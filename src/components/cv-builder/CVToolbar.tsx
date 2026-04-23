'use client';
import React from 'react';
import { Button, Select, Input, Space, Tooltip, Popconfirm, Tag } from 'antd';
import {
  SaveOutlined,
  FilePdfOutlined,
  PlusOutlined,
  DeleteOutlined,
  LayoutOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import type { CVData } from '@/types';
import { getLabel } from './constants/sectionLabels';
import CVLanguageToggle from './CVLanguageToggle';

interface Props {
  cvData: CVData;
  cvList: CVData[];
  saving: boolean;
  saveStatus: 'idle' | 'saving' | 'saved';
  exporting: boolean;
  language: 'vi' | 'en';
  onChange: (data: Partial<CVData>) => void;
  onSelectCv: (id: string) => void;
  onNewCv: () => void;
  onSave: () => void;
  onExportPdf: () => void;
  onOpenTemplateSelector: () => void;
  onDeleteCv: () => void;
  onLanguageChange: (lang: 'vi' | 'en') => void;
}

export default function CVToolbar({
  cvData, cvList, saving, saveStatus, exporting, language,
  onChange, onSelectCv, onNewCv, onSave, onExportPdf,
  onOpenTemplateSelector, onDeleteCv, onLanguageChange,
}: Props) {
  const l = (key: string) => getLabel(key, language);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 16px',
      background: '#fff',
      borderBottom: '1px solid #e8e8e8',
      flexWrap: 'wrap',
    }}>
      {/* CV Selector */}
      <Select
        value={cvData.id || undefined}
        onChange={onSelectCv}
        style={{ width: 200 }}
        placeholder={l('newCv')}
        options={cvList.map((cv) => ({
          value: cv.id,
          label: cv.title || l('untitled'),
        }))}
        dropdownRender={(menu) => (
          <>
            {menu}
            <div style={{ padding: 8, borderTop: '1px solid #f0f0f0' }}>
              <Button type="dashed" icon={<PlusOutlined />} block size="small" onClick={onNewCv}>
                {l('newCv')}
              </Button>
            </div>
          </>
        )}
      />

      {/* Title */}
      <Input
        value={cvData.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder={l('untitled')}
        variant="borderless"
        style={{ flex: 1, minWidth: 120, fontWeight: 600 }}
      />

      {/* Save status */}
      {saveStatus === 'saving' && (
        <Tag icon={<LoadingOutlined />} color="processing">{l('saving')}</Tag>
      )}
      {saveStatus === 'saved' && (
        <Tag icon={<CheckCircleOutlined />} color="success">{l('saved')}</Tag>
      )}

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <CVLanguageToggle language={language} onChange={onLanguageChange} />

        <Tooltip title={l('selectTemplate')}>
          <Button icon={<LayoutOutlined />} onClick={onOpenTemplateSelector} />
        </Tooltip>

        <Tooltip title={l('save')}>
          <Button icon={<SaveOutlined />} onClick={onSave} loading={saving} />
        </Tooltip>

        <Tooltip title={l('exportPdf')}>
          <Button type="primary" icon={<FilePdfOutlined />} onClick={onExportPdf} loading={exporting}>
            PDF
          </Button>
        </Tooltip>

        {cvData.id && (
          <Popconfirm
            title={l('confirmDelete')}
            onConfirm={onDeleteCv}
            okText={language === 'vi' ? 'Xóa' : 'Delete'}
            cancelText={language === 'vi' ? 'Hủy' : 'Cancel'}
          >
            <Tooltip title={l('deleteCv')}>
              <Button danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        )}
      </div>
    </div>
  );
}
