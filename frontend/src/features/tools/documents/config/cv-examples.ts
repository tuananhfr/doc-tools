import type { CvTemplateId } from './cv-templates'
import { emptyCv, type CvDraft } from '../models/cv'

/** Fictional examples, separate from the person's draft and never loaded automatically. */
export function cvExample(template: CvTemplateId, language = 'vi'): CvDraft {
  const vi = language.startsWith('vi')
  const profiles = vi ? {
    classic: ['Nguyễn Minh An', 'Nhân viên hành chính', 'Điều phối hồ sơ, lịch họp và công việc văn phòng với 3 năm kinh nghiệm.', 'Công ty Mẫu', 'Phụ trách hành chính', 'Chuẩn hóa quy trình lưu hồ sơ, giảm 20% thời gian tìm kiếm tài liệu.', 'Quản trị văn phòng', 'Quản lý hồ sơ\nExcel, Word\nGiao tiếp nội bộ'],
    modern: ['Trần Thảo Linh', 'Chuyên viên marketing', 'Xây dựng nội dung và triển khai chiến dịch truyền thông dựa trên dữ liệu.', 'Studio Minh Họa', 'Chuyên viên nội dung', 'Phối hợp 4 chiến dịch; tăng 25% lượt đăng ký so với quý trước.', 'Truyền thông đa phương tiện', 'Lập kế hoạch nội dung\nPhân tích dữ liệu\nThiết kế cơ bản'],
    compact: ['Lê Hoàng Nam', 'Lập trình viên phần mềm', 'Phát triển ứng dụng web, chú trọng hiệu năng, kiểm thử và trải nghiệm người dùng.', 'Nhóm Sản Phẩm Mẫu', 'Lập trình viên frontend', 'Xây dựng 12 màn hình và bổ sung kiểm thử cho các luồng chính.', 'Công nghệ thông tin', 'TypeScript, React\nSQL, Git\nKiểm thử tự động'],
    executive: ['Phạm Ngọc Mai', 'Trưởng nhóm vận hành', 'Có 8 năm kinh nghiệm điều phối vận hành, phát triển đội ngũ và cải tiến quy trình.', 'Doanh nghiệp Minh Họa', 'Trưởng nhóm vận hành', 'Quản lý nhóm 8 người; chuẩn hóa báo cáo và giảm 15% chi phí vận hành.', 'Quản trị kinh doanh', 'Quản lý đội ngũ\nLập kế hoạch ngân sách\nCải tiến quy trình'],
    sidebar: ['Võ Gia Hân', 'Chuyên viên thiết kế', 'Thiết kế ấn phẩm và giao diện rõ ràng, nhất quán, phù hợp với mục tiêu thương hiệu.', 'Xưởng Thiết Kế Mẫu', 'Chuyên viên thiết kế', 'Hoàn thiện bộ nhận diện và 20 ấn phẩm cho các dự án minh họa.', 'Thiết kế đồ họa', 'Figma, Illustrator\nBố cục và màu sắc\nThiết kế giao diện'],
  } : {
    classic: ['Alex Morgan', 'Office Administrator', 'Three years of experience coordinating documents, meetings and office operations.', 'Example Company', 'Office Administrator', 'Organized records and reduced document retrieval time by 20%.', 'Office Administration', 'Records management\nExcel and Word\nTeam communication'],
    modern: ['Taylor Lee', 'Marketing Specialist', 'Creates clear content and plans campaigns using research and measurable goals.', 'Example Studio', 'Content Specialist', 'Delivered four campaigns and increased registrations by 25%.', 'Communications', 'Content planning\nData analysis\nVisual communication'],
    compact: ['Sam Parker', 'Software Developer', 'Builds reliable web applications with attention to performance and usability.', 'Example Product Team', 'Frontend Developer', 'Delivered twelve screens with automated tests for key journeys.', 'Computer Science', 'TypeScript and React\nSQL and Git\nAutomated testing'],
    executive: ['Jordan Rivera', 'Operations Manager', 'Eight years of experience improving operations and supporting effective teams.', 'Example Enterprise', 'Operations Lead', 'Managed a team of eight and reduced operating costs by 15%.', 'Business Administration', 'Team leadership\nBudget planning\nProcess improvement'],
    sidebar: ['Casey Quinn', 'Visual Designer', 'Designs clear, consistent visual identities and accessible digital interfaces.', 'Example Design Studio', 'Visual Designer', 'Created a brand system and twenty communication assets.', 'Graphic Design', 'Figma and Illustrator\nTypography and colour\nInterface design'],
  }
  const [name, role, summary, organization, title, description, degree, skills] = profiles[template]
  return { ...emptyCv(), template, name, role, summary, email: 'candidate@example.com', phone: '0900000000',
    location: vi ? 'Đà Nẵng' : 'Your city', link: 'https://example.com/portfolio',
    experience: [{ period: '2022 – 2025', organization, title, description }],
    education: [{ period: '2018 – 2022', organization: vi ? 'Trường Đại học Mẫu' : 'Example University', title: degree, description: vi ? 'Nội dung minh họa; thay bằng thông tin của bạn.' : 'Illustrative content; replace with your own details.' }],
    skills, languages: vi ? 'Tiếng Việt: bản ngữ\nTiếng Anh: giao tiếp' : 'English: fluent\nSpanish: conversational',
    certificates: vi ? 'Chứng chỉ chuyên môn (ví dụ)' : 'Professional certificate (example)' }
}
