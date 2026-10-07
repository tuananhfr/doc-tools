import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/Skeleton'
import { AI_SETTINGS_PATH } from '../config/ai-routes'
import { useAgentChat } from '../hooks/useAgentChat'
import { useAgentConnection } from '../hooks/useAgentConnection'
import { CONNECTION_STATES } from '../types/ai.types'
import { ChatMessageBody } from './ChatMessageBody'

const MAX_MESSAGE_LENGTH = 4000
// Follow new text only while the reader is already at the bottom; scrolling up to reread must not be yanked back.
const STICKY_BOTTOM_PX = 80

export interface ChatStarter {
  /** A new id sends again; the same id is sent once. */
  id: number
  text: string
  beforeSend?: (sessionKey: string) => Promise<unknown> | void
}

interface AgentChatProps {
  /** Keeps the embedded chat's open session apart from the assistant page's. */
  storageKey?: string
  /** Inside a tool page: no session picker, the host decides when a conversation starts. */
  embedded?: boolean
  starter?: ChatStarter | null
  /** After every finished turn; the agent may have written something the host shows. */
  onTurnEnd?: () => void
  emptyTitle?: string
  emptyText?: string
  placeholder?: string
}

export function AgentChat({ storageKey, embedded = false, starter = null, onTurnEnd, emptyTitle, emptyText, placeholder }: AgentChatProps) {
  const { t } = useTranslation('ai')
  const hint = placeholder ?? t('chat.placeholder')
  const connection = useAgentConnection(true)
  const chat = useAgentChat(connection.client, connection.connected, { storageKey })
  const [draft, setDraft] = useState('')
  const threadRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef(true)
  const startedRef = useRef<number | null>(null)
  const streamingRef = useRef(false)
  const turnEndRef = useRef(onTurnEnd)
  useEffect(() => { turnEndRef.current = onTurnEnd }, [onTurnEnd])

  useEffect(() => {
    const thread = threadRef.current
    if (thread && stickRef.current) thread.scrollTop = thread.scrollHeight
  }, [chat.messages, chat.streaming])

  useEffect(() => {
    if (streamingRef.current && !chat.streaming) turnEndRef.current?.()
    streamingRef.current = chat.streaming
  }, [chat.streaming])

  useEffect(() => {
    if (!starter || startedRef.current === starter.id || !connection.connected || !chat.restored || chat.streaming) return
    startedRef.current = starter.id
    stickRef.current = true
    void chat.startWith(starter.text, starter.beforeSend)
  }, [starter, connection.connected, chat.restored, chat.streaming, chat.startWith])

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    const text = draft.trim()
    if (!text || chat.streaming || !connection.connected) return
    setDraft('')
    stickRef.current = true
    void chat.send(text)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Vietnamese IMEs (Telex/VNI) confirm a syllable with Enter; sending mid-composition cuts the word.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) submit(event)
  }

  const { state, ticketError } = connection
  const knownSession = chat.sessions.some((session) => session.key === chat.sessionKey)
  const lastMessage = chat.messages[chat.messages.length - 1]
  const waitingFirstChunk = chat.streaming && lastMessage?.role !== 'assistant'

  // Between connecting and reopening the stored session the thread is not empty yet, only unknown.
  const restoring = connection.connected && !chat.restored && !chat.messages.length

  return (
    <div className={`cn-ai-chat${embedded ? ' is-embedded' : ''}`}>
      {embedded ? null : <div className="cn-ai-chat__bar">
        <label className="cn-ai-chat__sessions">
          <span className="visually-hidden">{t('chat.history')}</span>
          <select
            className="form-select cn-input"
            value={chat.sessionKey}
            disabled={!connection.connected || chat.streaming}
            onChange={(event) => void chat.openSession(event.target.value)}
          >
            <option value="">{t('chat.newChat')}</option>
            {chat.sessionKey && !knownSession ? <option value={chat.sessionKey}>{t('chat.untitled')}</option> : null}
            {chat.sessions.map((session) => <option key={session.key} value={session.key}>{session.label || t('chat.untitled')}</option>)}
          </select>
        </label>
        <button type="button" className="cn-button cn-button--ghost" disabled={!connection.connected || chat.streaming || !chat.sessionKey} onClick={chat.startNewSession}>
          <Icon name="plus-lg" />{t('chat.newChat')}
        </button>
      </div>}

      {state === CONNECTION_STATES.failed ? (
        <div className="cn-ai-chat__notice is-bad" role="alert">
          <Icon name="exclamation-octagon" />
          <div>
            <p>{ticketError ? t(`errors.${ticketError}`) : t('chat.failed')}</p>
            <div className="cn-ai-chat__notice-actions">
              <button type="button" className="cn-link-button" onClick={connection.retry}><Icon name="arrow-clockwise" />{t('chat.retry')}</button>
              {ticketError === 'AI_NOT_READY' || ticketError === 'AI_NO_PROVIDER' ? <Link className="cn-link-button" to={AI_SETTINGS_PATH}><Icon name="key" />{t('chat.settings')}</Link> : null}
            </div>
          </div>
        </div>
      ) : state === CONNECTION_STATES.disconnected ? (
        <p className="cn-ai-chat__notice is-warn" role="status"><Icon name="wifi-off" />{t('chat.offline')}</p>
      ) : null}

      <div
        ref={threadRef}
        className="cn-ai-chat__thread"
        aria-live="polite"
        aria-busy={chat.streaming || chat.loadingHistory || restoring}
        onScroll={(event) => {
          const thread = event.currentTarget
          stickRef.current = thread.scrollHeight - thread.scrollTop - thread.clientHeight < STICKY_BOTTOM_PX
        }}
      >
        {!connection.connected && state !== CONNECTION_STATES.failed && !chat.messages.length ? (
          <p className="cn-ai-chat__connecting"><span className="cn-ai-dots" aria-hidden="true"><span /><span /><span /></span>{t('chat.connecting')}</p>
        ) : chat.loadingHistory || restoring ? (
          <Skeleton rows={4} title={false} />
        ) : !chat.messages.length ? (
          <div className="cn-ai-chat__empty">
            <span className="cn-ai-chat__empty-icon"><Icon name="stars" /></span>
            <h3>{emptyTitle ?? t('chat.emptyTitle')}</h3>
            <p>{emptyText ?? t('chat.emptyText')}</p>
          </div>
        ) : (
          chat.messages.map((message) => (
            <article key={message.id} className={`cn-ai-message is-${message.role}`}>
              {message.role === 'user' ? <p>{message.content}</p> : <ChatMessageBody content={message.content} />}
              {message.streaming ? <span className="cn-ai-caret" aria-hidden="true" /> : null}
            </article>
          ))
        )}
        {waitingFirstChunk ? (
          <p className="cn-ai-chat__thinking" role="status"><span className="cn-ai-dots" aria-hidden="true"><span /><span /><span /></span>{t('chat.thinking')}</p>
        ) : null}
      </div>

      {chat.failed ? <p className="cn-form-error" role="alert"><Icon name="exclamation-circle" />{chat.messages.length ? t('chat.sendFailed') : t('chat.loadFailed')}</p> : null}

      <form className="cn-ai-chat__composer" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="cn-ai-draft">{hint}</label>
        <textarea
          id="cn-ai-draft"
          className="form-control cn-input"
          rows={2}
          maxLength={MAX_MESSAGE_LENGTH}
          value={draft}
          placeholder={hint}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {chat.streaming ? (
          <button type="button" className="cn-button cn-button--navy" onClick={() => void chat.abort().catch(() => undefined)}><Icon name="stop-fill" />{t('chat.stop')}</button>
        ) : (
          <button type="submit" className="cn-button" disabled={!connection.connected || !draft.trim()}><Icon name="send" />{t('chat.send')}</button>
        )}
      </form>
      <p className="cn-ai-chat__disclaimer"><Icon name="info-circle" />{t('chat.disclaimer')}</p>
    </div>
  )
}
