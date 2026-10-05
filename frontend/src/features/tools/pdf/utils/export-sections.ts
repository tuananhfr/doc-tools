/** Neo trong bảng Xuất tệp — gợi ý sau khi thả tệp cuộn thẳng tới đúng mục. */
export const EXPORT_SECTION = { split: 'doc-tools-export-split', image: 'doc-tools-export-image' } as const
export type ExportSection = keyof typeof EXPORT_SECTION

/** Cột phải (Xuất / Số trang / Tìm) — nút "Xuất tệp" dính đáy ở màn hẹp cuộn tới đây. */
export const SIDE_PANEL_ID = 'doc-tools-panel'
