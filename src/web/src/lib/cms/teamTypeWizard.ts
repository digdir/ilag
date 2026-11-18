import { authHeaders, sdk, type TeamTypeWizardQuestion } from '@ilag/shared'

/**
 * The team type wizard's questions (TK-03), by ID, with the questions and
 * team types their answers lead to filled in, and the one it starts at.
 */
export async function getTeamTypeWizard(cookie: string | null) {
  const { docs } = await sdk.find(
    { collection: 'teamtype-veiviser', pagination: false, depth: 1 },
    { headers: authHeaders(cookie) },
  )
  return {
    startQuestion: docs.find((question) => question.isStart),
    questionsById: new Map<number, TeamTypeWizardQuestion>(docs.map((question) => [question.id, question])),
  }
}

type Answer = NonNullable<TeamTypeWizardQuestion['answers']>[number]

/**
 * Where the answers' numbers in the URL lead from the start question: the
 * question to ask next, or the answer that ended the wizard. Null when they
 * don't fit the questions as they are now, say because an editor changed them.
 */
export function follow(
  startQuestion: TeamTypeWizardQuestion,
  questionsById: Map<number, TeamTypeWizardQuestion>,
  path: number[],
): { question?: TeamTypeWizardQuestion; ending?: Answer } | null {
  let question = startQuestion
  for (const [index, answerNumber] of path.entries()) {
    const answer = question.answers?.[answerNumber - 1]
    if (!answer) return null

    const leadsTo = answer.leadsTo
    if (leadsTo?.relationTo !== 'teamtype-veiviser') {
      // A team type or nowhere ends the wizard, so only the last answer can.
      return index === path.length - 1 ? { ending: answer } : null
    }

    const nextQuestion = questionsById.get(typeof leadsTo.value === 'object' ? leadsTo.value.id : leadsTo.value)
    if (!nextQuestion) return null
    question = nextQuestion
  }
  return { question }
}

/** A list editors write one point per line, as its points. */
export const lines = (text: string | null | undefined): string[] =>
  (text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
