// A link target on this site, or null for anything else, so a crafted link
// can't send people elsewhere. The target is resolved the way a browser
// resolves a Location header, which drops tabs and newlines and reads
// backslashes as slashes, so a target like "/<tab>/evil.example" is seen for
// what it is: //evil.example.
export const sameSiteURL = (target: string | null, base: URL): URL | null => {
  if (!target) return null
  try {
    const url = new URL(target, base)
    return url.origin === base.origin ? url : null
  } catch {
    return null
  }
}
