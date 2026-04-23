'use client';
import React, { useState } from 'react';
import { Input, Button, Switch, Collapse, Tooltip } from 'antd';
import { HolderOutlined, DeleteOutlined, PlusOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CVSection, CVSectionItem } from '@/types';
import { generateId } from './constants/defaultSections';
import { getLabel } from './constants/sectionLabels';

const { TextArea } = Input;

interface Props {
  section: CVSection;
  onChange: (section: CVSection) => void;
  onRemove: () => void;
  language: 'vi' | 'en';
}

export default function CVSectionEditor({ section, onChange, onRemove, language }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const l = (key: string) => getLabel(key, language);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const updateItem = (index: number, field: keyof CVSectionItem, value: string) => {
    const items = [...section.items];
    items[index] = { ...items[index], [field]: value };
    onChange({ ...section, items });
  };

  const addItem = () => {
    const newItem: CVSectionItem = {
      id: generateId(),
      title: '',
      subtitle: '',
      startDate: '',
      endDate: '',
      description: '',
    };
    onChange({ ...section, items: [...section.items, newItem] });
  };

  const removeItem = (index: number) => {
    const items = section.items.filter((_, i) => i !== index);
    onChange({ ...section, items });
  };

  const isTagType = ['skills', 'languages', 'interests'].includes(section.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
    >
      <div style={{
        border: '1px solid #e8e8e8',
        borderRadius: 8,
        background: '#fff',
        marginBottom: 8,
      }}>
        {/* Section Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: '#fafafa',
          borderRadius: '8px 8px 0 0',
          borderBottom: collapsed ? 'none' : '1px solid #f0f0f0',
        }}>
          <div {...listeners} style={{ cursor: 'grab', color: '#999', display: 'flex' }}>
            <HolderOutlined />
          </div>
          <Input
            value={section.title}
            onChange={(e) => onChange({ ...section, title: e.target.value })}
            variant="borderless"
            style={{ flex: 1, fontWeight: 600, fontSize: 13 }}
            placeholder={l('title')}
          />
          <Tooltip title={section.visible ? (language === 'vi' ? 'Đang hiển thị' : 'Visible') : (language === 'vi' ? 'Đã ẩn' : 'Hidden')}>
            <Button
              type="text"
              size="small"
              icon={section.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              onClick={() => onChange({ ...section, visible: !section.visible })}
              style={{ color: section.visible ? '#52c41a' : '#ccc' }}
            />
          </Tooltip>
          <Button
            type="text"
            size="small"
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 12, color: '#888' }}
          >
            {collapsed ? '▼' : '▲'}
          </Button>
          <Tooltip title={l('removeSection')}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={onRemove} />
          </Tooltip>
        </div>

        {/* Section Content */}
        {!collapsed && (
          <div style={{ padding: '10px 12px' }}>
            {section.items.map((item, index) => (
              <div key={item.id} style={{
                padding: '8px 10px',
                marginBottom: 6,
                background: '#fafafa',
                borderRadius: 6,
                border: '1px solid #f0f0f0',
              }}>
                {isTagType ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Input
                      placeholder={l('title')}
                      value={item.title}
                      onChange={(e) => updateItem(index, 'title', e.target.value)}
                      style={{ flex: 1 }}
                      size="small"
                    />
                    <Input
                      placeholder={language === 'vi' ? 'Chi tiết' : 'Detail'}
                      value={item.subtitle}
                      onChange={(e) => updateItem(index, 'subtitle', e.target.value)}
                      style={{ flex: 1 }}
                      size="small"
                    />
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => removeItem(index)} />
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Input
                        placeholder={l('title')}
                        value={item.title}
                        onChange={(e) => updateItem(index, 'title', e.target.value)}
                        size="small"
                        style={{ flex: 1 }}
                      />
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => removeItem(index)} />
                    </div>
                    <Input
                      placeholder={l('subtitle')}
                      value={item.subtitle}
                      onChange={(e) => updateItem(index, 'subtitle', e.target.value)}
                      size="small"
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Input
                        placeholder={l('startDate')}
                        value={item.startDate}
                        onChange={(e) => updateItem(index, 'startDate', e.target.value)}
                        size="small"
                        style={{ flex: 1 }}
                      />
                      <Input
                        placeholder={l('endDate')}
                        value={item.endDate}
                        onChange={(e) => updateItem(index, 'endDate', e.target.value)}
                        size="small"
                        style={{ flex: 1 }}
                      />
                    </div>
                    <TextArea
                      placeholder={l('description')}
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      autoSize={{ minRows: 1, maxRows: 4 }}
                      size="small"
                    />
                  </div>
                )}
              </div>
            ))}
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={addItem}
              block
              style={{ marginTop: 4 }}
            >
              {l('addItem')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
