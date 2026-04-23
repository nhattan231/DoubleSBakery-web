export const SECTION_LABELS: Record<string, { vi: string; en: string }> = {
  experience: { vi: 'Kinh nghiệm làm việc', en: 'Work Experience' },
  education: { vi: 'Học vấn', en: 'Education' },
  skills: { vi: 'Kỹ năng', en: 'Skills' },
  projects: { vi: 'Dự án', en: 'Projects' },
  certifications: { vi: 'Chứng chỉ', en: 'Certifications' },
  languages: { vi: 'Ngoại ngữ', en: 'Languages' },
  references: { vi: 'Người tham chiếu', en: 'References' },
  interests: { vi: 'Sở thích', en: 'Interests' },
  custom: { vi: 'Mục tùy chỉnh', en: 'Custom Section' },
};

export const UI_LABELS = {
  personalInfo: { vi: 'Thông tin cá nhân', en: 'Personal Information' },
  fullName: { vi: 'Họ và tên', en: 'Full Name' },
  email: { vi: 'Email', en: 'Email' },
  phone: { vi: 'Điện thoại', en: 'Phone' },
  address: { vi: 'Địa chỉ', en: 'Address' },
  jobTitle: { vi: 'Vị trí ứng tuyển', en: 'Job Title' },
  summary: { vi: 'Giới thiệu bản thân', en: 'Summary' },
  avatar: { vi: 'Ảnh đại diện', en: 'Avatar' },
  addSection: { vi: 'Thêm mục', en: 'Add Section' },
  removeSection: { vi: 'Xóa mục', en: 'Remove Section' },
  addItem: { vi: 'Thêm mục con', en: 'Add Item' },
  save: { vi: 'Lưu', en: 'Save' },
  saving: { vi: 'Đang lưu...', en: 'Saving...' },
  saved: { vi: 'Đã lưu', en: 'Saved' },
  exportPdf: { vi: 'Xuất PDF', en: 'Export PDF' },
  newCv: { vi: 'Tạo CV mới', en: 'New CV' },
  selectTemplate: { vi: 'Chọn mẫu', en: 'Select Template' },
  font: { vi: 'Font chữ', en: 'Font' },
  fontSize: { vi: 'Cỡ chữ', en: 'Font Size' },
  color: { vi: 'Màu chủ đạo', en: 'Primary Color' },
  style: { vi: 'Kiểu dáng', en: 'Style' },
  title: { vi: 'Tiêu đề', en: 'Title' },
  subtitle: { vi: 'Phụ đề', en: 'Subtitle' },
  startDate: { vi: 'Bắt đầu', en: 'Start Date' },
  endDate: { vi: 'Kết thúc', en: 'End Date' },
  description: { vi: 'Mô tả', en: 'Description' },
  present: { vi: 'Hiện tại', en: 'Present' },
  untitled: { vi: 'Chưa đặt tên', en: 'Untitled' },
  deleteCv: { vi: 'Xóa CV', en: 'Delete CV' },
  confirmDelete: { vi: 'Bạn có chắc muốn xóa CV này?', en: 'Are you sure you want to delete this CV?' },
  language: { vi: 'Ngôn ngữ', en: 'Language' },
  vietnamese: { vi: 'Tiếng Việt', en: 'Vietnamese' },
  english: { vi: 'Tiếng Anh', en: 'English' },
};

export function getLabel(key: string, lang: 'vi' | 'en', labels: Record<string, { vi: string; en: string }> = UI_LABELS): string {
  return labels[key]?.[lang] || key;
}

export function getSectionLabel(type: string, lang: 'vi' | 'en'): string {
  return SECTION_LABELS[type]?.[lang] || type;
}
