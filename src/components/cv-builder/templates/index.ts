import type { CVPersonalInfo, CVSection } from '@/types';
import TemplateClassic from './TemplateClassic';
import TemplateModern from './TemplateModern';
import TemplateProfessional from './TemplateProfessional';
import TemplateMinimal from './TemplateMinimal';

export interface TemplateProps {
  personalInfo: CVPersonalInfo;
  sections: CVSection[];
  style: {
    fontFamily: string;
    fontSize: number;
    primaryColor: string;
  };
  language: 'vi' | 'en';
}

export interface TemplateConfig {
  id: string;
  name: string;
  description: { vi: string; en: string };
  component: React.ComponentType<TemplateProps>;
}

export const TEMPLATES: TemplateConfig[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: { vi: '1 cột, truyền thống, formal', en: 'Single column, traditional, formal' },
    component: TemplateClassic,
  },
  {
    id: 'modern',
    name: 'Modern',
    description: { vi: '2 cột, sidebar màu, hiện đại', en: 'Two-column, colored sidebar, modern' },
    component: TemplateModern,
  },
  {
    id: 'professional',
    name: 'Professional',
    description: { vi: '1 cột, thanh accent, chuyên nghiệp', en: 'Single column, accent bar, professional' },
    component: TemplateProfessional,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: { vi: 'Tối giản, nhiều khoảng trắng', en: 'Ultra-clean, whitespace-heavy' },
    component: TemplateMinimal,
  },
];

export function getTemplateById(id: string): TemplateConfig {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}
