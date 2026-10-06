import { Icon } from '@/components/ui/Icon'

interface ToolSearchProps {
  id: string
  keyword: string
  onKeyword: (keyword: string) => void
  onSubmit?: () => void
  placeholder?: string
  label?: string
}

export function ToolSearch({ id, keyword, onKeyword, onSubmit, placeholder = 'Tìm công cụ… (ví dụ: ghép PDF, QR, OCR)', label = 'Tìm công cụ' }: ToolSearchProps) {
  return (
    <form className="cn-tool-search" role="search" onSubmit={(event) => { event.preventDefault(); onSubmit?.() }}>
      <label className="visually-hidden" htmlFor={id}>{label}</label>
      <Icon name="search" />
      <input id={id} name="q" type="search" placeholder={placeholder} autoComplete="off" value={keyword} onChange={(event) => onKeyword(event.target.value)} />
      {keyword ? <button className="cn-search-clear" type="button" aria-label="Xoá từ khoá" onClick={() => onKeyword('')}><Icon name="x-lg" /></button> : null}
      <button className="cn-search-submit" type="submit">Tìm ngay</button>
    </form>
  )
}
