import { describe, expect, it } from 'vitest'
import { HANDOFF_TTL_MS, handOff, takeHandoff } from './handoff'
import { handOffFiles, takeHandoff as takeEditorHandoff } from '../pdf/services/handoff'

const image = (name = 'a.jpg') => new File(['x'], name, { type: 'image/jpeg' })

describe('tool handoff', () => {
  it('gives the files to the target screen exactly once', () => {
    const file = image()
    handOff('id-photo', [file], 1000)
    expect(takeHandoff('id-photo', 1001)).toEqual([file])
    expect(takeHandoff('id-photo', 1002)).toEqual([])
  })

  it('leaves the files for the target when another screen asks', () => {
    const file = image()
    handOff('id-photo', [file], 0)
    expect(takeHandoff('cv', 1)).toEqual([])
    expect(takeHandoff('id-photo', 2)).toEqual([file])
  })

  it('drops a stale handoff instead of loading it into a later visit', () => {
    handOff('cv', [image()], 0)
    expect(takeHandoff('cv', HANDOFF_TTL_MS + 1)).toEqual([])
    expect(takeHandoff('cv', HANDOFF_TTL_MS + 2)).toEqual([])
  })

  it('lets a newer handoff replace an older one', () => {
    const second = image('b.jpg')
    handOff('cv', [image()], 0)
    handOff('id-photo', [second], 1)
    expect(takeHandoff('cv', 2)).toEqual([])
    expect(takeHandoff('id-photo', 3)).toEqual([second])
  })

  it('keeps its own copy of the list', () => {
    const files = [image()]
    handOff('cv', files, 0)
    files.push(image('late.jpg'))
    expect(takeHandoff('cv', 1)).toHaveLength(1)
  })

  it('keeps the old PDF quick-tool → editor API working', () => {
    const pdf = new File(['%PDF'], 'a.pdf', { type: 'application/pdf' })
    handOffFiles([pdf])
    expect(takeHandoff('id-photo')).toEqual([])
    expect(takeEditorHandoff()).toEqual([pdf])
    expect(takeEditorHandoff()).toEqual([])
  })
})
