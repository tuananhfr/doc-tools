import { SUPPORT_EMAIL } from './site-navigation'

export interface FaqItem {
  id: string
  question: string
  /** Văn bản thuần: dùng lại nguyên văn cho JSON-LD FAQPage. */
  answer: string
  link?: { to: string; label: string }
}

/**
 * Câu trả lời về dữ liệu phải khớp code (đếm lượt, góp ý, lưu trên trình duyệt);
 * đổi luồng dữ liệu thì sửa cả đây, `/xu-ly-du-lieu` và `/quyen-rieng-tu`.
 */
export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    id: 'mien-phi',
    question: 'Chuyện Nhỏ có miễn phí không?',
    answer: 'Có. Mọi công cụ đang chạy đều miễn phí, không giới hạn lượt dùng và không cần tài khoản. Khi đội nhóm cần lưu trữ, chia sẻ và phê duyệt tài liệu lâu dài, ERPCons là bản trả phí dành cho việc đó.',
  },
  {
    id: 'tai-khoan',
    question: 'Tôi có cần tạo tài khoản không?',
    answer: 'Không. Bạn vào trang, chọn công cụ và dùng ngay. Chuyện Nhỏ không có đăng ký, không hỏi tên, email hay số điện thoại.',
  },
  {
    id: 'luu-tep',
    question: 'Tệp của tôi có bị tải lên hay lưu lại không?',
    answer: 'Không. Tệp PDF, ảnh, video bạn mở chỉ nằm trong tab trình duyệt và được xử lý ngay trên máy bạn. Chúng tôi không nhận tệp. Đóng tab là tệp biến mất khỏi trình duyệt; kết quả chỉ có khi bạn tải về.',
  },
  {
    id: 'may-chu',
    question: 'Vì sao một số công cụ ghi “Xử lý trên máy chủ”?',
    answer: 'Một số công cụ sắp ra mắt cần dữ liệu lớn hoặc cập nhật liên tục, như giá xây dựng hay quy hoạch, nên phải tra cứu trên máy chủ. Thẻ của chúng ghi rõ điều này để bạn biết trước. Các công cụ đang dùng được hiện đều xử lý trên thiết bị.',
    link: { to: '/xu-ly-du-lieu', label: 'Xem từng công cụ xử lý ở đâu' },
  },
  {
    id: 'cai-dat',
    question: 'Làm thế nào để cài Chuyện Nhỏ trên điện thoại?',
    answer: 'Mở Chuyện Nhỏ bằng Chrome (Android) hoặc Safari (iPhone, iPad), rồi chọn “Thêm vào màn hình chính”. Trên máy tính, bấm biểu tượng cài đặt ở thanh địa chỉ của Chrome hoặc Edge.',
    link: { to: '/cai-dat', label: 'Hướng dẫn cài từng thiết bị' },
  },
  {
    id: 'offline',
    question: 'Tôi có dùng Chuyện Nhỏ khi không có Internet được không?',
    answer: 'Sau lần mở đầu tiên có mạng, trình duyệt lưu sẵn trang và mã của công cụ nên thường vẫn mở lại được khi mạng chập chờn. Phần nặng như nhận dạng chữ hay xử lý video được tải về ở lần dùng đầu, nên hãy dùng thử một lần khi có mạng.',
  },
  {
    id: 'loi',
    question: 'Tôi gặp lỗi, phải làm sao?',
    answer: `Hãy tải lại trang và dùng bản mới của Chrome, Edge hoặc Safari. Tệp quá lớn hoặc bị khoá mật khẩu cũng có thể làm công cụ dừng; công cụ sẽ báo lý do ngay trên màn hình. Nếu vẫn lỗi, gửi thư tới ${SUPPORT_EMAIL}, kèm tên công cụ, trình duyệt bạn dùng và mô tả lỗi.`,
  },
  {
    id: 'an-toan',
    question: 'Chuyện Nhỏ có an toàn không?',
    answer: 'Trang chạy qua kết nối mã hoá (HTTPS), không dùng cookie, không gắn công cụ quảng cáo hay theo dõi của bên thứ ba. Tệp của bạn không rời thiết bị.',
    link: { to: '/xu-ly-du-lieu', label: 'Cách chúng tôi xử lý dữ liệu' },
  },
  {
    id: 'thu-thap',
    question: 'Chuyện Nhỏ có thu thập thông tin cá nhân của tôi không?',
    answer: 'Gần như không. Khi bạn mở một công cụ, trình duyệt báo tên công cụ để chúng tôi đếm tổng lượt dùng; địa chỉ IP chỉ được băm một chiều để chống gửi tự động và tự xoá sau khoảng 1 giờ. Nội dung góp ý chỉ gửi đi khi bạn đánh dấu đồng ý và bấm Gửi.',
    link: { to: '/quyen-rieng-tu', label: 'Đọc chính sách quyền riêng tư' },
  },
  {
    id: 'xoa-du-lieu',
    question: 'Làm thế nào để xoá dữ liệu của tôi?',
    answer: `Dữ liệu bạn lưu trong công cụ (Lịch Gia Đình, ghi chú, nháp CV, thẻ ghi nhớ) nằm trên máy bạn: xoá ngay trong công cụ, hoặc xoá dữ liệu trang web trong cài đặt trình duyệt. Muốn xoá góp ý đã gửi, hãy gửi thư tới ${SUPPORT_EMAIL} kèm mã biên nhận.`,
  },
  {
    id: 'ben-thu-ba',
    question: 'Dữ liệu có được chia sẻ với bên thứ ba không?',
    answer: 'Không. Chúng tôi không bán và không chia sẻ dữ liệu cho quảng cáo. Riêng công cụ Ghi âm thành văn bản dùng tính năng nhận dạng giọng nói của chính trình duyệt, nên âm thanh đi tới nhà cung cấp trình duyệt (ví dụ Google với Chrome), không qua máy chủ của chúng tôi.',
  },
  {
    id: 'de-xuat',
    question: 'Tôi muốn đề xuất một công cụ mới?',
    answer: 'Rất hoan nghênh. Hãy dùng công cụ Đề xuất tiện ích: bạn nhận một mã biên nhận để tra cứu tình trạng xem xét sau đó.',
    link: { to: '/de-xuat-tien-ich', label: 'Mở Đề xuất tiện ích' },
  },
]

/** Câu hỏi lặp lại ở cuối trang "Cách xử lý dữ liệu". */
export const DATA_FAQ_IDS = ['thu-thap', 'luu-tep', 'may-chu', 'xoa-du-lieu', 'ben-thu-ba', 'offline'] as const
