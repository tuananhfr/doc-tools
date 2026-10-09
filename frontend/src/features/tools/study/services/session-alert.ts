let audio: AudioContext | null = null
// Người dùng bỏ qua hộp hỏi quyền thì thôi — hỏi lại mỗi lần bấm Bắt đầu là làm phiền.
let permissionAsked = false

function audioContext(): AudioContext | null {
  if (audio) return audio
  const Ctor = typeof window === 'undefined' ? undefined : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
  if (!Ctor) return null
  try {
    audio = new Ctor()
  } catch {
    audio = null
  }
  return audio
}

/**
 * Gọi trong lúc người dùng bấm Bắt đầu: trình duyệt chỉ cho mở âm thanh và hỏi quyền
 * thông báo khi có thao tác của người dùng — để tới lúc hết giờ mới mở thì bị chặn im lặng.
 */
export function primeSessionAlerts(): void {
  const context = audioContext()
  if (context?.state === 'suspended') void context.resume().catch(() => {})
  if (permissionAsked || typeof Notification === 'undefined' || Notification.permission !== 'default') return
  permissionAsked = true
  try {
    // Safari cũ trả undefined (kiểu callback), không phải Promise.
    const asked = Notification.requestPermission() as Promise<NotificationPermission> | undefined
    asked?.catch(() => {})
  } catch {
    /* Trình duyệt không cho hỏi quyền — vẫn còn tiếng bíp và tiêu đề tab. */
  }
}

export function playBeep(): void {
  const context = audioContext()
  if (!context) return
  try {
    if (context.state === 'suspended') void context.resume().catch(() => {})
    const start = context.currentTime
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    // Lên / xuống âm lượng mềm: tắt phụt ở biên độ lớn nghe thành tiếng "tách".
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.5)
  } catch {
    /* Không phát được âm thanh thì vẫn còn thông báo và tiêu đề tab. */
  }
}

/** Chỉ báo khi quyền ĐÃ được cấp — không bao giờ tự bật hộp hỏi quyền lúc hết giờ. */
export function notifySessionEnd(title: string, body: string): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, tag: 'chuyen-nho-pomodoro' })
  } catch {
    // Chrome Android chỉ cho tạo thông báo qua service worker — bỏ qua, tiêu đề tab vẫn đổi.
  }
}
