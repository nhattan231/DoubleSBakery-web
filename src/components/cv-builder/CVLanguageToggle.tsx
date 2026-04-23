'use client';
import React from 'react';
import { Radio } from 'antd';

interface Props {
  language: 'vi' | 'en';
  onChange: (lang: 'vi' | 'en') => void;
}

export default function CVLanguageToggle({ language, onChange }: Props) {
  return (
    <Radio.Group
      value={language}
      onChange={(e) => onChange(e.target.value)}
      optionType="button"
      buttonStyle="solid"
      size="small"
      options={[
        { label: 'VN', value: 'vi' },
        { label: 'EN', value: 'en' },
      ]}
    />
  );
}
