export interface NoteTask {
  id: string
  text: string
  done: boolean
}

/** Một ghi chú: đoạn chữ tự do + danh sách việc, cả hai đều có thể để trống. */
export interface Note {
  id: string
  title: string
  body: string
  tasks: NoteTask[]
  /** `Date.now()` của lần sửa gần nhất. */
  updatedAt: number
}
