export function editableRuleLines(text: string): string[][] {
  return text.split('\n').map(line => {
    const strong = line.match(/^([^;|\t]*)[;|\t]+(.*)$/)
    if (strong) return [strong[1].trim(), strong[2].trim()]
    const spaced = line.trim().match(/^(\S+)\s+(\S+)$/)
    if (spaced) return [spaced[1], spaced[2]]
    const comma = line.indexOf(',')
    return comma > 0 ? [line.slice(0, comma).trim(), line.slice(comma + 1).trim()] : [line.trim(), '']
  })
}
