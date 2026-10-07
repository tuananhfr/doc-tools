import type { ParseKeys } from 'i18next'
import { translate } from '@/i18n/runtime'

/** Nhóm phép tính tiền — mỗi nhóm một thẻ trên màn. */
export type MoneyGroup = 'percent' | 'tax' | 'profit' | 'split'

/** `money` in kiểu tiền, `percent` kèm dấu %, `count` là số nguyên đếm được (người). */
export type MoneyUnit = 'money' | 'percent' | 'count'

/** Nhãn trong cấu hình là khoá i18n: hằng nạp từ lúc import, khi đó chưa dịch được. */
type UtilityKey = ParseKeys<'utility'>

export interface MoneyInput {
  key: string
  label: UtilityKey
  unit: MoneyUnit
  placeholder?: UtilityKey
  /** Bỏ trống = 0 (phụ phí, tiền tip). */
  optional?: boolean
}

export interface MoneyRow {
  label: string
  value: number
  unit: MoneyUnit
}

export interface MoneyPreset {
  /** `preset_id` của spec: ổn định, không đổi khi đổi nhãn tiếng Việt. */
  id: string
  /** `formula_version`: tăng khi CÁCH TÍNH đổi — cùng số gõ vào mà ra kết quả khác. */
  version: number
  group: MoneyGroup
  label: UtilityKey
  inputs: MoneyInput[]
  /** Dòng đầu là kết quả chính. Trả về chuỗi = số hợp lệ nhưng phép tính không có nghĩa (chia cho 0). */
  compute: (values: Record<string, number>) => MoneyRow[] | string
  /** Phép tính in ra cho người dùng soát, dựng từ các số ĐÃ định dạng. */
  explain: (values: Record<string, string>) => string
}

export const MONEY_GROUPS: { value: MoneyGroup; label: UtilityKey; icon: string }[] = [
  { value: 'percent', label: 'money.groups.percent', icon: 'percent' },
  { value: 'tax', label: 'money.groups.tax', icon: 'receipt' },
  { value: 'profit', label: 'money.groups.profit', icon: 'graph-up-arrow' },
  { value: 'split', label: 'money.groups.split', icon: 'people' },
]

const money = (key: string, label: UtilityKey, placeholder?: UtilityKey): MoneyInput => ({ key, label, unit: 'money', placeholder })
const percent = (key: string, label: UtilityKey, placeholder?: UtilityKey): MoneyInput => ({ key, label, unit: 'percent', placeholder })

/** Làm tròn LÊN tới nghìn đồng: chia tiền mà thu thiếu thì người trả hộ chịu. */
const ROUND_UP_TO = 1000

/**
 * Thuế suất luôn do người dùng NHẬP TAY: mức thuế đổi theo từng thời kỳ và từng
 * mặt hàng, gắn sẵn một con số là công cụ lặng lẽ tính sai khi luật đổi.
 *
 * Margin tính trên GIÁ BÁN, markup tính trên GIÁ VỐN — hai con số hay bị gọi
 * chung là "lãi bao nhiêu phần trăm", nên phép nào cũng in ra cả hai.
 */
export const MONEY_PRESETS: MoneyPreset[] = [
  {
    id: 'percent-of',
    version: 1,
    group: 'percent',
    label: 'money.presets.percentOf',
    inputs: [percent('rate', 'money.inputs.rate'), money('base', 'money.inputs.ofNumber')],
    compute: ({ rate, base }) => [{ label: translate('utility:money.rows.result'), value: (base * rate) / 100, unit: 'money' }],
    explain: ({ rate, base }) => `${base} × ${rate}%`,
  },
  {
    id: 'percent-ratio',
    version: 1,
    group: 'percent',
    label: 'money.presets.percentRatio',
    inputs: [money('part', 'money.inputs.numberA'), money('whole', 'money.inputs.numberB')],
    compute: ({ part, whole }) => (whole === 0 ? translate('utility:money.errors.bNonZero') : [{ label: translate('utility:money.rows.aVsB'), value: (part / whole) * 100, unit: 'percent' }]),
    explain: ({ part, whole }) => `${part} ÷ ${whole} × 100`,
  },
  {
    id: 'percent-change',
    version: 1,
    group: 'percent',
    label: 'money.presets.percentChange',
    inputs: [money('from', 'money.inputs.oldValue'), money('to', 'money.inputs.newValue')],
    compute: ({ from, to }) =>
      from === 0
        ? translate('utility:money.errors.oldNonZero')
        : [
            { label: to >= from ? translate('utility:money.rows.increase') : translate('utility:money.rows.decrease'), value: (Math.abs(to - from) / from) * 100, unit: 'percent' },
            { label: translate('utility:money.rows.difference'), value: to - from, unit: 'money' },
          ],
    explain: ({ from, to }) => `(${to} − ${from}) ÷ ${from} × 100`,
  },
  {
    id: 'vat-add',
    version: 1,
    group: 'tax',
    label: 'money.presets.vatAdd',
    inputs: [money('net', 'money.inputs.netPrice'), percent('rate', 'money.inputs.taxRate', 'money.placeholders.manual')],
    compute: ({ net, rate }) => {
      const tax = (net * rate) / 100
      return [
        { label: translate('utility:money.rows.grossPrice'), value: net + tax, unit: 'money' },
        { label: translate('utility:money.rows.tax'), value: tax, unit: 'money' },
      ]
    },
    explain: ({ net, rate }) => `${net} × (1 + ${rate}%)`,
  },
  {
    id: 'vat-extract',
    version: 1,
    group: 'tax',
    label: 'money.presets.vatExtract',
    inputs: [money('gross', 'money.inputs.grossPrice'), percent('rate', 'money.inputs.taxRate', 'money.placeholders.manual')],
    compute: ({ gross, rate }) => {
      const net = gross / (1 + rate / 100)
      return [
        { label: translate('utility:money.rows.netPrice'), value: net, unit: 'money' },
        { label: translate('utility:money.rows.tax'), value: gross - net, unit: 'money' },
      ]
    },
    explain: ({ gross, rate }) => `${gross} ÷ (1 + ${rate}%)`,
  },
  {
    id: 'discount',
    version: 1,
    group: 'tax',
    label: 'money.presets.discount',
    inputs: [money('price', 'money.inputs.originalPrice'), percent('rate', 'money.inputs.discount')],
    compute: ({ price, rate }) => {
      if (rate > 100) return translate('utility:money.errors.discountMax')
      const off = (price * rate) / 100
      return [
        { label: translate('utility:money.rows.discounted'), value: price - off, unit: 'money' },
        { label: translate('utility:money.rows.discountAmount'), value: off, unit: 'money' },
      ]
    },
    explain: ({ price, rate }) => `${price} × (1 − ${rate}%)`,
  },
  {
    id: 'margin',
    version: 1,
    group: 'profit',
    label: 'money.presets.margin',
    inputs: [money('cost', 'money.inputs.cost'), money('price', 'money.inputs.price')],
    compute: ({ cost, price }) => {
      if (price === 0) return translate('utility:money.errors.pricePositive')
      if (cost === 0) return translate('utility:money.errors.costPositive')
      const profit = price - cost
      return [
        { label: translate('utility:money.rows.margin'), value: (profit / price) * 100, unit: 'percent' },
        { label: translate('utility:money.rows.markup'), value: (profit / cost) * 100, unit: 'percent' },
        { label: translate('utility:money.rows.grossProfit'), value: profit, unit: 'money' },
      ]
    },
    explain: ({ cost, price }) => `(${price} − ${cost}) ÷ ${price} × 100`,
  },
  {
    id: 'price-from-margin',
    version: 1,
    group: 'profit',
    label: 'money.presets.priceFromMargin',
    inputs: [money('cost', 'money.inputs.cost'), percent('margin', 'money.inputs.targetMargin')],
    compute: ({ cost, margin }) => {
      // Margin 100% nghĩa là giá vốn bằng 0 — không có giá bán nào đạt được.
      if (margin >= 100) return translate('utility:money.errors.marginMax')
      const price = cost / (1 - margin / 100)
      return [
        { label: translate('utility:money.rows.price'), value: price, unit: 'money' },
        { label: translate('utility:money.rows.grossProfit'), value: price - cost, unit: 'money' },
        { label: translate('utility:money.rows.impliedMarkup'), value: cost === 0 ? 0 : ((price - cost) / cost) * 100, unit: 'percent' },
      ]
    },
    explain: ({ cost, margin }) => `${cost} ÷ (1 − ${margin}%)`,
  },
  {
    id: 'price-from-markup',
    version: 1,
    group: 'profit',
    label: 'money.presets.priceFromMarkup',
    inputs: [money('cost', 'money.inputs.cost'), percent('markup', 'money.inputs.targetMarkup')],
    compute: ({ cost, markup }) => {
      const price = cost * (1 + markup / 100)
      return [
        { label: translate('utility:money.rows.price'), value: price, unit: 'money' },
        { label: translate('utility:money.rows.grossProfit'), value: price - cost, unit: 'money' },
        { label: translate('utility:money.rows.impliedMargin'), value: price === 0 ? 0 : ((price - cost) / price) * 100, unit: 'percent' },
      ]
    },
    explain: ({ cost, markup }) => `${cost} × (1 + ${markup}%)`,
  },
  {
    id: 'split',
    version: 1,
    group: 'split',
    label: 'money.presets.split',
    inputs: [money('total', 'money.inputs.total'), { key: 'people', label: 'money.inputs.people', unit: 'count' }, { ...percent('extra', 'money.inputs.extra'), optional: true, placeholder: 'money.placeholders.zero' }],
    compute: ({ total, people, extra }) => {
      const due = total * (1 + extra / 100)
      const each = due / people
      const rounded = Math.ceil(each / ROUND_UP_TO) * ROUND_UP_TO
      return [
        { label: translate('utility:money.rows.each'), value: each, unit: 'money' },
        { label: translate('utility:money.rows.totalDue'), value: due, unit: 'money' },
        { label: translate('utility:money.rows.eachRounded'), value: rounded, unit: 'money' },
        { label: translate('utility:money.rows.surplus'), value: rounded * people - due, unit: 'money' },
      ]
    },
    explain: ({ total, people, extra }) => (extra === '0' ? `${total} ÷ ${people}` : `${total} × (1 + ${extra}%) ÷ ${people}`),
  },
]
