export const NUMEROLOGY_METHOD_NOTE = 'Bản này đọc theo phép cộng toàn bộ chữ số rồi rút gọn đang dùng trong công cụ. Ngày sinh được đọc sau rút gọn; Năm cá nhân 11/22/33 được đọc thêm theo nền 2/4/6. Họ tên bỏ dấu, Đ thành D, AEIOU là nguyên âm và Y là phụ âm; đây là quy ước của công cụ, có thể khác nguồn tham khảo.'

export const NUMEROLOGY_METRIC_ROLES: Readonly<Record<string, { name: string; description: string }>> = {
  life_path: { name: 'Đường đời', description: 'Tính cách chính và bài học trong cuộc sống. Tính từ toàn bộ chữ số của ngày, tháng, năm sinh.' },
  birthday: { name: 'Ngày sinh', description: 'Khả năng thường thể hiện trong việc hằng ngày. Tính từ ngày sinh sau khi cộng chữ số và rút gọn.' },
  personal_year: { name: 'Năm cá nhân', description: 'Chủ đề cần chú ý trong năm đã chọn. Tính từ ngày sinh, tháng sinh và năm đó.' },
  expression: { name: 'Biểu đạt', description: 'Cách sử dụng khả năng của mình. Tính từ tất cả chữ cái trong họ tên.' },
  soul_urge: { name: 'Nội tâm', description: 'Mong muốn và nhu cầu bên trong. Tính từ nguyên âm trong họ tên.' },
  personality: { name: 'Nhân cách', description: 'Cách thể hiện khi giao tiếp và ấn tượng ban đầu. Tính từ phụ âm trong họ tên.' },
}
