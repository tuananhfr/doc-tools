import type { HubPage, HubPageSlug } from '../types/hub-page.types'

/**
 * Ba trang nhóm theo mockup. Thẻ lấy từ danh mục bằng id, nên trạng thái
 * "Dùng ngay / Sắp có" và nơi xử lý luôn khớp `tool-list.ts`, không ghi lại ở đây.
 * Một công cụ được nằm ở nhiều nhóm con; lưới "Tất cả" tự bỏ trùng.
 */
export const HUB_PAGES: Record<HubPageSlug, HubPage> = {
  'xay-dung': {
    slug: 'xay-dung',
    label: 'Công cụ xây dựng',
    title: 'Công cụ xây dựng',
    titleAccent: 'xây dựng',
    tagline: 'Tra cứu. Tính toán. Kiểm tra. Đơn giản mà hiệu quả.',
    description: 'Bộ công cụ miễn phí cho kỹ sư, kiến trúc sư, nhà thầu và chủ nhà, từ lúc lên ý tưởng đến khi thi công và hoàn công.',
    metaTitle: 'Công cụ xây dựng miễn phí | Chuyện Nhỏ',
    metaDescription: 'Khái toán chi phí xây nhà, xác định hướng nhà, đo kích thước trên ảnh và các công cụ tra cứu xây dựng sắp ra mắt. Miễn phí, không cần tài khoản.',
    caption: 'Công việc xây dựng\nđơn giản hơn mỗi ngày!',
    art: { kind: 'image', src: '/brand/skyline-hero-v1.png', width: 1792, height: 896 },
    highlights: ['Khái toán', 'Quy hoạch', 'Giá xây dựng', 'Pháp lý', 'Tiêu chuẩn', 'Kiểm hồ sơ', 'Hiện trường'],
    trust: [
      { icon: 'gift', title: 'Miễn phí', detail: 'Dùng ngay, không chi phí ẩn' },
      { icon: 'lightning-charge', title: 'Không cần cài đặt', detail: 'Chạy ngay trên trình duyệt' },
      { icon: 'shield-check', title: 'Tính trên máy bạn', detail: 'Số liệu nhập vào không rời thiết bị' },
      { icon: 'heart', title: 'Cho việc thực tế', detail: 'Từ chủ nhà đến nhà thầu' },
    ],
    searchPlaceholder: 'Tìm công cụ xây dựng… (ví dụ: khái toán, hướng nhà, quy hoạch)',
    subgroups: [
      { id: 'khai-toan', label: 'Khái toán & tính toán', toolIds: ['house-estimate', 'structure-calc'] },
      { id: 'quy-hoach', label: 'Quy hoạch & hướng nhà', toolIds: ['planning-lookup', 'house-orientation'] },
      { id: 'gia-vat-lieu', label: 'Giá & vật liệu', toolIds: ['construction-price', 'supplier-lookup'] },
      { id: 'phap-ly', label: 'Pháp lý & tiêu chuẩn', toolIds: ['construction-law', 'construction-standards'] },
      { id: 'ban-ve', label: 'Bản vẽ & hồ sơ', toolIds: ['measure-image', 'dossier-check', 'drawing-convert', 'drawing-area'] },
      { id: 'hien-truong', label: 'Hiện trường', toolIds: ['site-diary'] },
    ],
    aside: [
      {
        kind: 'product',
        product: 'erpcons',
        title: 'Bạn cần nhiều hơn một công cụ?',
        description: 'Quản lý toàn bộ dự án, chi phí, hợp đồng, hồ sơ và mua hàng trên một nền tảng.',
        points: ['Công việc · Dự án · Hợp đồng', 'Chi phí · Ngân sách · Mua hàng', 'Hồ sơ · Tài liệu · Phê duyệt', 'Trợ lý AI hỏi đáp dữ liệu'],
      },
      {
        kind: 'product',
        product: 'tekshot',
        title: 'Ghi nhận hiện trường thông minh hơn?',
        description: 'Camera, ảnh hiện trường và nhận diện AI, kết nối thẳng với dự án.',
        points: ['Vision · Camera · Hiện trường', 'Studio · Nội dung · Báo cáo', 'Insight · Thị trường', 'Central · Tổng hợp & vận hành'],
      },
      { kind: 'support' },
    ],
    journey: {
      title: 'Từ ý tưởng đến công trình. Chúng tôi luôn đồng hành.',
      motto: 'Công cụ nhỏ.\nGiá trị lớn!',
      flow: true,
      steps: [
        { icon: 'lightbulb', title: 'Ý tưởng', detail: 'Quy hoạch · Hướng nhà' },
        { icon: 'rulers', title: 'Thiết kế', detail: 'Tiêu chuẩn · Kiểm hồ sơ' },
        { icon: 'calculator', title: 'Dự toán', detail: 'Khái toán · Giá xây dựng' },
        { icon: 'cone-striped', title: 'Thi công', detail: 'Nhật ký hiện trường' },
        { icon: 'house-check', title: 'Hoàn công', detail: 'Hồ sơ · Lưu trữ' },
      ],
    },
  },

  'gia-dinh': {
    slug: 'gia-dinh',
    label: 'Công cụ gia đình',
    title: 'Công cụ cho gia đình',
    titleAccent: 'gia đình',
    tagline: 'Những việc nhỏ, hạnh phúc lớn.',
    description: 'Tiện ích đơn giản giúp sắp xếp lịch chung, nhắc việc, tính chi tiêu trong nhà. Để cả nhà cùng nhịp sống, cùng vui mỗi ngày.',
    metaTitle: 'Công cụ cho gia đình miễn phí | Chuyện Nhỏ',
    metaDescription: 'Lịch Gia Đình, lịch âm dương, tiền điện nước, chia tiền nhóm, hướng nhà và các tiện ích gia đình sắp ra mắt. Miễn phí, dữ liệu lưu trên thiết bị của bạn.',
    caption: 'Hôm nay nhà mình\ncó gì vui?',
    art: { kind: 'icon', icon: 'house-heart' },
    highlights: ['Sắp xếp lịch chung', 'Nhắc việc & quan tâm', 'Tính chi tiêu trong nhà', 'Cả nhà cùng nhịp sống'],
    trust: [
      { icon: 'heart', title: 'Miễn phí', detail: 'Dùng ngay, không chi phí ẩn' },
      { icon: 'lightning-charge', title: 'Không cần cài đặt', detail: 'Chạy ngay trên trình duyệt' },
      { icon: 'shield-check', title: 'Riêng tư', detail: 'Dữ liệu lưu trên thiết bị của bạn' },
      { icon: 'phone', title: 'Dùng tốt trên', detail: 'Điện thoại và máy tính' },
    ],
    searchPlaceholder: 'Tìm công cụ gia đình… (ví dụ: lịch, nhắc việc, tiền điện)',
    subgroups: [
      { id: 'lich', label: 'Lịch & nhắc việc', toolIds: ['family-calendar', 'lunar-calendar', 'family-reminders', 'special-days'] },
      { id: 'chi-tieu', label: 'Chi tiêu', toolIds: ['electricity', 'group-split', 'family-budget'] },
      { id: 'nha-cua', label: 'Nhà cửa', toolIds: ['house-orientation', 'house-chores'] },
      { id: 'hoc-tap', label: 'Học tập', toolIds: ['flashcards', 'study'] },
      { id: 'suc-khoe', label: 'Sức khỏe', toolIds: ['family-health'] },
      { id: 'ket-noi', label: 'Kết nối', toolIds: ['family-share', 'family-album'] },
    ],
    aside: [
      {
        kind: 'spotlight',
        toolId: 'family-calendar',
        title: 'Lịch Gia Đình',
        subtitle: 'Hôm nay nhà mình có gì?',
        points: ['Lịch học, lịch làm việc, lịch gia đình', 'Danh sách việc và liên hệ khẩn cấp', 'Lưu trên máy, sao lưu khi cần', 'Xuất lịch sang điện thoại (ICS)'],
      },
      {
        kind: 'spotlight',
        toolId: 'house-orientation',
        title: 'Hướng nhà & la bàn',
        subtitle: 'Chọn hướng tốt, an tâm hơn',
        points: ['Xác định hướng nhà, hướng đất', 'La bàn ngay trên điện thoại', 'Tra cứu nhanh, dễ dùng'],
      },
      { kind: 'support' },
    ],
    journey: {
      title: 'Vì một gia đình hạnh phúc mỗi ngày',
      motto: 'Chuyện nhỏ.\nTạo hạnh phúc lớn!',
      flow: false,
      steps: [
        { icon: 'calendar-check', title: 'Sắp xếp tốt hơn', detail: 'Thời gian, công việc, cuộc sống' },
        { icon: 'people', title: 'Gắn kết hơn', detail: 'Cả nhà cùng chia sẻ' },
        { icon: 'emoji-smile', title: 'Quan tâm hơn', detail: 'Sức khỏe, học tập, sinh hoạt' },
        { icon: 'star', title: 'Hạnh phúc hơn', detail: 'Từ những điều nhỏ mỗi ngày' },
      ],
    },
  },

  'tai-lieu-pdf': {
    slug: 'tai-lieu-pdf',
    label: 'Tài liệu & PDF',
    title: 'Công cụ Tài liệu & PDF',
    titleAccent: 'Tài liệu & PDF',
    tagline: 'Sửa. Chuyển đổi. Gộp tách. Ký. Nén. Nhanh và miễn phí.',
    description: 'Xử lý văn bản, PDF và ảnh chụp tài liệu một cách đơn giản. Dùng ngay trên trình duyệt, không cần cài đặt, tệp không rời thiết bị.',
    metaTitle: 'Công cụ PDF miễn phí: ghép, tách, nén, OCR, ký | Chuyện Nhỏ',
    metaDescription: 'Ghép, tách, nén, chỉnh sửa, ký, chuyển PDF sang Word và nhận dạng chữ tiếng Việt. Miễn phí, không cần tài khoản, tệp xử lý ngay trên thiết bị.',
    caption: 'Việc tài liệu\ngiờ thật đơn giản!',
    art: { kind: 'image', src: '/brand/documents-hero-v1.png', width: 1280, height: 1280 },
    highlights: ['Sửa nội dung PDF', 'Gộp, tách, nén', 'Chuyển đổi định dạng', 'Ký tài liệu', 'OCR văn bản', 'So sánh tài liệu', 'Che thông tin nhạy cảm'],
    trust: [
      { icon: 'gift', title: 'Miễn phí', detail: 'Dùng ngay, không chi phí ẩn' },
      { icon: 'lightning-charge', title: 'Không cần cài đặt', detail: 'Chạy ngay trên trình duyệt' },
      { icon: 'shield-check', title: 'Bảo mật, riêng tư', detail: 'Tệp xử lý ngay trên thiết bị' },
      { icon: 'files', title: 'Nhiều định dạng', detail: 'PDF, Word, Excel, ảnh' },
    ],
    searchPlaceholder: 'Tìm công cụ tài liệu… (ví dụ: nén PDF, ghép PDF, OCR, ký)',
    subgroups: [
      { id: 'sua', label: 'Sửa & sắp xếp', toolIds: ['edit-pdf', 'view-pdf', 'organize-pdf', 'page-numbers', 'stamp-pdf'] },
      { id: 'gop-tach', label: 'Gộp, tách, nén', toolIds: ['merge-pdf', 'split-pdf', 'compress-pdf'] },
      { id: 'chuyen-doi', label: 'Chuyển đổi', toolIds: ['scan-to-pdf', 'convert-file', 'pdf-to-image'] },
      { id: 'ocr', label: 'OCR & so sánh', toolIds: ['ocr', 'image-to-text', 'compare'] },
      { id: 'ky-bao-mat', label: 'Ký & bảo mật', toolIds: ['sign', 'pdf-password', 'redact-pdf'] },
      { id: 'soan-thao', label: 'Soạn văn bản', toolIds: ['form-templates', 'cv'] },
    ],
    aside: [
      {
        kind: 'product',
        product: 'erpcons',
        title: 'Xử lý tài liệu nhanh hơn với ERPCons',
        description: 'Quản lý hồ sơ, tài liệu, hợp đồng, phiên bản và phê duyệt trên một nền tảng.',
        points: ['Lưu trữ tập trung', 'Phân quyền & chia sẻ', 'Theo dõi phiên bản', 'Gắn với công việc & dự án'],
      },
      {
        kind: 'tips',
        title: 'Mẹo nhanh',
        items: ['Kéo thả tệp vào vùng công cụ.', 'Chọn tùy chọn phù hợp.', 'Tải kết quả về máy.', 'Đóng tab là tệp biến mất khỏi trình duyệt.'],
      },
      { kind: 'privacy' },
      { kind: 'support' },
    ],
    journey: {
      title: 'Từ tài liệu đến công việc. Chúng tôi luôn đồng hành.',
      motto: 'Việc lớn bắt đầu\ntừ những việc nhỏ!',
      flow: true,
      steps: [
        { icon: 'file-earmark-pdf', title: 'Tài liệu', detail: 'PDF, Word, Excel' },
        { icon: 'folder2-open', title: 'Lưu trữ', detail: 'Hồ sơ tập trung' },
        { icon: 'people', title: 'Chia sẻ', detail: 'Với đồng nghiệp' },
        { icon: 'patch-check', title: 'Phê duyệt', detail: 'Nhanh chóng' },
        { icon: 'bar-chart', title: 'Theo dõi', detail: 'Phiên bản, lịch sử' },
      ],
    },
  },
}

export const HUB_PAGE_LIST: HubPage[] = Object.values(HUB_PAGES)
