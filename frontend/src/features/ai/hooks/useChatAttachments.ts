import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AiError, aiService } from '../services/ai.service'
import type { ChatAttachment } from '../types/ai.types'
import { ATTACHMENT_LIMITS, attachmentKind, decodeText } from '../utils/attachments'
import { randomUuid } from '../utils/chat-text'

export type AttachError = 'TYPE' | 'TOO_LARGE' | 'TEXT_TOO_LONG' | 'TOO_MANY' | 'NOT_TEXT' | 'LINK_FAILED'

const CONSENT_KEY = 'cn.ai.attachConsent'

function hasConsent() {
  try { return localStorage.getItem(CONSENT_KEY) === '1' } catch { return false }
}

function rememberConsent() {
  try { localStorage.setItem(CONSENT_KEY, '1') } catch { /* asked again next time */ }
}

/**
 * Files waiting in the composer. Images start uploading as soon as they are picked so sending is
 * instant; text files are only read. Uploads left behind (removed chip, page closed) are deleted.
 */
export function useChatAttachments() {
  const { t } = useTranslation('ai')
  const [items, setItems] = useState<ChatAttachment[]>([])
  const [error, setError] = useState<AttachError | null>(null)
  const itemsRef = useRef(items)
  // Object URLs stay alive while a sent message still shows them; all go when the chat unmounts.
  const previewsRef = useRef<string[]>([])

  useEffect(() => { itemsRef.current = items }, [items])

  useEffect(() => () => {
    for (const url of previewsRef.current) URL.revokeObjectURL(url)
    for (const item of itemsRef.current) if (item.kind === 'image' && item.uploadId) void aiService.removeUpload(item.uploadId).catch(() => undefined)
  }, [])

  const patch = useCallback((id: string, change: Partial<Extract<ChatAttachment, { kind: 'image' }>>) => {
    setItems((previous) => previous.map((item) => (item.id === id && item.kind === 'image' ? { ...item, ...change } : item)))
  }, [])

  const upload = useCallback((id: string, file: File) => {
    aiService.uploadImage(file)
      .then((result) => {
        // Removed while uploading: the server copy has no chip left to clean it up.
        if (!itemsRef.current.some((item) => item.id === id)) { void aiService.removeUpload(result.id).catch(() => undefined); return }
        patch(id, { status: 'ready', uploadId: result.id })
      })
      .catch((reason: unknown) => patch(id, { status: 'failed', error: reason instanceof AiError ? reason.code : 'UNKNOWN' }))
  }, [patch])

  const add = useCallback(async (files: File[]) => {
    if (!files.length) return
    setError(null)
    if (!hasConsent()) {
      if (!window.confirm(t('chat.attachConsent'))) return
      rememberConsent()
    }
    // Upload callbacks look chips up by id, so each chip is in the ref before its upload can settle.
    const append = (item: ChatAttachment) => {
      itemsRef.current = [...itemsRef.current, item]
      setItems(itemsRef.current)
    }
    for (const file of files) {
      if (itemsRef.current.length >= ATTACHMENT_LIMITS.maxFiles) { setError('TOO_MANY'); break }
      const kind = attachmentKind(file.name)
      if (!kind) { setError('TYPE'); continue }
      if (file.size > (kind === 'image' ? ATTACHMENT_LIMITS.imageBytes : ATTACHMENT_LIMITS.textBytes)) { setError('TOO_LARGE'); continue }
      const id = randomUuid()
      if (kind === 'image') {
        const previewUrl = URL.createObjectURL(file)
        previewsRef.current.push(previewUrl)
        append({ id, kind, name: file.name, size: file.size, previewUrl, status: 'uploading' })
        upload(id, file)
        continue
      }
      const content = decodeText(new Uint8Array(await file.arrayBuffer()))
      if (content === null) { setError('NOT_TEXT'); continue }
      if (content.length > ATTACHMENT_LIMITS.textChars) { setError('TEXT_TOO_LONG'); continue }
      append({ id, kind, name: file.name, size: file.size, content, status: 'ready' })
    }
  }, [t, upload])

  const remove = useCallback((id: string) => {
    const item = itemsRef.current.find((entry) => entry.id === id)
    itemsRef.current = itemsRef.current.filter((entry) => entry.id !== id)
    setItems(itemsRef.current)
    setError(null)
    if (item?.kind === 'image' && item.uploadId) void aiService.removeUpload(item.uploadId).catch(() => undefined)
  }, [])

  /** Hands the ready files to the sender and empties the composer; failed chips stay to be removed. */
  const take = useCallback(() => {
    const ready = itemsRef.current.filter((item) => item.status === 'ready')
    itemsRef.current = itemsRef.current.filter((item) => item.status !== 'ready')
    setItems(itemsRef.current)
    setError(null)
    return ready
  }, [])

  const busy = items.some((item) => item.status === 'uploading')
  const ready = items.filter((item) => item.status === 'ready')

  return { items, ready, busy, error, setError, add, remove, take }
}
