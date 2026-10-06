import { useEffect, useState } from 'react'
import { fetchVerifiedRules, type RuleDataParser, type RuleLookup } from '../services/signed-rules'

export type SignedRulesState<T> = RuleLookup<T> | { state: 'loading' }

/** `parse` phải là hằng khai ngoài component — đổi tham chiếu mỗi lần render là gọi lại API liên tục. */
export function useSignedRules<T>(kind: string, parse: RuleDataParser<T>): SignedRulesState<T> {
  const [lookup, setLookup] = useState<SignedRulesState<T>>({ state: 'loading' })
  useEffect(() => {
    let alive = true
    void fetchVerifiedRules(kind, parse).then((result) => { if (alive) setLookup(result) })
    return () => { alive = false }
  }, [kind, parse])
  return lookup
}
