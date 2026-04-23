'use client';
import React, { useState } from 'react';
import { Input, Button, Upload, message, Avatar } from 'antd';
import { UploadOutlined, UserOutlined, DeleteOutlined } from '@ant-design/icons';
import { uploadApi } from '@/lib/api';
import type { CVPersonalInfo } from '@/types';
import { getLabel } from './constants/sectionLabels';

const { TextArea } = Input;

interface Props {
  personalInfo: CVPersonalInfo;
  onChange: (info: CVPersonalInfo) => void;
  language: 'vi' | 'en';
}

export default function CVPersonalInfoForm({ personalInfo, onChange, language }: Props) {
  const [uploading, setUploading] = useState(false);
  const l = (key: string) => getLabel(key, language);

  const update = (field: keyof CVPersonalInfo, value: string) => {
    onChange({ ...personalInfo, [field]: value });
  };

  const handleUploadAvatar = async (file: File) => {
    setUploading(true);
    try {
      const res = await uploadApi.uploadImage(file);
      const url = res.data.data?.url;
      if (url) {
        onChange({ ...personalInfo, avatarUrl: url });
        message.success(language === 'vi' ? 'Tải ảnh thành công' : 'Upload successful');
      }
    } catch {
      message.error(language === 'vi' ? 'Lỗi tải ảnh' : 'Upload failed');
    } finally {
      setUploading(false);
    }
    return false;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{l('personalInfo')}</div>

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <Avatar
          size={56}
          src={personalInfo.avatarUrl || undefined}
          icon={!personalInfo.avatarUrl ? <UserOutlined /> : undefined}
          style={{ flexShrink: 0 }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <Upload
            showUploadList={false}
            beforeUpload={handleUploadAvatar}
            accept="image/*"
          >
            <Button size="small" icon={<UploadOutlined />} loading={uploading}>
              {l('avatar')}
            </Button>
          </Upload>
          {personalInfo.avatarUrl && (
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onChange({ ...personalInfo, avatarUrl: '' })}
            />
          )}
        </div>
      </div>

      <Input
        placeholder={l('fullName')}
        value={personalInfo.fullName}
        onChange={(e) => update('fullName', e.target.value)}
      />
      <Input
        placeholder={l('jobTitle')}
        value={personalInfo.title}
        onChange={(e) => update('title', e.target.value)}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <Input
          placeholder={l('email')}
          value={personalInfo.email}
          onChange={(e) => update('email', e.target.value)}
          style={{ flex: 1 }}
        />
        <Input
          placeholder={l('phone')}
          value={personalInfo.phone}
          onChange={(e) => update('phone', e.target.value)}
          style={{ flex: 1 }}
        />
      </div>
      <Input
        placeholder={l('address')}
        value={personalInfo.address}
        onChange={(e) => update('address', e.target.value)}
      />
      <TextArea
        placeholder={l('summary')}
        value={personalInfo.summary}
        onChange={(e) => update('summary', e.target.value)}
        rows={3}
        autoSize={{ minRows: 2, maxRows: 5 }}
      />
    </div>
  );
}
