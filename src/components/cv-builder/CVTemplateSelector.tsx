'use client';
import React from 'react';
import { Modal, Card } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import { TEMPLATES } from './templates';

interface Props {
  open: boolean;
  current: string;
  language: 'vi' | 'en';
  onSelect: (templateId: string) => void;
  onClose: () => void;
}

export default function CVTemplateSelector({ open, current, language, onSelect, onClose }: Props) {
  return (
    <Modal
      title={language === 'vi' ? 'Chọn mẫu CV' : 'Select Template'}
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 12 }}>
        {TEMPLATES.map((tmpl) => (
          <Card
            key={tmpl.id}
            hoverable
            onClick={() => { onSelect(tmpl.id); onClose(); }}
            style={{
              border: current === tmpl.id ? '2px solid #1677ff' : '1px solid #e8e8e8',
              position: 'relative',
              cursor: 'pointer',
            }}
            bodyStyle={{ padding: 16 }}
          >
            {current === tmpl.id && (
              <CheckCircleFilled style={{ position: 'absolute', top: 8, right: 8, color: '#1677ff', fontSize: 18 }} />
            )}
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{tmpl.name}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{tmpl.description[language]}</div>
          </Card>
        ))}
      </div>
    </Modal>
  );
}
