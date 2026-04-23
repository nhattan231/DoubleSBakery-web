'use client';
import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { Button, Dropdown } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { CVSection } from '@/types';
import CVSectionEditor from './CVSectionEditor';
import { generateId, AVAILABLE_SECTION_TYPES } from './constants/defaultSections';
import { getSectionLabel, getLabel } from './constants/sectionLabels';

interface Props {
  sections: CVSection[];
  onChange: (sections: CVSection[]) => void;
  language: 'vi' | 'en';
}

export default function CVSectionList({ sections, onChange, language }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);
      onChange(arrayMove(sections, oldIndex, newIndex));
    }
  };

  const handleSectionChange = (index: number, updated: CVSection) => {
    const newSections = [...sections];
    newSections[index] = updated;
    onChange(newSections);
  };

  const handleRemoveSection = (index: number) => {
    onChange(sections.filter((_, i) => i !== index));
  };

  const handleAddSection = (type: string) => {
    const title = getSectionLabel(type, language);
    const newSection: CVSection = {
      id: generateId(),
      type,
      title,
      visible: true,
      items: [],
    };
    onChange([...sections, newSection]);
  };

  const addMenuItems = AVAILABLE_SECTION_TYPES.map((type) => ({
    key: type,
    label: getSectionLabel(type, language),
    onClick: () => handleAddSection(type),
  }));

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {sections.map((section, index) => (
            <CVSectionEditor
              key={section.id}
              section={section}
              onChange={(updated) => handleSectionChange(index, updated)}
              onRemove={() => handleRemoveSection(index)}
              language={language}
            />
          ))}
        </SortableContext>
      </DndContext>

      <Dropdown menu={{ items: addMenuItems }} trigger={['click']}>
        <Button type="dashed" icon={<PlusOutlined />} block style={{ marginTop: 8 }}>
          {getLabel('addSection', language)}
        </Button>
      </Dropdown>
    </div>
  );
}
