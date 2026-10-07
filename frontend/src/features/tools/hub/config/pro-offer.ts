/**
 * Lời mời dùng ERPCons Pro trên "Chuyện Nhỏ".
 *
 * `null` = form đăng ký dùng thử chưa có (đang làm ở nhánh khác): nút "Đăng ký
 * dùng thử" vẫn hiện nhưng chỉ báo "sắp có". Có form thì điền URL vào đây — mở ở
 * tab mới, vì tệp đang làm chỉ sống trong RAM của tab này.
 */
export const PRO_CONTACT_URL: string | null = null

/** Form đăng ký dùng thử TekshotOS; `null` thì nút báo "sắp có" như trên. */
export const TEKSHOT_TRIAL_URL: string | null = 'https://tekshot.vn/dung-thu-mien-phi'

/** Giá trị trả tiền của Pro theo spec DocTools 02 — không phải nút sửa PDF bị khoá ở Free (spec 00). */
export const PRO_FEATURES = ['storage', 'sharing', 'linking', 'ai'] as const
