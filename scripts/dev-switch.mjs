#!/usr/bin/env node
// Runs the dev servers — CMS on :3000, frontend on :4321 — for one checkout of
// ilag at a time, and moves them between Git worktrees.
//
//   pnpm dev:wt [worktree]   stop the servers wherever they run and start them in
//                            [worktree], or in the worktree you are in
//   pnpm dev:status          which checkout serves the ports
//   pnpm dev:logs            follow the servers' output
//   pnpm dev:stop            stop the servers, in any checkout
//
// [worktree] is a worktree's directory name, its branch or its path. The servers
// run in the background with their output in one log, and the state lives in the
// repository's common Git directory, so every worktree sees the same servers.
//
// The ports stay 3000 and 4321 whatever the checkout, so URLs in .env files,
// bookmarks and port forwards keep working. Each worktree keeps its own
// node_modules and .env, and with it the database its DATABASE_URL names.

import { execFileSync, spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SERVERS = [
  // `command` must match the listener before it is stopped, so an unrelated
  // service on the same port is left alone.
  { name: 'CMS', port: 3000, command: /next/, url: 'http://localhost:3000/admin' },
  { name: 'frontend', port: 4321, command: /astro/, url: 'http://localhost:4321' },
]
const DB_PORT = 5432
// The database in src/cms/.env.example, which the main checkout keeps.
const SHARED_DATABASE = 'ilag_dev'
const START_TIMEOUT_MS = 120_000
const LOAD_TIMEOUT_MS = 300_000
// "Is concepts table created or renamed from another table?" and Payload's
// "Accept warnings and push schema to database?"
const SCHEMA_PROMPT = /created or renamed from another|Accept warnings and push schema/
const SCHEMA_PROMPT_LINES = 6

// pnpm runs scripts from the checkout's root and passes the directory it was
// started in as INIT_CWD.
const invokedFrom = process.env.INIT_CWD ?? process.cwd()
const here = git(['rev-parse', '--show-toplevel'], path.dirname(fileURLToPath(import.meta.url)))
const stateDir = path.join(git(['rev-parse', '--path-format=absolute', '--git-common-dir'], here), 'ilag-dev')
const stateFile = path.join(stateDir, 'state.json')
const logFile = path.join(stateDir, 'dev.log')

const [command = 'status', ...args] = process.argv.slice(2)
const commands = { switch: switchTo, status, logs, stop }

if (!commands[command]) {
  console.error(`Unknown command "${command}". Use one of: ${Object.keys(commands).join(', ')}.`)
  process.exit(1)
}
await commands[command](...args)

async function switchTo(target) {
  const checkout = resolveCheckout(target)
  console.log(`Switching the dev servers to ${describe(checkout)}`)

  await stop()

  step('pnpm install', checkout.path, ['install', '--frozen-lockfile', '--prefer-offline'])
  step('pnpm setup', checkout.path, ['setup'])

  if (!(await isListening(DB_PORT))) {
    step('pnpm db:up', checkout.path, ['db:up'])
    if (!(await waitFor(() => isListening(DB_PORT), 60_000))) fail(`PostgreSQL did not come up on :${DB_PORT}`)
  }
  ensureOwnDatabase(checkout)

  fs.mkdirSync(stateDir, { recursive: true })
  const log = fs.openSync(logFile, 'w')
  fs.writeSync(log, `# pnpm dev in ${checkout.path} (${checkout.branch}), ${new Date().toISOString()}\n`)
  const child = spawn('pnpm', ['dev'], {
    cwd: checkout.path,
    // Its own process group, so `stop` takes down pnpm, Next and Astro together.
    detached: true,
    stdio: ['ignore', log, log],
    // Keeps Astro in the foreground of this process group. Without it, Astro 7
    // detaches into a daemon of its own when it thinks an AI agent runs it.
    env: { ...process.env, ASTRO_DEV_BACKGROUND: '1' },
  })
  child.unref()
  fs.closeSync(log)

  let exited = false
  child.on('exit', () => (exited = true))
  writeState({ path: checkout.path, branch: checkout.branch, pid: child.pid, startedAt: new Date().toISOString() })

  console.log(`\nStarting ${SERVERS.map((s) => `:${s.port}`).join(' and ')} …`)
  const up = await waitFor(
    async () => exited || (await Promise.all(SERVERS.map((s) => isListening(s.port)))).every(Boolean),
    START_TIMEOUT_MS,
  )
  if (exited || !up) {
    console.error(`\nThe dev servers did not start. The end of ${logFile}:\n`)
    console.error(tail(logFile, 30))
    await stop({ quiet: true })
    process.exit(1)
  }

  // Payload loads, and pushes its schema to the database, on the first request.
  // When the database holds tables another branch made, it asks in the terminal
  // whether to create or rename them, and these servers have no terminal: they
  // would wait for an answer forever.
  console.log('Loading the CMS, which pushes its schema to the database …')
  const loaded = await loadCms()
  if (loaded === 'prompt') {
    const lines = tail(logFile, 200).split('\n')
    const at = lines.findIndex((l) => SCHEMA_PROMPT.test(l))
    const question = lines.slice(at, at + SCHEMA_PROMPT_LINES).join('\n')
    await stop({ quiet: true })
    const db = databaseName(checkout.path) ?? 'the database'
    const shared = db === SHARED_DATABASE
    console.error(
      `\nPayload asks how to change the schema of ${db}, which holds tables of another branch:\n\n` +
        question +
        '\n\nThe servers are stopped and nothing was changed. Answer the question by running\n' +
        `\`pnpm dev\` in ${checkout.path}, then stop it and run \`pnpm dev:wt\` again.\n` +
        (shared
          ? `${db} is shared, so the answer changes it for every checkout that uses it.`
          : `${db} belongs to this worktree, so the answer only changes it here.`),
    )
    process.exit(1)
  }
  if (loaded === 'timeout') console.warn(`The CMS has not answered yet; see \`pnpm dev:logs\`.`)

  console.log(`\nThe dev servers run from ${describe(checkout)}`)
  for (const s of SERVERS) console.log(`  ${s.name.padEnd(9)} ${s.url}`)
  console.log(`  database  ${databaseName(checkout.path) ?? '(no src/cms/.env)'}`)
  console.log(`\nFollow the output with \`pnpm dev:logs\`, stop them with \`pnpm dev:stop\`.`)
}

async function status() {
  const state = readState()
  const checkouts = worktrees()
  let running = false

  for (const s of SERVERS) {
    const pids = listeners(s.port)
    if (pids.length === 0) {
      console.log(`${s.name.padEnd(9)} :${s.port}  not running`)
      continue
    }
    running = true
    for (const pid of pids) {
      const owner = owningCheckout(pid, checkouts)
      console.log(`${s.name.padEnd(9)} :${s.port}  pid ${pid}, ${owner ? describe(owner) : processCommand(pid)}`)
    }
  }

  if (state && isAlive(state.pid)) {
    console.log(`\nStarted by \`pnpm dev:wt\` at ${state.startedAt}. Output: ${logFile}`)
  } else if (running) {
    console.log('\nNot started by `pnpm dev:wt`; `pnpm dev:wt` and `pnpm dev:stop` still stop them.')
  }
}

async function logs() {
  if (!fs.existsSync(logFile)) fail('No log yet. Start the dev servers with `pnpm dev:wt`.')
  spawnSync('tail', ['-n', '100', '-F', logFile], { stdio: 'inherit' })
}

async function stop({ quiet = false } = {}) {
  const say = quiet ? () => {} : (msg) => console.log(msg)
  const state = readState()

  if (state && isAlive(state.pid)) {
    signalGroup(state.pid, 'SIGTERM')
    if (!(await waitFor(() => !isAlive(state.pid), 10_000))) signalGroup(state.pid, 'SIGKILL')
    say(`Stopped the dev servers of ${state.path}`)
  }
  removeState()

  // Servers started by hand with `pnpm dev`, `pnpm dev:cms` or `pnpm dev:web`, in
  // any checkout, and leftovers such as a detached Astro daemon.
  for (const s of SERVERS) {
    for (const pid of listeners(s.port)) {
      const cmd = processCommand(pid)
      if (!s.command.test(cmd)) {
        say(`Port ${s.port} is held by pid ${pid} (${cmd}), which is not the ${s.name} dev server — left running`)
        continue
      }
      // pnpm runs each package's script in a process group of its own; end the
      // whole group (`next dev` and its server) when its leader is that script.
      const group = processGroup(pid)
      const kill = group && s.command.test(processCommand(group)) ? (sig) => signalGroup(group, sig) : (sig) => signal(pid, sig)
      kill('SIGTERM')
      if (!(await waitFor(() => !isAlive(pid), 5_000))) kill('SIGKILL')
      say(`Stopped the ${s.name} on :${s.port} (pid ${pid})`)
    }
  }

  // The ports can take a moment to close after the processes exit.
  await waitFor(async () => !(await Promise.all(SERVERS.map((s) => isListening(s.port)))).some(Boolean), 5_000)
}

// --- Checkouts ---------------------------------------------------------------

function worktrees() {
  const list = []
  let current
  for (const line of git(['worktree', 'list', '--porcelain'], here).split('\n')) {
    if (line.startsWith('worktree ')) list.push((current = { path: line.slice(9), branch: '(detached)' }))
    else if (line.startsWith('branch ')) current.branch = line.slice(7).replace(/^refs\/heads\//, '')
    else if (line === 'bare') list.pop()
  }
  return list
}

function resolveCheckout(target) {
  const list = worktrees()
  if (!target) {
    // The worktree you are in, which is not always the one this script is in:
    // an older worktree without the script can run the main checkout's copy.
    let top
    try {
      top = git(['rev-parse', '--show-toplevel'], invokedFrom)
    } catch {
      fail(`${invokedFrom} is not inside a worktree of ilag. Name one: pnpm dev:wt <worktree>`)
    }
    const match = list.find((w) => w.path === top)
    if (!match) fail(`${top} is not a worktree of this repository. Name one: pnpm dev:wt <worktree>`)
    return match
  }

  const asPath = path.resolve(invokedFrom, target)
  const match =
    list.find((w) => w.path === asPath) ??
    list.find((w) => path.basename(w.path) === target) ??
    list.find((w) => w.branch === target)
  if (match) return match

  console.error(`No worktree called "${target}". Pick a directory name, a branch or a path:\n`)
  for (const w of list) console.error(`  ${path.basename(w.path).padEnd(20)} ${w.branch}`)
  console.error('\nCreate one with `git worktree add <path> <branch>`.')
  process.exit(1)
}

function owningCheckout(pid, list) {
  const cwd = processCwd(pid)
  if (!cwd) return undefined
  return list
    .filter((w) => cwd === w.path || cwd.startsWith(w.path + path.sep))
    .sort((a, b) => b.path.length - a.path.length)[0]
}

function describe(checkout) {
  return `${checkout.path} (${checkout.branch})`
}

// Requests the admin panel until it answers, or until the log shows one of
// Payload's (drizzle-kit's) schema questions.
async function loadCms() {
  const request = fetch(SERVERS[0].url, { signal: AbortSignal.timeout(LOAD_TIMEOUT_MS) }).then(
    () => 'ready',
    () => 'timeout',
  )
  let result
  request.then((r) => (result ??= r))
  await waitFor(() => {
    if (SCHEMA_PROMPT.test(tail(logFile, 40))) result ??= 'prompt'
    return result !== undefined
  }, LOAD_TIMEOUT_MS + 1_000)
  return result ?? 'timeout'
}

// --- Database ----------------------------------------------------------------

// Payload pushes each branch's schema to its database on start and drops what
// the branch lacks, so worktrees sharing a database would undo each other's
// tables. A worktree still on the shared default gets a database of its own,
// ilag_<worktree>, which starts as a copy of the shared one so its data comes
// along. The main checkout keeps the shared one, and other names are left alone.
function ensureOwnDatabase(checkout) {
  if (checkout.path === worktrees()[0]?.path) return
  const envFile = path.join(checkout.path, 'src/cms/.env')
  let env
  try {
    env = fs.readFileSync(envFile, 'utf8')
  } catch {
    return
  }
  const line = env.match(/^DATABASE_URL=(.*)$/m)
  if (!line) return
  const url = new URL(line[1].trim().replace(/^["']|["']$/g, ''))
  if (url.pathname.slice(1) !== SHARED_DATABASE) return

  const name = `ilag_${path.basename(checkout.path).toLowerCase().replace(/[^a-z0-9]/g, '_')}`.slice(0, 58)
  const user = decodeURIComponent(url.username) || 'ilag'
  console.log(`\nGiving this worktree a database of its own: ${name}`)

  const exists = psql(checkout.path, user, `SELECT 1 FROM pg_database WHERE datname = '${name}'`)
  if (exists.ok && exists.out === '1') {
    console.log(`${name} exists already; using it.`)
  } else {
    // Needs nobody connected to the shared database; the servers are stopped.
    const copy = psql(checkout.path, user, `CREATE DATABASE "${name}" TEMPLATE "${SHARED_DATABASE}"`)
    if (copy.ok) console.log(`Copied ${SHARED_DATABASE} into ${name}.`)
    else
      console.warn(
        `Could not copy ${SHARED_DATABASE} (${copy.out || 'no output'}).\n` +
          `Payload creates ${name} empty instead; fill it with \`pnpm db:seed\`.`,
      )
  }

  url.pathname = `/${name}`
  fs.writeFileSync(envFile, env.replace(line[0], `DATABASE_URL=${url}`))
  console.log(`Set DATABASE_URL in ${path.relative(checkout.path, envFile)} to ${name}.`)
}

// psql inside the database container, so it works without psql on the machine.
function psql(cwd, user, sql) {
  const r = spawnSync('docker', ['compose', 'exec', '-T', 'postgres', 'psql', '-U', user, '-d', 'postgres', '-Atc', sql], {
    cwd,
    encoding: 'utf8',
  })
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() }
}

function databaseName(checkoutPath) {
  try {
    const env = fs.readFileSync(path.join(checkoutPath, 'src/cms/.env'), 'utf8')
    const url = env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '')
    return url ? new URL(url).pathname.slice(1) : undefined
  } catch {
    return undefined
  }
}

// --- Processes and ports -----------------------------------------------------

function listeners(port) {
  // On Linux, lsof skips Next's `next-server (v16…)` process, whose name holds a
  // parenthesis, so ask ss there. macOS has no ss, and lsof works.
  const ss = spawnSync('ss', ['-ltnpH', `sport = :${port}`], { encoding: 'utf8' })
  const out =
    ss.status === 0
      ? [...ss.stdout.matchAll(/pid=(\d+)/g)].map((m) => m[1])
      : (spawnSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' }).stdout ?? '').split('\n')
  return [...new Set(out.filter(Boolean).map(Number))]
}

function processCommand(pid) {
  return spawnSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).stdout?.trim() ?? ''
}

function processGroup(pid) {
  const pgid = Number(spawnSync('ps', ['-p', String(pid), '-o', 'pgid='], { encoding: 'utf8' }).stdout?.trim())
  return pgid > 1 && pgid !== process.pid ? pgid : undefined
}

function processCwd(pid) {
  try {
    return fs.readlinkSync(`/proc/${pid}/cwd`)
  } catch {
    // macOS has no /proc.
    const out = spawnSync('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'], { encoding: 'utf8' }).stdout ?? ''
    return out.split('\n').find((l) => l.startsWith('n'))?.slice(1)
  }
}

function isAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    return err.code === 'EPERM'
  }
}

function signal(pid, sig) {
  try {
    process.kill(pid, sig)
  } catch {}
}

function signalGroup(pid, sig) {
  try {
    process.kill(-pid, sig)
  } catch {
    signal(pid, sig)
  }
}

function isListening(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' })
    socket.once('connect', () => (socket.destroy(), resolve(true)))
    socket.once('error', () => resolve(false))
    socket.setTimeout(1_000, () => (socket.destroy(), resolve(false)))
  })
}

async function waitFor(check, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await check()) return true
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

// --- Helpers -----------------------------------------------------------------

function git(gitArgs, cwd) {
  return execFileSync('git', gitArgs, { cwd, encoding: 'utf8' }).trim()
}

function step(label, cwd, pnpmArgs) {
  console.log(`\n$ ${label}`)
  const result = spawnSync('pnpm', pnpmArgs, { cwd, stdio: 'inherit' })
  if (result.status !== 0) fail(`${label} failed in ${cwd}`)
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'))
  } catch {
    return undefined
  }
}

function writeState(state) {
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n')
}

function removeState() {
  fs.rmSync(stateFile, { force: true })
}

function tail(file, lines) {
  try {
    return fs.readFileSync(file, 'utf8').trimEnd().split('\n').slice(-lines).join('\n')
  } catch {
    return '(no log)'
  }
}

function fail(message) {
  console.error(`\n${message}`)
  process.exit(1)
}
