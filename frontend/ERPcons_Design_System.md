# ERPcons — Crimson Ice Design System

**Construction OS • Final Implementation Guideline • 2027–2036+**
Design + Frontend/Flutter Dev • Light / Field / Dark • Responsive • Accessible
**Version: FINAL v1.1** (cập nhật từ v1.0 DEV) • Ngày: 2026-08-12

> **Tagline mới:** Trust • Intelligence • Progress • Identity
> **Triết lý chốt:** BLUE CARRIES TRUST • TEAL CARRIES INTELLIGENCE • GREEN CARRIES PROGRESS • CRIMSON CARRIES IDENTITY • RED CARRIES RISK

---

## 01. Quyết định thiết kế đã chốt

ERPcons dùng nền **Neutral/Ice** sạch; **Blue/Steel** là ngôn ngữ Trust/Data/Control; **Teal** là Intelligence; **Green** là Progress/ESG; **Copper** là Construction; **Crimson chỉ giữ Identity/CTA**. Dark cho điều hành/ban đêm; Light cho văn phòng; Field cho công trường ngoài trời.

### Tỷ lệ màu chủ đạo (Visual Ratio) — ⚠️ ĐÃ THAY ĐỔI so với v1.0

| Nhóm | Visual ratio mục tiêu | Vai trò |
| --- | --- | --- |
| Neutral / Ice | **74%** | Nền, surface, vùng nghỉ mắt |
| Blue / Steel | **12%** | Tin cậy, dữ liệu, kiểm soát |
| Teal / Green / Copper | **7%** | AI, tiến độ, ESG, xây dựng |
| Crimson | **2%** | Nhận diện, CTA quan trọng |
| Danger | **<1%** (bình thường) | Rủi ro/lỗi thực sự |
| Semantic / khác | **~5%** | Context phụ |

> *(v1.0 cũ: 70% Neutral / 18% Foundation / 8% Semantic-Domain / 4% Brand — đã bị thay thế.)*

**Nguyên tắc:** Blue tạo niềm tin • Teal tạo trí tuệ • Green tạo tiến độ • Crimson tạo nhận diện • Red chỉ dành cho rủi ro.

---

## 02. Theme Modes

| Mode | Đối tượng | Đặc điểm |
| --- | --- | --- |
| **Light Mode** (Văn phòng) | Office default | Sáng, sạch, dễ đọc, tập trung làm việc lâu |
| **Field Mode** (Ngoài trời) | Kỹ sư/chỉ huy trưởng công trường | Tương phản cao, chống chói, dễ thao tác |
| **Dark Mode** (Điều hành) | Executive / control room / ban đêm | Tối ưu cho trung tâm điều hành, ít chói, tập trung cao |

---

## 03. Color Source of Truth

### Primitive tokens (chuẩn — áp dụng cho mọi theme)

| Token | HEX | Ý nghĩa |
| --- | --- | --- |
| `brand.crimson` | `#DA3548` | ERPcons identity / primary CTA |
| `foundation.ink` | `#101820` | Text mạnh / dark base |
| `foundation.graphite` | `#1B2633` | Dark surface/navigation |
| `foundation.steel` | `#526477` | Structure/secondary |
| `foundation.mist` | `#F2F6F8` | Light background |
| `foundation.snow` | `#FFFFFF` | Light surface |
| `foundation.cloud` | `#E7EEF2` | Secondary surface |
| `domain.blue` | `#3678D4` | **Trust**/Data/Analytics/Workflow |
| `domain.teal` | `#16A6A0` | AI/Automation/Intelligence |
| `domain.green` | `#27A66F` | **Progress**/ESG/Efficiency |
| `domain.copper` | `#C98245` | Construction/Material/Equipment |
| `semantic.success` | `#159A68` | Success |
| `semantic.warning` | `#C88920` | Warning |
| `semantic.danger` | `#D9363E` | Danger/Error/Risk |
| `semantic.info` | `#3678D4` | Info |
| `semantic.neutral` | `#718096` | Neutral |

### Thang màu mở rộng (theo poster Design System 2027+)

Poster mới bổ sung các thang (scale) phục vụ UI chi tiết. Các giá trị đọc được từ ảnh:

**Neutral / Ice Scale** — nền, surface, border, text chính & phụ:
`Ice 0 #FFFFFF` • `Ice 50 #F8FAFC` • `Ice 100 #F2F6F8` • `Ice 200` *(cần xác nhận hex)* • `Ice 300 #D2DEE7` • `Grey 600 #64748B` • `Ink 900 #0F172A`

**Blue / Steel** — màu chính cho dữ liệu, tin cậy, liên kết, cấu trúc:
`Blue 600 #3678D4` • `Blue 500 #1F6FE8` • các bậc Blue 400/300 nhạt dần • `Steel 600 #334155`

**Teal / Green / Copper** — trí tuệ (AI), tiến độ, ESG, dự báo, xây dựng:
`Teal 600 #0D9488` • `Green 600 #16A34A` • `Green 400 #4ADE80` • `Copper 500 #F59E0B`

> ⚠️ File DOCX FINAL là **Color Source of Truth** cho primitive tokens. Các thang mở rộng trên lấy từ poster; một số hex khó đọc từ ảnh — cần đối chiếu file Figma/token JSON gốc trước khi code.

---

## 04. Theme Tokens

### LIGHT — Office Default

| Token | HEX |
| --- | --- |
| `bg.default` | `#F2F6F8` |
| `surface.default` | `#FFFFFF` |
| `surface.secondary` | `#E7EEF2` |
| `text.primary` | `#101820` |
| `text.secondary` | `#344454` |
| `border.default` | `#D6E0E6` |
| `action.primary` | `#DA3548` |
| `action.secondary` | `#3678D4` *(mới trong v1.1)* |
| `focus.ring` | `#3678D4` |

**Mục tiêu:** làm việc 8–10 giờ, sạch, mát, ít mỏi; hierarchy bằng surface/border/spacing, **không dùng shadow nặng**.

### DARK — Executive / Control Room / Night

| Token | HEX |
| --- | --- |
| `bg.default` | `#101820` |
| `surface.default` | `#17232E` |
| `surface.secondary` | `#202F3C` |
| `text.primary` | `#F2F6F8` |
| `text.secondary` | `#AEBBC6` |
| `border.default` | `#344554` |
| `action.primary` | `#F04457` |
| `action.secondary` | `#5EA8FF` *(mới trong v1.1)* |
| `focus.ring` | `#5EA8FF` |

**Quy tắc:** Không dùng `#000000` làm nền chính; không neon/gaming.

### FIELD — Outdoor Construction / Sunlight

| Token | HEX |
| --- | --- |
| `bg.default` | `#FFFFFF` |
| `surface.default` | `#FFFFFF` *(bổ sung rõ trong v1.1)* |
| `surface.secondary` | `#F3F5F6` |
| `text.primary` | `#101820` |
| `text.secondary` | `#344454` |
| `border.default` | `#AAB7C2` |
| `action.primary` | `#C9283E` |
| `action.secondary` | `#145CC2` *(mới trong v1.1)* |
| `focus.ring` | `#145CC2` *(v1.0 chưa định nghĩa riêng)* |
| `domain.teal` | `#087F7A` |
| `domain.blue` | `#145CC2` |
| `state.success` | `#087A50` |
| `state.warning` | `#9A6100` |
| `state.danger` | `#B51F2D` |

**Quy tắc:** Field là **theme riêng** (không phải Light tăng brightness): tăng contrast, giảm pastel, border rõ, touch target lớn; **phải test trên thiết bị thật dưới nắng**.

---

## 05. Semantic Language — ⚠️ ĐÃ CẬP NHẬT ý nghĩa màu

| Màu | Thông điệp | Ví dụ |
| --- | --- | --- |
| Blue | **Trust / Data / Control** | KPI, chart, analytics, workflow |
| Teal | **Intelligence** | AI insight, prediction, automation |
| Green | **Progress** | Positive trend, ESG, efficiency |
| Copper | **Construction reality** | Material, equipment, site |
| Crimson | **Identity / Action** | Logo, selected, primary CTA |
| Danger | **Risk** | Critical issue, error, violation |

> ⚠️ **RULE BẮT BUỘC: Crimson ≠ Danger.** Không dùng Crimson làm cảnh báo chỉ vì logo màu đỏ.

**Semantic states** — cách thể hiện bắt buộc: **màu + icon/label**, không bao giờ chỉ dùng màu (không chỉ chấm đỏ cho Danger).

| State | Token | HEX |
| --- | --- | --- |
| Success | `semantic.success` | `#159A68` |
| Warning | `semantic.warning` | `#C88920` |
| Info | `semantic.info` | `#3678D4` |
| Danger | `semantic.danger` | `#D9363E` |
| Neutral | `semantic.neutral` | `#718096` |

---

## 06. Responsive & Context

| Nền tảng | Chiến lược |
| --- | --- |
| PC/Laptop | **Information Dense:** dashboard, chart, table, multi-column |
| Tablet | **Field Command:** progress, issue, risk, task, photo, approval |
| Mobile | **Action First:** Today, task, risk, progress, photo, approval, AI |
| Mobile Field | Camera, QR, voice, checklist, offline, sync |

> **Không scale desktop xuống mobile. Mobile phải tái cấu trúc theo nhiệm vụ.**

### Field UX chuẩn

| Field UX | Chuẩn |
| --- | --- |
| Touch target | ≥ **44px**; khuyến nghị **48px**; action công trường **52–56px** |
| Input | Khuyến nghị **48px** |
| Status | Icon + label + color; không color-only |
| Chart | Series chính stroke ≥ **2px**; marker/label khi cần |
| Offline | **Offline / Pending Sync / Synced** rõ ràng |
| Outdoor | Test thiết bị thật dưới ánh sáng cao |

### Breakpoints (tham chiếu poster v1.0 — vẫn áp dụng)

| Thiết bị | Kích thước | Layout |
| --- | --- | --- |
| Mobile | ≤ 576px | 1 cột; ưu tiên nội dung quan trọng |
| Tablet | 577px – 1024px | 2 cột; tối ưu thao tác cảm ứng |
| Desktop | 1025px – 1440px | Lưới 12 cột; hiển thị đầy đủ |
| Large Desktop | ≥ 1441px | Lưới 12–16 cột; tối ưu phân tích |

---

## 07. Data Visualization

| Series | Color | Ý nghĩa |
| --- | --- | --- |
| Planned | `#3678D4` | Kế hoạch |
| Actual | `#16A6A0` | Thực tế |
| Forecast | `#C98245` | Dự báo |
| Positive | `#27A66F` | Tốt |
| Negative | `#D9363E` | Xấu |
| Reference | `#526477` | Baseline |

**Quy tắc:**
- Không quá **5–6 series màu** cùng lúc.
- **Luôn có** legend / label / marker / line style — không phụ thuộc màu duy nhất.
- Field Mode: tăng stroke/marker, không chỉ đổi màu.

---

## 08. AI / Intelligence Layer

AI dùng **Teal** làm ngôn ngữ chính. Gradient **Crimson→Teal** chỉ dùng cho AI moments / hero / agent visualization. **Không biến toàn bộ ERP thành neon.**

| AI element | Rule |
| --- | --- |
| AI badge | Teal + icon + "AI" |
| AI insight | Teal accent + **giải thích ngắn** |
| Prediction | Teal/Blue + **confidence** *(mới trong v1.1)* |
| Recommendation | Teal + action CTA *(mới trong v1.1)* |
| Risk/Error | Semantic Danger/Warning **thắng** AI styling |
| Glow | Chỉ hero/visualization |

---

## 09. Typography / Spacing / Shape

### Typography

**Font:** Inter Variable hoặc sans tương đương — **bắt buộc hỗ trợ tiếng Việt đầy đủ**.

| Cấp | Size / Weight (theo poster mới — size cố định) |
| --- | --- |
| H1 | 32px / Bold |
| H2 | 24px / SemiBold |
| H3 | 20px / SemiBold |
| H4 | 16px / Medium |
| Body Large | 14px / Regular |
| Body | 14px / Regular (chuẩn 14–16px) |
| Caption | 12px / Regular (12–14px) |
| Overline | 10px / Medium |

> *(v1.0 dùng dải size H1 32–40, H2 24–32… — v1.1 chốt size cố định theo poster.)*

### Spacing (8px grid)

- **Scale chuẩn (DOCX):** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px
- Poster có thêm các bậc lớn hơn (tới 96px) cho section spacing/layout — dùng khi cần khoảng cách vùng lớn.

### Radius

| Token | Giá trị |
| --- | --- |
| sm | 4px (Small) |
| md | 8px (Medium) |
| lg | 12px (Large) |
| xl | 16px (Extra Large) |
| round | 24px (Round) |
| pill | 32px (Pill / Circle) |

### Border / Focus / Shadow

| Hạng mục | Giá trị |
| --- | --- |
| Border | 1px |
| Focus | 2px visible ring |
| Shadow | Subtle (0–2px nhẹ, hạn chế shadow lớn) |

---

## 10. Components — UI Kit (theo poster)

- **Buttons:** Primary (Crimson) • Secondary (Blue) • Secondary dark • Tertiary • Ghost. Tránh ghost button cho action quan trọng ngoài trời.
- **Status / Labels:** Thành công, Đang thực hiện, Chờ phản hồi, Chưa bắt đầu, Quá hạn, Cảnh báo, Thông tin — semantic soft fill + label.
- **Inputs:** Input text, Dropdown, Date picker, Search — có Label; error dùng semantic danger + text mô tả.
- **Tabs:** Tab đang chọn có indicator rõ (không chỉ đổi màu chữ).
- **Cards:** Tiêu đề + mô tả ngắn; card KPI có số liệu lớn + trend.
- **Progress / Steps:** Stepper có trạng thái từng bước (hoàn thành / đang làm / chưa làm).
- **Table:** STT, hạng mục, tiến độ, trạng thái — trạng thái dùng badge semantic.
- **Notification steps:** Thành công / Cảnh báo / Thông tin / Lỗi — icon + màu + nội dung.

**Component states:** Default → Hover → Active/Focus → Disabled (giữ nguyên quy tắc v1.0: Primary Crimson đậm dần, disabled dùng neutral muted, không dùng opacity quá thấp cho card).

---

## 11. Accessibility / WCAG 2.2

| Check | Acceptance |
| --- | --- |
| Normal text | ≥ **4.5:1** |
| Large text | ≥ **3:1** |
| UI indicator | ≥ 3:1 khi cần phân biệt |
| Color-only | **Không được** |
| Focus | Visible trên cả Light/Dark/Field |
| Field | **Contrast cao hơn Light** + test ngoài trời |

### Sunlight / Outdoor Guidelines — ⚠️ CẬP NHẬT v1.1

- **Field Mode contrast tối thiểu 7:1** *(mới — v1.0 chỉ yêu cầu AA 4.5:1)*
- Text tối thiểu **16px trên mobile** *(nâng từ 14px)*
- Nút chạm tối thiểu **44–48px**
- Ưu tiên **icon + text** (không chỉ màu)
- Tránh bóng mờ quá nhiều ngoài trời
- Sử dụng màu bão hòa vừa phải

---

## 12. Design Token Architecture

**Bắt buộc: Primitive → Semantic → Component.** Component không gọi trực tiếp HEX.

```text
color/
  primitive/
    brand.crimson
    foundation.*          (ink, graphite, steel, mist, snow, cloud)
    domain.blue / domain.teal / domain.green / domain.copper
    semantic.*            (success, warning, danger, info, neutral)

  semantic/
    bg.*  surface.*  text.*  border.*
    action.*  focus.*  state.*

  component/
    button.*  input.*  card.*  table.*
    badge.*  navigation.*  chart.*  alert.*   ← alert.* mới trong v1.1
```

Theme tokens tổ chức dạng JSON structure (color / spacing / radius / typography / elevation / component tokens) — dùng chung cho Design QA và Dev QA.

---

## 13. Flutter Implementation — 🆕 MỚI TRONG v1.1

Dùng **`ThemeData` + `ThemeExtension`** (hoặc lớp token tương đương) cho Light/Dark/Field.
**Không hardcode `Color(0xFF...)` trong widget nghiệp vụ.** Component chỉ đọc semantic token; feature screen không tự tạo màu.

| Layer | Rule |
| --- | --- |
| App | Light/Dark/Field Theme |
| Token | Immutable definitions |
| Component | Semantic token only |
| Feature | Compose component; không tạo màu riêng |
| Responsive | Breakpoint/context layout |
| QA | Theme + accessibility + device test |

---

## 14. Do / Don't — ⚠️ CẬP NHẬT v1.1

| ✅ DO | ❌ DON'T |
| --- | --- |
| Neutral là nền chính; ưu tiên trắng & khoảng nghỉ | Không phủ màn hình bằng Crimson; không lạm dụng màu đỏ |
| Blue tạo trust/data; dùng Blue cho dữ liệu & tin cậy | Không biến ERP thành blue-only SaaS / 1 màu 1 màn |
| Teal cho AI & thông tin thông minh | Không neon AI toàn hệ thống |
| Green cho kết quả tích cực / tiến độ | Không dùng green cho mọi thứ |
| Copper tạo construction | Không dùng orange làm accent chính |
| Crimson cho CTA & nhận diện (~2%) | Không dùng đỏ cho mọi CTA/status; không nút quá nhỏ khó thao tác |
| Danger <1% bình thường | Không biến dashboard thành cảnh báo; không chỉ dùng màu để truyền tải thông tin |
| Tăng tương phản ngoài trời; Field cho công trường | Không dùng Dark dưới nắng; không thiếu tương phản chữ/nền |
| Icon + label + color | Không color-only |
| Token-first | Không hardcode HEX |
| Thiết kế mobile-first cho công trường; responsive theo nhiệm vụ | Không shrink desktop xuống mobile; không nhồi nhét thông tin không hợp lý |

---

## 15. Definition of Done — ⚠️ CẬP NHẬT v1.1

- [ ] Light/Dark/Field dùng chung component, khác nhau qua token.
- [ ] Không hardcode HEX trong component nghiệp vụ.
- [ ] Crimson được tách khỏi Danger.
- [ ] **Tỷ lệ visual không tạo cảm giác "red UI" hoặc "blue SaaS".** *(mới)*
- [ ] WCAG 2.2 AA được kiểm tra cho text/component.
- [ ] Không có state chỉ thể hiện bằng màu.
- [ ] Touch target mobile ≥44px; action field ≥48px.
- [ ] Field Mode được test trên **thiết bị thật ngoài trời**.
- [ ] Chart không phụ thuộc màu duy nhất.
- [ ] **Mobile đã tái cấu trúc theo task.** *(nhấn mạnh mới)*
- [ ] AI dùng Teal có tiết chế.
- [ ] Dark không dùng black tuyệt đối.
- [ ] **Offline / Pending Sync / Synced rõ trên mobile field.** *(mới)*
- [ ] **Design QA và Dev QA dùng cùng source-of-truth.** *(mới)*
- [ ] Kiểm tra font tiếng Việt, số liệu, dấu phân cách, zoom, keyboard focus, disabled/error states *(giữ từ v1.0)*.
- [ ] Theme switch không làm mất trạng thái dữ liệu hoặc workflow *(giữ từ v1.0)*.

---

## 16. Final Philosophy

**BLUE CARRIES TRUST • TEAL CARRIES INTELLIGENCE • GREEN CARRIES PROGRESS • CRIMSON CARRIES IDENTITY • RED CARRIES RISK**

Logo mạnh + UI yên tĩnh + AI có tín hiệu nhẹ. ERPcons phải **tươi mới, mát, đáng tin, rõ ràng và có năng lượng làm việc**; không gây căng thẳng, không nhàm chán và không chạy theo aesthetic AI nhất thời.

> *ERPcons — Construction OS for the Future. Build better today – Sustainable tomorrow – Better life for life.*

---

## Phụ lục — Tóm tắt thay đổi v1.0 → v1.1

| Hạng mục | v1.0 DEV | v1.1 FINAL |
| --- | --- | --- |
| Visual ratio | 70 / 18 / 8 / 4 | **74% Ice / 12% Blue-Steel / 7% Teal-Green-Copper / 2% Crimson / <1% Danger / ~5% khác** |
| Tagline | Intelligent • Integrated • Construction OS | **Trust • Intelligence • Progress • Identity** |
| Ý nghĩa Blue | "System knows" (Digital) | **Trust / Data / Control** — vai trò lớn hơn (12%) |
| Ý nghĩa Green | ESG / Sustainability | **Progress** / ESG / Efficiency |
| `action.secondary` | Chưa có | **Thêm** cho cả 3 theme (Light #3678D4, Dark #5EA8FF, Field #145CC2) |
| Field `focus.ring` | Dùng chung | **Định nghĩa riêng #145CC2** |
| Field contrast | AA 4.5:1 | **Tối thiểu 7:1** |
| Text mobile field | 14px (mobile 16px) | **Tối thiểu 16px trên mobile** |
| Typography | Dải size (H1 32–40…) | **Size cố định** (H1 32, H2 24, H3 20, H4 16…) |
| Spacing | 4–96px | **Core 4/8/12/16/24/32/48/64** (bậc lớn hơn cho layout) |
| Color scale | Chỉ primitive | **Thêm Ice/Blue-Steel/Teal-Green-Copper scale** (theo poster) |
| Flutter | Không có | **Section riêng: ThemeData + ThemeExtension, layer rules** |
| Token component | Không có `alert.*` | **Thêm `alert.*`** |
| AI layer | 6 rule cơ bản | Thêm **Prediction + confidence**, **Recommendation + CTA** |
| DoD | 15 mục | Thêm: **no red-UI/blue-SaaS feel, offline states, QA chung source-of-truth, mobile tái cấu trúc theo task** |
