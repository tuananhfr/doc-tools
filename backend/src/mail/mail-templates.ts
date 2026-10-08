export type MailLocale = 'vi' | 'en'
export type MailTemplate = 'otp' | 'test' | 'pro_expiring' | 'cloud_purge'

export interface OtpPayload { code: string; locale: MailLocale; ttlMinutes: number }
export interface TestPayload { requestedBy: string; at: string }
/** Epoch seconds; `endsAt` is exclusive (midnight in Vietnam after the last day). */
export interface ProExpiringPayload { endsAt: number; siteUrl: string }
export interface CloudPurgePayload { purgeAt: number; items: number; siteUrl: string }

export interface RenderedMail { subject: string; text: string; html: string }

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
}

const OTP_COPY = {
  vi: {
    subject: 'Mã xác nhận Chuyện Nhỏ',
    intro: 'Mã xác nhận để tạo tài khoản hoặc đặt lại mật khẩu Chuyện Nhỏ của bạn là:',
    expiry: (minutes: number) => `Mã có hiệu lực trong ${minutes} phút và chỉ dùng được một lần.`,
    ignore: 'Nếu bạn không yêu cầu mã này, hãy bỏ qua thư. Không ai đổi được mật khẩu của bạn nếu không có mã.',
    never: 'Chuyện Nhỏ không bao giờ hỏi mã này qua điện thoại hay tin nhắn.',
  },
  en: {
    subject: 'Your Chuyện Nhỏ confirmation code',
    intro: 'Your code to create a Chuyện Nhỏ account or reset its password is:',
    expiry: (minutes: number) => `The code is valid for ${minutes} minutes and works only once.`,
    ignore: 'If you did not request this code, you can ignore this email. Nobody can change your password without it.',
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

function renderTest(payload: TestPayload): RenderedMail {
  const lines = ['Đây là thư thử của Chuyện Nhỏ.', `Người yêu cầu: ${payload.requestedBy}`, `Thời điểm: ${payload.at}`, '', 'Thư đến được hộp thư (không vào Spam) nghĩa là cấu hình gửi thư đang ổn.']
  const html = `<!doctype html><html lang="vi"><body style="margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#1d2433">${lines.map((line) => `<p style="margin:0 0 8px">${escapeHtml(line) || '&nbsp;'}</p>`).join('')}</body></html>`
  return { subject: 'Thư thử Chuyện Nhỏ', text: lines.join('\n'), html }
}

const SUPPORT = 'contact@lpc.vn'

function day(seconds: number, locale: MailLocale) {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', { dateStyle: 'long', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(seconds * 1000))
}

/** Accounts do not store a language, so account notices carry Vietnamese first and English below. */
function renderBilingual(subject: string, vi: string[], en: string[]): RenderedMail {
  const block = (lines: string[], lang: MailLocale) => `<div lang="${lang}">${lines.map((line) => `<p style="margin:0 0 10px;font-size:15px;line-height:23px">${escapeHtml(line) || '&nbsp;'}</p>`).join('')}</div>`
  const html = `<!doctype html><html lang="vi"><body style="margin:0;padding:24px;background:#f4f6fa;font-family:Arial,Helvetica,sans-serif;color:#1d2433">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px">
<tr><td>${block(vi, 'vi')}<hr style="border:0;border-top:1px solid #e3e7ef;margin:20px 0">${block(en, 'en')}</td></tr>
</table></td></tr></table></body></html>`
  return { subject, text: [...vi, '', '---', '', ...en].join('\n'), html }
}

function renderProExpiring(payload: ProExpiringPayload): RenderedMail {
  const last = payload.endsAt - 1
  return renderBilingual('Gói Pro Chuyện Nhỏ sắp hết hạn / Your Chuyện Nhỏ Pro plan ends soon', [
    `Gói Pro của bạn dùng được tới hết ngày ${day(last, 'vi')}.`,
    `Muốn gia hạn, hãy trả lời thư này hoặc viết tới ${SUPPORT}.`,
    'Nếu không gia hạn: trợ lý AI dừng, các mục đã lưu chuyển sang chỉ đọc và được giữ thêm 90 ngày rồi mới xoá. Các công cụ miễn phí vẫn dùng bình thường.',
    `Tài khoản: ${payload.siteUrl}/tai-khoan`,
  ], [
    `Your Pro plan is active until the end of ${day(last, 'en')}.`,
    `To renew, reply to this email or write to ${SUPPORT}.`,
    'Without renewal, the AI assistant stops and saved items become read-only; they are kept for 90 more days before deletion. Free tools keep working as usual.',
    `Account: ${payload.siteUrl}/en/tai-khoan`,
  ])
}

function renderCloudPurge(payload: CloudPurgePayload): RenderedMail {
  return renderBilingual('Mục đã lưu trên Chuyện Nhỏ sắp bị xoá / Your saved items on Chuyện Nhỏ will be deleted', [
    `Gói Pro của bạn đã hết. ${payload.items} mục đã lưu (kết quả và công cụ yêu thích) sẽ bị xoá từ ngày ${day(payload.purgeAt, 'vi')}.`,
    `Bạn vẫn mở được chúng để xem hoặc chép lại trước ngày đó tại ${payload.siteUrl}/tai-khoan/da-luu.`,
    `Gia hạn Pro trước ngày đó thì mọi mục được giữ nguyên. Liên hệ: ${SUPPORT}.`,
  ], [
    `Your Pro plan has ended. ${payload.items} saved items (results and favourite tools) will be deleted from ${day(payload.purgeAt, 'en')}.`,
    `You can still open them to read or copy before then at ${payload.siteUrl}/en/tai-khoan/da-luu.`,
    `Renew Pro before that date and everything stays. Contact: ${SUPPORT}.`,
  ])
}

export function renderMail(template: MailTemplate, payload: unknown): RenderedMail {
  switch (template) {
    case 'otp': return renderOtp(payload as OtpPayload)
    case 'test': return renderTest(payload as TestPayload)
    case 'pro_expiring': return renderProExpiring(payload as ProExpiringPayload)
    case 'cloud_purge': return renderCloudPurge(payload as CloudPurgePayload)
  }
}
