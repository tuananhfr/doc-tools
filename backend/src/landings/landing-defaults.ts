import type { LandingDoc } from './landing-content'

/**
 * A new page starts from the office homepage copy so staff edit text instead of facing empty
 * fields. Pictures stay null: the page then shows the bundled homepage artwork for each slot.
 */
export function defaultLandingDoc(): LandingDoc {
  return {
    v: 1,
    theme: { accent: '#005be8', mode: 'light', logo: null },
    canonicalUrl: '',
    meta: { title: 'Chuyện Nhỏ | Công cụ cho những việc mỗi ngày', description: 'Công cụ cho tài liệu, hình ảnh và cuộc sống, mở ngay trong trình duyệt.' },
    hero: { title: 'Việc nhỏ mỗi ngày,', highlight: 'giải quyết nhẹ nhàng.', body: 'Công cụ cho tài liệu, hình ảnh và cuộc sống.', cta: 'Mở công cụ', image: null },
    tools: {
      title: 'Tài liệu gọn gàng. Công việc nhẹ hơn.', body: 'Những công cụ thiết thực cho tài liệu mỗi ngày.', image: null,
      items: [
        { slug: 'chinh-sua-pdf', title: 'Chỉnh sửa PDF', body: 'Sửa chữ, đánh dấu và sắp xếp trang.' },
        { slug: 'ghep-pdf', title: 'Ghép PDF', body: 'Gộp nhiều tệp thành một tài liệu.' },
        { slug: 'tach-pdf', title: 'Tách PDF', body: 'Trích trang bạn cần thành một tệp riêng.' },
      ],
    },
    cases: {
      title: 'Một nơi cho những việc nhỏ.', body: 'Từ tài liệu công việc đến tiện ích mỗi ngày.',
      items: [
        { title: 'Tài liệu & PDF', body: 'Chỉnh sửa, ghép và chuyển đổi tài liệu.', image: null, target: 'tai-lieu-pdf', linkLabel: 'Xem công cụ' },
        { title: 'Ảnh & video', body: 'Chỉnh ảnh, nén video, tạo GIF.', image: null, target: 'cong-cu', linkLabel: 'Xem công cụ' },
        { title: 'Tiện ích đời sống', body: 'Tính toán, tra cứu và sắp xếp công việc.', image: null, target: 'gia-dinh', linkLabel: 'Xem công cụ' },
      ],
    },
    steps: {
      title: 'Bắt đầu thật đơn giản.', body: 'Mở trình duyệt và chọn việc bạn cần làm.', note: 'Các công cụ Free có thể dùng ngay, không cần tài khoản.',
      items: [
        { title: 'Chọn công cụ', body: 'Tìm tiện ích phù hợp với việc cần làm.' },
        { title: 'Thêm dữ liệu', body: 'Chọn tệp hoặc nhập thông tin.' },
        { title: 'Nhận kết quả', body: 'Xem lại và tải kết quả về máy.' },
      ],
    },
    privacy: {
      title: 'Dữ liệu của bạn. Bạn chủ động quyết định.', body: 'Biết rõ dữ liệu được xử lý ở đâu trước khi sử dụng.', image: null,
      items: [
        { title: 'Công cụ xử lý cục bộ', body: 'Tệp được xử lý ngay trong trình duyệt với các công cụ cục bộ.' },
        { title: 'AI và lưu trữ online', body: 'Có luồng gửi dữ liệu riêng, được thông báo trước.' },
        { title: 'Chủ động lựa chọn', body: 'Xem thông tin xử lý dữ liệu của từng công cụ.' },
      ],
    },
    closing: { title: 'Bớt việc lặt vặt. Thêm thời gian cho điều quan trọng.', body: 'Bắt đầu từ một công cụ nhỏ hôm nay.', image: null },
    footer: { tagline: 'Việc nhỏ mỗi ngày, giải quyết nhẹ nhàng.' },
  }
}
