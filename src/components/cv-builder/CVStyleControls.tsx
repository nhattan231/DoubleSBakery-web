'use client';
import React from 'react';
import { Select, InputNumber, ColorPicker } from 'antd';
import { CV_FONTS } from './constants/fonts';
import { getLabel } from './constants/sectionLabels';
import type { Color } from 'antd/es/color-picker';

interface Props {
  fontFamily: string;
  fontSize: number;
  primaryColor: string;
  language: 'vi' | 'en';
  onFontFamilyChange: (value: string) => void;
  onFontSizeChange: (value: number) => void;
  onColorChange: (value: string) => void;
}

export default function CVStyleControls({
  fontFamily, fontSize, primaryColor, language,
  onFontFamilyChange, onFontSizeChange, onColorChange,
}: Props) {
  const l = (key: string) => getLabel(key, language);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{l('style')}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 160px' }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{l('font')}</div>
          <Select
            value={fontFamily}
            onChange={onFontFamilyChange}
            style={{ width: '100%' }}
            options={CV_FONTS.map((f) => ({
              value: f.value,
              label: <span style={{ fontFamily: f.value }}>{f.label}</span>,
            }))}
            showSearch
            optionFilterProp="label"
          />
        </div>
        <div style={{ flex: '0 0 80px' }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{l('fontSize')}</div>
          <InputNumber
            value={fontSize}
            onChange={(v) => v && onFontSizeChange(v)}
            min={10}
            max={20}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ flex: '0 0 auto' }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{l('color')}</div>
          <ColorPicker
            value={primaryColor}
            onChange={(color: Color) => onColorChange(color.toHexString())}
            showText
            size="middle"
          />
        </div>
      </div>
    </div>
  );
}
