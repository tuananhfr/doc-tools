export interface GroupExpense {
  payer: string
  amount: number
  participants: string[]
}

export interface Transfer {
  from: string
  to: string
  amount: number
}

export function settleGroup(people: string[], expenses: GroupExpense[]): { balances: Record<string, number>; transfers: Transfer[] } | null {
  const unique = [...new Set(people.map((person) => person.trim()).filter(Boolean))]
  if (unique.length !== people.length || unique.length < 2 || expenses.some((expense) =>
    !Number.isSafeInteger(expense.amount) || expense.amount <= 0 || !unique.includes(expense.payer) ||
    expense.participants.length === 0 || expense.participants.some((person) => !unique.includes(person)) ||
    new Set(expense.participants).size !== expense.participants.length)) return null
  const balances = Object.fromEntries(unique.map((person) => [person, 0])) as Record<string, number>
  for (const expense of expenses) {
    balances[expense.payer] += expense.amount
    const share = expense.amount / expense.participants.length
    for (const participant of expense.participants) balances[participant] -= share
  }
  const debtors = unique.filter((person) => balances[person] < -0.5).map((person) => ({ person, value: -balances[person] })).sort((a, b) => b.value - a.value)
  const creditors = unique.filter((person) => balances[person] > 0.5).map((person) => ({ person, value: balances[person] })).sort((a, b) => b.value - a.value)
  const transfers: Transfer[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].value, creditors[j].value)
    if (amount > 0.5) transfers.push({ from: debtors[i].person, to: creditors[j].person, amount })
    debtors[i].value -= amount
    creditors[j].value -= amount
    if (debtors[i].value <= 0.5) i += 1
    if (creditors[j].value <= 0.5) j += 1
  }
  return { balances, transfers }
}
