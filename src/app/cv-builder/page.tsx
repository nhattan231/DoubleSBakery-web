'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { message, Spin } from 'antd';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { CVData } from '@/types';
import { useCvsQuery, useCreateCvMutation, useUpdateCvMutation, useDeleteCvMutation } from '@/lib/hooks';
import { getGoogleFontUrl } from '@/components/cv-builder/constants/fonts';
import { DEFAULT_PERSONAL_INFO, createDefaultSections } from '@/components/cv-builder/constants/defaultSections';
import CVToolbar from '@/components/cv-builder/CVToolbar';
import CVEditorPanel from '@/components/cv-builder/CVEditorPanel';
import CVPreviewPanel, { CVPreviewHandle } from '@/components/cv-builder/CVPreviewPanel';
import CVTemplateSelector from '@/components/cv-builder/CVTemplateSelector';

function createEmptyCv(): CVData {
  return {
    id: '',
    userId: '',
    title: 'My CV',
    templateId: 'classic',
    fontFamily: 'Inter',
    fontSize: 14,
    primaryColor: '#2563eb',
    language: 'vi',
    personalInfo: { ...DEFAULT_PERSONAL_INFO },
    sections: createDefaultSections(),
    createdAt: '',
    updatedAt: '',
  };
}

export default function CVBuilderPage() {
  const [cvData, setCvData] = useState<CVData>(createEmptyCv);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [exporting, setExporting] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const previewRef = useRef<CVPreviewHandle>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>();

  const { data: cvList = [], isLoading: loadingList } = useCvsQuery();
  const createMutation = useCreateCvMutation();
  const updateMutation = useUpdateCvMutation();
  const deleteMutation = useDeleteCvMutation();

  // Load first CV on mount
  useEffect(() => {
    if (!initialized && !loadingList && cvList.length > 0) {
      setCvData(cvList[0]);
      setInitialized(true);
    } else if (!initialized && !loadingList) {
      setInitialized(true);
    }
  }, [cvList, loadingList, initialized]);

  // Load Google Font
  useEffect(() => {
    const linkId = 'cv-google-font';
    let link = document.getElementById(linkId) as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = getGoogleFontUrl(cvData.fontFamily);
  }, [cvData.fontFamily]);

  // Auto-save with debounce
  useEffect(() => {
    if (!cvData.id || !initialized) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      handleSave(true);
    }, 3000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cvData, initialized]);

  const handleChange = useCallback((partial: Partial<CVData>) => {
    setCvData((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleSave = useCallback(async (auto = false) => {
    setSaveStatus('saving');
    try {
      const payload = {
        title: cvData.title,
        templateId: cvData.templateId,
        fontFamily: cvData.fontFamily,
        fontSize: cvData.fontSize,
        primaryColor: cvData.primaryColor,
        language: cvData.language,
        personalInfo: cvData.personalInfo,
        sections: cvData.sections,
      };

      if (cvData.id) {
        await updateMutation.mutateAsync({ id: cvData.id, data: payload });
      } else {
        const res = await createMutation.mutateAsync(payload);
        const newId = res.data?.data?.id || res.data?.id;
        if (newId) {
          setCvData((prev) => ({ ...prev, id: newId }));
        }
      }
      setSaveStatus('saved');
      if (!auto) message.success(cvData.language === 'vi' ? 'Đã lưu' : 'Saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('idle');
      if (!auto) message.error(cvData.language === 'vi' ? 'Lỗi lưu CV' : 'Failed to save');
    }
  }, [cvData, updateMutation, createMutation]);

  const handleNewCv = useCallback(async () => {
    const newCv = createEmptyCv();
    try {
      const res = await createMutation.mutateAsync({
        title: newCv.title,
        templateId: newCv.templateId,
        fontFamily: newCv.fontFamily,
        fontSize: newCv.fontSize,
        primaryColor: newCv.primaryColor,
        language: newCv.language,
        personalInfo: newCv.personalInfo,
        sections: newCv.sections,
      });
      const newId = res.data?.data?.id || res.data?.id;
      if (newId) {
        newCv.id = newId;
      }
      setCvData(newCv);
      message.success(cvData.language === 'vi' ? 'Đã tạo CV mới' : 'New CV created');
    } catch {
      message.error(cvData.language === 'vi' ? 'Lỗi tạo CV' : 'Failed to create CV');
    }
  }, [createMutation, cvData.language]);

  const handleSelectCv = useCallback((id: string) => {
    const selected = cvList.find((cv) => cv.id === id);
    if (selected) setCvData(selected);
  }, [cvList]);

  const handleDeleteCv = useCallback(async () => {
    if (!cvData.id) return;
    try {
      await deleteMutation.mutateAsync(cvData.id);
      message.success(cvData.language === 'vi' ? 'Đã xóa CV' : 'CV deleted');
      const remaining = cvList.filter((cv) => cv.id !== cvData.id);
      if (remaining.length > 0) {
        setCvData(remaining[0]);
      } else {
        setCvData(createEmptyCv());
      }
    } catch {
      message.error(cvData.language === 'vi' ? 'Lỗi xóa CV' : 'Failed to delete');
    }
  }, [cvData.id, cvData.language, deleteMutation, cvList]);

  const handleExportPdf = useCallback(async () => {
    const element = previewRef.current?.getPreviewElement();
    if (!element) return;

    setExporting(true);
    try {
      // Wait for fonts to load
      await document.fonts.ready;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: 794,
        height: Math.max(element.scrollHeight, 1123),
        windowWidth: 794,
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = 297;
      const imgData = canvas.toDataURL('image/png');

      // Handle multi-page if content is taller than A4
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      if (imgHeight <= pdfHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
      } else {
        let yOffset = 0;
        let page = 0;
        while (yOffset < imgHeight) {
          if (page > 0) pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfWidth, imgHeight);
          yOffset += pdfHeight;
          page++;
        }
      }

      pdf.save(`${cvData.title || 'cv'}.pdf`);
      message.success(cvData.language === 'vi' ? 'Đã xuất PDF' : 'PDF exported');
    } catch (err) {
      console.error('PDF export error:', err);
      message.error(cvData.language === 'vi' ? 'Lỗi xuất PDF' : 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  }, [cvData.title, cvData.language]);

  if (loadingList && !initialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', background: '#f5f5f5' }}>
      {/* Toolbar */}
      <CVToolbar
        cvData={cvData}
        cvList={cvList}
        saving={updateMutation.isPending || createMutation.isPending}
        saveStatus={saveStatus}
        exporting={exporting}
        language={cvData.language}
        onChange={handleChange}
        onSelectCv={handleSelectCv}
        onNewCv={handleNewCv}
        onSave={() => handleSave(false)}
        onExportPdf={handleExportPdf}
        onOpenTemplateSelector={() => setTemplateModalOpen(true)}
        onDeleteCv={handleDeleteCv}
        onLanguageChange={(lang) => handleChange({ language: lang })}
      />

      {/* Split Screen */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Editor - Left */}
        <div style={{
          width: '42%',
          minWidth: 340,
          borderRight: '1px solid #e8e8e8',
          background: '#fff',
          overflow: 'hidden',
        }}>
          <CVEditorPanel cvData={cvData} onChange={handleChange} />
        </div>

        {/* Preview - Right */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <CVPreviewPanel ref={previewRef} cvData={cvData} />
        </div>
      </div>

      {/* Template Selector Modal */}
      <CVTemplateSelector
        open={templateModalOpen}
        current={cvData.templateId}
        language={cvData.language}
        onSelect={(templateId) => handleChange({ templateId })}
        onClose={() => setTemplateModalOpen(false)}
      />
    </div>
  );
}
