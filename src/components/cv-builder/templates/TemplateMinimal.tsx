'use client';
import React from 'react';
import type { TemplateProps } from './index';

export default function TemplateMinimal({ personalInfo, sections, style, language }: TemplateProps) {
  const { fontFamily, fontSize, primaryColor } = style;
  const visibleSections = sections.filter((s) => s.visible);

  return (
    <div style={{ fontFamily, fontSize, color: '#444', lineHeight: 1.7, padding: '50px 48px' }}>
      {/* Header - very clean */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 12 }}>
          {personalInfo.avatarUrl && (
            <img
              src={personalInfo.avatarUrl}
              alt="Avatar"
              style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }}
              crossOrigin="anonymous"
            />
          )}
          <div>
            <div style={{ fontSize: fontSize * 2, fontWeight: 300, color: '#222', letterSpacing: -0.5 }}>
              {personalInfo.fullName || (language === 'vi' ? 'Họ và tên' : 'Your Name')}
            </div>
            {personalInfo.title && (
              <div style={{ fontSize: fontSize * 1.0, color: primaryColor, fontWeight: 400, letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 }}>
                {personalInfo.title}
              </div>
            )}
          </div>
        </div>
        {/* Contact - inline minimal */}
        <div style={{ fontSize: fontSize * 0.85, color: '#888', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {personalInfo.email && <span>{personalInfo.email}</span>}
          {personalInfo.phone && <span>{personalInfo.phone}</span>}
          {personalInfo.address && <span>{personalInfo.address}</span>}
        </div>
      </div>

      {/* Summary */}
      {personalInfo.summary && (
        <div style={{ marginBottom: 32, fontSize: fontSize * 0.95, color: '#666' }}>
          {personalInfo.summary}
        </div>
      )}

      {/* Thin separator */}
      <div style={{ height: 1, background: '#e8e8e8', marginBottom: 28 }} />

      {/* Sections */}
      {visibleSections.map((section, idx) => (
        <div key={section.id} style={{ marginBottom: 28 }}>
          <div style={{ fontSize: fontSize * 0.85, fontWeight: 600, color: primaryColor, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 12 }}>
            {section.title}
          </div>
          {section.type === 'skills' || section.type === 'languages' || section.type === 'interests' ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {section.items.map((item) => (
                <span key={item.id} style={{ fontSize: fontSize * 0.9, color: '#555' }}>
                  {item.title}{item.subtitle ? ` (${item.subtitle})` : ''}
                  {section.items.indexOf(item) < section.items.length - 1 ? '  ·' : ''}
                </span>
              ))}
            </div>
          ) : (
            section.items.map((item) => (
              <div key={item.id} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontWeight: 500, color: '#333', fontSize: fontSize * 1.0 }}>{item.title}</div>
                  {(item.startDate || item.endDate) && (
                    <div style={{ fontSize: fontSize * 0.8, color: '#aaa' }}>
                      {item.startDate}{item.startDate && item.endDate ? ' — ' : ''}{item.endDate}
                    </div>
                  )}
                </div>
                {item.subtitle && (
                  <div style={{ fontSize: fontSize * 0.9, color: '#777' }}>{item.subtitle}</div>
                )}
                {item.description && (
                  <div style={{ fontSize: fontSize * 0.85, color: '#666', marginTop: 4, whiteSpace: 'pre-line' }}>{item.description}</div>
                )}
              </div>
            ))
          )}
          {idx < visibleSections.length - 1 && (
            <div style={{ height: 1, background: '#f0f0f0', marginTop: 20 }} />
          )}
        </div>
      ))}
    </div>
  );
}
