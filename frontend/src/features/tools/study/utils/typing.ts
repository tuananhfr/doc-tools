export type TypingLevel = 'basic' | 'advanced'
export interface TypingProgress { level: TypingLevel; wpm: number; accuracy: number; at: number }
export const TYPING_STORAGE_KEY = 'chuyen-nho.typing-progress.v1'

export const TYPING_LESSONS = {
  basic: [
    'fff jjj fff jjj fjf jfj ddd kkk dkd kdk sss lll sls lsl aaa ;;; asa ;l;',
    'asdf jkl; asdf jkl; sad lad fall ask flask salad dad adds a flask',
    'qwer tyui op zxcv bnm quick brown fox jumps over the lazy dog',
  ],
  advanced: [
    'Mỗi ngày luyện gõ một chút, đôi tay sẽ linh hoạt hơn. Hãy nhìn nội dung và giữ nhịp gõ đều, chính xác.',
    'Chuyện Nhỏ giúp bạn xử lý tài liệu, hình ảnh và những việc cần mỗi ngày. Đơn giản, dễ dùng và tiết kiệm thời gian.',
    'Ngày 02/11/2026, nhóm đã xử lý 125 hồ sơ; hoàn thành 98% kế hoạch. Tổng chi phí: 1.250.000 đồng.',
  ],
} as const
export const ENGLISH_TYPING_LESSONS = [
  'Practice a little every day. Keep your fingers on the home row, look at the text, and focus on accuracy before speed.',
  'Small tools help you work with documents and images. A steady rhythm makes typing easier, faster, and more accurate.',
  'On 02/11/2026, the team processed 125 files and completed 98% of the plan. Total cost: 1,250.00.',
] as const

const VI_PARAGRAPHS = [
  [
    'Buổi sáng, nắng chiếu qua khung cửa. Tôi mở cuốn sách yêu thích, đọc vài trang rồi bắt đầu một ngày làm việc mới.',
    'Một chuyến đi ngắn cũng mang lại nhiều niềm vui. Hãy chuẩn bị đồ dùng, kiểm tra đường đi và dành thời gian ngắm cảnh.',
    'Khi học một kỹ năng mới, hãy bắt đầu từ những việc nhỏ. Luyện tập đều đặn giúp bạn tiến bộ từng ngày.',
    'Trong khu vườn nhỏ, những bông hoa vừa nở. Tiếng chim hót cùng làn gió nhẹ khiến buổi chiều trở nên yên bình.',
    'Chúng tôi cùng sắp xếp góc học tập. Sách đặt trên giá, bút để trong hộp và mặt bàn luôn sạch sẽ, gọn gàng.',
  ],
  [
    'Những cánh đồng lúa chín trải dài dưới ánh nắng. Người nông dân phấn khởi thu hoạch sau nhiều tháng chăm sóc.',
    'Giữ gìn sức khỏe bằng cách ngủ đủ giấc, uống nước thường xuyên và vận động phù hợp. Đừng quên nghỉ ngơi giữa giờ.',
    'Tiếng Việt giàu hình ảnh và nhạc điệu. Khi luyện gõ, hãy chú ý các dấu sắc, huyền, hỏi, ngã và nặng.',
    'Bữa cơm gia đình có bát canh nóng, đĩa rau xanh và những câu chuyện vui. Mọi người cùng chia sẻ việc đã làm trong ngày.',
    'Dù gặp khó khăn, chúng ta vẫn có thể bình tĩnh tìm cách giải quyết. Sự kiên nhẫn và cố gắng sẽ tạo nên khác biệt.',
  ],
  [
    'Cuộc họp bắt đầu lúc 08:30 ngày 15/06. Nhóm cần hoàn thành 24 nhiệm vụ, kiểm tra 6 báo cáo và gửi kết quả trước 17:00.',
    'Danh sách mua sắm: 2 kg gạo, 500 g thịt, 3 hộp sữa và 12 quả trứng. Tổng số tiền dự kiến là 450.000 đồng.',
    'Mã hồ sơ: AB-2026/015. Có 36 tài liệu đã được kiểm tra; tỷ lệ hoàn thành đạt 90%. Vui lòng lưu bản sao trước khi đóng.',
    'Lớp học có 28 bạn, chia thành 4 nhóm. Mỗi nhóm đọc 3 trang, thảo luận trong 15 phút rồi trình bày kết quả.',
    'Chuyến tàu số 128 khởi hành lúc 09:45. Hành khách nên đến sớm 30 phút và kiểm tra thông tin ở cổng số 5.',
  ],
]
const EN_PARAGRAPHS = [
  [
    'The morning light fills the room. I open my favorite book, read a few pages, and get ready for a new day.',
    'A short walk can bring fresh ideas. Take a quiet path, enjoy the view, and notice the small things around you.',
    'Learning a new skill takes practice. Start with a small goal and make a little progress each day.',
    'We keep our workspace tidy. Books go on the shelf, pens stay in a cup, and the desk is ready for the next task.',
    'The garden is full of flowers. Birds sing in the trees while a gentle breeze moves through the leaves.',
  ],
  [
    'Good communication starts with careful listening. Ask clear questions, share useful details, and give others time to respond.',
    'A balanced routine includes work, rest, and exercise. Take short breaks and return to your tasks with a fresh mind.',
    'Typing accurately is more useful than rushing. Relax your shoulders, keep a steady rhythm, and correct mistakes carefully.',
    'Our team works together to solve problems. Each person brings a different idea, and we choose the most practical solution.',
    'Save your work regularly and use clear file names. A simple folder structure makes documents easier to find later.',
  ],
  [
    'The meeting starts at 08:30 on 15/06. Please review 24 tasks, check 6 reports, and send the results before 17:00.',
    'Shopping list: 2 kg of rice, 500 g of vegetables, 3 bottles of milk, and 12 eggs. The estimated cost is 45.50.',
    'File reference: AB-2026/015. We checked 36 documents and completed 90% of the plan. Save a copy before closing.',
    'There are 28 students in 4 groups. Each group reads 3 pages, discusses them for 15 minutes, and presents its findings.',
    'Train 128 departs at 09:45. Please arrive 30 minutes early and check the information at gate 5.',
  ],
]

/** Local exercise generation; random lessons never repeat the current text. */
export function randomTypingLesson(level: TypingLevel, lesson: number, locale: string, previous = '', random = Math.random): string {
  const index = Math.max(0, Math.min(2, Math.trunc(lesson)))
  const pick = (size: number) => Math.min(size - 1, Math.max(0, Math.floor(random() * size)))
  if (level === 'advanced') {
    const pool = locale.startsWith('vi') ? VI_PARAGRAPHS[index] : EN_PARAGRAPHS[index]
    const choices = pool.filter(text => text !== previous)
    return choices[pick(choices.length)]
  }
  const keys = ['fjdk', 'asdfjkl;', 'qwertyuiopasdfghjkl;zxcvbnm'][index]
  const groups = Array.from({ length: 14 }, () => Array.from({ length: 3 + pick(3) }, () => keys[pick(keys.length)]).join(''))
  const text = groups.join(' ')
  if (text !== previous) return text
  return keys[(keys.indexOf(text[0]) + 1) % keys.length] + text.slice(1)
}

export function typingCharacters(text: string): string[] { return Array.from(text.normalize('NFC')) }

/** Count new attempts only; fixing a mistake must not erase its accuracy penalty. */
export function typingEdits(previous: string, next: string, target: string): { attempts: number; correct: number } {
  const before = typingCharacters(previous), after = typingCharacters(next), expected = typingCharacters(target)
  let start = 0
  while (start < before.length && start < after.length && before[start] === after[start]) start++
  let endBefore = before.length, endAfter = after.length
  while (endBefore > start && endAfter > start && before[endBefore - 1] === after[endAfter - 1]) { endBefore--; endAfter-- }
  const added = after.slice(start, endAfter)
  return { attempts: added.length, correct: added.filter((char, index) => char === expected[start + index]).length }
}

export function typingMetrics(typed: string, target: string, elapsedMs: number, attempts: number, correctAttempts: number) {
  const actual = typingCharacters(typed), expected = typingCharacters(target)
  const correct = actual.filter((char, index) => char === expected[index]).length
  return {
    wpm: elapsedMs > 0 ? Math.round(correct / 5 / (elapsedMs / 60000)) : 0,
    accuracy: attempts ? Math.round(correctAttempts / attempts * 100) : 100,
    progress: expected.length ? Math.min(100, Math.round(actual.length / expected.length * 100)) : 0,
    complete: typed.normalize('NFC') === target.normalize('NFC'),
  }
}

export function readTypingProgress(value: string | null): TypingProgress[] {
  try {
    const parsed: unknown = JSON.parse(value ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is TypingProgress => Boolean(item && (item.level === 'basic' || item.level === 'advanced') && Number.isFinite(item.wpm) && item.wpm >= 0 && Number.isFinite(item.accuracy) && item.accuracy >= 0 && item.accuracy <= 100 && Number.isFinite(item.at))).slice(-20)
  } catch { return [] }
}

export const KEYBOARD_ROWS = ['1234567890', 'qwertyuiop', 'asdfghjkl;', 'zxcvbnm,./']
export function typingFinger(char: string): number | null {
  if (char === ' ') return 8
  const key = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase()
  const groups = ['1qaz', '2wsx', '3edc', '45rtfgvb', '67yuhjnm', '8ik,', '9ol.', '0p;/-=[]']
  const index = groups.findIndex(group => group.includes(key) && key.length === 1)
  return index < 0 ? null : index
}
