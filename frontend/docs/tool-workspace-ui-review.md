# Kiểm tra giao diện công cụ — 2026-10-13

Phạm vi triển khai: toàn bộ 71 công cụ đã có màn làm việc trong danh mục và sản phẩm Lịch Gia Đình. Các mục “sắp có” chưa có màn công cụ không nằm trong lượt này. Homepage, trang danh mục và landing giữ bố cục hiện tại.

## Thay đổi

- Thu gọn tiêu đề, mô tả và thông tin thiết bị/quyền riêng tư; công cụ cùng nhóm nằm trong menu cạnh tiêu đề.
- Chọn tỷ lệ nhập liệu/kết quả theo tác vụ thay vì áp một lưới cho mọi công cụ.
- Chuẩn hóa chọn tệp, nhãn, nút, lỗi và trạng thái kết quả. Giữ màu/font/logo hiện có; CTA chính 48px, vùng bấm 44px; nhãn và hint dùng chung 14px.
- Mobile có chuyển vùng nhập/xem trước ở các tác vụ cần thiết; canvas cắt/đánh dấu ảnh mở ngay ở vùng thao tác. Công cụ đo ảnh vẫn giữ luồng nhập mốc hiệu chuẩn.
- CV và mẫu đơn gom trường liên quan, giảm chiều cao chọn mẫu và đưa tùy chọn lưu nháp xuống cuối form.
- PDF editor có thanh thao tác chính và mục tùy chọn bổ sung; gợi ý có thể mở khi cần.
- Video đặt tệp/xem trước gần thiết lập; đọc văn bản đặt nút phát gần nội dung; kính lúp đặt nút điều khiển trước hình camera.
- Lịch có chữ và nút dễ đọc/bấm hơn; đóng form thêm/sửa quay về panel lịch để người dùng thấy kết quả.
- Giữ engine, schema dữ liệu, route, handoff và vị trí quảng cáo đã duyệt ở cuối nội dung.

## Môi trường và giới hạn

Chrome cài trên máy, điều khiển bằng Playwright, kiểm tra ở 360, 390, 768, 1024 và 1440px. Session/API công khai được mock trong các harness để không ghi lượt truy cập hoặc dữ liệu vào server. Nội dung nhập và tệp mẫu là dữ liệu thử trong profile trình duyệt tạm.

Camera dùng thiết bị giả của Chrome. Chưa xác nhận cảm biến la bàn/camera trên điện thoại thật, giọng đọc/nhận dạng giọng nói trên mọi hệ điều hành hoặc dịch vụ Pro/AI bằng tài khoản thật. Lượt này kiểm tra trạng thái UI của các phần cần dịch vụ ngoài; không thay API hoặc engine của chúng.

## Kiểm tra thao tác có dữ liệu

| Luồng | Bằng chứng |
| --- | --- |
| CV/mẫu đơn/thiết kế | Đổi mẫu giữ dữ liệu; PDF/DOCX và thiết kế tải được; bản xem trước tồn tại sau tải |
| Chuyển công cụ | Cắt ảnh → ảnh thẻ → CV; xóa phông bằng model thật → ảnh thẻ; nén PDF → editor giữ dữ liệu |
| Xử lý ảnh | PNG/JPG/WebP, ZIP hàng loạt, nén, cắt/xoay/sáng tối có kiểm pixel; đo ảnh, hình và đơn vị; lưu được kết quả |
| QR/tiện ích | PNG/SVG và màu mã đúng; quét lại QR/mã vạch; giữ dữ liệu khi đổi loại mã; tính toán, đổi đơn vị, đếm, màu, mã ngẫu nhiên và ghi chú |
| PDF reader/editor | 3 viewport: chuyển reader → editor giữ 3 trang, xoay/hoàn tác, mở toolbar bổ sung và modal; PDF xuất đủ 3 trang |
| Video | 3 viewport: chọn MP4 1,65 giây, cắt thành MP4 mới có chữ ký hợp lệ, xem trước và tải được |
| VietQR/mã vạch | 3 viewport: PNG hợp lệ; vùng xem trước mobile dùng được; thiết lập mã vạch hàng loạt hiện cùng form |
| Lịch gia đình | 3 viewport: thêm sự kiện, giữ sau reload; panel sau lưu nằm trong vùng xem mobile |

Tệp WebM do MediaRecorder sinh ban đầu không có metadata thời lượng nên bị engine từ chối; MP4 có thời lượng hợp lệ đã qua kiểm tra. Các harness ảnh/QR được cập nhật selector và thao tác đổi panel cho bố cục mobile mới.

## Chạy lại

Từ thư mục frontend, sử dụng Node và Chrome đã cài:

```powershell
$env:QA_OUT = "$env:TEMP\chuyen-nho-tools-redesign\routes"
node scripts/doc-tools/check-workspace-ui.mjs

$env:WIDTHS = '360,390,430'
$env:THEMES = 'light,dark,field'
$env:TEXT_SIZE = 'large'
$env:PAGES = '/lich-am,/lich-gia-dinh,/tao-ma-vach,/tao-cv,/mau-don,/doc-to-van-ban'
node scripts/doc-tools/check-a11y.mjs
```

Harness responsive lấy trực tiếp các công cụ có status ready từ ALL_TOOLS, chờ màn làm việc thật thay vì chỉ kiểm spinner, lưu ảnh và report.json. PAGES lọc theo slug không có dấu /; WIDTHS và BASE cho phép chọn viewport/server.

Build kiểm tra dùng next build --webpack, NEXT_DIST_DIR riêng và khôi phục nguyên byte tsconfig.json/next-env.d.ts sau mỗi lần chạy. Máy thiếu bộ nhớ với 23 worker mặc định; build cuối giới hạn 1 worker bằng CIRCLE_NODE_TOTAL=2 và heap Node 1 GB. Không thay next.config.mjs hoặc dependencies.

Ảnh/báo cáo/tệp xuất thử nằm dưới thư mục tạm chuyen-nho-tools-redesign; không đưa tệp nhị phân thử vào Git.

## Kết quả cuối

| Kiểm tra | Kết quả |
| --- | --- |
| Responsive tiếng Việt trên dev 3002 | 72 trang × 5 viewport = 360 ca đạt, 49 ảnh trạng thái tab/chế độ bổ sung |
| Accessibility | Toàn bộ 72 trang đã qua lượt kiểm tra chữ lớn ở 390px và ba theme sau sửa các lỗi; các màn được chỉnh cuối kiểm thêm 360/390/430px. Lịch âm sau sửa grid: 9 tổ hợp, 0 P0/P1/error |
| Luồng có dữ liệu | Các kịch bản trong bảng phía trên đạt; camera là thiết bị giả |
| TypeScript / build Next webpack | Đạt; sinh đủ 1.675 trang, build cuối exit 0 |
| UI production locale /en | 6 màn đại diện × 5 viewport = 30 ca đạt; đã xem screenshot CV, editor và cắt ảnh |
| Encoding / diff | 80 file source/script/style và báo cáo có UTF-8 hợp lệ, không BOM; giữ line ending gốc; diff check đạt |
| Routing production tiếng Việt mặc định | BỊ CHẶN: URL /lich-am trả 308 với Location: /lich-am, browser báo ERR_TOO_MANY_REDIRECTS. Lượt quét production tiếng Việt có 360 lỗi điều hướng, không phải 360 ca UI đạt |

## Vấn đề ngoài phạm vi UI

Server production tạm dùng đúng bản build cuối tại port 3092. /lich-am và /vi/lich-am đều trả 308 về /lich-am; /en/lich-am và /fr/tao-cv trả 200. Luồng rewrite/redirect locale nằm trong src/proxy.ts; src/proxy.ts, src/proxy.test.ts và next.config.mjs không được sửa trong task UI này.

Cần duyệt riêng phần sửa routing: kiểm tra việc chuẩn hóa URL và rewrite nội bộ của locale mặc định, sửa tối thiểu tại proxy/config, bổ sung test, build và kiểm tra URL tiếng Việt không tiền tố trả 200, /vi/... chỉ chuyển hướng một lần, các locale khác vẫn hoạt động. Chưa commit, push hoặc deploy thay đổi UI.

Các lần build ban đầu bị thiếu bộ nhớ; một lượt QA dev bị treo và đã dừng riêng tiến trình/browser do task tạo. Lượt UI lịch âm cuối chạy riêng giữ nguyên các ngưỡng accessibility, không lặp lại kịch bản xuất ảnh đã đạt ở các lượt trước.

## Danh sách màn đã kiểm tra responsive

| Màn công cụ | Route | Viewport đạt |
| --- | --- | --- |
| Ảnh hàng loạt | /anh-hang-loat | 5/5 |
| Scan ảnh → PDF | /anh-sang-pdf | 5/5 |
| Lấy chữ từ ảnh | /anh-sang-van-ban | 5/5 |
| Ảnh thẻ & In ảnh | /anh-the | 5/5 |
| Bài Tây 52 lá | /bai-tay | 5/5 |
| Cắt & chỉnh ảnh | /cat-chinh-anh | 5/5 |
| Cắt video | /cat-video | 5/5 |
| Che & đóng dấu ảnh | /che-dong-dau-anh | 5/5 |
| Che thông tin PDF | /che-thong-tin-pdf | 5/5 |
| Chia tiền nhóm | /chia-tien-nhom | 5/5 |
| Chỉnh sửa PDF | /chinh-sua-pdf | 5/5 |
| Chuyển đổi ảnh | /chuyen-doi-anh | 5/5 |
| Chuyển đổi đơn vị | /chuyen-doi-don-vi | 5/5 |
| Chuyển font & dấu tiếng Việt | /chuyen-font-tieng-viet | 5/5 |
| Đánh số trang | /danh-so-trang | 5/5 |
| Đếm ký tự | /dem-ky-tu | 5/5 |
| Quy đổi điểm & xét tuyển | /diem-hoc-tap | 5/5 |
| Đo kích thước ảnh | /do-kich-thuoc-anh | 5/5 |
| Đọc hóa đơn điện tử XML | /doc-hoa-don-xml | 5/5 |
| Đọc mã QR/Barcode | /doc-ma-qr | 5/5 |
| Đọc to văn bản | /doc-to-van-ban | 5/5 |
| Đổi địa chỉ sau sáp nhập | /doi-dia-chi | 5/5 |
| Đóng dấu PDF | /dong-dau-pdf | 5/5 |
| Ghép ảnh | /ghep-anh | 5/5 |
| Ghép PDF | /ghep-pdf | 5/5 |
| Ghi âm thành văn bản | /ghi-am | 5/5 |
| Ghi chú nhanh | /ghi-chu-nhanh | 5/5 |
| Hướng nhà & la bàn | /huong-nha-la-ban | 5/5 |
| Khái toán chi phí xây nhà | /khai-toan-nha | 5/5 |
| Kiểm tra tin nhắn, link lạ | /kiem-tra-tin-nhan-link-la | 5/5 |
| Kính lúp | /kinh-lup | 5/5 |
| Chèn chữ ký | /ky-tai-lieu | 5/5 |
| Lịch âm – dương | /lich-am | 5/5 |
| Lịch Gia Đình | /lich-gia-dinh | 5/5 |
| Lương Gross – Net | /luong | 5/5 |
| Đặt, gỡ mật khẩu PDF | /mat-khau-pdf | 5/5 |
| Mẫu đơn, biên bản | /mau-don | 5/5 |
| Màu sắc | /mau-sac | 5/5 |
| Nén ảnh | /nen-anh | 5/5 |
| Nén PDF | /nen-pdf | 5/5 |
| Nén video | /nen-video | 5/5 |
| Lấy chữ từ bản scan | /ocr-van-ban | 5/5 |
| PDF → Ảnh | /pdf-sang-anh | 5/5 |
| Chuyển đổi file | /pdf-sang-word | 5/5 |
| Hẹn giờ tập trung | /pomodoro | 5/5 |
| Quản lý QR động | /quan-ly-ma | 5/5 |
| Sắp xếp PDF | /sap-xep-pdf | 5/5 |
| So sánh giá theo đơn vị | /so-sanh-gia-theo-don-vi | 5/5 |
| So sánh tài liệu | /so-sanh-tai-lieu | 5/5 |
| Đọc số thành chữ | /so-thanh-chu | 5/5 |
| Tách âm thanh từ video | /tach-am-thanh | 5/5 |
| Tách PDF | /tach-pdf | 5/5 |
| Tạo CV xin việc | /tao-cv | 5/5 |
| Tạo GIF từ video | /tao-gif | 5/5 |
| Tạo mã ngẫu nhiên | /tao-ma-ngau-nhien | 5/5 |
| Tạo QR Code | /tao-ma-qr | 5/5 |
| Tạo mã vạch | /tao-ma-vach | 5/5 |
| Tarot 78 lá | /tarot | 5/5 |
| Thần số học | /than-so-hoc | 5/5 |
| Thẻ ghi nhớ | /the-ghi-nho | 5/5 |
| Thiết kế nhanh | /thiet-ke-nhanh | 5/5 |
| Tiền điện, nước | /tien-dien | 5/5 |
| Tính ngày & thời hạn | /tinh-ngay | 5/5 |
| Tính tiền & thuế | /tinh-tien | 5/5 |
| Tính toán nhanh | /tinh-toan-nhanh | 5/5 |
| Trợ lý chọn công cụ | /tro-ly | 5/5 |
| Vay trả góp & tiết kiệm | /vay-tra-gop | 5/5 |
| VietQR chuyển khoản | /vietqr-chuyen-khoan | 5/5 |
| Vòng quay ngẫu nhiên | /vong-quay | 5/5 |
| Xem PDF | /xem-pdf | 5/5 |
| Xóa vị trí trong ảnh | /xoa-metadata-anh | 5/5 |
| Xóa phông nền ảnh | /xoa-phong | 5/5 |
