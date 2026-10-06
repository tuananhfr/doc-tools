export type GuideGroupId = 'tai-lieu' | 'hinh-anh-qr' | 'xay-dung' | 'gia-dinh'

export interface GuideStep {
  title: string
  detail: string
}

export interface Guide {
  slug: string
  /** Công cụ đầu tiên là công cụ chính: nút "Mở công cụ" và icon của bài. */
  toolIds: [string, ...string[]]
  group: GuideGroupId
  title: string
  summary: string
  minutes: number
  intro: string
  steps: readonly GuideStep[]
  tips: readonly string[]
  notes: readonly string[]
}

export const GUIDE_GROUPS: readonly { id: GuideGroupId; label: string; icon: string }[] = [
  { id: 'tai-lieu', label: 'Tài liệu & PDF', icon: 'file-earmark-pdf' },
  { id: 'hinh-anh-qr', label: 'Mã QR & mã vạch', icon: 'qr-code' },
  { id: 'xay-dung', label: 'Xây dựng', icon: 'building' },
  { id: 'gia-dinh', label: 'Gia đình', icon: 'house-heart' },
]

/**
 * Nhãn nút trong ngoặc kép phải khớp chữ trên màn hình công cụ; đổi nhãn ở
 * công cụ thì sửa cả bài. Bản nháp 06/10/2026, chờ duyệt nội dung.
 */
export const GUIDES: readonly Guide[] = [
  {
    slug: 'nen-pdf',
    toolIds: ['compress-pdf'],
    group: 'tai-lieu',
    title: 'Nén PDF cho nhẹ để gửi email',
    summary: 'Giảm dung lượng tệp scan, tệp chụp từ điện thoại mà vẫn đọc rõ.',
    minutes: 1,
    intro: 'Nén PDF giảm dung lượng bằng cách nén lại ảnh chụp, ảnh scan bên trong tệp. Tệp được xử lý ngay trên máy bạn, không tải lên đâu cả.',
    steps: [
      { title: 'Chọn tệp PDF', detail: 'Mở Nén PDF, bấm “Chọn tệp” hoặc kéo thả tệp vào khung. Chọn được nhiều tệp một lúc, mỗi tệp tối đa 100 MB.' },
      { title: 'Chọn mức nén', detail: '“Vừa” giữ ảnh đủ nét để in A4. “Mạnh” cho tệp nhẹ nhất, hợp gửi email hoặc xem trên màn hình.' },
      { title: 'Bấm “Nén PDF”', detail: 'Chọn nhiều tệp thì nút ghi số tệp, ví dụ “Nén 3 tệp”. Thanh tiến trình hiện ra; bấm “Huỷ” nếu muốn dừng.' },
      { title: 'Tải kết quả', detail: 'Bấm “Tải về”. Một tệp sẽ có tên “<tên tệp> - đã nén.pdf”; nhiều tệp được gói vào một tệp .zip. Bạn có thể “Xem trước” hoặc “Sửa tiếp” trước khi tải.' },
    ],
    tips: [
      'Tệp scan và tệp chụp từ điện thoại nén được nhiều nhất.',
      'Gửi email thì chọn “Mạnh”, cần in thì chọn “Vừa”.',
      'Tệp có mật khẩu: công cụ hỏi mật khẩu để mở trước khi nén.',
    ],
    notes: [
      'Tệp toàn chữ, như tệp xuất từ Word, thường không nhỏ hơn được. Khi đó màn hình báo “Không nén thêm được” và bạn nên giữ tệp gốc.',
      'Ảnh PNG và ảnh trắng đen được giữ nguyên để chữ không bị nhoè.',
      'Mỗi lượt nhận tối đa 100 tệp, 500 trang và 300 MB tổng cộng.',
    ],
  },
  {
    slug: 'scan-anh-sang-pdf',
    toolIds: ['scan-to-pdf'],
    group: 'tai-lieu',
    title: 'Scan giấy tờ bằng điện thoại thành PDF',
    summary: 'Chụp hoặc chọn ảnh, cắt khung, gộp thành một tệp PDF nhiều trang.',
    minutes: 2,
    intro: 'Không cần máy scan: chụp giấy tờ bằng camera điện thoại, cắt cho gọn rồi gộp thành một tệp PDF. Ảnh chỉ nằm trên máy bạn.',
    steps: [
      { title: 'Chọn hoặc chụp ảnh', detail: 'Mở Scan ảnh → PDF. Bấm “Chọn tệp” để lấy ảnh có sẵn (JPG, PNG), hoặc “Chụp ảnh” để chụp bằng camera sau.' },
      { title: 'Chụp và cắt khung', detail: 'Mỗi lần chụp được tối đa 50 ảnh. Chạm vào ảnh nhỏ để cắt khung hoặc xoá; chỗ tối thì bấm “Bật đèn”. Xong bấm nút “Dùng” kèm số ảnh.' },
      { title: 'Sắp lại thứ tự', detail: 'Mỗi ảnh là một trang. Đổi thứ tự các trang cho đúng trước khi tạo.' },
      { title: 'Chọn khổ giấy và lề', detail: 'Ở mục “Trang ảnh”, chọn “Khổ giấy” (A4, A3, Letter hoặc “Vừa ảnh”) và “Lề” (không lề, 10 mm hoặc 20 mm).' },
      { title: 'Tạo và tải PDF', detail: 'Bấm “Tạo PDF” rồi “Tải về”. Ảnh điện thoại bị xoay sẽ được tự dựng thẳng.' },
    ],
    tips: [
      'Chụp thẳng từ trên xuống, đặt giấy trên nền tối và đủ sáng.',
      'Chọn “Vừa ảnh” để giữ nguyên tỉ lệ ảnh, không thêm viền trắng.',
      'Muốn tệp nhẹ hơn, chạy tiếp Nén PDF. Muốn tìm được chữ, chạy tiếp OCR văn bản.',
    ],
    notes: [
      'Camera chỉ chạy khi trang mở bằng HTTPS. Nếu trình duyệt chặn camera, bấm biểu tượng ổ khoá trên thanh địa chỉ để cho phép rồi thử lại.',
      'Hiện chỉ nhận ảnh JPG và PNG.',
    ],
  },
  {
    slug: 'tach-pdf',
    toolIds: ['split-pdf'],
    group: 'tai-lieu',
    title: 'Tách PDF hoặc lấy riêng vài trang',
    summary: 'Cắt một tệp PDF thành nhiều tệp theo khoảng trang hoặc theo số trang.',
    minutes: 1,
    intro: 'Tách PDF giúp lấy riêng phụ lục, một vài trang cần gửi, hoặc chia tệp dài thành nhiều phần đều nhau.',
    steps: [
      { title: 'Chọn tệp PDF', detail: 'Mở Tách PDF và chọn một tệp PDF.' },
      { title: 'Chọn cách tách', detail: '“Theo khoảng trang”: nhập ví dụ 1-3, 5, 8-10; mỗi nhóm cách nhau bằng dấu phẩy thành một tệp. “Mỗi N trang một tệp”: nhập số trang cho mỗi tệp.' },
      { title: 'Bấm tách', detail: 'Nút đổi theo lựa chọn: “Lấy trang ra tệp riêng” khi chỉ có một nhóm, hoặc “Tách thành” kèm số tệp khi có nhiều nhóm.' },
      { title: 'Tải về', detail: 'Một nhóm cho ra một tệp PDF. Nhiều nhóm được gói trong một tệp .zip, tên mỗi phần ghi rõ số trang.' },
    ],
    tips: [
      'Chỉ cần trang 5: nhập “5”.',
      'Tách hợp đồng theo phụ lục: nhập từng khoảng trang của mỗi phụ lục, cách nhau dấu phẩy.',
      'Cần xoá, xoay hay sắp lại trang: bấm “Sửa tiếp” để mở trình chỉnh sửa PDF.',
    ],
    notes: [
      'Tệp chỉ có một trang thì không có gì để tách.',
      'Số trang nằm ngoài tệp sẽ được báo ngay dưới ô nhập.',
    ],
  },
  {
    slug: 'ocr-van-ban',
    toolIds: ['ocr', 'image-to-text'],
    group: 'tai-lieu',
    title: 'Nhận dạng chữ tiếng Việt từ bản scan (OCR)',
    summary: 'Biến bản scan thành PDF tìm được chữ, hoặc lấy chữ ra để sao chép.',
    minutes: 3,
    intro: 'OCR đọc chữ trong ảnh và bản scan. Bộ nhận dạng tiếng Việt chạy ngay trên máy bạn; tệp không được gửi đi.',
    steps: [
      { title: 'Chọn bản scan hoặc ảnh', detail: 'Mở OCR văn bản, chọn tệp PDF scan hoặc ảnh JPG, PNG. Chọn được nhiều tệp và đổi thứ tự.' },
      { title: 'Chọn kiểu kết quả', detail: '“PDF tìm được chữ” giữ nguyên hình trang và thêm lớp chữ để tìm (Ctrl+F), sao chép. “Văn bản (.txt)” chỉ lấy phần chữ.' },
      { title: 'Bấm “Nhận dạng chữ”', detail: 'Lần đầu, công cụ tải bộ nhận dạng tiếng Việt (khoảng 1,4 MB) từ chính trang này. Sau đó mỗi trang mất vài giây.' },
      { title: 'Tải hoặc sao chép', detail: 'Bản PDF tải về có tên “<tên tệp> - OCR.pdf”. Bản văn bản hiện trong khung “Nội dung văn bản”; bấm “Sao chép” để dán sang nơi khác.' },
    ],
    tips: [
      'Ảnh chụp thẳng, rõ nét, chữ đủ lớn cho kết quả tốt nhất.',
      'Trang đã có sẵn lớp chữ được bỏ qua, không đọc lại.',
      'Chỉ cần lấy chữ từ một tấm ảnh: dùng Ảnh → Văn bản, nhanh hơn.',
    ],
    notes: [
      'Hiện chỉ nhận dạng tiếng Việt.',
      'OCR có thể đọc sai, nhất là ảnh mờ hoặc chữ viết tay. Hãy soát lại trước khi dùng.',
      'Lần đầu cần có mạng để tải bộ nhận dạng.',
    ],
  },
  {
    slug: 'tao-va-doc-ma-qr',
    toolIds: ['qr-create', 'barcode-create', 'qr-read'],
    group: 'hinh-anh-qr',
    title: 'Tạo mã QR, mã vạch và quét mã',
    summary: 'Tạo QR Wi-Fi, danh thiếp, mã vạch in hàng loạt, và đọc mã từ ảnh hoặc camera.',
    minutes: 2,
    intro: 'Ba công cụ dùng chung một bộ thẻ: “Tạo mã QR”, “Tạo mã vạch” và “Quét mã”. Mọi thứ chạy trên máy bạn.',
    steps: [
      { title: 'Tạo mã QR', detail: 'Mở Tạo QR Code, chọn “Loại mã”: đường dẫn, văn bản, Wi-Fi, số điện thoại, email hoặc danh thiếp. Mã tự vẽ lại ngay khi bạn gõ.' },
      { title: 'Chọn màu và tải', detail: 'Chọn màu ở “Màu sắc”, rồi bấm “Tải mã QR” để lấy ảnh PNG, hoặc “Tải bản SVG để in” cho bản in sắc nét.' },
      { title: 'Tạo mã vạch', detail: 'Mở Tạo mã vạch, chọn loại (Code 128, Code 39, EAN-13, EAN-8, ITF-14) và nhập “Giá trị”. Cần nhiều mã: chọn “Hàng loạt” rồi nạp tệp CSV hoặc Excel, tối đa 500 dòng.' },
      { title: 'Quét mã', detail: 'Mở Đọc mã QR/Barcode, chọn ảnh có mã, dán ảnh bằng Ctrl+V, hoặc bấm “Quét bằng camera”. Mã được đọc tự động, không cần bấm.' },
      { title: 'Dùng kết quả', detail: 'Bấm “Sao chép”, mở đường dẫn, hoặc “Chép mật khẩu” với mã Wi-Fi.' },
    ],
    tips: [
      'QR Wi-Fi dán ở quầy: khách quét là vào mạng, không cần đọc mật khẩu.',
      'In mã vạch cỡ nhỏ: in thử một tem trước khi in cả lô.',
      'Khi quét mã EAN, công cụ kiểm tra luôn số cuối để phát hiện mã in hỏng.',
    ],
    notes: [
      'Số EAN và ITF-14 cho hàng bán lẻ phải do GS1 Việt Nam cấp.',
      'Xem kỹ đường dẫn trước khi mở: ai cũng in được một mã QR rồi dán đè lên mã thật.',
      'Mật khẩu Wi-Fi WPA cần ít nhất 8 ký tự.',
    ],
  },
  {
    slug: 'xem-huong-nha',
    toolIds: ['house-orientation'],
    group: 'xay-dung',
    title: 'Xem hướng nhà bằng la bàn điện thoại hoặc bản vẽ',
    summary: 'Đo hướng nhà, cửa chính, bếp, bàn thờ và lưu lại thành ảnh hoặc PDF.',
    minutes: 3,
    intro: 'Hướng nhà & la bàn đo hướng bằng cảm biến của điện thoại, hoặc đọc từ ký hiệu hướng Bắc trên bản vẽ. Dữ liệu chỉ nằm trong tab đang mở.',
    steps: [
      { title: 'Chọn nguồn', detail: 'Ở bước “Bạn có gì trong tay?”, chọn ảnh hoặc bản vẽ (JPG, PNG, WebP, PDF), chụp ảnh mới, hoặc chọn mục chỉ dùng la bàn nếu không có ảnh.' },
      { title: 'Chọn cách lấy hướng', detail: '“Đo ngay” dùng la bàn của điện thoại. “Tôi biết số độ” để nhập số đo có sẵn. “Theo bản vẽ” khi đã có ảnh: chạm ký hiệu hướng Bắc rồi đặt trục nhà.' },
      { title: 'Đo bằng la bàn', detail: 'Bấm “Bắt đầu đo”, cầm máy nằm ngang, đứng xa cột thép, ô tô, cửa cuốn. Chờ nhãn “Ổn định” rồi bấm chốt số đo. Đứng ngoài nhìn vào nhà thì đánh dấu ô tương ứng.' },
      { title: 'Đo thêm các vị trí', detail: 'Ngoài hướng nhà, đo được cửa chính, ban công, bếp, bàn thờ, giường và các vị trí khác.' },
      { title: 'Lưu kết quả', detail: 'Ở “Lưu kết quả”, chọn ảnh hoặc PDF rồi bấm lưu.' },
    ],
    tips: [
      'Đo hai, ba lần ở các điểm khác nhau rồi so lại.',
      'Chế độ “Gia chủ” dễ đọc; “Chuyên môn” hiện nhiều số liệu hơn.',
      'iPhone hỏi quyền đọc cảm biến sau khi bấm “Bắt đầu đo”: hãy chọn Cho phép.',
    ],
    notes: [
      'Máy tính và nhiều trình duyệt không có cảm biến la bàn; khi đó chọn nhập số độ.',
      'La bàn chỉ chạy khi trang mở bằng HTTPS.',
      'Phần “Xem thêm theo tuổi” là tham khảo theo phong thuỷ dân gian (Bát trạch), không phải kết luận kỹ thuật.',
      'Kết quả không được lưu tự động: đóng tab là mất nếu chưa bấm lưu.',
    ],
  },
  {
    slug: 'khai-toan-xay-nha',
    toolIds: ['house-estimate'],
    group: 'xay-dung',
    title: 'Khái toán chi phí xây nhà phố',
    summary: 'Ước tính chi phí từ diện tích và đơn giá nhà thầu báo, cập nhật ngay khi gõ.',
    minutes: 2,
    intro: 'Khái toán quy đổi diện tích từng phần (móng, sàn, tum, sân thượng, mái) theo hệ số rồi nhân với đơn giá bạn nhập. Kết quả chỉ để tham khảo.',
    steps: [
      { title: 'Nhập diện tích', detail: 'Điền “Diện tích sàn trệt”, “Số lầu (không tính trệt)”, diện tích tum, sân thượng không mái và sân trước, sau.' },
      { title: 'Nhập đơn giá', detail: 'Điền “Đơn giá phần thô” và “Đơn giá hoàn thiện hoặc trọn gói” theo báo giá bạn có. Nếu đơn giá thứ hai đã gồm phần thô, đánh dấu ô tương ứng.' },
      { title: 'Chỉnh hệ số nếu cần', detail: 'Mở “Sửa hệ số theo báo giá nhà thầu” để đổi tỉ lệ tính diện tích. Mặc định móng 50%, mỗi tầng 100%, sân thượng và mái 50%.' },
      { title: 'Đọc kết quả', detail: 'Khung “Khái toán tham khảo” cập nhật ngay khi bạn gõ: diện tích quy đổi, chi phí từng hạng mục và tổng cộng.' },
    ],
    tips: [
      'Hỏi hai, ba nhà thầu để có đơn giá sát thực tế.',
      'Có khoản cọc thì nhập vào “Chi phí cọc” để thấy tổng đầy đủ.',
      'Công cụ không lưu số liệu: chụp màn hình nếu muốn giữ lại.',
    ],
    notes: [
      'Hệ số là quy ước tham khảo, không phải định mức nhà nước.',
      'Chưa gồm thiết kế, giấy phép, nội thất rời hoặc phát sinh địa chất.',
      'Công cụ không có sẵn đơn giá; mọi con số do bạn nhập.',
    ],
  },
  {
    slug: 'lich-gia-dinh',
    toolIds: ['family-calendar'],
    group: 'gia-dinh',
    title: 'Dùng Lịch Gia Đình: thêm việc, nhắc lịch, sao lưu',
    summary: 'Ghi lịch cho cả nhà, lưu số khẩn cấp và sao lưu, không cần tài khoản.',
    minutes: 5,
    intro: 'Lịch Gia Đình lưu ngay trên thiết bị này, không cần tài khoản. Chưa có chia sẻ hay đồng bộ qua mạng, nên hãy sao lưu định kỳ.',
    steps: [
      { title: 'Thêm thành viên', detail: 'Ở thẻ “Thành viên”, nhập “Tên gọi”, chọn hồ sơ Bố mẹ, Ông bà hoặc Con, rồi bấm “Thêm thành viên”. Hồ sơ Ông bà có chữ to và ít mục hơn.' },
      { title: 'Thêm việc', detail: 'Ở thẻ “Thêm”, nhập “Tên việc”, ngày, giờ, chọn loại việc, kiểu lặp lại và thành viên, rồi bấm “Lưu lịch trên thiết bị”.' },
      { title: 'Bật nhắc', detail: 'Nhập số phút nhắc trước (việc cần có giờ cụ thể), rồi bấm “Bật thông báo khi trang đang mở” và cho phép thông báo.' },
      { title: 'Xem lịch', detail: 'Thẻ “Lịch” có ba chế độ: Hôm nay, 7 ngày tới và 30 ngày tới. Bấm “Đã xong” khi xong việc.' },
      { title: 'Lưu liên hệ khẩn cấp', detail: 'Thẻ “SOS & liên hệ” lưu tên, số điện thoại người thân để gọi nhanh, kèm nút gọi 113 và 115.' },
      { title: 'Sao lưu', detail: 'Thẻ “Sao lưu” có “Tải bản sao lưu” (tệp đầy đủ để khôi phục), “Tải ICS” để nhập vào lịch điện thoại, và in lịch 30 ngày tới.' },
    ],
    tips: [
      'Dùng ô “Đang xem cho” để xem lịch của từng người.',
      'Sao lưu trước khi xoá dữ liệu trình duyệt hoặc đổi máy.',
      'Tệp ICS mở được bằng Google Calendar và lịch trên iPhone.',
    ],
    notes: [
      'Nhắc việc chỉ hiện khi trang đang mở.',
      'Tín hiệu SOS chỉ lưu trên thiết bị, chưa được gửi cho người thân.',
      'Xoá dữ liệu trình duyệt sẽ mất lịch nếu bạn chưa tải bản sao lưu.',
    ],
  },
]

export function findGuide(slug: string | undefined): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug)
}
