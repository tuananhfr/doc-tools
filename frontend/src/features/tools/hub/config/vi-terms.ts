export const VI_TERMS = {
  ocr: { label: 'Lấy chữ từ ảnh / bản scan', aliases: ['nhận dạng chữ', 'OCR'], caution: 'Kết quả cần đối chiếu với ảnh gốc' },
  compress: { label: 'Nén tệp', aliases: ['giảm dung lượng', 'làm nhẹ tệp'] },
  background: { label: 'Nền ảnh', aliases: ['phông nền', 'nền trắng', 'nền xanh'] },
  receipt: { label: 'Biên nhận tiền', aliases: ['giấy nhận tiền', 'giấy xác nhận đã nhận tiền'] },
  merge: { label: 'Ghép tệp', aliases: ['gộp', 'nối', 'hợp nhất'] },
  redact: { label: 'Che thông tin', aliases: ['ẩn thông tin riêng tư', 'xóa thông tin nhạy cảm'] },
  local: { label: 'Xử lý trên thiết bị', aliases: ['xử lý cục bộ', 'trong trình duyệt'] },
} as const
