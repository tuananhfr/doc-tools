import { useEffect, useState } from 'react'
import { Button } from 'react-bootstrap'
import { Icon, useToast } from '@/components/ui'
import { copyText } from '../utils/clipboard'

interface CopyButtonProps {
  /** Chữ sẽ chép; rỗng = nút bị khoá. */
  text: string
  label?: string
  /** Chỉ vẽ icon (hàng trong danh sách) — khi đó `label` thành `aria-label`. */
  iconOnly?: boolean
  variant?: string
  size?: 'sm'
  className?: string
}

/** Nút "Sao chép" tự báo đã chép ngay trên nút — không bật toast cho một việc xảy ra hàng chục lần. */
export function CopyButton({ text, label = 'Sao chép', iconOnly, variant = 'outline-secondary', size, className }: CopyButtonProps) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    if (await copyText(text)) setCopied(true)
    else toast.error('Trình duyệt không cho sao chép. Bôi đen đoạn chữ rồi nhấn Ctrl+C.')
  }

  const shown = copied ? 'Đã chép' : label

  return (
    <Button
      variant={variant}
      size={size}
      className={`erp-tool-copy${iconOnly ? ' erp-tool-copy--icon' : ''}${className ? ` ${className}` : ''}`}
      disabled={text === ''}
      aria-label={iconOnly ? shown : undefined}
      title={iconOnly ? shown : undefined}
      onClick={() => void copy()}
    >
      <Icon name={copied ? 'check2' : 'copy'} className={iconOnly ? undefined : 'me-2'} />
      {iconOnly ? null : shown}
      {/* Nút chỉ có icon vẫn phải báo cho trình đọc màn hình biết đã chép. */}
      {iconOnly ? (
        <span className="visually-hidden" role="status">
          {copied ? 'Đã chép' : ''}
        </span>
      ) : null}
    </Button>
  )
}
