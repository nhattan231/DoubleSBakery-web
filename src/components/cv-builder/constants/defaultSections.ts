import type { CVSection, CVPersonalInfo } from '@/types';

let _counter = 0;
export function generateId(): string {
  return `${Date.now()}-${++_counter}-${Math.random().toString(36).slice(2, 7)}`;
}

export const DEFAULT_PERSONAL_INFO: CVPersonalInfo = {
  fullName: '',
  email: '',
  phone: '',
  address: '',
  avatarUrl: '',
  title: '',
  summary: '',
};

export function createDefaultSections(): CVSection[] {
  return [
    {
      id: generateId(),
      type: 'experience',
      title: 'Kinh nghiệm làm việc',
      visible: true,
      items: [],
    },
    {
      id: generateId(),
      type: 'education',
      title: 'Học vấn',
      visible: true,
      items: [],
    },
    {
      id: generateId(),
      type: 'skills',
      title: 'Kỹ năng',
      visible: true,
      items: [],
    },
    {
      id: generateId(),
      type: 'languages',
      title: 'Ngoại ngữ',
      visible: true,
      items: [],
    },
  ];
}

export const AVAILABLE_SECTION_TYPES = [
  'experience',
  'education',
  'skills',
  'languages',
  'projects',
  'certifications',
  'references',
  'interests',
  'custom',
] as const;
