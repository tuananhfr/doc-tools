/** Nhóm phép tính tiền — mỗi nhóm một thẻ trên màn. */
export type MoneyGroup = 'percent' | 'tax' | 'profit' | 'split'

/** `money` in kiểu tiền, `percent` kèm dấu %, `count` là số nguyên đếm được (người). */
export type MoneyUnit = 'money' | 'percent' | 'count'

export interface MoneyInput {
  key: string
  label: string
  unit: MoneyUnit
  placeholder?: string
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
  label: string
  inputs: MoneyInput[]
  /** Dòng đầu là kết quả chính. Trả về chuỗi = số hợp lệ nhưng phép tính không có nghĩa (chia cho 0). */
  compute: (values: Record<string, number>) => MoneyRow[] | string
  /** Phép tính in ra cho người dùng soát, dựng từ các số ĐÃ định dạng. */
  explain: (values: Record<string, string>) => string
}

export const MONEY_GROUPS: { value: MoneyGroup; label: string; icon: string }[] = [
  { value: 'percent', label: 'Phần trăm', icon: 'percent' },
  { value: 'tax', label: 'Thuế & chiết khấu', icon: 'receipt' },
  { value: 'profit', label: 'Lãi gộp', icon: 'graph-up-arrow' },
  { value: 'split', label: 'Chia tiền', icon: 'people' },
]

const money = (key: string, label: string, placeholder?: string): MoneyInput => ({ key, label, unit: 'money', placeholder })
const percent = (key: string, label: string, placeholder?: string): MoneyInput => ({ key, label, unit: 'percent', placeholder })

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
    label: 'X% của một số',
    inputs: [percent('rate', 'Tỷ lệ'), money('base', 'Của số')],
    compute: ({ rate, base }) => [{ label: 'Kết quả', value: (base * rate) / 100, unit: 'money' }],
    explain: ({ rate, base }) => `${base} × ${rate}%`,
  },
  {
    id: 'percent-ratio',
    version: 1,
    group: 'percent',
    label: 'A bằng bao nhiêu % của B',
    inputs: [money('part', 'Số A'), money('whole', 'Số B')],
    compute: ({ part, whole }) => (whole === 0 ? 'Số B phải khác 0.' : [{ label: 'A so với B', value: (part / whole) * 100, unit: 'percent' }]),
    explain: ({ part, whole }) => `${part} ÷ ${whole} × 100`,
  },
  {
    id: 'percent-change',
    version: 1,
    group: 'percent',
    label: 'Tăng / giảm bao nhiêu %',
    inputs: [money('from', 'Giá trị cũ'), money('to', 'Giá trị mới')],
    compute: ({ from, to }) =>
      from === 0
        ? 'Giá trị cũ phải khác 0.'
        : [
            { label: to >= from ? 'Tăng' : 'Giảm', value: (Math.abs(to - from) / from) * 100, unit: 'percent' },
            { label: 'Chênh lệch', value: to - from, unit: 'money' },
          ],
    explain: ({ from, to }) => `(${to} − ${from}) ÷ ${from} × 100`,
  },
  {
    id: 'vat-add',
    version: 1,
    group: 'tax',
    label: 'Cộng thuế vào giá chưa thuế',
    inputs: [money('net', 'Giá chưa thuế'), percent('rate', 'Thuế suất', 'Tự nhập')],
    compute: ({ net, rate }) => {
      const tax = (net * rate) / 100
      return [
        { label: 'Giá đã gồm thuế', value: net + tax, unit: 'money' },
        { label: 'Tiền thuế', value: tax, unit: 'money' },
      ]
    },
    explain: ({ net, rate }) => `${net} × (1 + ${rate}%)`,
  },
  {
    id: 'vat-extract',
    version: 1,
    group: 'tax',
    label: 'Tách thuế khỏi giá đã gồm thuế',
    inputs: [money('gross', 'Giá đã gồm thuế'), percent('rate', 'Thuế suất', 'Tự nhập')],
    compute: ({ gross, rate }) => {
      const net = gross / (1 + rate / 100)
      return [
        { label: 'Giá chưa thuế', value: net, unit: 'money' },
        { label: 'Tiền thuế', value: gross - net, unit: 'money' },
      ]
    },
    explain: ({ gross, rate }) => `${gross} ÷ (1 + ${rate}%)`,
  },
  {
    id: 'discount',
    version: 1,
    group: 'tax',
    label: 'Chiết khấu / giảm giá',
    inputs: [money('price', 'Giá gốc'), percent('rate', 'Chiết khấu')],
    compute: ({ price, rate }) => {
      if (rate > 100) return 'Chiết khấu không quá 100%.'
      const off = (price * rate) / 100
      return [
        { label: 'Giá sau chiết khấu', value: price - off, unit: 'money' },
        { label: 'Số tiền được giảm', value: off, unit: 'money' },
      ]
    },
    explain: ({ price, rate }) => `${price} × (1 − ${rate}%)`,
  },
  {
    id: 'margin',
    version: 1,
    group: 'profit',
    label: 'Lãi gộp từ giá vốn và giá bán',
    inputs: [money('cost', 'Giá vốn'), money('price', 'Giá bán')],
    compute: ({ cost, price }) => {
      if (price === 0) return 'Giá bán phải lớn hơn 0.'
      if (cost === 0) return 'Giá vốn phải lớn hơn 0.'
      const profit = price - cost
      return [
        { label: 'Biên lợi nhuận (margin, trên giá bán)', value: (profit / price) * 100, unit: 'percent' },
        { label: 'Markup (trên giá vốn)', value: (profit / cost) * 100, unit: 'percent' },
        { label: 'Lãi gộp', value: profit, unit: 'money' },
      ]
    },
    explain: ({ cost, price }) => `(${price} − ${cost}) ÷ ${price} × 100`,
  },
  {
    id: 'price-from-margin',
    version: 1,
    group: 'profit',
    label: 'Giá bán từ giá vốn và margin',
    inputs: [money('cost', 'Giá vốn'), percent('margin', 'Margin mong muốn')],
    compute: ({ cost, margin }) => {
      // Margin 100% nghĩa là giá vốn bằng 0 — không có giá bán nào đạt được.
      if (margin >= 100) return 'Margin phải nhỏ hơn 100%.'
      const price = cost / (1 - margin / 100)
      return [
        { label: 'Giá bán', value: price, unit: 'money' },
        { label: 'Lãi gộp', value: price - cost, unit: 'money' },
        { label: 'Markup tương ứng', value: cost === 0 ? 0 : ((price - cost) / cost) * 100, unit: 'percent' },
      ]
    },
    explain: ({ cost, margin }) => `${cost} ÷ (1 − ${margin}%)`,
  },
  {
    id: 'price-from-markup',
    version: 1,
    group: 'profit',
    label: 'Giá bán từ giá vốn và markup',
    inputs: [money('cost', 'Giá vốn'), percent('markup', 'Markup mong muốn')],
    compute: ({ cost, markup }) => {
      const price = cost * (1 + markup / 100)
      return [
        { label: 'Giá bán', value: price, unit: 'money' },
        { label: 'Lãi gộp', value: price - cost, unit: 'money' },
        { label: 'Margin tương ứng', value: price === 0 ? 0 : ((price - cost) / price) * 100, unit: 'percent' },
      ]
    },
    explain: ({ cost, markup }) => `${cost} × (1 + ${markup}%)`,
  },
  {
    id: 'split',
    version: 1,
    group: 'split',
    label: 'Chia đều một khoản tiền',
    inputs: [money('total', 'Tổng tiền'), { key: 'people', label: 'Số người', unit: 'count' }, { ...percent('extra', 'Phụ phí / tip'), optional: true, placeholder: '0' }],
    compute: ({ total, people, extra }) => {
      const due = total * (1 + extra / 100)
      const each = due / people
      const rounded = Math.ceil(each / ROUND_UP_TO) * ROUND_UP_TO
      return [
        { label: 'Mỗi người', value: each, unit: 'money' },
        { label: 'Tổng phải trả', value: due, unit: 'money' },
        { label: 'Mỗi người, làm tròn lên nghìn', value: rounded, unit: 'money' },
        { label: 'Dư ra khi thu tròn', value: rounded * people - due, unit: 'money' },
      ]
    },
    explain: ({ total, people, extra }) => (extra === '0' ? `${total} ÷ ${people}` : `${total} × (1 + ${extra}%) ÷ ${people}`),
  },
]
