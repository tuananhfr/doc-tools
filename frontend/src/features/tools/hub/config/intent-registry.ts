import { VI_TERMS } from './vi-terms'

export interface SearchIntent {
  id: string
  canonical: string
  aliases: readonly string[]
  preferredTool: string
  acceptableTools: readonly string[]
  forbiddenTools: readonly string[]
  inputProfiles: readonly string[]
  expectedOutcome: string
  risk: 'low' | 'review'
  requiredTerms?: readonly (readonly string[])[]
  excludedTerms?: readonly string[]
  handoff?: { profile: 'table'; output: 'xlsx' }
}

export const INTENT_REGISTRY_VERSION = 3

export const SEARCH_INTENTS: readonly SearchIntent[] = [
  {
    id: 'image.table', canonical: 'Ảnh bảng sang Excel', preferredTool: 'image-to-text', acceptableTools: [], forbiddenTools: ['scan-to-pdf'],
    requiredTerms: [['ảnh', 'hình'], ['bảng'], ['excel', 'xlsx']], aliases: ['ảnh bảng sang Excel', 'lấy bảng từ ảnh sang Excel'],
    inputProfiles: ['image-table'], expectedOutcome: 'Bảng Excel sau khi đối chiếu từng ô với ảnh gốc', risk: 'review', handoff: { profile: 'table', output: 'xlsx' },
  },
  {
    id: 'pdf.table', canonical: 'Bảng PDF sang Excel', preferredTool: 'ocr', acceptableTools: [], forbiddenTools: ['pdf-to-image'],
    requiredTerms: [['pdf', 'scan'], ['bảng'], ['excel', 'xlsx']], aliases: ['đọc bảng PDF sang Excel', 'bảng scan sang Excel'],
    inputProfiles: ['pdf-table'], expectedOutcome: 'Bảng Excel sau khi đối chiếu từng ô với bản scan', risk: 'review', handoff: { profile: 'table', output: 'xlsx' },
  },
  {
    id: 'pdf.compress', canonical: 'Nén PDF', preferredTool: 'compress-pdf', acceptableTools: [], forbiddenTools: ['remove-background', 'compress-video'],
    requiredTerms: [['pdf'], ['nén', 'nặng', 'nhẹ', 'nhỏ', 'giảm dung lượng', 'giảm kích thước']], excludedTerms: ['video', 'ảnh'],
    aliases: ['giảm dung lượng PDF', 'làm file PDF nhỏ lại', 'file nặng quá không gửi được', 'gửi hồ sơ nhẹ hơn', 'nén PDF gửi Zalo', 'PDF quá lớn để gửi email'],
    inputProfiles: ['pdf'], expectedOutcome: 'PDF được nén; thông báo nếu dung lượng không giảm', risk: 'low',
  },
  {
    id: 'pdf.merge', canonical: 'Ghép PDF', preferredTool: 'merge-pdf', acceptableTools: [], forbiddenTools: ['scan-to-pdf', 'split-pdf'],
    requiredTerms: [['pdf'], ['ghép', 'gộp', 'nối', 'gom', 'hợp nhất']], excludedTerms: ['ảnh', 'jpg', 'png'],
    aliases: ['gộp PDF', 'gộp hai tệp PDF', 'ghép nhiều file PDF thành một', 'nối các bản PDF', 'gom hồ sơ PDF vào một file'],
    inputProfiles: ['pdf-multiple'], expectedOutcome: 'Một PDF theo thứ tự người dùng chọn', risk: 'low',
  },
  {
    id: 'pdf.split', canonical: 'Tách PDF', preferredTool: 'split-pdf', acceptableTools: ['organize-pdf'], forbiddenTools: ['merge-pdf'],
    requiredTerms: [['pdf', 'hợp đồng', 'hồ sơ'], ['trang', 'tách', 'chia']],
    aliases: ['lấy vài trang trong PDF', 'tách một trang PDF', 'chia PDF thành nhiều file', 'chỉ gửi trang cần thiết'],
    inputProfiles: ['pdf'], expectedOutcome: 'PDF chứa các trang đã chọn', risk: 'low',
  },
  {
    id: 'image.text', canonical: 'Lấy chữ từ ảnh', preferredTool: 'image-to-text', acceptableTools: ['ocr'], forbiddenTools: ['scan-to-pdf', 'dictation'],
    requiredTerms: [['ảnh', 'hình', 'chụp', 'trang sách'], ['chữ', 'văn bản', 'ocr'], ['lấy', 'chép', 'đọc', 'trích', 'copy', 'gõ']],
    aliases: ['lấy chữ trong ảnh', 'chép chữ từ ảnh chụp', 'ảnh sang văn bản', 'đọc chữ trong ảnh', 'không muốn gõ lại chữ trong ảnh'],
    inputProfiles: ['image'], expectedOutcome: 'Văn bản tiếng Việt để kiểm tra, sửa và tải về', risk: 'review',
  },
  {
    id: 'pdf.ocr', canonical: VI_TERMS.ocr.label, preferredTool: 'ocr', acceptableTools: [], forbiddenTools: ['merge-pdf', 'scan-to-pdf'],
    requiredTerms: [['pdf', 'scan'], ['chữ', 'ocr'], ['scan', 'copy', 'tìm', 'lấy']],
    aliases: ['OCR PDF', 'PDF scan không copy được chữ', 'tìm chữ trong PDF scan', 'nhận dạng chữ tiếng Việt', 'đọc chữ trong bản scan'],
    inputProfiles: ['pdf-scan', 'image'], expectedOutcome: 'PDF có lớp chữ hoặc TXT; chữ nhận dạng cần được kiểm tra', risk: 'review',
  },
  {
    id: 'image.pdf', canonical: 'Ảnh sang PDF', preferredTool: 'scan-to-pdf', acceptableTools: [], forbiddenTools: ['image-to-text', 'merge-pdf'],
    requiredTerms: [['ảnh', 'hình'], ['pdf', 'chung một file'], ['ghép', 'gộp', 'gom', 'chuyển', 'đổi', 'chụp', 'thành', 'chung']],
    aliases: ['ghép ảnh thành PDF', 'chụp giấy tờ thành PDF', 'gom ảnh vào một PDF', 'đổi ảnh sang PDF'],
    inputProfiles: ['image-multiple'], expectedOutcome: 'PDF chứa các ảnh theo thứ tự chọn', risk: 'low',
  },
  {
    id: 'image.compress', canonical: 'Nén ảnh', preferredTool: 'compress-image', acceptableTools: [], forbiddenTools: ['remove-background', 'compress-pdf'],
    requiredTerms: [['ảnh', 'hình'], ['nén', 'nặng', 'nhẹ', 'giảm dung lượng']], excludedTerms: ['pdf'],
    aliases: ['ảnh quá nặng', 'làm ảnh nhẹ hơn để gửi', 'giảm dung lượng ảnh', 'nén ảnh gửi Zalo'],
    inputProfiles: ['image'], expectedOutcome: 'Ảnh được giảm dung lượng', risk: 'low',
  },
  {
    id: 'image.id', canonical: 'Ảnh thẻ', preferredTool: 'id-photo', acceptableTools: [], forbiddenTools: ['collage'],
    requiredTerms: [['ảnh', 'hình', 'hồ sơ'], ['3x4', '4x6', '3 x 4', '4 x 6', 'thẻ']],
    aliases: ['ảnh 3x4', 'ảnh 4x6', 'làm ảnh thẻ tại nhà', 'ảnh hồ sơ 3 x 4'],
    inputProfiles: ['portrait-image'], expectedOutcome: 'Ảnh theo kích thước người dùng chọn', risk: 'low',
  },
  {
    id: 'image.background', canonical: 'Xóa nền ảnh', preferredTool: 'remove-background', acceptableTools: [], forbiddenTools: ['compress-image'],
    aliases: ['xóa phông', 'tách nền ảnh', 'ảnh nền trong suốt', 'xóa nền màu trơn'],
    inputProfiles: ['image'], expectedOutcome: 'Ảnh được AI xóa nền trên thiết bị, chỉnh mép bằng cọ', risk: 'review',
  },
  {
    id: 'image.watermark', canonical: 'Đóng dấu ảnh', preferredTool: 'mark-image', acceptableTools: [], forbiddenTools: ['redact-pdf'],
    requiredTerms: [['ảnh', 'hình'], ['logo', 'đóng dấu', 'số điện thoại', 'watermark', 'thêm chữ']],
    aliases: ['thêm chữ vào ảnh', 'thêm chữ lên ảnh', 'đóng watermark ảnh', 'gắn logo lên ảnh', 'đánh dấu ảnh sản phẩm'],
    inputProfiles: ['image'], expectedOutcome: 'Ảnh có chữ hoặc logo đã chọn', risk: 'low',
  },
  {
    id: 'qr.create', canonical: 'Tạo mã QR', preferredTool: 'qr-create', acceptableTools: [], forbiddenTools: ['qr-read', 'barcode-create'],
      requiredTerms: [['qr', 'mã'], ['tạo', 'menu', 'wifi', 'đường link', 'thành']], excludedTerms: ['đọc qr', 'barcode'],
    aliases: ['link thành QR', 'tạo QR cho đường link', 'chia sẻ wifi bằng QR', 'mã QR wifi'],
    inputProfiles: ['url', 'text', 'wifi'], expectedOutcome: 'Mã QR có thể tải về', risk: 'low',
  },
  {
    id: 'qr.read', canonical: 'Đọc mã QR', preferredTool: 'qr-read', acceptableTools: [], forbiddenTools: ['qr-create'],
      requiredTerms: [['qr', 'barcode', 'mã vạch'], ['đọc', 'quét', 'xem nội dung']], excludedTerms: ['menu', 'wifi', 'tạo'],
    aliases: ['quét QR trong ảnh', 'đọc QR từ ảnh chụp', 'xem nội dung mã QR'],
    inputProfiles: ['image-qr'], expectedOutcome: 'Nội dung mã; không tự mở liên kết', risk: 'review',
  },
  {
    id: 'pdf.word', canonical: 'PDF sang Word', preferredTool: 'convert-file', acceptableTools: [], forbiddenTools: ['pdf-to-image'],
    aliases: ['đổi PDF thành Word', 'chuyển PDF sang docx', 'sửa hồ sơ PDF bằng Word'],
    inputProfiles: ['pdf'], expectedOutcome: 'DOCX; bố cục có thể khác bản gốc', risk: 'review',
  },
  {
    id: 'pdf.password', canonical: 'Mật khẩu PDF', preferredTool: 'pdf-password', acceptableTools: [], forbiddenTools: [],
    aliases: ['đặt mật khẩu PDF', 'khóa file PDF', 'bảo vệ PDF bằng mật khẩu', 'gỡ mật khẩu PDF đã biết'],
    inputProfiles: ['pdf'], expectedOutcome: 'PDF được khóa hoặc mở bằng mật khẩu hợp lệ', risk: 'review',
  },
  {
    id: 'pdf.redact', canonical: 'Che thông tin PDF', preferredTool: 'redact-pdf', acceptableTools: [], forbiddenTools: ['stamp-pdf'],
    requiredTerms: [['pdf', 'hồ sơ'], ['che', 'ẩn', 'xóa thông tin']],
    aliases: ['che số căn cước trong PDF', 'ẩn thông tin riêng tư trong PDF', 'xóa thông tin nhạy cảm PDF'],
    inputProfiles: ['pdf'], expectedOutcome: 'PDF có vùng thông tin bị loại bỏ', risk: 'review',
  },
  {
    id: 'video.compress', canonical: 'Nén video', preferredTool: 'compress-video', acceptableTools: [], forbiddenTools: ['compress-pdf', 'compress-image'],
    requiredTerms: [['video', 'clip'], ['nén', 'nặng', 'nhẹ', 'giảm dung lượng']],
    aliases: ['video quá nặng để gửi', 'giảm dung lượng video', 'làm clip nhẹ hơn'],
    inputProfiles: ['video'], expectedOutcome: 'Video MP4 được nén', risk: 'low',
  },
  {
    id: 'video.audio', canonical: 'Tách âm thanh', preferredTool: 'extract-audio', acceptableTools: [], forbiddenTools: ['dictation'],
    requiredTerms: [['video', 'clip'], ['tách tiếng', 'tách âm thanh', 'lấy nhạc', 'mp3']],
    aliases: ['lấy nhạc từ video', 'video sang MP3', 'tách tiếng khỏi video'],
    inputProfiles: ['video'], expectedOutcome: 'Tệp âm thanh', risk: 'low',
  },
  {
    id: 'home.estimate', canonical: 'Ước tính chi phí xây nhà', preferredTool: 'house-estimate', acceptableTools: [], forbiddenTools: ['construction-price', 'structure-calc'],
    requiredTerms: [['xây nhà', 'xây căn nhà'], ['tiền', 'chi phí', 'khái toán', 'ước']],
    aliases: ['xây nhà hết bao nhiêu tiền', 'khái toán xây nhà', 'tính chi phí xây nhà'],
    inputProfiles: ['area', 'user-prices'], expectedOutcome: 'Ước tính theo tham số; không phải báo giá chính thức', risk: 'review',
  },
  {
    id: 'home.calendar', canonical: 'Lịch gia đình', preferredTool: 'family-calendar', acceptableTools: [], forbiddenTools: ['family-reminders', 'family-health'],
    requiredTerms: [['nhắc', 'lịch', 'tkb', 'thời khóa biểu'], ['thuốc', 'passport', 'hộ chiếu', 'con', 'đứa nhỏ', 'gia đình']],
    aliases: ['nhắc uống thuốc', 'lịch uống thuốc cho ông', 'ghi lịch uống thuốc', 'nhắc hộ chiếu sắp hết hạn', 'lưu lịch gia đình'],
    inputProfiles: ['user-events'], expectedOutcome: 'Lịch lưu trên thiết bị; không hứa thông báo nền tự động', risk: 'review',
  },
  {
    id: 'money.words', canonical: 'Đọc số tiền bằng chữ', preferredTool: 'number-words', acceptableTools: [], forbiddenTools: ['read-aloud'],
    aliases: ['số tiền thành chữ', 'viết số tiền bằng chữ', 'đổi số sang chữ tiếng Việt'],
    inputProfiles: ['number'], expectedOutcome: 'Số tiền viết bằng chữ', risk: 'review',
  },
  {
    id: 'money.split', canonical: 'Chia tiền nhóm', preferredTool: 'group-split', acceptableTools: [], forbiddenTools: [],
    aliases: ['chia tiền ăn nhóm', 'chia hóa đơn cho bạn bè', 'tính mỗi người trả bao nhiêu'],
    inputProfiles: ['amounts', 'participants'], expectedOutcome: 'Phần tiền từng người', risk: 'review',
  },
  {
    id: 'date.count', canonical: 'Tính ngày', preferredTool: 'date-calc', acceptableTools: [], forbiddenTools: ['lunar-calendar'],
    requiredTerms: [['ngày'], ['hạn', 'cộng', 'kể từ', 'cách nhau', 'giữa', 'thời hạn']],
    aliases: ['hai ngày cách nhau bao lâu', 'tính số ngày giữa hai mốc', 'cộng thêm ngày vào ngày hiện tại'],
    inputProfiles: ['dates'], expectedOutcome: 'Khoảng cách hoặc ngày sau khi cộng', risk: 'low',
  },
  {
    id: 'money.tax', canonical: 'Tính tiền và thuế', preferredTool: 'money-calc', acceptableTools: [], forbiddenTools: ['payroll'],
    requiredTerms: [['thuế', 'vat'], ['tính', 'giá', 'bao gồm']], aliases: ['Tính VAT', 'tính lại giá gốc', 'giá đã bao gồm thuế'],
    inputProfiles: ['amounts'], expectedOutcome: 'Số tiền và thuế theo tham số người dùng nhập', risk: 'review',
  },
  {
    id: 'home.orientation', canonical: 'Hướng nhà', preferredTool: 'house-orientation', acceptableTools: [], forbiddenTools: [],
    requiredTerms: [['hướng'], ['nhà', 'la bàn']], aliases: ['xem hướng nhà', 'la bàn'],
    inputProfiles: ['orientation'], expectedOutcome: 'Hướng theo giá trị nhập hoặc cảm biến được cho phép', risk: 'review',
  },
  {
    id: 'image.metadata', canonical: 'Xóa vị trí trong ảnh', preferredTool: 'remove-metadata', acceptableTools: [], forbiddenTools: ['remove-background'],
    requiredTerms: [['ảnh', 'hình'], ['gps', 'tọa độ', 'metadata', 'exif'], ['xóa', 'gỡ', 'bỏ']], aliases: ['xóa tọa độ GPS', 'gỡ EXIF khỏi ảnh'],
    inputProfiles: ['image'], expectedOutcome: 'Ảnh đã gỡ metadata', risk: 'low',
  },
  {
    id: 'text.count', canonical: 'Đếm ký tự', preferredTool: 'char-count', acceptableTools: [], forbiddenTools: ['number-words'],
    requiredTerms: [['đếm', 'tính số'], ['chữ', 'từ', 'ký tự']], aliases: ['tính số chữ bài văn', 'đếm từ trong bài'],
    inputProfiles: ['text'], expectedOutcome: 'Số ký tự, từ và dòng', risk: 'low',
  },
  {
    id: 'unit.convert', canonical: 'Đổi đơn vị', preferredTool: 'unit-convert', acceptableTools: [], forbiddenTools: [],
    requiredTerms: [['đổi', 'chuyển'], ['mét', 'hecta', 'kilôgam', 'đơn vị', 'kg', 'cm']], aliases: ['đổi mét vuông sang hecta', 'chuyển đơn vị đo'],
    inputProfiles: ['number'], expectedOutcome: 'Giá trị theo đơn vị đã chọn', risk: 'low',
  },
  {
    id: 'document.receipt', canonical: 'Tạo biên nhận', preferredTool: 'form-templates', acceptableTools: [], forbiddenTools: [],
    requiredTerms: [['biên nhận', 'giấy xác nhận'], ['tạo', 'tiền', 'nhận']], aliases: ['giấy xác nhận đã nhận tiền', 'biên nhận tiền'],
    inputProfiles: ['user-fields'], expectedOutcome: 'Biên nhận có thể xem trước và in', risk: 'review',
  },
]

// Curated corrections avoid turning unrelated short Vietnamese words into matches.
export const SEARCH_TYPOS: Readonly<Record<string, string>> = { pfd: 'pdf', pdff: 'pdf', gpeh: 'ghep', ghepp: 'ghep', dungluong: 'dung luong', vanban: 'van ban', qrcode: 'qr' }
