import type { ReactNode } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import type { Permission, Staff } from '../types/admin.types'

export function useStaff() { return useOutletContext<Staff>() }

/** Hiding the menu entry is not enough: a pasted link still lands here, and the API would answer 403 piece by piece. */
export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const staff = useStaff()
  if (staff.permissions.includes(permission)) return children
  return (
    <div className="cn-admin-empty is-page">
      <Icon name="shield-x" />
      <strong>Vai trò của bạn không mở được mục này</strong>
      <span>Hỏi chủ hệ thống nếu bạn cần quyền này.</span>
    </div>
  )
}
