export type LoanMethod = 'annuity' | 'equal-principal'

export interface LoanPayment {
  month: number
  principal: number
  interest: number
  payment: number
  balance: number
}

export interface LoanSchedule {
  rows: LoanPayment[]
  totalInterest: number
  totalPayment: number
}

export function calculateLoan(principal: number, annualRatePercent: number, months: number, method: LoanMethod): LoanSchedule | null {
  if (!Number.isFinite(principal) || principal <= 0 || !Number.isFinite(annualRatePercent) || annualRatePercent < 0 || !Number.isInteger(months) || months < 1 || months > 600) return null
  const monthlyRate = annualRatePercent / 1200
  const annuity = monthlyRate === 0 ? principal / months : principal * monthlyRate / (1 - (1 + monthlyRate) ** -months)
  const rows: LoanPayment[] = []
  let balance = principal
  let totalInterest = 0
  for (let month = 1; month <= months; month += 1) {
    const interest = balance * monthlyRate
    const installment = method === 'annuity' ? annuity - interest : principal / months
    const principalPaid = month === months ? balance : Math.min(balance, installment)
    balance = Math.max(0, balance - principalPaid)
    totalInterest += interest
    rows.push({ month, principal: principalPaid, interest, payment: principalPaid + interest, balance })
  }
  return { rows, totalInterest, totalPayment: principal + totalInterest }
}

export function calculateSavings(principal: number, annualRatePercent: number, termMonths: number, renewals: number) {
  if (!Number.isFinite(principal) || principal <= 0 || !Number.isFinite(annualRatePercent) || annualRatePercent < 0 ||
    !Number.isInteger(termMonths) || termMonths < 1 || termMonths > 120 || !Number.isInteger(renewals) || renewals < 1 || renewals > 100) return null
  const total = principal * (1 + annualRatePercent / 100 * termMonths / 12) ** renewals
  return Number.isFinite(total) ? { total, interest: total - principal, months: termMonths * renewals } : null
}
