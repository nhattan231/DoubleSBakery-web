'use client';
import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { CVData } from '@/types';
import { getTemplateById } from './templates';

// A4 at 96 DPI
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

export interface CVPreviewHandle {
  getPreviewElement: () => HTMLDivElement | null;
}

interface Props {
  cvData: CVData;
}

const CVPreviewPanel = forwardRef<CVPreviewHandle, Props>(({ cvData }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  const calculateScale = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 40; // padding
      const newScale = Math.min(containerWidth / A4_WIDTH, 1);
      setScale(newScale);
    }
  }, []);

  useEffect(() => {
    calculateScale();
    const observer = new ResizeObserver(calculateScale);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [calculateScale]);

  useImperativeHandle(ref, () => ({
    getPreviewElement: () => previewRef.current,
  }));

  const template = getTemplateById(cvData.templateId);
  const TemplateComponent = template.component;

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        overflowY: 'auto',
        background: '#e8e8e8',
        padding: 20,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          width: A4_WIDTH,
          minHeight: A4_HEIGHT,
        }}
      >
        <div
          ref={previewRef}
          style={{
            width: A4_WIDTH,
            minHeight: A4_HEIGHT,
            background: '#fff',
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            overflow: 'hidden',
          }}
        >
          <TemplateComponent
            personalInfo={cvData.personalInfo}
            sections={cvData.sections}
            style={{
              fontFamily: cvData.fontFamily,
              fontSize: cvData.fontSize,
              primaryColor: cvData.primaryColor,
            }}
            language={cvData.language}
          />
        </div>
      </div>
    </div>
  );
});

CVPreviewPanel.displayName = 'CVPreviewPanel';

export default CVPreviewPanel;
