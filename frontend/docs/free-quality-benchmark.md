# Bộ kiểm chứng Free: OCR và journey P0

Bộ này lưu **baseline v1 và kiểm chứng triển khai Search/OCR Free v2**. Kết quả tổng hợp và journey tự động không thay chứng nhận chất lượng trên tài liệu thật. V2 có engine nhiều lượt, giao diện đối chiếu và gate bằng chứng; gate tổng hiện chưa đạt. Tệp thử không được gửi đến OCR bên ngoài.

## Chạy

Vào `frontend/`, dùng Node theo `package.json`. Cần Chrome và Playwright có sẵn; `PLAYWRIGHT_DIR` trỏ đến thư mục `node_modules` chứa Playwright. Không cần thêm dependency vào project.

Ví dụ PowerShell; thay đường dẫn runtime và URL bằng môi trường của bạn:

```powershell
$env:PLAYWRIGHT_DIR = 'C:/path/to/runtime/node_modules'
$env:QA_OUT = "$PWD/qa-output"
$env:SITE = 'http://localhost:3012'
node scripts/doc-tools/fixtures/ocr-benchmark.mjs
node scripts/doc-tools/bench-ocr.mjs
node scripts/doc-tools/check-p0-journeys.mjs
$env:VIEW = '390x844'
node scripts/doc-tools/check-p0-journeys.mjs
```

`SITE` có thể chứa base path, ví dụ `http://localhost:3002/doc-tools`. Dùng instance kiểm thử riêng; runner giả lập API đếm lượt, không gửi bộ đếm vào backend thật. Không chạy trên session có tài liệu riêng tư. Runner tạo context trình duyệt mới, người dùng Free ẩn danh, không có tài khoản hay khóa AI.

`OCR_FIXTURES` đổi thư mục mẫu, mặc định dưới `QA_OUT/ocr-fixtures`. `ONLY` chọn ID cách nhau bằng dấu phẩy. Với journey, `ENTRY=search` hoặc `ENTRY=browse` chọn một đường vào; bỏ biến này để chạy cả hai. Chạy lại có thể ghi đè evidence cùng ID: dùng `QA_OUT` khác để giữ từng đợt baseline. Không chạy hai runner cùng ghi một thư mục.

## Bộ mẫu và đáp án

`scripts/doc-tools/benchmark/ocr-cases.json` chứa đáp án cố định trước khi chạy: văn bản tiếng Việt, biên nhận và bảng kê. Có 8 trường hợp: chữ in sạch, biên nhận sạch/mờ/nghiêng/phản sáng/nhỏ, bảng sạch/tương phản thấp.

Generator vẽ bằng Arial, dữ liệu tổng hợp, kích thước 1200 × 760 (mẫu nhỏ 480 × 304). Phản sáng và nghiêng là phép biến đổi có kiểm soát; không đại diện toàn bộ ảnh điện thoại. Nó cũng tạo PDF scan, PDF có số trang nhận diện và JPEG đủ lớn cho journey nén. Không dùng font giả chữ tay để tính thành tích HTR.

`manifest.json` lưu đáp án, hash cấu hình và SHA-256 từng đầu vào. Runner kiểm hash trước khi dùng. Chỉnh đáp án/generator phải được review và sinh bộ mẫu mới; không thay ground truth theo kết quả OCR. Không tự promote dữ liệu `draft` thành regression đã duyệt.

Nhóm còn thiếu của v1 được lưu tại `missingCoverage`: chữ tay thật, ảnh điện thoại được phép sử dụng, form có chữ tay, méo phối cảnh/giấy cong và output ô bảng có cấu trúc. V2 bổ sung mẫu bảng có cấu trúc, nghiêng, phối cảnh, lóa, mực màu và ô gộp dọc; giấy cong và bộ nhiều người viết có đáp án vẫn thiếu.

Để thêm mẫu thật, cần tệp đã được phép sử dụng và đáp án được người kiểm tra xác nhận. Tạo manifest riêng theo cấu trúc manifest sinh sẵn; giữ hash đầu vào, nguồn/quyền sử dụng và version. Chỉ đặt ảnh trong thư mục QA cục bộ. Không commit tài liệu cá nhân hay dùng dữ liệu production thiếu quyền. Việc thu nhận bộ dữ liệu thật nằm ngoài baseline tổng hợp này.

## Đọc baseline OCR

`ocr-benchmark/results.json` giữ raw text, word/confidence nhìn được qua UI, số từ bắt buộc xác nhận, CER/WER, kết quả trích trường, thời gian tự động, hash đầu vào/đầu ra và build ID. Hash model tiếng Việt lấy từ asset của bản đang phục vụ. Không suy version engine từ source đang được agent khác sửa.

- **CER**: Levenshtein ký tự / số ký tự đáp án. Dùng NFC, gom khoảng trắng, giữ dấu, chữ hoa và dấu câu. Lỗi có thể vượt 100% khi chèn quá nhiều ký tự.
- **WER**: Levenshtein token cách nhau bởi khoảng trắng / số token đáp án. Tổng hợp theo tổng số lỗi và mẫu số, không trung bình tùy ý các tỷ lệ.
- **Trường**: regex cố định trích tên/ngày/tiền từ raw text; exact match với đáp án. Tiền cho phép dấu phân nhóm, không đoán lại chữ số. Không tìm thấy hoặc nhiều kết quả được báo `missing`/`ambiguous`.
- **Giới hạn đo trường**: đây là proxy trích trường trên text, chưa phải đánh giá region/cell OCR. Sai nhãn “Số tiền” có thể làm tên và tiền thành `missing` dù giá trị đọc đúng. Xem `rawText`, `rawValue`, `status` để phân biệt. Không sửa regex sau mỗi lần chạy nhằm tăng điểm.
- **Xuất TXT**: runner xác nhận nguyên giá trị OCR, không dùng đáp án để sửa. TXT phải khớp các từ quan sát được; đo chất lượng raw OCR độc lập với kiểm tra xuất file.
- **Thời gian**: `recognitionMs` từ thao tác chạy đến màn review/lỗi; gồm tải/khởi tạo engine nếu xảy ra. `totalAutomatedMs` gồm tìm, đọc UI và xuất file; không phải thời gian con người sửa tài liệu.

Baseline v1 chưa đo bbox nội bộ, merged-cell hay khả năng giữ cấu trúc bảng. V2 đo riêng giá trị và span của ô trước khi sửa; chưa có phép đo độ chính xác bbox trên ảnh thật. OCR đọc được chữ trên bảng không bảo đảm hàng–cột đúng.

Mã thoát 0 và `baseline-measured` nghĩa runner đo được baseline, **không có nghĩa OCR đạt ngưỡng sản phẩm**. Lỗi thao tác, hash, xuất file hoặc browser làm runner thoát 1. Không đọc được chữ là mẫu chất lượng kém có điểm lỗi, không bị loại khỏi phép đo. Không có ngưỡng chất lượng tự đặt; Product/BA/QA cần chốt sau dữ liệu phù hợp.

## Journey P0

`benchmark/p0-journeys.json` chứa 8 ứng viên: ghép PDF, lấy trang PDF, nén PDF, ảnh thành PDF, nén ảnh, OCR ra TXT, OCR ra PDF tìm được chữ và tạo QR. Mỗi ứng viên chạy cả Search và Browse từ trang chủ. Slug chỉ dùng xác minh sau khi click công cụ, không làm URL vào tắt.

Validator kiểm thứ tự/nội dung trang ghép–tách; PDF nén nhẹ hơn, giữ khổ và ảnh; ảnh-PDF giữ các stream ảnh nguồn theo thứ tự; ảnh nén nhẹ hơn và giữ kích thước; chữ/số đã sửa xuất đúng ra TXT/lớp chữ PDF; PNG QR giải mã ra đúng payload bằng ZXing độc lập với thư viện tạo QR.

OCR journey sửa 1250000 thành 1280000 và kiểm bản cũ không còn trong text xuất. Điều này kiểm cơ chế correction, không chứng minh bản scan trực quan được sửa: hình gốc của PDF vẫn giữ nguyên.

`p0-journeys-<width>/results.json` lưu query/entry/persona, số action, URL sau discovery, expected/actual, output/hash, lỗi và thời gian. Có screenshot UI, download riêng và trace ZIP cho từng case. Mở trace bằng Playwright có sẵn. File ảnh tải về mang hậu tố `-output` để không đè screenshot UI.

`steps` là action của script. `backtracks=0` chỉ mô tả kịch bản chạy thẳng; không thay dữ liệu first-attempt, help-required hoặc abandonment của người thật. `passed` nghĩa các ứng viên được chọn hoàn tất contract hiện tại; chưa phải toàn bộ P0 core của spec.

Kiểm tra viewport mô phỏng không thay kiểm tra điện thoại thật, bàn phím mở, zoom 125/150%, mạng chậm/gián đoạn và accessibility đầy đủ. Evidence cần được mở xem; build hay screenshot chưa xem không đủ để kết luận giao diện đúng.

## Baseline đầu tiên, 07/10/2026

Target: `http://localhost:3012`, Chrome headless, Free ẩn danh, build `Pg4FLE3otJ5ALMRnbwmbC`. Bộ tổng hợp v1:

| Phép đo | Kết quả |
| --- | --- |
| Mẫu OCR đo được | 8/8 |
| CER | 27/685 = 3,94% |
| WER | 20/145 = 13,79% |
| Trích trường đúng theo regex cố định | 12/17 = 70,59% |
| CER mẫu phản sáng | 17,57% |
| Journey desktop 1440 × 900 | 16/16 pass: 8 Search + 8 Browse |
| Journey mobile mô phỏng 390 × 844 | 16/16 pass: 8 Search + 8 Browse |

Mẫu sạch vẫn có lỗi dấu: “THÔNG BÁO” → “THÔNG BẢO”, “Hồ” → “HỖ”; biên nhận có “Số tiền” → “Số tiên”. Mẫu nghiêng tách ngày thành “07/1 0/2026”. Phản sáng làm mất phần tên và đơn vị tiền. Đây là finding để chọn tiền xử lý/consensus, chưa được sửa trong đợt tạo benchmark.

Có từ đọc sai nhưng điểm nhận dạng cao, ví dụ “BIÊN” → “BIẾN” với 93/100 ở mẫu nhỏ. Điểm engine không phải xác suất đúng; nhiều lượt nhận dạng và kiểm tra ngữ cảnh vẫn cần thiết. Không suy ra rằng mọi vùng không màu cam đều đúng.

Đã mở xem 8 ảnh mẫu, 8 screenshot review OCR, ảnh kết quả của 8 công cụ ở desktop/mobile và vùng QR/tải về mobile. Nút và nội dung chính đọc được, không thấy tràn ngang ở các trạng thái đã kiểm tra. File xuất được kiểm độc lập bởi các validator. Không có lỗi JavaScript hay write chứa nội dung tệp; API bộ đếm đã được mock. Build ID đầu/cuối mỗi run khớp nhau. Đây là kiểm chứng bản local đã build, không phải xác nhận toàn bộ source hiện tại đang được các agent khác sửa.

Bước nâng cấp được đề xuất sau baseline này là tiền xử lý và nhiều lượt nhận dạng trên cùng bộ cố định. Kết quả triển khai v2 dưới đây giữ nguyên baseline và ghi cả mẫu bị giảm chất lượng.

## Triển khai Free v2, 07/10/2026

Search dùng từ điển tiếng Việt chung, registry intent/capability và 102 story nháp (90 positive, 12 negative). Kết quả deterministic: 102/102 đúng, top-1/top-3 100%, false match 0. Đây là kết quả trên story do nhóm phát triển soạn, chưa được BA/QA duyệt bằng người dùng thật. Search ảnh/PDF bảng sang Excel giữ `ocrProfile=table&ocrOutput=xlsx` khi mở công cụ. Yêu cầu chữ tay không được gợi ý như một capability đã sẵn sàng.

OCR có profile chữ in/số/bảng/form/thử nghiệm mixed; tối đa ba lượt nối tiếp. Lượt ảnh gốc, raw text và confidence được giữ nguyên. Lượt xử lý có pass, phiên bản, phép đổi tọa độ và candidate riêng. Có deskew, tương phản, threshold, kênh màu, xử lý đường bảng và perspective theo bốn góc. Tự nhận góc giấy chỉ áp dụng khi có bằng chứng biên đủ rõ; người dùng có thể chọn góc bằng ảnh hoặc bàn phím. Góc nhập tay chỉ áp dụng trang đầu. Giấy cong chưa được xử lý.

Đối chiếu hiển thị ảnh/vùng gốc, candidate và phần sửa, có undo trong RAM. Số, ngày, tiền, vùng bất đồng và mixed phải xác nhận trước xuất. Bảng có ô trống, gộp ngang/dọc, tách ô, đổi số hàng/cột và đề xuất từ lượt đã xử lý; proposal không ghi đè raw. Form biên nhận có template/version và kiểm ngày lịch, tiền, tổng, trường bắt buộc hoặc trùng. Trường nhập bổ sung liên kết với từ tương ứng để xác nhận cũ bị hủy khi sửa lại. Cache phân biệt hash nguồn, trang, rotation, profile/options và phiên bản pipeline; hủy trong lúc khởi tạo cũng quay lại được để chạy lại.

Xuất TXT/PDF tìm chữ/DOCX/XLSX/CSV/JSON sau đối chiếu. PDF giữ ảnh gốc và thêm lớp chữ đã xác nhận; sửa chữ không sửa hình ảnh scan. XLSX giữ mã `0012` dưới dạng chuỗi. CSV dùng dấu nháy bảo vệ chuỗi có số 0 đầu và công thức; dùng XLSX khi cần giữ chuỗi nguyên dạng trong Excel. Luồng bảng/form có cấu trúc hiện dùng ảnh hoặc PDF scan; PDF có lớp chữ gốc vẫn giữ luồng trích text cũ, chưa có bộ trích bảng native PDF.

Thống kê chất lượng chỉ gửi finite event/tool khi có cả build flag và consent của phiên hiện tại. Consent, nội dung tệp, raw query, sửa OCR không lưu làm dữ liệu huấn luyện hay xếp hàng gửi. Backend có strict payload, giới hạn request, aggregate theo ngày, retention và CLI báo cáo. Kiểm tra tích hợp dùng database `doc_tools`; không dùng database ERPCons. Namespace mới `ocr`/`quality` có tiếng Việt/Anh; các ngôn ngữ khác tạm dùng bản Anh, còn chờ agent dịch.

## Bằng chứng v2

Target kiểm thử riêng: `http://localhost:3016`, production build `rV9fyx-YH2nrJmJ5nNBcL`. Snapshot 1.347 source file có SHA-256 `d3c4d5441969b31a9013adcd0635af63c8013763ccf6732215f63162e781ab12`. Build QA bật `NEXT_PUBLIC_QUALITY_EVENTS=1` để kiểm consent; production mặc định vẫn tắt nếu không cấu hình flag. Bản local 3012 và deploy ngoài máy không được thay trong đợt này.

| Kiểm tra | Kết quả |
| --- | --- |
| Frontend Vitest | 1.951 test / 142 file pass; TypeScript pass |
| Backend | 4 test pass, gồm HTTP 400/413, privacy và aggregate/rate limit MySQL |
| Production build | 1.393 trang pass; còn warning Next về nhiều lockfile trong snapshot QA |
| Sáu định dạng xuất | 6/6 pass, đọc lại nội dung; PDF text, DOCX XML, XLSX string/merge, CSV bảo vệ chuỗi |
| Trạng thái OCR | 10/10 pass: consent, Search handoff, cancel/retry, tải model lỗi/chậm, numeric crop, đổi profile cùng nguồn, form, góc giấy, ảnh chữ tay, offline |
| Review bắt buộc trên fixture | 3/3 giá trị quan trọng được xác nhận trước xuất; không suy ra coverage trên tài liệu thật |
| Journey P0 | 16/16 desktop + 16/16 mobile, gồm Search và Browse |
| Responsive | 1.440 × 900, 768 × 1.024, 390 × 844, 320 × 780; outer overflow 0; ảnh đã mở xem |
| Zoom chẩn đoán | CSS zoom 125%/150% trên form mobile không tràn ngang; chưa kiểm native browser zoom |

CER raw v2 là **30/685 = 4,38%**, so với v1 **3,94%**. WER 21/145 = 14,48%; proxy trích trường vẫn 12/17 = 70,59%. Tám đầu vào có hash giữ nguyên. Mẫu phản sáng tăng CER từ 17,57% lên 21,62%; các mẫu còn lại không đổi. Không coi cơ chế đối chiếu hoặc sửa bằng đáp án fixture là cải thiện độ chính xác nhận dạng.

| Đề xuất bảng trước sửa | Giá trị + span đúng | Ô dư |
| --- | --- | --- |
| Sạch | 15/19 | 0 |
| Nghiêng | 9/19 | 0 |
| Phối cảnh, chưa chọn góc thủ công | 0/19 | 6 |
| Lóa | 8/19 | 0 |
| Mực màu | 1/19 | 0 |
| Gộp dọc | 14/18 | 0 |

Mẫu khó vẫn sai nhiều; bảng là đề xuất cần người dùng đối chiếu. Test góc thủ công chứng minh thao tác và pass chạy được, chưa chấm lại độ chính xác sau chọn góc. Chưa đo bbox/region trên ảnh thật, RAM/thời gian trên điện thoại thật, accessibility đầy đủ, Word/Excel native hoặc thời gian sửa của người thật. Không có phiên real-user được xác nhận trong đợt này.

Evidence cục bộ dưới `qa-output/`: `ocr-build/source-manifest.json`, `search-v2/results.json`, `ocr-v2-baseline/ocr-benchmark/results.json`, `ocr-v2-layout/ocr-layout/results.json`, `ocr-v2-check/ocr-v2/results.json`, `ocr-v2-states/ocr-states/results.json`, hai thư mục `p0-v2-*`, và `visual-ocr-release/frontend-visual-qa-report.json`. `quality-v2/index.html`/`report.json` tổng hợp gate và giữ regression nhìn thấy; thư mục này được ignore khỏi Git.

Các runner v2: `fixtures/ocr-benchmark-v2.mjs`, `check-ocr-dataset.mjs`, `bench-ocr-layout.mjs`, `check-ocr-v2.mjs`, `check-ocr-states.mjs`, `bench-handwriting.mjs`, `check-real-user-journeys.mjs`, `quality-report.mjs`. Với baseline/journey v1 dùng `OCR_FIXTURES` trỏ đến `ocr-fixtures-v2/baseline-v1`; với bảng/states dùng thư mục v2. Chạy riêng `QA_OUT` cho từng runner để giữ evidence và đặt `SITE` đúng build cần kiểm. Dashboard mặc định đọc các thư mục evidence nêu trên.

## Những gate chưa đạt

**Gate tổng: `not-ready`.** Search story còn `draft`, chưa có BA/QA approval. Test chức năng xanh không thay gate chất lượng tài liệu thật.

Ảnh chữ tay được người dùng cho phép kiểm cục bộ nhưng **chưa có đáp án**. Giữ metadata/hash với ground truth `pending`, không lưu ảnh/bản chép vào repo, không tính CER/WER/accuracy và không dùng để train. Chưa có nhiều người viết hoặc writer holdout. Test chỉ xác nhận mixed cảnh báo capability chưa kiểm chứng, mọi từ bắt buộc đối chiếu và không tự xuất.

HTR local tiếp tục **blocked**: giấy phép code không thay giấy phép weights; còn thiếu weight license/hash, browser model/tokenizer đã pin, kiểm hiệu năng bộ nhớ WASM/WebGPU và dữ liệu thật có đáp án. Model preparation bỏ qua candidate chưa đủ bằng chứng. `bench-handwriting.mjs` trả exit 2 là gate bị chặn dự kiến, không phải bài accuracy đã chạy. Không bật quảng bá chữ tay hoặc báo tỷ lệ chính xác giả.
