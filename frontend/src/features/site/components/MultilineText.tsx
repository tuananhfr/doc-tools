import { Fragment } from 'react'

/** Chữ viết tay trong mockup ngắt dòng có chủ ý; config giữ chỗ ngắt bằng `\n`. */
export function MultilineText({ text }: { text: string }) {
  return text.split('\n').map((line, index) => <Fragment key={line}>{index > 0 ? <br /> : null}{line}</Fragment>)
}
