import { describe, expect, it } from 'vitest'
import { attachmentKind, composeMessage, decodeText, fileBlock, splitUserMessage, toChatMedia } from './attachments'
import { toChatMessages } from './chat-text'

describe('attachment kinds', () => {
  it('takes images and plain text only', () => {
    expect(attachmentKind('Ảnh.JPG')).toBe('image')
    expect(attachmentKind('bang-luong.csv')).toBe('text')
    expect(attachmentKind('hop-dong.pdf')).toBeNull()
    expect(attachmentKind('.png')).toBeNull()
    expect(attachmentKind('noext')).toBeNull()
  })

  it('reads strict UTF-8 and refuses binaries', () => {
    expect(decodeText(new TextEncoder().encode('Tiền điện'))).toBe('Tiền điện')
    expect(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, 0x61]))).toBe('a')
    expect(decodeText(new Uint8Array([0x4d, 0x5a, 0x00, 0x01]))).toBeNull()
    expect(decodeText(new Uint8Array([0xc3, 0x28]))).toBeNull()
  })
})

describe('text files inside the message', () => {
  it('wraps a file in a fence it cannot close', () => {
    expect(fileBlock('a.md', 'x\n')).toBe('```cn-file name="a.md"\nx\n```')
    const tricky = fileBlock('b"`\n.md', 'code:\n```\nrun\n```')
    expect(tricky.startsWith('````cn-file name="b.md"\n')).toBe(true)
    expect(tricky.endsWith('\n````')).toBe(true)
  })

  it('round-trips through the stored message', () => {
    const message = composeMessage('  Tóm tắt giúp tôi  ', [{ name: 'a.csv', content: 'x,y\n1,2' }, { name: 'b.md', content: '```\nz\n```' }])
    // GoClaw prepends its media tags when images came along.
    const stored = `<media:image id="1">\n<media:image>\n\n${message}`
    expect(splitUserMessage(stored)).toEqual({ text: 'Tóm tắt giúp tôi', files: [{ name: 'a.csv', lines: 2 }, { name: 'b.md', lines: 3 }] })
    expect(composeMessage('', [{ name: 'a.txt', content: 'x' }])).toBe('```cn-file name="a.txt"\nx\n```')
    expect(splitUserMessage('plain <media:image> mention')).toEqual({ text: 'plain <media:image> mention', files: [] })
  })
})

describe('media in history', () => {
  it('links only signed GoClaw file paths', () => {
    const refs = [
      { kind: 'image', mime_type: 'image/png', path: '/v1/files/app/ws/.uploads/%E1%BA%A3nh.png?ft=abc' },
      { kind: 'document', path: '/v1/files/app/ws/report.txt?ft=x' },
      { kind: 'image', path: 'javascript:alert(1)' },
      { kind: 'image', path: 'https://evil.test/a.png' },
    ]
    expect(toChatMedia(refs, 'https://goclaw.test/')).toEqual([
      { kind: 'image', url: 'https://goclaw.test/v1/files/app/ws/.uploads/%E1%BA%A3nh.png?ft=abc', name: 'ảnh.png' },
      { kind: 'file', url: 'https://goclaw.test/v1/files/app/ws/report.txt?ft=x', name: 'report.txt' },
    ])
    expect(toChatMedia(refs, '')).toEqual([])
    // GoClaw's own naming: `<uuid>.<ext>` without a filename, `<stem>-<8 hex>.<ext>` with one.
    const named = toChatMedia([
      { kind: 'image', path: '/v1/files/ws/.uploads/0b7c2f4e-1d2a-4c3b-9e8f-0123456789ab.jpg?ft=a' },
      { kind: 'image', path: '/v1/files/ws/.uploads/hoa-don-1a2b3c4d.jpg?ft=b' },
    ], 'https://goclaw.test')
    expect(named.map((media) => media.name)).toEqual(['', 'hoa-don.jpg'])
    const [message] = toChatMessages([{ role: 'user', content: '<media:image>', media_refs: refs.slice(0, 1) }], () => 'm1', 'https://goclaw.test')
    expect(message.media).toHaveLength(1)
  })
})
