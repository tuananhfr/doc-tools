import { describe, expect, it } from 'vitest'
import { addedLater, duplicateNames, reconcilePeople, type GroupPerson } from './group-roster'
import { settleGroup } from './group-settlement'

const counter = () => {
  let next = 0
  return () => `new${++next}`
}
const start: GroupPerson[] = [{ id: 'a', name: 'An' }, { id: 'b', name: 'Bình' }]

describe('group roster', () => {
  it('keeps the id when a person is renamed', () => {
    expect(reconcilePeople(start, ['Anh', 'Bình'], counter())).toEqual([{ id: 'a', name: 'Anh' }, { id: 'b', name: 'Bình' }])
    expect(reconcilePeople(start, ['An', 'Bình Lê'], counter())).toEqual([{ id: 'a', name: 'An' }, { id: 'b', name: 'Bình Lê' }])
  })

  it('keeps the id while a name is cleared and retyped', () => {
    const cleared = reconcilePeople(start, ['', 'Bình'], counter())
    expect(cleared[0]).toEqual({ id: 'a', name: '' })
    expect(reconcilePeople(cleared, ['Hùng', 'Bình'], counter())[0]).toEqual({ id: 'a', name: 'Hùng' })
  })

  it('adds new ids only for new lines and drops removed people', () => {
    const three = reconcilePeople(start, ['An', 'Chi', 'Bình'], counter())
    expect(three.map((person) => person.id)).toEqual(['a', 'new1', 'b'])
    expect(reconcilePeople(three, ['An', 'Bình'], counter()).map((person) => person.id)).toEqual(['a', 'b'])
  })

  it('gives a duplicate name its own id and reports it', () => {
    const people = reconcilePeople(start, ['An', 'Bình', 'an'], counter())
    expect(new Set(people.map((person) => person.id)).size).toBe(3)
    expect(duplicateNames(people)).toEqual(['An'])
    expect(duplicateNames(start)).toEqual([])
    expect(duplicateNames([...start, { id: 'x', name: '' }, { id: 'y', name: '' }])).toEqual([])
  })

  it('lists people added after an expense who are not ticked in it', () => {
    const people = [...start, { id: 'c', name: 'Chi' }]
    expect(addedLater(people, ['a', 'b'], ['a', 'b'])).toEqual([{ id: 'c', name: 'Chi' }])
    expect(addedLater(people, ['a', 'b'], ['a', 'b', 'c'])).toEqual([])
    // Người có từ đầu mà bị bỏ tích là chủ ý, không nhắc.
    expect(addedLater(people, ['a', 'b', 'c'], ['a'])).toEqual([])
  })

  it('settles by id so a rename does not change balances', () => {
    const expenses = [{ payer: 'a', amount: 90000, participants: ['a', 'b', 'c'] }]
    const result = settleGroup(['a', 'b', 'c'], expenses)
    expect(result?.balances).toEqual({ a: 60000, b: -30000, c: -30000 })
    expect(result?.transfers).toEqual([{ from: 'b', to: 'a', amount: 30000 }, { from: 'c', to: 'a', amount: 30000 }])
  })
})
