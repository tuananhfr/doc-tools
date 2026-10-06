export type InstallPlatformId = 'android' | 'ios' | 'windows' | 'macos' | 'other'

export interface InstallPlatform {
  id: InstallPlatformId
  label: string
  browser: string
  icon: string
  steps: readonly { title: string; detail: string }[]
}

/**
 * Nhãn menu viết theo bản tiếng Việt của trình duyệt; trình duyệt đổi chữ giữa các
 * phiên bản nên bước nào cũng kèm một cách nhận ra bằng hình (biểu tượng, vị trí).
 */
export const INSTALL_PLATFORMS: readonly InstallPlatform[] = [
  {
    id: 'android',
    label: 'Android',
    browser: 'Chrome',
    icon: 'android2',
    steps: [
      { title: 'Mở Chuyện Nhỏ bằng Chrome', detail: 'Gõ địa chỉ trang vào thanh địa chỉ của Chrome.' },
      { title: 'Bấm menu ⋮ (ba chấm)', detail: 'Ở góc trên bên phải màn hình.' },
      { title: 'Chọn “Thêm vào màn hình chính”', detail: 'Có máy ghi là “Cài đặt ứng dụng”.' },
      { title: 'Bấm “Cài đặt”', detail: 'Biểu tượng Chuyện Nhỏ sẽ nằm trên màn hình chính, mở như một ứng dụng.' },
    ],
  },
  {
    id: 'ios',
    label: 'iPhone / iPad',
    browser: 'Safari',
    icon: 'apple',
    steps: [
      { title: 'Mở Chuyện Nhỏ bằng Safari', detail: 'Gõ địa chỉ trang vào thanh địa chỉ của Safari.' },
      { title: 'Bấm nút Chia sẻ', detail: 'Hình vuông có mũi tên hướng lên. Trên iOS mới, nút này nằm trong menu ⋯ ở thanh dưới.' },
      { title: 'Chọn “Thêm vào MH chính”', detail: 'Kéo danh sách xuống nếu chưa thấy dòng này.' },
      { title: 'Bấm “Thêm”', detail: 'Ở góc trên bên phải. Biểu tượng Chuyện Nhỏ sẽ nằm trên màn hình chính.' },
    ],
  },
  {
    id: 'windows',
    label: 'Windows',
    browser: 'Chrome / Edge',
    icon: 'windows',
    steps: [
      { title: 'Mở Chuyện Nhỏ bằng Chrome hoặc Edge', detail: 'Trình duyệt cần là bản mới.' },
      { title: 'Bấm biểu tượng cài đặt ở thanh địa chỉ', detail: 'Hình màn hình có mũi tên xuống, nằm ở cuối thanh địa chỉ.' },
      { title: 'Chưa thấy biểu tượng? Dùng menu', detail: 'Chrome: menu ⋮, chọn “Truyền, lưu và chia sẻ”, rồi “Cài đặt trang dưới dạng ứng dụng”. Edge: menu ⋯, chọn “Ứng dụng”, rồi “Cài đặt trang web này dưới dạng ứng dụng”.' },
      { title: 'Bấm “Cài đặt”', detail: 'Chuyện Nhỏ mở trong cửa sổ riêng và có trong menu Start.' },
    ],
  },
  {
    id: 'macos',
    label: 'macOS',
    browser: 'Safari / Chrome',
    icon: 'apple',
    steps: [
      { title: 'Mở Chuyện Nhỏ bằng Safari', detail: 'Cần macOS Sonoma (14) trở lên.' },
      { title: 'Vào menu Tệp, chọn “Thêm vào Dock”', detail: 'Trên thanh menu ở đầu màn hình.' },
      { title: 'Bấm “Thêm”', detail: 'Chuyện Nhỏ xuất hiện trên Dock, mở trong cửa sổ riêng.' },
      { title: 'Dùng Chrome hoặc Edge?', detail: 'Làm như trên Windows: bấm biểu tượng cài đặt ở cuối thanh địa chỉ.' },
    ],
  },
  {
    id: 'other',
    label: 'Trình duyệt khác',
    browser: 'Firefox, Samsung Internet…',
    icon: 'display',
    steps: [
      { title: 'Samsung Internet', detail: 'Bấm menu ≡, chọn “Thêm trang vào”, rồi “Màn hình chính”.' },
      { title: 'Firefox trên máy tính', detail: 'Chưa hỗ trợ cài trang thành ứng dụng. Bạn vẫn dùng mọi công cụ bình thường trong tab.' },
      { title: 'Muốn cài như ứng dụng?', detail: 'Mở Chuyện Nhỏ bằng Chrome, Edge hoặc Safari rồi làm theo thẻ tương ứng.' },
    ],
  },
]

export const INSTALL_TROUBLESHOOTING = [
  'Cập nhật trình duyệt lên phiên bản mới nhất.',
  'Kiểm tra bạn đang mở đúng địa chỉ của Chuyện Nhỏ, không phải trang chia sẻ lại.',
  'Chế độ ẩn danh không cho cài. Hãy mở tab thường.',
  'Nếu đã cài rồi, trình duyệt sẽ không hiện lại tùy chọn cài đặt.',
] as const

export function detectInstallPlatform(userAgent: string): InstallPlatformId {
  if (/android/i.test(userAgent)) return 'android'
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios'
  // iPadOS báo mình là Macintosh; phân biệt bằng màn cảm ứng ở chỗ gọi.
  if (/macintosh|mac os x/i.test(userAgent)) return 'macos'
  if (/windows/i.test(userAgent)) return 'windows'
  return 'other'
}
