/** Product token sent in User-Agent and matched against `User-agent:` lines. */
export const ROBOTS_AGENT = 'chuyennhoreader'

interface RobotsRule { allow: boolean; pattern: string }
interface RobotsGroup { agents: string[]; rules: RobotsRule[] }

function parseGroups(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = []
  let current: RobotsGroup | null = null
  let collectingAgents = false
  for (const raw of text.split(/\r\n|\r|\n/)) {
    const line = raw.replace(/#.*$/, '')
    const colon = line.indexOf(':')
    if (colon < 0) continue
    const field = line.slice(0, colon).trim().toLowerCase()
    const value = line.slice(colon + 1).trim()
    if (field === 'user-agent') {
      // Consecutive User-agent lines share one group (RFC 9309 §2.1).
      if (!current || !collectingAgents) { current = { agents: [], rules: [] }; groups.push(current) }
      current.agents.push(value.toLowerCase())
      collectingAgents = true
      continue
    }
    collectingAgents = false
    if ((field === 'allow' || field === 'disallow') && current && value) current.rules.push({ allow: field === 'allow', pattern: value })
  }
  return groups
}

// Wildcard match without RegExp: a hostile robots.txt cannot make it backtrack exponentially (O(path x pattern)).
function matches(pattern: string, path: string) {
  const anchored = pattern.endsWith('$')
  const wanted = anchored ? pattern.slice(0, -1) : `${pattern}*`
  let i = 0, j = 0, star = -1, mark = 0
  while (i < path.length) {
    if (j < wanted.length && wanted[j] === '*') { star = j++; mark = i }
    else if (j < wanted.length && wanted[j] === path[i]) { i++; j++ }
    else if (star >= 0) { j = star + 1; i = ++mark }
    else return false
  }
  while (j < wanted.length && wanted[j] === '*') j++
  return j === wanted.length
}

/**
 * RFC 9309 subset: the group naming this agent wins over `*`, the longest matching rule decides and Allow wins
 * a tie. `path` is pathname + search of the page.
 */
export function robotsAllows(text: string, path: string, agent = ROBOTS_AGENT): boolean {
  if (path === '/robots.txt') return true
  const groups = parseGroups(text)
  const own = groups.filter((group) => group.agents.some((name) => name === agent))
  const chosen = own.length ? own : groups.filter((group) => group.agents.includes('*'))
  let best: RobotsRule | null = null
  for (const rule of chosen.flatMap((group) => group.rules)) {
    if (!matches(rule.pattern, path)) continue
    if (!best || rule.pattern.length > best.pattern.length || (rule.pattern.length === best.pattern.length && rule.allow)) best = rule
  }
  return best ? best.allow : true
}
