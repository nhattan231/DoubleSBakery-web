'use client';
import React from 'react';
import type { TemplateProps } from './index';

export default function TemplateClassic({ personalInfo, sections, style, language }: TemplateProps) {
  const { fontFamily, fontSize, primaryColor } = style;
  const visibleSections = sections.filter((s) => s.visible);

  return (
    <div style={{ fontFamily, fontSize, color: '#333', lineHeight: 1.5, padding: 40 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 20, borderBottom: `2px solid ${primaryColor}`, paddingBottom: 16 }}>
        {personalInfo.avatarUrl && (
          <img
            src={personalInfo.avatarUrl}
            alt="Avatar"
            style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 10px', display: 'block' }}
            crossOrigin="anonymous"
          />
        )}
        <div style={{ fontSize: fontSize * 1.8, fontWeight: 700, color: primaryColor }}>
          {personalInfo.fullName || (language === 'vi' ? 'Họ và tên' : 'Your Name')}
        </div>
        {personalInfo.title && (
          <div style={{ fontSize: fontSize * 1.1, color: '#666', marginTop: 4 }}>
            {personalInfo.title}
          </div>
        )}
        <div style={{ fontSize: fontSize * 0.85, color: '#888', marginTop: 8, display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          {personalInfo.email && <span>{personalInfo.email}</span>}
          {personalInfo.phone && <span>{personalInfo.phone}</span>}
          {personalInfo.address && <span>{personalInfo.address}</span>}
        </div>
      </div>

      {/* Summary */}
      {personalInfo.summary && (
        <div style={{ marginBottom: 20, fontSize: fontSize * 0.95, color: '#555', textAlign: 'center', fontStyle: 'italic' }}>
          {personalInfo.summary}
        </div>
      )}

      {/* Sections */}
      {visibleSections.map((section) => (
        <div key={section.id} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: fontSize * 1.15, fontWeight: 700, color: primaryColor, borderBottom: `1px solid ${primaryColor}`, paddingBottom: 4, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
            {section.title}
          </div>
          {section.type === 'skills' || section.type === 'languages' || section.type === 'interests' ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {section.items.map((item) => (
                <span key={item.id} style={{ padding: '3px 10px', background: `${primaryColor}15`, border: `1px solid ${primaryColor}40`, borderRadius: 4, fontSize: fontSize * 0.85 }}>
                  {item.title}{item.subtitle ? ` - ${item.subtitle}` : ''}
                </span>
              ))}
            </div>
          ) : (
            section.items.map((item) => (
              <div key={item.id} style={{ marginBottom: 10, paddingLeft: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontWeight: 600, fontSize: fontSize * 1.0 }}>{item.title}</div>
                  {(item.startDate || item.endDate) && (
                    <div style={{ fontSize: fontSize * 0.8, color: '#888', whiteSpace: 'nowrap' }}>
                      {item.startDate}{item.startDate && item.endDate ? ' - ' : ''}{item.endDate}
                    </div>
                  )}
                </div>
                {item.subtitle && (
                  <div style={{ fontSize: fontSize * 0.9, color: '#666', fontStyle: 'italic' }}>{item.subtitle}</div>
                )}
                {item.description && (
                  <div style={{ fontSize: fontSize * 0.9, color: '#555', marginTop: 4, whiteSpace: 'pre-line' }}>{item.description}</div>
                )}
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  );
}
