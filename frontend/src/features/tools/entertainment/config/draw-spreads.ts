export type SpreadRole = 'situation' | 'obstacle' | 'support' | 'advice' | 'direction' | 'background' | 'desire' | 'change' | 'need' | 'relationship' | 'step' | 'self' | 'environment' | 'hope'
export interface SpreadPosition { title: string; description: string; role: SpreadRole }
export interface DrawSpread { title: string; positions: readonly SpreadPosition[] }

const position = (title: string, description: string, role: SpreadRole): SpreadPosition => ({ title, description, role })
const situation = position('Tình huống', 'Chuyện chính đang diễn ra trong việc bạn muốn tìm hiểu.', 'situation')
const obstacle = position('Trở ngại', 'Điều đang cản trở hoặc làm chuyện này khó giải quyết.', 'obstacle')
const support = position('Điểm tựa', 'Người, khả năng hoặc điều kiện có thể giúp bạn xử lý chuyện này.', 'support')
const advice = position('Lời khuyên', 'Cách xử lý hoặc việc bạn nên cân nhắc làm tiếp.', 'advice')
const direction = position('Hướng phát triển', 'Khả năng tiếp theo nếu tình huống tiếp tục theo cách hiện tại.', 'direction')

export const DRAW_SPREADS: Readonly<Record<number, DrawSpread>> = {
  1: { title: 'Một lá: Lời khuyên hôm nay', positions: [advice] },
  3: { title: 'Ba lá: Tình huống, trở ngại, lời khuyên', positions: [situation, obstacle, advice] },
  5: { title: 'Năm lá: Nhìn rõ một tình huống', positions: [situation, obstacle, support, advice, direction] },
  7: { title: 'Bảy lá: Hiểu chuyện đang hỏi', positions: [
    position('Bối cảnh', 'Hoàn cảnh dẫn đến chuyện đang hỏi.', 'background'),
    situation, obstacle,
    position('Điều mong muốn', 'Điều bạn muốn đạt được hoặc muốn người khác hiểu.', 'desire'),
    support, advice, direction,
  ] },
  9: { title: 'Chín lá: Bức tranh tổng quan', positions: [
    position('Ảnh hưởng trước đây', 'Chuyện cũ vẫn đang ảnh hưởng đến hiện tại.', 'background'),
    situation,
    position('Điều đang thay đổi', 'Phần tình huống đang khác đi so với trước.', 'change'),
    position('Nhu cầu bên trong', 'Điều bạn thực sự cần hoặc đang thiếu.', 'need'),
    obstacle, support,
    position('Quan hệ xung quanh', 'Cách người có liên quan đang ảnh hưởng đến chuyện này.', 'relationship'),
    advice, direction,
  ] },
  10: { title: 'Mười lá: Khám phá một quyết định', positions: [
    situation, obstacle,
    position('Nền tảng', 'Lý do hoặc điều kiện chính đứng sau chuyện này.', 'background'),
    position('Ảnh hưởng trước đây', 'Chuyện đã xảy ra đang ảnh hưởng đến quyết định hiện tại.', 'background'),
    position('Điều mong muốn', 'Kết quả bạn đang muốn đạt được.', 'desire'),
    position('Bước tiếp theo', 'Một việc gần nhất bạn có thể cân nhắc làm.', 'step'),
    position('Góc nhìn của bạn', 'Cách bạn đang nhìn và phản ứng với chuyện này.', 'self'),
    position('Môi trường xung quanh', 'Ảnh hưởng từ người khác hoặc hoàn cảnh bên ngoài.', 'environment'),
    position('Hy vọng và băn khoăn', 'Điều bạn đang mong đợi hoặc lo sợ.', 'hope'),
    direction,
  ] },
}

export const SPREAD_METHOD_NOTE = 'Đọc ý nghĩa mỗi lá theo vị trí của nó: chẳng hạn Tình huống, Trở ngại hoặc Lời khuyên. Chuyện Nhỏ biên soạn các bố cục này để tham khảo; trải ba lá dựa trên cách đọc Tình huống, Trở ngại, Lời khuyên. Những trải nhiều lá là bố cục riêng, không phải lời khẳng định về tương lai.'
