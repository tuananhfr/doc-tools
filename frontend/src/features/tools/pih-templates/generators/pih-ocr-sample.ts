/**
 * OCR: "Phiếu nhập Foodtek" — phiếu nhập kho giả lập, vẽ bằng canvas (không phải ảnh chụp
 * thật, không có khuôn mặt hay dữ liệu thật nào) để người dùng thử tính năng OCR (đọc chữ
 * trong ảnh) mà không cần tự chuẩn bị tệp. "Foodtek" ở đây là tên công ty hư cấu dùng riêng
 * cho tài liệu mẫu này — không phải khách hàng hay thương hiệu thật.
 */
export async function createPihFoodtekReceiptImage(): Promise<File> {
  const { createCanvas, encodeCanvas, releaseCanvas } = await import('@/features/tools/image/services/image-codec')
  const { canvas, context } = createCanvas({ width: 900, height: 1200 })
  try {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, 900, 1200)
    context.fillStyle = '#0a2d6b'
    context.fillRect(0, 0, 900, 90)
    context.fillStyle = '#ffffff'
    context.font = 'bold 34px Arial'
    context.fillText('FOODTEK DEMO — PHIẾU NHẬP KHO (MẪU)', 40, 56)

    context.fillStyle = '#1a1a1a'
    context.font = '24px Arial'
    const lines = [
      '', 'Số phiếu (demo): FT-DEMO-0001',
      'Ngày nhập (demo): 01/01/2026',
      'Kho nhập (demo): Kho Demo 01',
      'Nhà cung cấp (demo): Công ty TNHH Cung ứng Demo',
      'Người giao hàng (demo): Trần Thị Demo',
      '',
      'Danh sách hàng hoá (số liệu giả lập):',
      '  1. Bột mì demo            SL: 50   Đơn vị: bao       Đơn giá: 350.000đ',
      '  2. Dầu ăn demo            SL: 30   Đơn vị: thùng     Đơn giá: 620.000đ',
      '  3. Đường demo             SL: 20   Đơn vị: bao       Đơn giá: 280.000đ',
      '  4. Muối demo              SL: 15   Đơn vị: bao       Đơn giá: 90.000đ',
      '',
      'Tổng số mặt hàng (demo): 4      Tổng số lượng (demo): 115',
      '',
      'Người lập phiếu (demo): Nguyễn Văn Demo',
      'Người duyệt (demo): Lê Văn Demo',
      'Ghi chú: Đây là phiếu minh hoạ để thử OCR, không phải chứng từ thật.',
    ]
    let y = 150
    for (const line of lines) {
      context.fillText(line, 40, y)
      y += 42
    }
    context.strokeStyle = '#cfd6e4'
    context.lineWidth = 2
    context.strokeRect(20, 110, 860, y - 90)

    const blob = await encodeCanvas(canvas, 'png')
    return new File([blob], 'foodtek-phieu-nhap-demo.png', { type: 'image/png' })
  } finally {
    releaseCanvas(canvas)
  }
}
