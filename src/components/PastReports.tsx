import React, { useState, useEffect } from 'react';
import { ReportAnalysis } from '../types/report';
import { SupportedLanguage, translations } from '../utils/translations';
import { getStoredReports, deleteReportFromStorage } from '../utils/storage';
import {
  Calendar,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ChevronRight,
} from 'lucide-react';

interface PastReportsProps {
  language: SupportedLanguage;
  onSelectReport: (report: ReportAnalysis) => void;
}

export const PastReports: React.FC<PastReportsProps> = ({
  language,
  onSelectReport,
}) => {
  const [reports, setReports] = useState<ReportAnalysis[]>([]);
  const t = translations[language];

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = () => {
    setReports(getStoredReports());
  };

  const handleDeleteOne = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteReportFromStorage(id);
    loadReports();
  };

  if (reports.length === 0) {
    return (
      <div className="rs-card p-10 text-center">
        <Calendar className="w-10 h-10 text-[var(--color-text-secondary)]/50 mx-auto mb-3" />
        <p className="text-base text-[var(--color-text-secondary)] font-semibold">
          {t.noPastReports}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((rep) => {
        const statusLabel =
          rep.overall_severity === 'green'
            ? t.statusGreen
            : rep.overall_severity === 'yellow'
            ? t.statusYellow
            : t.statusRed;

        return (
          <div
            key={rep.id}
            onClick={() => onSelectReport(rep)}
            className="rs-card p-4 hover:bg-[var(--color-brand-soft)]/40 cursor-pointer flex items-center justify-between gap-3 transition"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={`w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0 ${
                  rep.overall_severity === 'green'
                    ? 'bg-[var(--color-normal-soft)] text-[var(--color-normal)]'
                    : rep.overall_severity === 'yellow'
                    ? 'bg-[var(--color-caution-soft)] text-[var(--color-caution)]'
                    : 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
                }`}
              >
                {rep.overall_severity === 'green' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : rep.overall_severity === 'yellow' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <AlertOctagon className="w-6 h-6" />
                )}
              </div>

              <div className="min-w-0">
                <h4 className="font-bold text-base text-[var(--color-text)] truncate">
                  {rep.translations?.[language]?.report_type || rep.report_type}
                </h4>
                <span className="text-sm font-medium text-[var(--color-text-secondary)] block truncate">
                  {statusLabel} • {new Date(rep.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={(e) => handleDeleteOne(e, rep.id)}
                className="p-2.5 rounded-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-danger)]"
                aria-label="Delete report"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
