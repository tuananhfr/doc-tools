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
}

export const INTENT_REGISTRY_VERSION = 1

export const SEARCH_INTENTS: readonly SearchIntent[] = [
  {
    id: 'pdf.compress', canonical: 'Nén PDF', preferredTool: 'compress-pdf', acceptableTools: [], forbiddenTools: ['remove-background', 'compress-video'],
    requiredTerms: [['pdf'], ['nén', 'nặng', 'nhẹ', 'giảm dung lượng', 'giảm kích thước']], excludedTerms: ['video', 'ảnh'],
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
    requiredTerms: [['pdf'], ['tách', 'chia', 'lấy trang']],
    aliases: ['lấy vài trang trong PDF', 'tách một trang PDF', 'chia PDF thành nhiều file', 'chỉ gửi trang cần thiết'],
    inputProfiles: ['pdf'], expectedOutcome: 'PDF chứa các trang đã chọn', risk: 'low',
  },
  {
    id: 'image.text', canonical: 'Lấy chữ từ ảnh', preferredTool: 'image-to-text', acceptableTools: ['ocr'], forbiddenTools: ['scan-to-pdf', 'dictation'],
    requiredTerms: [['ảnh', 'hình'], ['chữ', 'văn bản', 'ocr'], ['lấy', 'chép', 'đọc', 'trích', 'copy', 'gõ']],
    aliases: ['lấy chữ trong ảnh', 'chép chữ từ ảnh chụp', 'ảnh sang văn bản', 'đọc chữ trong ảnh', 'không muốn gõ lại chữ trong ảnh', 'lấy chữ viết tay từ ảnh'],
    inputProfiles: ['image'], expectedOutcome: 'Văn bản tiếng Việt để kiểm tra, sửa và tải về', risk: 'review',
  },
  {
    id: 'pdf.ocr', canonical: 'Lấy chữ từ bản scan', preferredTool: 'ocr', acceptableTools: [], forbiddenTools: ['merge-pdf', 'scan-to-pdf'],
    requiredTerms: [['pdf', 'scan'], ['chữ', 'ocr'], ['scan', 'copy', 'tìm', 'lấy']],
    aliases: ['OCR PDF', 'PDF scan không copy được chữ', 'tìm chữ trong PDF scan', 'nhận dạng chữ tiếng Việt', 'đọc chữ trong bản scan'],
    inputProfiles: ['pdf-scan', 'image'], expectedOutcome: 'PDF có lớp chữ hoặc TXT; chữ nhận dạng cần được kiểm tra', risk: 'review',
  },
  {
    id: 'image.pdf', canonical: 'Ảnh sang PDF', preferredTool: 'scan-to-pdf', acceptableTools: [], forbiddenTools: ['image-to-text', 'merge-pdf'],
    requiredTerms: [['ảnh', 'hình'], ['pdf'], ['ghép', 'gộp', 'gom', 'chuyển', 'đổi', 'chụp']],
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
    aliases: ['ảnh 3x4', 'ảnh 4x6', 'làm ảnh thẻ tại nhà', 'ảnh hồ sơ 3 x 4'],
    inputProfiles: ['portrait-image'], expectedOutcome: 'Ảnh theo kích thước người dùng chọn', risk: 'low',
  },
  {
    id: 'image.background', canonical: 'Xóa nền ảnh', preferredTool: 'remove-background', acceptableTools: [], forbiddenTools: ['compress-image'],
    aliases: ['xóa phông', 'tách nền ảnh', 'ảnh nền trong suốt', 'xóa nền màu trơn'],
    inputProfiles: ['image'], expectedOutcome: 'Ảnh đã xóa nền màu trơn hoặc chỉnh bằng cọ', risk: 'review',
  },
  {
    id: 'image.watermark', canonical: 'Đóng dấu ảnh', preferredTool: 'mark-image', acceptableTools: [], forbiddenTools: ['redact-pdf'],
    aliases: ['thêm chữ vào ảnh', 'đóng watermark ảnh', 'gắn logo lên ảnh', 'đánh dấu ảnh sản phẩm'],
    inputProfiles: ['image'], expectedOutcome: 'Ảnh có chữ hoặc logo đã chọn', risk: 'low',
  },
  {
    id: 'qr.create', canonical: 'Tạo mã QR', preferredTool: 'qr-create', acceptableTools: [], forbiddenTools: ['qr-read', 'barcode-create'],
    aliases: ['link thành QR', 'tạo QR cho đường link', 'chia sẻ wifi bằng QR', 'mã QR wifi'],
    inputProfiles: ['url', 'text', 'wifi'], expectedOutcome: 'Mã QR có thể tải về', risk: 'low',
  },
  {
    id: 'qr.read', canonical: 'Đọc mã QR', preferredTool: 'qr-read', acceptableTools: [], forbiddenTools: ['qr-create'],
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
    aliases: ['lấy nhạc từ video', 'video sang MP3', 'tách tiếng khỏi video'],
    inputProfiles: ['video'], expectedOutcome: 'Tệp âm thanh', risk: 'low',
  },
  {
    id: 'home.estimate', canonical: 'Ước tính chi phí xây nhà', preferredTool: 'house-estimate', acceptableTools: [], forbiddenTools: ['construction-price', 'structure-calc'],
    aliases: ['xây nhà hết bao nhiêu tiền', 'khái toán xây nhà', 'tính chi phí xây nhà'],
    inputProfiles: ['area', 'user-prices'], expectedOutcome: 'Ước tính theo tham số; không phải báo giá chính thức', risk: 'review',
  },
  {
    id: 'home.calendar', canonical: 'Lịch gia đình', preferredTool: 'family-calendar', acceptableTools: [], forbiddenTools: ['family-reminders', 'family-health'],
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
    aliases: ['hai ngày cách nhau bao lâu', 'tính số ngày giữa hai mốc', 'cộng thêm ngày vào ngày hiện tại'],
    inputProfiles: ['dates'], expectedOutcome: 'Khoảng cách hoặc ngày sau khi cộng', risk: 'low',
  },
]

// Curated corrections avoid turning unrelated short Vietnamese words into matches.
export const SEARCH_TYPOS: Readonly<Record<string, string>> = { pfd: 'pdf', pdff: 'pdf', gpeh: 'ghep', ghepp: 'ghep', dungluong: 'dung luong', vanban: 'van ban', qrcode: 'qr' }
