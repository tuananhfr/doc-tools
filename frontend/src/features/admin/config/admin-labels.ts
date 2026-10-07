import type { ContributionStatus, MailStatus, StaffRole, Transition } from '../types/admin.types'

export type Tone = 'neutral' | 'info' | 'positive' | 'warning' | 'danger'

export const ROLE_LABEL: Record<StaffRole, string> = { owner: 'Chủ hệ thống', admin: 'Quản trị viên', reviewer: 'Người duyệt' }
export const ROLE_HELP: Record<StaffRole, string> = {
  owner: 'Toàn quyền, gồm cài đặt hệ thống, phân quyền và nhật ký.',
  admin: 'Người dùng, gói Pro, email, tài khoản AI, thống kê, duyệt đề xuất.',
  reviewer: 'Chỉ duyệt đề xuất và xem thống kê.',
}

export const CONTRIBUTION_STATUS: Record<ContributionStatus, { label: string; icon: string; tone: Tone }> = {
  NEEDS_SOURCE: { label: 'Chờ nguồn', icon: 'link-45deg', tone: 'warning' },
  NEEDS_REVIEW: { label: 'Chờ xác minh', icon: 'hourglass-split', tone: 'info' },
  VERIFIED: { label: 'Đã xác minh', icon: 'check2', tone: 'info' },
  APPROVED: { label: 'Đã phê duyệt', icon: 'check2-all', tone: 'info' },
  PUBLISHED: { label: 'Đã công bố', icon: 'megaphone', tone: 'positive' },
  REJECTED: { label: 'Từ chối', icon: 'x-circle', tone: 'danger' },
  SUPERSEDED: { label: 'Bị thay thế', icon: 'arrow-repeat', tone: 'neutral' },
  REVOKED: { label: 'Đã rút', icon: 'slash-circle', tone: 'neutral' },
}

/** Steps a reviewer can take from each status; mirrors `expected` in ContributionsRepository.transition. */
export const NEXT_STEPS: Partial<Record<ContributionStatus, Transition[]>> = {
  NEEDS_SOURCE: ['reject'],
  NEEDS_REVIEW: ['verify', 'reject'],
  VERIFIED: ['approve', 'reject'],
  APPROVED: ['publish'],
  PUBLISHED: ['supersede', 'revoke'],
}

export const TRANSITION: Record<Transition, { label: string; help: string; danger?: boolean }> = {
  verify: { label: 'Xác minh', help: 'Bạn đã đối chiếu nguồn và thấy đề xuất đúng. Ghi chú xác minh tối thiểu 10 ký tự.' },
  approve: { label: 'Phê duyệt', help: 'Người phê duyệt phải khác người đã xác minh.' },
  publish: { label: 'Công bố', help: 'Người công bố phải khác người xác minh và người phê duyệt. Dữ liệu quy định cần digest gói đã ký và đã stage bằng CLI.' },
  reject: { label: 'Từ chối', help: 'Ghi rõ lý do để lưu vào nhật ký đề xuất.', danger: true },
  supersede: { label: 'Đánh dấu bị thay thế', help: 'Dùng khi một đề xuất mới hơn đã thay nội dung này.' },
  revoke: { label: 'Rút công bố', help: 'Gỡ nội dung đã công bố khỏi trang công khai.', danger: true },
}

export const RISK_LABEL = { LOW: 'Thấp', MEDIUM: 'Vừa', HIGH: 'Cao' } as const

export const MAIL_STATUS: Record<MailStatus, { label: string; icon: string; tone: Tone }> = {
  pending: { label: 'Chờ gửi', icon: 'clock', tone: 'info' },
  sending: { label: 'Đang gửi', icon: 'send', tone: 'info' },
  sent: { label: 'Đã gửi', icon: 'check2-circle', tone: 'positive' },
  failed: { label: 'Thất bại', icon: 'exclamation-octagon', tone: 'danger' },
}

export const MAIL_TEMPLATE: Record<string, string> = { otp: 'Mã đăng nhập', test: 'Thư thử' }

export const MAIL_TRANSPORT = { direct: 'Gửi thẳng (MX + DKIM)', smtp: 'Qua máy chủ SMTP', log: 'Chỉ ghi log (không gửi)' } as const

export const AUDIT_ACTION: Record<string, string> = {
  USER_DISABLED: 'Khoá tài khoản', USER_ENABLED: 'Mở khoá tài khoản', SESSIONS_ENDED: 'Đăng xuất mọi phiên', PROFILE_EDITED: 'Sửa hồ sơ',
  PRO_GRANTED: 'Cấp Pro', PRO_REVOKED: 'Thu hồi Pro', USER_DELETED: 'Xoá tài khoản',
  CONTRIBUTION_VERIFY: 'Xác minh đề xuất', CONTRIBUTION_APPROVE: 'Phê duyệt đề xuất', CONTRIBUTION_PUBLISH: 'Công bố đề xuất',
  CONTRIBUTION_REJECT: 'Từ chối đề xuất', CONTRIBUTION_SUPERSEDE: 'Đánh dấu thay thế', CONTRIBUTION_REVOKE: 'Rút công bố',
  MAIL_TEST: 'Gửi thư thử', SETTING_CHANGED: 'Đổi cài đặt', SETTING_RESET: 'Khôi phục mặc định', ROLE_GRANTED: 'Cấp vai trò', ROLE_REVOKED: 'Thu vai trò',
  // Account trail (user_audit) shares this table.
  LOGIN: 'Đăng nhập', DISABLED: 'Bị khoá', ENABLED: 'Được mở khoá', DELETED: 'Bị xoá',
  SUBMITTED: 'Gửi đề xuất', SOURCES_ADDED: 'Thêm nguồn (mã biên nhận)', EVIDENCE_ADDED: 'Bổ sung nguồn', VERIFY: 'Xác minh', APPROVE: 'Phê duyệt',
  PUBLISH: 'Công bố', REJECT: 'Từ chối', SUPERSEDE: 'Bị thay thế', REVOKE: 'Rút công bố',
}

export const AUDIT_TARGET: Record<string, string> = { user: 'Người dùng', contribution: 'Đề xuất', mail: 'Email', setting: 'Cài đặt', role: 'Vai trò', ai: 'AI' }
