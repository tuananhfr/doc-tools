export type MailLocale = 'vi' | 'en'
export type MailTemplate = 'otp'

export interface OtpPayload { code: string; locale: MailLocale; ttlMinutes: number }

export interface RenderedMail { subject: string; text: string; html: string }

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
}

const OTP_COPY = {
  vi: {
    subject: 'Mã đăng nhập Chuyện Nhỏ',
    intro: 'Mã đăng nhập Chuyện Nhỏ của bạn là:',
    expiry: (minutes: number) => `Mã có hiệu lực trong ${minutes} phút và chỉ dùng được một lần.`,
    ignore: 'Nếu bạn không yêu cầu mã này, hãy bỏ qua thư. Không ai đăng nhập được nếu không có mã.',
    never: 'Chuyện Nhỏ không bao giờ hỏi mã này qua điện thoại hay tin nhắn.',
  },
  en: {
    subject: 'Your Chuyện Nhỏ sign-in code',
    intro: 'Your Chuyện Nhỏ sign-in code is:',
    expiry: (minutes: number) => `The code is valid for ${minutes} minutes and works only once.`,
    ignore: 'If you did not request this code, you can ignore this email. Nobody can sign in without it.',
    never: 'Chuyện Nhỏ will never ask for this code by phone or message.',
  },
}

function renderOtp(payload: OtpPayload): RenderedMail {
  const copy = OTP_COPY[payload.locale] ?? OTP_COPY.vi
  const expiry = copy.expiry(payload.ttlMinutes)
  const text = [copy.intro, '', payload.code, '', expiry, copy.ignore, copy.never].join('\n')
  const html = `<!doctype html><html lang="${payload.locale}"><body style="margin:0;padding:24px;background:#f4f6fa;font-family:Arial,Helvetica,sans-serif;color:#1d2433">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px">
<tr><td style="font-size:16px;line-height:24px">${escapeHtml(copy.intro)}</td></tr>
<tr><td style="padding:20px 0;font-size:32px;font-weight:700;letter-spacing:8px;font-family:Consolas,Menlo,monospace">${escapeHtml(payload.code)}</td></tr>
<tr><td style="font-size:14px;line-height:22px;color:#4a5468">${escapeHtml(expiry)}<br>${escapeHtml(copy.ignore)}<br>${escapeHtml(copy.never)}</td></tr>
</table></td></tr></table></body></html>`
  return { subject: copy.subject, text, html }
}

export function renderMail(template: MailTemplate, payload: unknown): RenderedMail {
  switch (template) {
    case 'otp': return renderOtp(payload as OtpPayload)
  }
}
