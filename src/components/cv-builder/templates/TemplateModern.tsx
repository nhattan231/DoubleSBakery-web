'use client';
import React from 'react';
import type { TemplateProps } from './index';

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function TemplateModern({ personalInfo, sections, style, language }: TemplateProps) {
  const { fontFamily, fontSize, primaryColor } = style;
  const visibleSections = sections.filter((s) => s.visible);
  const sidebarTypes = ['skills', 'languages', 'interests', 'certifications'];
  const sidebarSections = visibleSections.filter((s) => sidebarTypes.includes(s.type));
  const mainSections = visibleSections.filter((s) => !sidebarTypes.includes(s.type));

  return (
    <div style={{ fontFamily, fontSize, color: '#333', lineHeight: 1.5, display: 'flex', minHeight: '100%' }}>
      {/* Sidebar */}
      <div style={{ width: '32%', background: primaryColor, color: '#fff', padding: '30px 20px', flexShrink: 0 }}>
        {/* Avatar */}
        {personalInfo.avatarUrl && (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <img
              src={personalInfo.avatarUrl}
              alt="Avatar"
              style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.4)' }}
              crossOrigin="anonymous"
            />
          </div>
        )}
        {/* Contact */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: fontSize * 0.9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: 4 }}>
            {language === 'vi' ? 'Liên hệ' : 'Contact'}
          </div>
          {personalInfo.email && (
            <div style={{ fontSize: fontSize * 0.8, marginBottom: 6, wordBreak: 'break-all' }}>{personalInfo.email}</div>
          )}
          {personalInfo.phone && (
            <div style={{ fontSize: fontSize * 0.8, marginBottom: 6 }}>{personalInfo.phone}</div>
          )}
          {personalInfo.address && (
            <div style={{ fontSize: fontSize * 0.8, marginBottom: 6 }}>{personalInfo.address}</div>
          )}
        </div>
        {/* Sidebar Sections */}
        {sidebarSections.map((section) => (
          <div key={section.id} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: fontSize * 0.9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: 4 }}>
              {section.title}
            </div>
            {section.items.map((item) => (
              <div key={item.id} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: fontSize * 0.85, fontWeight: 500 }}>{item.title}</div>
                {item.subtitle && (
                  <div style={{ fontSize: fontSize * 0.75, opacity: 0.8 }}>{item.subtitle}</div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: '30px 28px' }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: fontSize * 1.9, fontWeight: 700, color: primaryColor }}>
            {personalInfo.fullName || (language === 'vi' ? 'Họ và tên' : 'Your Name')}
          </div>
          {personalInfo.title && (
            <div style={{ fontSize: fontSize * 1.1, color: '#666', marginTop: 4 }}>{personalInfo.title}</div>
          )}
        </div>
        {/* Summary */}
        {personalInfo.summary && (
          <div style={{ marginBottom: 20, fontSize: fontSize * 0.9, color: '#555', padding: 12, background: hexToRgba(primaryColor, 0.06), borderRadius: 6, borderLeft: `3px solid ${primaryColor}` }}>
            {personalInfo.summary}
          </div>
        )}
        {/* Main Sections */}
        {mainSections.map((section) => (
          <div key={section.id} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: fontSize * 1.1, fontWeight: 700, color: primaryColor, borderBottom: `2px solid ${primaryColor}`, paddingBottom: 4, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
              {section.title}
            </div>
            {section.items.map((item) => (
              <div key={item.id} style={{ marginBottom: 12, paddingLeft: 10, borderLeft: `2px solid ${hexToRgba(primaryColor, 0.2)}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontWeight: 600 }}>{item.title}</div>
                  {(item.startDate || item.endDate) && (
                    <div style={{ fontSize: fontSize * 0.8, color: primaryColor, whiteSpace: 'nowrap' }}>
                      {item.startDate}{item.startDate && item.endDate ? ' - ' : ''}{item.endDate}
                    </div>
                  )}
                </div>
                {item.subtitle && (
                  <div style={{ fontSize: fontSize * 0.9, color: '#666', fontStyle: 'italic' }}>{item.subtitle}</div>
                )}
                {item.description && (
                  <div style={{ fontSize: fontSize * 0.85, color: '#555', marginTop: 4, whiteSpace: 'pre-line' }}>{item.description}</div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
