export type MailLocale = 'vi' | 'en'
export type MailTemplate = 'otp' | 'test' | 'pro_expiring' | 'cloud_purge' | 'email_change_code' | 'email_changed_old' | 'email_changed_new'

export interface OtpPayload { code: string; locale: MailLocale; ttlMinutes: number }
export interface TestPayload { requestedBy: string; at: string }
/** Epoch seconds; `endsAt` is exclusive (midnight in Vietnam after the last day). */
export interface ProExpiringPayload { endsAt: number; siteUrl: string }
export interface CloudPurgePayload { purgeAt: number; items: number; siteUrl: string }
/** `self`: the person confirmed a code; `admin`: support moved the account for someone who lost the old mailbox. */
export type EmailChangedBy = 'self' | 'admin'
/** `newEmail` arrives masked: the old mailbox may no longer belong to the account holder. */
export interface EmailChangedOldPayload { newEmail: string; by: EmailChangedBy }
export interface EmailChangedNewPayload { by: EmailChangedBy; siteUrl: string }

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

const EMAIL_CHANGE_COPY: typeof OTP_COPY = {
  vi: {
    subject: 'Mã xác nhận đổi email Chuyện Nhỏ',
    intro: 'Có người muốn dùng địa chỉ này làm email đăng nhập tài khoản Chuyện Nhỏ. Mã xác nhận là:',
    expiry: OTP_COPY.vi.expiry,
    ignore: 'Nếu không phải bạn, hãy bỏ qua thư. Không có mã thì địa chỉ này không được gắn vào tài khoản nào.',
    never: OTP_COPY.vi.never,
  },
  en: {
    subject: 'Confirm your new Chuyện Nhỏ email',
    intro: 'Someone wants to use this address to sign in to a Chuyện Nhỏ account. The confirmation code is:',
    expiry: OTP_COPY.en.expiry,
    ignore: 'If this was not you, ignore this email. Without the code this address is not added to any account.',
    never: OTP_COPY.en.never,
  },
}

function renderCode(table: typeof OTP_COPY, payload: OtpPayload): RenderedMail {
  const copy = table[payload.locale] ?? table.vi
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

function renderEmailChangedOld(payload: EmailChangedOldPayload): RenderedMail {
  const admin = payload.by === 'admin'
  return renderBilingual('Email đăng nhập Chuyện Nhỏ đã đổi / Your Chuyện Nhỏ sign-in email has changed', [
    admin
      ? `Quản trị viên Chuyện Nhỏ vừa đổi email đăng nhập tài khoản của bạn sang ${payload.newEmail} theo một yêu cầu hỗ trợ.`
      : `Email đăng nhập tài khoản Chuyện Nhỏ của bạn vừa được đổi sang ${payload.newEmail}.`,
    'Từ nay địa chỉ này không còn dùng để đăng nhập tài khoản đó.',
    `Nếu bạn không yêu cầu việc này, hãy liên hệ ngay ${SUPPORT}.`,
  ], [
    admin
      ? `A Chuyện Nhỏ administrator has changed your account's sign-in email to ${payload.newEmail} following a support request.`
      : `The sign-in email of your Chuyện Nhỏ account has just been changed to ${payload.newEmail}.`,
    'This address no longer signs in to that account.',
    `If you did not ask for this, contact ${SUPPORT} right away.`,
  ])
}

function renderEmailChangedNew(payload: EmailChangedNewPayload): RenderedMail {
  const admin = payload.by === 'admin'
  return renderBilingual('Email đăng nhập Chuyện Nhỏ mới / Your new Chuyện Nhỏ sign-in email', [
    admin ? 'Quản trị viên Chuyện Nhỏ đã chuyển tài khoản của bạn sang địa chỉ email này theo yêu cầu hỗ trợ.' : 'Từ nay bạn đăng nhập Chuyện Nhỏ bằng địa chỉ email này.',
    `Không nhớ mật khẩu? Đặt mật khẩu mới bằng mã gửi tới địa chỉ này: ${payload.siteUrl}/dang-nhap?mode=reset`,
    `Nếu bạn không biết gì về việc này, hãy báo ${SUPPORT}.`,
  ], [
    admin ? 'A Chuyện Nhỏ administrator has moved your account to this email address following a support request.' : 'From now on you sign in to Chuyện Nhỏ with this email address.',
    `Forgot your password? Set a new one with a code sent to this address: ${payload.siteUrl}/en/dang-nhap?mode=reset`,
    `If you know nothing about this, tell ${SUPPORT}.`,
  ])
}

export function renderMail(template: MailTemplate, payload: unknown): RenderedMail {
  switch (template) {
    case 'otp': return renderCode(OTP_COPY, payload as OtpPayload)
    case 'email_change_code': return renderCode(EMAIL_CHANGE_COPY, payload as OtpPayload)
    case 'email_changed_old': return renderEmailChangedOld(payload as EmailChangedOldPayload)
    case 'email_changed_new': return renderEmailChangedNew(payload as EmailChangedNewPayload)
    case 'test': return renderTest(payload as TestPayload)
    case 'pro_expiring': return renderProExpiring(payload as ProExpiringPayload)
    case 'cloud_purge': return renderCloudPurge(payload as CloudPurgePayload)
  }
}
