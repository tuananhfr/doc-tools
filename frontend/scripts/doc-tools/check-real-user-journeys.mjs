import fs from 'node:fs'
import path from 'node:path'

const input = process.argv[2]
if (!input) throw new Error('Usage: check-real-user-journeys <human-reviewed-journeys.json>')
const report = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'))
const problems = []
if (!Array.isArray(report.sessions) || !report.sessions.length) problems.push('No real-user sessions supplied')
for (const session of report.sessions ?? []) {
  if (session.actorType !== 'real-user' || session.permission !== 'approved-local' || !session.reviewedBy) problems.push(`${session.id}: consent and human reviewer required`)
  if (!['search', 'browse'].includes(session.entry) || !session.fixtureSha256 || !session.outputValidation) problems.push(`${session.id}: discovery, fixture and output evidence required`)
  if (![session.steps, session.backtracks, session.elapsedMs].every(value => Number.isFinite(value) && value >= 0)) problems.push(`${session.id}: missing observed journey measurements`)
  if (Object.keys(session).some(key => /query|filename|rawText|correction|identity|email/iu.test(key))) problems.push(`${session.id}: raw personal content must not enter aggregate report`)
}
console.log(JSON.stringify({ status: problems.length ? 'pending' : 'validated', sessions: report.sessions?.length ?? 0, problems }, null, 2))
if (problems.length) process.exitCode = 1
