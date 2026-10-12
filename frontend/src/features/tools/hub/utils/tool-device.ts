import type { ToolDevice, ToolOffline } from '../types/tool.types'

/** 'network' không hiện thành nhãn riêng: dòng "Cần mạng…" đã nói điều đó. */
export function deviceNeedKeys(device: ToolDevice): ('camera' | 'mic')[] {
  return (device.needs ?? []).filter((need): need is 'camera' | 'mic' => need !== 'network')
}

/** Chỉ lên tiếng khi đang mất mạng, và một lần khi có mạng lại — không làm phiền người luôn online. */
export function offlineNoticeKey(device: ToolDevice, status: { online: boolean; wasOffline: boolean }): ToolOffline | 'online' | null {
  if (!status.online) return device.offline
  return status.wasOffline ? 'online' : null
}
