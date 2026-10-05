/**
 * Hop dong (contract) voi ERP REST API cua Drupal.
 *
 * Envelope do module `erp_api` quy dinh (`ApiResponse`): MOI phan hoi deu co
 * khoa `ok` boolean, du lieu nghiep vu duoc tron PHANG vao cung cap - khong co
 * lop `data` bao ngoai. Component KHONG dung truc tiep cac type nay; service
 * cua tung feature map sang domain model (tai lieu kien truc, muc 13 & 14).
 */

/** Phan hoi thanh cong: `{ ok: true, <khoa nghiep vu>: ... }`. */
export type ErpItemResponse<T> = { ok: true } & Record<string, T | unknown>

/** Phan hoi danh sach: `{ ok: true, items: [...], pager: {...} }`. */
export interface ErpListResponse<T> {
  ok: true
  items: T[]
  pager?: ErpPager
}

/** Khoi phan trang cua `ApiPager` - `page` DEM TU 0, tran `limit` la 100. */
export interface ErpPager {
  total: number
  page: number
  limit: number
  pages: number
}

/**
 * Body loi chuan hoa tu erp_api.
 *
 * `errors` la loi theo tung truong. Backend gui mot chuoi cho moi truong, nhung
 * chap nhan ca mang de con dung duoc voi endpoint tra nhieu loi mot luc.
 */
export interface ErpErrorResponse {
  ok?: false
  message?: string
  errors?: Record<string, string | string[]>
  /**
   * Ma loi may doc — khong phai endpoint nao cung tra. Co o erp_evidence
   * (`CHECKSUM_MISMATCH`, `SYNC_CONFLICT`...), erp_storage (`OUT_OF_ORDER`...),
   * erp_offline (`IN_PROGRESS`).
   */
  code?: string
}

/** Tham so gui len endpoint danh sach. */
export interface ErpListParams {
  /** DEM TU 0. */
  page?: number
  limit?: number
  /** Tu khoa tim kiem - ten la `q`, khong phai `search`. */
  q?: string
  sort?: string
  order?: 'asc' | 'desc'
  [filterKey: string]: unknown
}
