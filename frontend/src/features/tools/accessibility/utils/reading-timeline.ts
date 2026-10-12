/** Mốc phát trên đồng hồ AudioContext → đoạn văn bản tương ứng, để bôi câu đang đọc. */
export interface TimelineEntry {
  startAt: number
  start: number
  end: number
}

/** Đoạn bắt đầu muộn nhất tính tới `time`; trong khoảng lặng giữa hai câu vẫn bôi câu vừa đọc. */
export function rangeAt(entries: readonly TimelineEntry[], time: number): TimelineEntry | null {
  let found: TimelineEntry | null = null
  for (const entry of entries) if (entry.startAt <= time && (!found || entry.startAt >= found.startAt)) found = entry
  return found
}

export interface ScheduledAudio {
  startAt: number
  duration: number
  /** Mẫu đầu tiên của âm thanh gốc (chưa co giãn) mà lần xếp lịch này phát. */
  from: number
  /** Tổng số mẫu âm thanh gốc. */
  length: number
}

/**
 * Khi đổi tốc độ giữa chừng: bỏ đoạn đã phát xong, đoạn đang phát thì cắt ở mẫu gốc đang nghe tới.
 * Quy đổi theo tỉ lệ thời gian vì âm thanh đã co giãn đều trên cả đoạn.
 */
export function remainingAt<T extends ScheduledAudio>(items: readonly T[], now: number): { item: T; from: number }[] {
  return items
    .filter((item) => item.startAt + item.duration > now)
    .map((item) => {
      if (item.startAt >= now) return { item, from: item.from }
      const played = (now - item.startAt) / item.duration
      return { item, from: Math.min(item.length, item.from + Math.round(played * (item.length - item.from))) }
    })
    .filter(({ item, from }) => from < item.length)
}
