import type { Permission } from '../types/admin.types'

/** Admin pages are Vietnamese only and live outside the 15-locale message files on purpose. */
export const ADMIN_ROOT = '/quan-tri'

export const ADMIN_SECTIONS = [
  { slug: '', label: 'Tổng quan', icon: 'speedometer2', permission: 'dashboard.view' },
  { slug: 'nguoi-dung', label: 'Người dùng', icon: 'people', permission: 'users.view' },
  { slug: 'de-xuat', label: 'Duyệt đề xuất', icon: 'clipboard-check', permission: 'contributions.review' },
  { slug: 'cong-cu', label: 'Lượt dùng công cụ', icon: 'bar-chart', permission: 'tools.view' },
  { slug: 'email', label: 'Email', icon: 'envelope', permission: 'mail.view' },
  { slug: 'cai-dat', label: 'Cài đặt', icon: 'sliders', permission: 'settings.manage' },
  { slug: 'phan-quyen', label: 'Phân quyền', icon: 'shield-lock', permission: 'roles.manage' },
  { slug: 'nhat-ky', label: 'Nhật ký quản trị', icon: 'journal-text', permission: 'audit.view' },
] as const satisfies readonly { slug: string; label: string; icon: string; permission: Permission }[]

export type AdminSlug = (typeof ADMIN_SECTIONS)[number]['slug']

export const adminPath = (slug: string, search = '') => `${ADMIN_ROOT}${slug ? `/${slug}` : ''}${search}`
