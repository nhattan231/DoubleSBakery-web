'use client';
import React from 'react';
import type { TemplateProps } from './index';

export default function TemplateProfessional({ personalInfo, sections, style, language }: TemplateProps) {
  const { fontFamily, fontSize, primaryColor } = style;
  const visibleSections = sections.filter((s) => s.visible);

  return (
    <div style={{ fontFamily, fontSize, color: '#333', lineHeight: 1.6 }}>
      {/* Top accent bar */}
      <div style={{ height: 6, background: primaryColor }} />

      {/* Header */}
      <div style={{ padding: '28px 40px 20px', display: 'flex', alignItems: 'center', gap: 20 }}>
        {personalInfo.avatarUrl && (
          <img
            src={personalInfo.avatarUrl}
            alt="Avatar"
            style={{ width: 70, height: 70, borderRadius: 8, objectFit: 'cover', border: `2px solid ${primaryColor}` }}
            crossOrigin="anonymous"
          />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: fontSize * 1.8, fontWeight: 700, color: '#222' }}>
            {personalInfo.fullName || (language === 'vi' ? 'Họ và tên' : 'Your Name')}
          </div>
          {personalInfo.title && (
            <div style={{ fontSize: fontSize * 1.05, color: primaryColor, fontWeight: 500, marginTop: 2 }}>
              {personalInfo.title}
            </div>
          )}
        </div>
      </div>

      {/* Contact bar */}
      <div style={{ padding: '8px 40px', background: '#f8f8f8', display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: fontSize * 0.85, color: '#666' }}>
        {personalInfo.email && <span>{personalInfo.email}</span>}
        {personalInfo.phone && <span>{personalInfo.phone}</span>}
        {personalInfo.address && <span>{personalInfo.address}</span>}
      </div>

      <div style={{ padding: '20px 40px' }}>
        {/* Summary */}
        {personalInfo.summary && (
          <div style={{ marginBottom: 20, fontSize: fontSize * 0.95, color: '#555', borderLeft: `3px solid ${primaryColor}`, paddingLeft: 12 }}>
            {personalInfo.summary}
          </div>
        )}

        {/* Sections */}
        {visibleSections.map((section) => (
          <div key={section.id} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: primaryColor, flexShrink: 0 }} />
              <div style={{ fontSize: fontSize * 1.1, fontWeight: 700, color: '#222', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {section.title}
              </div>
              <div style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
            </div>
            {section.type === 'skills' || section.type === 'languages' || section.type === 'interests' ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 18 }}>
                {section.items.map((item) => (
                  <span key={item.id} style={{ padding: '4px 12px', background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: 20, fontSize: fontSize * 0.85 }}>
                    {item.title}{item.subtitle ? ` (${item.subtitle})` : ''}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ paddingLeft: 18 }}>
                {section.items.map((item) => (
                  <div key={item.id} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div style={{ fontWeight: 600 }}>{item.title}</div>
                      {(item.startDate || item.endDate) && (
                        <div style={{ fontSize: fontSize * 0.8, color: primaryColor, fontWeight: 500 }}>
                          {item.startDate}{item.startDate && item.endDate ? ' - ' : ''}{item.endDate}
                        </div>
                      )}
                    </div>
                    {item.subtitle && (
                      <div style={{ fontSize: fontSize * 0.9, color: '#666' }}>{item.subtitle}</div>
                    )}
                    {item.description && (
                      <div style={{ fontSize: fontSize * 0.85, color: '#555', marginTop: 4, whiteSpace: 'pre-line' }}>{item.description}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
