// Cửa riêng cho docx: chunk tải lười mang tên `docx-lib-*` thay vì `dist-*` (theo đường dẫn
// trong gói) — vite.config loại khỏi precache của service worker theo đúng tên này.
export * from 'docx'
