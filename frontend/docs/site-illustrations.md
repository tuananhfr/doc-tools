# Ảnh minh hoạ cần vẽ cho các trang site

Các trang site mới đang dùng tạm ảnh có sẵn hoặc một icon trong vòng tròn. Bảng dưới
liệt kê từng chỗ cần ảnh, kích thước và prompt để nhờ ChatGPT vẽ.

## Phong cách chung (dán vào đầu mọi prompt)

> Hand-drawn marker sketch illustration, thick navy blue outline (#0c254d), light blue
> diagonal hatching fill (#005be8 at low opacity), a few short red accent strokes
> (#da263d) like "energy marks", white paper shapes, no text, no letters, no logos,
> flat front view, generous empty space around the subject, fully transparent
> background, PNG.

Mẫu tham chiếu: `public/brand/documents-hero-v1.png` và `skyline-hero-v1.png`. Gửi kèm một
trong hai ảnh này khi nhờ vẽ để giữ cùng nét.

## Danh sách

| # | Trang, vị trí | Đang dùng tạm | Tên tệp đề xuất | Kích thước | Nội dung prompt (sau phần phong cách chung) |
| --- | --- | --- | --- | --- | --- |
| 1 | `/gia-dinh` hero | icon `house-heart` | `family-hero-v1.png` | 1774 × 887 | A small Vietnamese tube house with a heart above the roof, a wall calendar, a bell for reminders and a phone with an SOS shield around it. |
| 2 | `/cai-dat` hero | khung điện thoại vẽ bằng CSS + icon app | `install-hero-v1.png` | 1254 × 1254 | A smartphone and a laptop side by side; a rounded app icon flying from a browser window onto the phone home screen with a small download arrow. |
| 3 | `/cai-dat` từng thẻ thiết bị (tuỳ chọn) | chưa có | `install-android-v1.png`, `install-ios-v1.png`, `install-desktop-v1.png` | 800 × 1000 | Phone screen mockup with a browser menu open and the "add to home screen" item circled in red. Three variants: Android Chrome, iPhone Safari share sheet, desktop browser address bar install icon. Leave menu text as blank lines. |
| 4 | `/ve-chung-toi` hero | `documents-hero-v1.png` (dùng lại) | `about-hero-v1.png` | 1254 × 1254 | A small toolbox open with a document, a QR code, a calculator and a house key coming out, each tiny, friendly. |
| 5 | `/ve-chung-toi` thẻ Tekshot OS | icon `camera-video` | `tekshot-mark-v1.png` | 512 × 512 | A security camera lens merged with an eye shape, scanning lines in front. |
| 6 | `/ho-tro` hero | icon `headset` | `support-hero-v1.png` | 1254 × 1254 | A headset next to a speech bubble containing a question mark shape (drawn, not a letter), a small book and a lightbulb. |
| 7 | `/xu-ly-du-lieu` hero | icon `shield-lock` | `privacy-hero-v1.png` | 1254 × 1254 | A laptop with a document staying inside a shield on its screen; a dashed arrow towards a cloud is crossed out with a red stroke. |
| 8 | `/huong-dan` hero | icon `book` | `guides-hero-v1.png` | 1254 × 1254 | An open notebook with three numbered step circles (draw the circles, no digits) and a pencil, a finger tapping a phone beside it. |
| 9 | `/huong-dan/<bài>` hero (tuỳ chọn) | icon của công cụ | `guide-<slug>-v1.png` | 1254 × 1254 | Một ảnh cho mỗi bài: nén PDF (document being squeezed by a clamp), scan (phone photographing a paper), tách PDF (scissors cutting a stack), OCR (magnifier over a page), QR (QR pattern and barcode), hướng nhà (compass over a house plan), khái toán (house with a calculator), lịch gia đình (calendar with small family figures). |
| 10 | `/dieu-khoan`, `/quyen-rieng-tu` | không có ảnh (trang chữ) | không cần | | Giữ trang chữ thuần để dễ đọc. |

## Khi có ảnh

- Đặt tệp vào `public/brand/`. Ảnh hero hub sửa `art` trong `src/features/site/config/hub-pages.ts`.
  Ảnh hero các trang nội dung truyền vào prop `art` của `SitePageHero` trong trang tương ứng
  (`src/features/site/pages/*.tsx`), theo mẫu `AboutPage.tsx` (`next/image` + `withBase`).
- `width`/`height` phải đúng kích thước thật của tệp; khai sai tỉ lệ là ảnh bị méo.
  Hai mục đang khai lệch nhẹ với tệp thật (cùng tỉ lệ nên chưa méo): `skyline-hero-v1.png`
  khai 1792 × 896 (thật 1774 × 887), `documents-hero-v1.png` khai 1280 × 1280 (thật 1254 × 1254).
- Nén PNG trước khi commit (ví dụ `npx sharp-cli` hoặc TinyPNG); ảnh hero nên dưới 300 KB.
