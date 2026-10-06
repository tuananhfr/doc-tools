import type { Guide } from '../config/guides'

export const guideTitle = (guide: Pick<Guide, 'title'>): string => `${guide.title} | Hướng dẫn Chuyện Nhỏ`
