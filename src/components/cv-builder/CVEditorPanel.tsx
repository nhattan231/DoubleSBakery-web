'use client';
import React from 'react';
import { Divider } from 'antd';
import type { CVData, CVPersonalInfo, CVSection } from '@/types';
import CVPersonalInfoForm from './CVPersonalInfoForm';
import CVStyleControls from './CVStyleControls';
import CVSectionList from './CVSectionList';

interface Props {
  cvData: CVData;
  onChange: (data: Partial<CVData>) => void;
}

export default function CVEditorPanel({ cvData, onChange }: Props) {
  return (
    <div style={{ padding: '16px 16px 40px', overflowY: 'auto', height: '100%' }}>
      <CVPersonalInfoForm
        personalInfo={cvData.personalInfo}
        onChange={(personalInfo: CVPersonalInfo) => onChange({ personalInfo })}
        language={cvData.language}
      />

      <Divider style={{ margin: '16px 0' }} />

      <CVStyleControls
        fontFamily={cvData.fontFamily}
        fontSize={cvData.fontSize}
        primaryColor={cvData.primaryColor}
        language={cvData.language}
        onFontFamilyChange={(fontFamily) => onChange({ fontFamily })}
        onFontSizeChange={(fontSize) => onChange({ fontSize })}
        onColorChange={(primaryColor) => onChange({ primaryColor })}
      />

      <Divider style={{ margin: '16px 0' }} />

      <CVSectionList
        sections={cvData.sections}
        onChange={(sections: CVSection[]) => onChange({ sections })}
        language={cvData.language}
      />
    </div>
  );
}
