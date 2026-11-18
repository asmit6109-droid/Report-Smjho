import React, { useState } from 'react';
import { ReportAnalysis } from '../types/report';
import { MedicineAnalysis } from '../types/medicine';
import { SupportedLanguage, translations } from '../utils/translations';
import { medicineTranslations } from '../utils/medicineTranslations';
import { PastReports } from './PastReports';
import { MyMedicines } from './MyMedicines';
import { ArrowLeft, FileText, Pill } from 'lucide-react';

interface HistoryScreenProps {
  language: SupportedLanguage;
  initialTab?: 'reports' | 'medicines';
  onSelectReport: (report: ReportAnalysis) => void;
  onCombineReports: (
    reports: ReportAnalysis[],
    groupMeta?: { groupId?: string; groupName?: string; isDemo?: boolean }
  ) => void;
  onSelectMedicine: (med: MedicineAnalysis) => void;
  onBackToHome: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  language,
  initialTab = 'reports',
  onSelectReport,
  onCombineReports,
  onSelectMedicine,
  onBackToHome,
}) => {
  const [activeTab, setActiveTab] = useState<'reports' | 'medicines'>(initialTab);
  const t = translations[language];
  const mt = medicineTranslations[language];

  return (
    <div className="max-w-xl mx-auto px-4 pt-4 pb-16 space-y-5">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToHome}
          className="rs-card inline-flex items-center gap-2 px-4 py-2.5 text-base font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)] transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t.backToHome}</span>
        </button>

        <h2 className="text-xl font-extrabold text-[var(--color-text)]">
          {language === 'hi' ? 'इतिहास' : language === 'or' ? 'ଇତିହାସ' : 'History'}
        </h2>

        <div className="w-16" />
      </div>

      {/* Two Tabs Inside History: Past Reports | My Medicines */}
      <div className="grid grid-cols-2 gap-2 bg-[var(--color-surface-subtle)] p-1.5 rounded-[16px]">
        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`flex items-center justify-center gap-2 rounded-[12px] py-2.5 text-base font-extrabold transition ${
            activeTab === 'reports'
              ? 'bg-[var(--color-surface)] text-[var(--color-brand)] shadow-[var(--shadow-card)]'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span>{t.pastReportsBtn}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('medicines')}
          className={`flex items-center justify-center gap-2 rounded-[12px] py-2.5 text-base font-extrabold transition ${
            activeTab === 'medicines'
              ? 'bg-[var(--color-surface)] text-[var(--color-brand)] shadow-[var(--shadow-card)]'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
          }`}
        >
          <Pill className="w-5 h-5" />
          <span>{mt.myMedicinesBtn}</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'reports' ? (
        <PastReports
          language={language}
          onSelectReport={onSelectReport}
          onCombineReports={onCombineReports}
        />
      ) : (
        <MyMedicines language={language} onSelectMedicine={onSelectMedicine} />
      )}
    </div>
  );
};
