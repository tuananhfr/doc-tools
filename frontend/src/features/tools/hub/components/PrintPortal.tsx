import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

const HOST_CLASS = 'erp-print-host'

/**
 * Đưa nội dung chỉ-để-in ra thẳng dưới `<body>`; lúc in, mọi thứ khác bị `display: none`.
 * Cách cũ (`visibility: hidden` + `position: absolute`) để bản in nằm trong khung cuộn
 * `overflow: hidden` của vỏ trang → in ra trang trắng hoặc bị cắt sau trang đầu.
 */
export function PrintPortal({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null)
  useEffect(() => {
    const element = document.createElement('div')
    element.className = 'erp-print-portal'
    document.body.appendChild(element)
    document.body.classList.add(HOST_CLASS)
    setHost(element)
    return () => {
      element.remove()
      if (!document.querySelector('.erp-print-portal')) document.body.classList.remove(HOST_CLASS)
    }
  }, [])
  return host ? createPortal(children, host) : null
}
