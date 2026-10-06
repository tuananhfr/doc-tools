import { SUPPORT_EMAIL } from './site-navigation'

export type LegalSlug = 'dieu-khoan' | 'quyen-rieng-tu'

export interface LegalSection {
  id: string
  heading: string
  paragraphs?: readonly string[]
  items?: readonly string[]
  link?: { to: string; label: string }
}

export interface LegalDocument {
  title: string
  titleAccent: string
  intro: string
  summary: readonly string[]
  sections: readonly LegalSection[]
}

export const LEGAL_UPDATED = '06/10/2026'

/**
 * Mục "dữ liệu xử lý" và "thời gian lưu" mô tả đúng code hiện tại (đếm lượt,
 * băm IP, góp ý có đồng ý). Đổi luồng dữ liệu là phải sửa chính sách này trước
 * khi phát hành: Luật 91/2025/QH15 coi thông báo sai là xử lý không hợp pháp.
 */
export const LEGAL_DOCUMENTS: Record<LegalSlug, LegalDocument> = {
  'dieu-khoan': {
    title: 'Điều khoản',
    titleAccent: 'sử dụng',
    intro: 'Điều khoản này áp dụng khi bạn dùng bộ công cụ miễn phí Chuyện Nhỏ do ERPCons & LPC (“chúng tôi”) vận hành. Dùng trang nghĩa là bạn đồng ý với các điều dưới đây.',
    summary: [
      'Miễn phí, không cần tài khoản.',
      'Tệp của bạn vẫn là của bạn và được xử lý trên máy bạn.',
      'Kết quả tính toán chỉ để tham khảo, hãy đối chiếu trước khi dùng.',
      'Không dùng công cụ để làm điều trái pháp luật.',
    ],
    sections: [
      {
        id: 'dich-vu',
        heading: 'Dịch vụ miễn phí',
        paragraphs: [
          'Chuyện Nhỏ cung cấp miễn phí các công cụ xử lý tài liệu, hình ảnh, tính toán và tiện ích hằng ngày, chạy ngay trong trình duyệt, không cần đăng ký.',
          'Chúng tôi có thể thêm, sửa, tạm ngừng hoặc dừng một công cụ bất cứ lúc nào. Công cụ ghi “Sắp có” là dự định, có thể thay đổi hoặc không ra mắt.',
        ],
      },
      {
        id: 'tep-cua-ban',
        heading: 'Tệp và nội dung của bạn',
        paragraphs: [
          'Bạn giữ toàn quyền với tệp và nội dung của mình. Các công cụ đang hoạt động xử lý tệp ngay trên thiết bị; chúng tôi không nhận và không lưu tệp của bạn.',
          'Bạn chịu trách nhiệm bảo đảm mình có quyền sử dụng, chỉnh sửa tệp đưa vào công cụ, và tự giữ bản gốc trước khi xử lý.',
        ],
      },
      {
        id: 'tham-khao',
        heading: 'Kết quả chỉ để tham khảo',
        paragraphs: ['Một số công cụ đưa ra con số hoặc kết luận dựa trên dữ liệu bạn nhập và quy ước phổ biến, ví dụ:'],
        items: [
          'Khái toán chi phí xây nhà, tính lương, tiền điện: không thay cho báo giá, bảng lương hay hoá đơn chính thức.',
          'Hướng nhà và phần xem theo tuổi: tham khảo theo phong thuỷ dân gian, không phải kết luận kỹ thuật.',
          'Nhận dạng chữ (OCR), chuyển đổi địa chỉ, tra cứu quy định: có thể sai sót, cần soát lại với văn bản gốc.',
        ],
      },
      {
        id: 'hanh-vi-cam',
        heading: 'Những việc không được làm',
        items: [
          'Dùng công cụ cho mục đích trái pháp luật, như làm giả giấy tờ, tạo mã QR lừa đảo.',
          'Gỡ mật khẩu hoặc chỉnh sửa tệp mà bạn không có quyền.',
          'Gửi tự động hàng loạt, dò quét, tấn công hoặc làm gián đoạn hệ thống.',
          'Gửi nội dung vi phạm pháp luật, xúc phạm người khác hoặc chứa thông tin cá nhân của người khác qua phần góp ý.',
        ],
      },
      {
        id: 'gop-y',
        heading: 'Góp ý và đề xuất',
        paragraphs: [
          'Khi gửi góp ý hoặc đề xuất, bạn đồng ý để chúng tôi dùng ý tưởng đó để cải thiện sản phẩm mà không phát sinh nghĩa vụ trả phí. Đề xuất được duyệt có thể hiện công khai trên trang đề xuất. Vui lòng không ghi thông tin cá nhân vào nội dung gửi.',
        ],
      },
      {
        id: 'so-huu-tri-tue',
        heading: 'Sở hữu trí tuệ',
        paragraphs: [
          'Tên gọi, biểu trưng, giao diện và mã nguồn của Chuyện Nhỏ thuộc về ERPCons & LPC. Các thư viện mã nguồn mở đi kèm tuân theo giấy phép riêng của chúng.',
        ],
      },
      {
        id: 'lien-ket',
        heading: 'Liên kết bên ngoài',
        paragraphs: ['Trang có liên kết tới ERPCons, TekShot AI và các trang khác. Nội dung và chính sách của những trang đó do bên vận hành tương ứng chịu trách nhiệm.'],
      },
      {
        id: 'trach-nhiem',
        heading: 'Giới hạn trách nhiệm',
        paragraphs: [
          'Công cụ được cung cấp miễn phí theo hiện trạng. Trong phạm vi pháp luật cho phép, chúng tôi không chịu trách nhiệm với thiệt hại phát sinh từ việc dùng kết quả của công cụ hoặc từ việc công cụ tạm thời không hoạt động.',
          'Điều khoản này không loại trừ các quyền mà pháp luật về bảo vệ quyền lợi người tiêu dùng dành cho bạn.',
        ],
      },
      {
        id: 'quyen-rieng-tu',
        heading: 'Quyền riêng tư',
        paragraphs: ['Cách chúng tôi xử lý dữ liệu được nói rõ trong Chính sách quyền riêng tư.'],
        link: { to: '/quyen-rieng-tu', label: 'Đọc Chính sách quyền riêng tư' },
      },
      {
        id: 'thay-doi',
        heading: 'Thay đổi điều khoản',
        paragraphs: ['Chúng tôi có thể cập nhật điều khoản. Ngày cập nhật ghi ở đầu trang; thay đổi quan trọng sẽ được thông báo trên trang. Tiếp tục dùng sau khi cập nhật nghĩa là bạn đồng ý với bản mới.'],
      },
      {
        id: 'luat-ap-dung',
        heading: 'Luật áp dụng',
        paragraphs: ['Điều khoản được điều chỉnh bởi pháp luật Việt Nam. Tranh chấp được ưu tiên giải quyết bằng thương lượng; nếu không thành, sẽ đưa ra cơ quan có thẩm quyền theo quy định.'],
      },
      {
        id: 'lien-he',
        heading: 'Liên hệ',
        paragraphs: [`Mọi câu hỏi về điều khoản, vui lòng gửi thư tới ${SUPPORT_EMAIL}.`],
      },
    ],
  },
  'quyen-rieng-tu': {
    title: 'Chính sách',
    titleAccent: 'quyền riêng tư',
    intro: 'Chính sách này cho biết Chuyện Nhỏ thu thập, sử dụng và bảo vệ dữ liệu cá nhân như thế nào, theo Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 và Nghị định 356/2025/NĐ-CP.',
    summary: [
      'Tệp của bạn được xử lý trên máy bạn, không gửi về máy chủ.',
      'Không tài khoản, không cookie, không công cụ quảng cáo hay theo dõi.',
      'Chỉ đếm lượt mở công cụ; địa chỉ IP được băm và tự xoá sau khoảng 1 giờ.',
      'Góp ý chỉ được gửi khi bạn đồng ý và bấm Gửi.',
    ],
    sections: [
      {
        id: 'chung-toi',
        heading: 'Chúng tôi là ai',
        paragraphs: [`Chuyện Nhỏ do ERPCons & LPC vận hành và là bên kiểm soát dữ liệu cá nhân được xử lý qua trang này. Liên hệ về dữ liệu cá nhân: ${SUPPORT_EMAIL}.`],
      },
      {
        id: 'nguyen-tac',
        heading: 'Nguyên tắc của chúng tôi',
        items: [
          'Xử lý trên thiết bị: các công cụ đang hoạt động không tải tệp của bạn lên máy chủ.',
          'Tối thiểu: chỉ xử lý dữ liệu cần cho việc vận hành và chống lạm dụng.',
          'Không định danh: không yêu cầu tên, email, số điện thoại hay tài khoản.',
          'Không cookie, không công cụ phân tích, quảng cáo hay theo dõi của bên thứ ba.',
        ],
      },
      {
        id: 'du-lieu',
        heading: 'Dữ liệu chúng tôi xử lý và mục đích',
        items: [
          'Lượt mở công cụ: tên công cụ và thời điểm, để đếm tổng lượt dùng. Chỉ lưu số đếm gộp, không gắn với người dùng.',
          'Địa chỉ IP: được băm một chiều bằng khoá bí mật, chỉ để giới hạn gửi tự động, và tự xoá sau khoảng 1 giờ.',
          'Nội dung góp ý, đề xuất: chỉ khi bạn đánh dấu đồng ý và bấm Gửi, để xem xét và cải thiện công cụ. Mã biên nhận chỉ được lưu dưới dạng băm.',
          'Nhật ký kỹ thuật của máy chủ web (địa chỉ IP, loại trình duyệt, trang được mở): chỉ dùng cho vận hành và an ninh hệ thống, lưu trong thời gian ngắn cần thiết.',
        ],
      },
      {
        id: 'tren-thiet-bi',
        heading: 'Dữ liệu lưu trên thiết bị của bạn',
        paragraphs: [
          'Một số công cụ lưu dữ liệu ngay trong trình duyệt của bạn để dùng lại: công cụ dùng gần đây, chế độ sáng tối, Lịch Gia Đình, ghi chú, nháp CV, thẻ ghi nhớ. Dữ liệu này không được gửi cho chúng tôi; bạn xoá được ngay trong công cụ hoặc bằng cách xoá dữ liệu trang web trong cài đặt trình duyệt.',
        ],
        link: { to: '/xu-ly-du-lieu', label: 'Xem từng công cụ xử lý ở đâu' },
      },
      {
        id: 'ben-thu-ba',
        heading: 'Chia sẻ với bên thứ ba',
        paragraphs: [
          'Chúng tôi không bán và không chia sẻ dữ liệu cá nhân cho mục đích quảng cáo. Chúng tôi chỉ cung cấp dữ liệu cho cơ quan nhà nước có thẩm quyền khi pháp luật yêu cầu.',
          'Riêng công cụ Ghi âm thành văn bản dùng dịch vụ nhận dạng giọng nói có sẵn trong trình duyệt. Âm thanh được trình duyệt gửi tới nhà cung cấp của trình duyệt đó (ví dụ Google với Chrome), có thể được xử lý ở nước ngoài theo chính sách của họ, và không đi qua máy chủ của chúng tôi.',
        ],
      },
      {
        id: 'thoi-gian-luu',
        heading: 'Thời gian lưu trữ',
        items: [
          'Bản băm địa chỉ IP: khoảng 1 giờ.',
          'Số đếm lượt dùng: lưu dưới dạng thống kê gộp, không chứa dữ liệu cá nhân.',
          'Góp ý, đề xuất: lưu trong thời gian cần để xem xét và theo dõi, hoặc tới khi bạn yêu cầu xoá.',
        ],
      },
      {
        id: 'quyen',
        heading: 'Quyền của bạn',
        paragraphs: ['Theo Luật Bảo vệ dữ liệu cá nhân, bạn có quyền:'],
        items: [
          'Được biết về việc xử lý dữ liệu cá nhân của mình.',
          'Đồng ý hoặc rút lại sự đồng ý.',
          'Xem, chỉnh sửa, yêu cầu xoá hoặc hạn chế xử lý dữ liệu.',
          'Khiếu nại, tố cáo, khởi kiện theo quy định của pháp luật.',
          'Yêu cầu cơ quan có thẩm quyền bảo vệ quyền về dữ liệu cá nhân của mình.',
        ],
      },
      {
        id: 'thuc-hien-quyen',
        heading: 'Cách thực hiện quyền',
        paragraphs: [
          `Gửi yêu cầu tới ${SUPPORT_EMAIL}. Vì Chuyện Nhỏ không có tài khoản, hãy gửi kèm mã biên nhận của góp ý để chúng tôi tìm đúng nội dung của bạn.`,
          'Chúng tôi xác nhận đã nhận yêu cầu trong 2 ngày làm việc và xử lý trong thời hạn pháp luật quy định, chậm nhất 20 ngày.',
        ],
      },
      {
        id: 'tre-em',
        heading: 'Trẻ em',
        paragraphs: ['Chuyện Nhỏ không thu thập thông tin để nhận biết trẻ em. Trẻ em muốn gửi góp ý cần có sự đồng ý của cha mẹ hoặc người giám hộ, theo quy định của pháp luật.'],
      },
      {
        id: 'bao-mat',
        heading: 'Bảo mật',
        paragraphs: ['Trang chạy qua kết nối mã hoá HTTPS. Dữ liệu nhận về được tối thiểu hoá và băm khi có thể. Không hệ thống nào an toàn tuyệt đối; nếu xảy ra sự cố ảnh hưởng tới dữ liệu cá nhân, chúng tôi sẽ thông báo theo quy định của pháp luật.'],
      },
      {
        id: 'thay-doi',
        heading: 'Thay đổi chính sách',
        paragraphs: ['Khi chính sách thay đổi, chúng tôi cập nhật ngày ở đầu trang và thông báo trên trang với các thay đổi quan trọng.'],
      },
      {
        id: 'lien-he',
        heading: 'Liên hệ',
        paragraphs: [`Mọi câu hỏi về dữ liệu cá nhân, vui lòng gửi thư tới ${SUPPORT_EMAIL}.`],
      },
    ],
  },
}
