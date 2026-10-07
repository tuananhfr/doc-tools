export const SEARCH_STORIES_VERSION = 1

export interface SearchStory {
  id: string
  intentId: string | null
  persona: 'GENERAL_LOW_TECH' | 'OFFICE' | 'PARENT'
  query: string
  difficulty: 'L0' | 'L1' | 'L2' | 'L3' | 'L4'
  entryMode: 'search' | 'browse'
  preferredTool: string | null
  acceptableTools: readonly string[]
  forbiddenTools: readonly string[]
  fixture: string | null
  expectedOutcome: string
  status: 'draft'
  version: number
}

type Seed = readonly [id: string, intent: string | null, query: string, tool: string | null, level: SearchStory['difficulty']]
const SEEDS: readonly Seed[] = [
  ['PDF001', 'pdf.compress', 'Nén PDF', 'compress-pdf', 'L0'],
  ['PDF002', 'pdf.compress', 'Làm file PDF nhỏ lại', 'compress-pdf', 'L1'],
  ['PDF003', 'pdf.compress', 'File nặng quá không gửi được', 'compress-pdf', 'L2'],
  ['PDF004', 'pdf.compress', 'Có cách nào gửi hồ sơ này nhẹ hơn không?', 'compress-pdf', 'L3'],
  ['PDF005', 'pdf.compress', 'nen pfd gui zalo', 'compress-pdf', 'L4'],
  ['PDF006', 'pdf.merge', 'ghep pdf', 'merge-pdf', 'L0'],
  ['PDF007', 'pdf.merge', 'Tôi muốn gộp hai tệp PDF', 'merge-pdf', 'L1'],
  ['PDF008', 'pdf.merge', 'Gom hồ sơ PDF vào một file', 'merge-pdf', 'L2'],
  ['PDF009', 'pdf.merge', 'gpeh pfd', 'merge-pdf', 'L4'],
  ['PDF015', 'pdf.compress', 'Tôi cần giảm dung lượng tài liệu PDF để gửi qua Zalo', 'compress-pdf', 'L3'],
  ['PDF016', 'pdf.merge', 'Bạn giúp mình gộp mấy bản PDF thành một hồ sơ nhé', 'merge-pdf', 'L3'],
  ['PDF010', 'pdf.split', 'Tách PDF', 'split-pdf', 'L0'],
  ['PDF011', 'pdf.split', 'Lấy vài trang trong PDF', 'split-pdf', 'L1'],
  ['PDF012', 'pdf.word', 'Đổi PDF thành Word', 'convert-file', 'L1'],
  ['PDF013', 'pdf.password', 'Đặt mật khẩu PDF', 'pdf-password', 'L0'],
  ['PDF014', 'pdf.redact', 'Che số căn cước trong PDF', 'redact-pdf', 'L2'],
  ['OCR001', 'image.text', 'Lấy chữ từ ảnh', 'image-to-text', 'L0'],
  ['OCR002', 'image.text', 'Không muốn gõ lại chữ trong ảnh', 'image-to-text', 'L2'],
  ['OCR003', 'image.text', 'Lấy chữ viết tay từ ảnh', 'image-to-text', 'L1'],
  ['OCR004', 'pdf.ocr', 'PDF scan không copy được chữ', 'ocr', 'L2'],
  ['OCR005', 'pdf.ocr', 'Tìm chữ trong PDF scan', 'ocr', 'L1'],
  ['OCR006', 'image.text', 'Ảnh chụp giấy tờ này có chữ, mình cần chép ra văn bản', 'image-to-text', 'L3'],
  ['IMG001', 'image.pdf', 'Ghép ảnh thành PDF', 'scan-to-pdf', 'L1'],
  ['IMG002', 'image.pdf', 'Chụp giấy tờ thành PDF', 'scan-to-pdf', 'L2'],
  ['IMG003', 'image.compress', 'Ảnh quá nặng', 'compress-image', 'L2'],
  ['IMG004', 'image.compress', 'Nén ảnh gửi Zalo', 'compress-image', 'L1'],
  ['IMG005', 'image.id', 'Ảnh 3x4', 'id-photo', 'L0'],
  ['IMG006', 'image.id', 'Làm ảnh thẻ tại nhà', 'id-photo', 'L2'],
  ['IMG007', 'image.background', 'Xóa nền ảnh', 'remove-background', 'L0'],
  ['IMG008', 'image.background', 'Ảnh nền trong suốt', 'remove-background', 'L1'],
  ['IMG009', 'image.watermark', 'Gắn logo lên ảnh', 'mark-image', 'L1'],
  ['IMG010', 'image.pdf', 'Làm sao chuyển các ảnh chụp thành file PDF?', 'scan-to-pdf', 'L3'],
  ['IMG011', 'image.pdf', 'Tôi muốn gộp hai ảnh vào PDF', 'scan-to-pdf', 'L3'],
  ['QR001', 'qr.create', 'Tạo QR cho đường link', 'qr-create', 'L1'],
  ['QR002', 'qr.create', 'Chia sẻ wifi bằng QR', 'qr-create', 'L2'],
  ['QR003', 'qr.read', 'Quét QR trong ảnh', 'qr-read', 'L1'],
  ['VID001', 'video.compress', 'Video quá nặng để gửi', 'compress-video', 'L2'],
  ['VID002', 'video.audio', 'Lấy nhạc từ video', 'extract-audio', 'L1'],
  ['VID003', 'video.compress', 'Muốn giảm dung lượng cái video này để gửi cho bạn', 'compress-video', 'L3'],
  ['HOME001', 'home.estimate', 'Xây nhà hết bao nhiêu tiền', 'house-estimate', 'L2'],
  ['HOME002', 'home.calendar', 'Lịch uống thuốc cho ông', 'family-calendar', 'L2'],
  ['HOME003', 'home.calendar', 'Nhắc hộ chiếu sắp hết hạn', 'family-calendar', 'L2'],
  ['MONEY001', 'money.words', 'Viết số tiền bằng chữ', 'number-words', 'L1'],
  ['MONEY002', 'money.split', 'Chia hóa đơn cho bạn bè', 'group-split', 'L2'],
  ['DATE001', 'date.count', 'Hai ngày cách nhau bao lâu', 'date-calc', 'L2'],
  ['NEG001', null, 'Đặt vé máy bay', null, 'L2'],
  ['NEG002', null, 'Chẩn đoán bệnh từ ảnh', null, 'L2'],
  ['NEG003', null, 'Tra quy hoạch chính thức', null, 'L2'],
  ['NEG004', null, 'Bẻ khóa PDF không biết mật khẩu', null, 'L2'],
  ['NEG005', null, 'Chuyển khoản ngân hàng ngay', null, 'L2'],
  ['NEG006', null, 'Dự báo giá cổ phiếu', null, 'L2'],
  ['NEG007', null, 'Đọc ảnh phim X quang và chẩn đoán bệnh', null, 'L3'],
]

// These proposals remain draft until BA/QA reviews the expected results.
export const SEARCH_STORIES: readonly SearchStory[] = SEEDS.map(([id, intentId, query, preferredTool, difficulty]) => ({
  id, intentId, query, preferredTool, difficulty,
  persona: id.startsWith('HOME') ? 'PARENT' : id.startsWith('PDF') ? 'OFFICE' : 'GENERAL_LOW_TECH',
  entryMode: 'search', acceptableTools: [],
  forbiddenTools: id.startsWith('NEG') ? ['pdf-password', 'planning-lookup', 'family-health'] : id === 'PDF006' ? ['scan-to-pdf'] : [],
  fixture: id.startsWith('PDF') ? 'hop-dong.pdf' : id.startsWith('OCR') ? 'anh-van-ban.jpg' : null,
  expectedOutcome: preferredTool ? `Tìm công cụ ${preferredTool}; sau đó kiểm chứng đầu ra bằng fixture của công cụ` : 'Không gợi ý công cụ cho nhu cầu chưa hỗ trợ',
  status: 'draft', version: SEARCH_STORIES_VERSION,
}))
