import { Fragment } from 'react'
import { inlineParts, splitFences } from '../utils/chat-text'
import { parseCnAction } from '../utils/cn-action'
import { CnActionButton } from './CnActionButton'

function InlineText({ text }: { text: string }) {
  return inlineParts(text).map((part, index) => {
    if (part.kind === 'strong') return <strong key={index}>{part.text}</strong>
    if (part.kind === 'code') return <code key={index}>{part.text}</code>
    if (part.kind === 'link') return <a key={index} href={part.href} target="_blank" rel="noopener noreferrer nofollow">{part.text}</a>
    return <Fragment key={index}>{part.text}</Fragment>
  })
}

function Prose({ text }: { text: string }) {
  return text.trim().split(/\n{2,}/).map((block, index) => {
    const lines = block.split('\n')
    const items = lines.filter((line) => /^\s*(?:[-*•]|\d+[.)])\s+/.test(line))
    // A block made only of list lines reads better as a list; mixed blocks stay as written.
    if (items.length && items.length === lines.length) {
      const ordered = /^\s*\d/.test(lines[0])
      const List = ordered ? 'ol' : 'ul'
      return <List key={index}>{lines.map((line, row) => <li key={row}><InlineText text={line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '')} /></li>)}</List>
    }
    const heading = /^#{1,4}\s+(.*)$/.exec(block)
    if (heading && lines.length === 1) return <p key={index} className="cn-ai-message__heading"><InlineText text={heading[1]} /></p>
    return <p key={index}>{lines.map((line, row) => <Fragment key={row}>{row ? <br /> : null}<InlineText text={line} /></Fragment>)}</p>
  })
}

/** Renders a reply as React nodes only: model text never reaches the page as HTML. */
export function ChatMessageBody({ content }: { content: string }) {
  return splitFences(content).map((part, index) => {
    if (part.kind === 'text') return <Prose key={index} text={part.text} />
    if (part.lang === 'cn-action') {
      const action = parseCnAction(part.text)
      return action ? <CnActionButton key={index} action={action} /> : null
    }
    return <pre key={index} className="cn-ai-message__code"><code>{part.text}</code></pre>
  })
}
