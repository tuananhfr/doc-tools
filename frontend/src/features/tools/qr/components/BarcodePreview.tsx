import { Icon } from '@/components/ui'

interface BarcodePreviewProps {
  /** SVG của mã; null = chưa có gì để vẽ. */
  svg: string | null
  label: string
  placeholder: string
}

/** Xem trước bằng chính SVG sẽ tải về — nền trắng ở cả ba theme, như tem in ra. */
export function BarcodePreview({ svg, label, placeholder }: BarcodePreviewProps) {
  if (!svg) {
    return (
      <div className="erp-qr-preview erp-qr-preview--empty erp-barcode-preview--empty">
        <Icon name="upc" className="erp-qr-preview__icon" />
        <p className="erp-qr-preview__hint">{placeholder}</p>
      </div>
    )
  }
  return (
    <div className="erp-barcode-preview">
      <img className="erp-barcode-preview__code" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt={label} />
    </div>
  )
}
