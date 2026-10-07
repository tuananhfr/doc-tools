import { describe, expect, it } from 'vitest'
import { blankOwner, readOwner, type OwnerDraft } from './owner'

const owner = (patch: Partial<OwnerDraft>): OwnerDraft => ({ ...blankOwner(1), ...patch })

describe('gia chủ', () => {
  it('chưa nhập gì thì chưa đọc, không báo lỗi', () => {
    expect(readOwner(owner({}))).toBeNull()
    expect(readOwner(owner({ kind: 'LUNAR_YEAR', year: '  ' }))).toBeNull()
  })

  it('ngày dương lịch → năm âm, can chi, nạp âm, cung mệnh', () => {
    const result = readOwner(owner({ date: '1986-09-15' }))
    expect(result?.ok).toBe(true)
    if (!result?.ok) return
    expect(result.birth).toMatchObject({ lunarYear: 1986, canChi: 'Bính Dần', beforeNewYear: false })
    expect(result.birth.napAm.name).toBe('Lư Trung Hoả')
    expect(result.reading.trigram.id).toBe('KUN')
  })

  it('sinh trước Tết tính sang năm âm trước đó', () => {
    const result = readOwner(owner({ date: '1986-01-20' }))
    expect(result?.ok && result.birth).toMatchObject({ lunarYear: 1985, canChi: 'Ất Sửu', beforeNewYear: true })
    expect(result?.ok && result.reading.trigram.id).toBe('QIAN')
  })

  it('chỉ biết năm âm lịch', () => {
    const result = readOwner(owner({ kind: 'LUNAR_YEAR', year: '1986', sex: 'FEMALE' }))
    expect(result?.ok && result.reading.trigram.id).toBe('KAN')
  })

  it('nhập sai thì nói rõ; năm ngoài khoảng luật vẫn giữ tuổi để hiện', () => {
    expect(readOwner(owner({ kind: 'LUNAR_YEAR', year: '86' }))).toMatchObject({ ok: false, birth: null })
    const old = readOwner(owner({ kind: 'LUNAR_YEAR', year: '1850' }))
    expect(old).toMatchObject({ ok: false, birth: { lunarYear: 1850 } })
  })
})
