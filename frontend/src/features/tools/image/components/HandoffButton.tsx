import { useState } from 'react'
import { Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@/components/ui'
import { toolPathOf, useToolsBranch, type ToolScreen } from '@/features/tools/hub'
import { useToolOrigin } from '@/features/tools/hub/hooks/useToolOrigin'
import { handOff } from '@/features/tools/shared'

/** Màn nhận ảnh. Với hai màn này `id` công cụ trùng `screen`, nên một giá trị dùng cho cả đường dẫn lẫn khoá handoff. */
export type ImageHandoffTarget = Extract<ToolScreen, 'id-photo' | 'cv'>

const ICON: Record<ImageHandoffTarget, string> = { 'id-photo': 'person-badge', cv: 'person-vcard' }

/** Đưa ảnh kết quả sang công cụ khác mà không phải tải về rồi chọn lại (spec v3 WORKSPACE "Không upload lại"). */
export function HandoffButton({ target, label, file, disabled = false }: { target: ImageHandoffTarget; label: string; file: () => File | null | Promise<File | null>; disabled?: boolean }) {
  const navigate = useNavigate()
  const { base } = useToolsBranch()
  const { capture } = useToolOrigin()
  const [busy, setBusy] = useState(false)
  const send = async () => {
    setBusy(true)
    try {
      const picked = await file()
      if (!picked) return
      handOff(target, [picked])
      navigate(toolPathOf(base, target), { state: capture() })
    } finally {
      setBusy(false)
    }
  }
  return <Button variant="outline-secondary" disabled={disabled || busy} onClick={() => void send()}><Icon name={ICON[target]} className="me-2" />{label}</Button>
}
