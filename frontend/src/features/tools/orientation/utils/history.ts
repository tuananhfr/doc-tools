export interface History<S> {
  past: S[]
  present: S
  future: S[]
}

export type HistoryAction<S, A> = { type: 'undo' } | { type: 'redo' } | { type: 'checkpoint' } | { type: 'do'; action: A } | { type: 'restart'; present: S }

/** Trần số bước hoàn tác — đủ cho một lượt làm việc, không giữ cả trăm bản trạng thái trong RAM. */
const LIMIT = 60

/**
 * Bọc một reducer thành reducer có hoàn tác / làm lại.
 *
 * `untracked(action)` = áp dụng mà KHÔNG ghi vào ngăn hoàn tác: các bước kéo
 * (mỗi lần di chuột một hành động) và thao tác chỉ đổi cách xem. Kéo thì gọi
 * `checkpoint` một lần lúc bắt đầu — hoàn tác là về đúng chỗ trước khi kéo.
 */
export function withHistory<S, A>(reducer: (state: S, action: A) => S, untracked: (action: A) => boolean) {
  return (history: History<S>, command: HistoryAction<S, A>): History<S> => {
    switch (command.type) {
      // Đổi ảnh / trang: toạ độ cũ thuộc ảnh khác, hoàn tác về đó là đặt điểm lên chỗ không còn tồn tại.
      case 'restart':
        return startHistory(command.present)
      case 'undo': {
        if (history.past.length === 0) return history
        const previous = history.past[history.past.length - 1]
        return { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future] }
      }
      case 'redo': {
        if (history.future.length === 0) return history
        const [next, ...rest] = history.future
        return { past: [...history.past, history.present].slice(-LIMIT), present: next, future: rest }
      }
      case 'checkpoint':
        return { past: [...history.past, history.present].slice(-LIMIT), present: history.present, future: [] }
      case 'do': {
        const present = reducer(history.present, command.action)
        if (present === history.present) return history
        if (untracked(command.action)) return { ...history, present }
        return { past: [...history.past, history.present].slice(-LIMIT), present, future: [] }
      }
    }
  }
}

export function startHistory<S>(present: S): History<S> {
  return { past: [], present, future: [] }
}
