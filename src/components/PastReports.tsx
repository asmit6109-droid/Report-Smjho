import React, { useState, useEffect } from 'react';
import { ReportAnalysis, ReportGroup } from '../types/report';
import { SupportedLanguage, translations } from '../utils/translations';
import {
  getStoredReports,
  deleteReportFromStorage,
  getStoredReportGroups,
  renameReportGroup,
  deleteReportGroup,
} from '../utils/storage';
import { demoCombinedReportsPreview } from '../utils/demoData';
import {
  Calendar,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ChevronRight,
  Layers,
  Check,
  Edit2,
  X,
} from 'lucide-react';

interface PastReportsProps {
  language: SupportedLanguage;
  onSelectReport: (report: ReportAnalysis) => void;
  onCombineReports: (
    reports: ReportAnalysis[],
    groupMeta?: { groupId?: string; groupName?: string; isDemo?: boolean }
  ) => void;
}

export const PastReports: React.FC<PastReportsProps> = ({
  language,
  onSelectReport,
  onCombineReports,
}) => {
  const [reports, setReports] = useState<ReportAnalysis[]>([]);
  const [groups, setGroups] = useState<ReportGroup[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const t = translations[language];

  const ui = {
    selectBtn: language === 'hi' ? 'चुनें' : language === 'or' ? 'ବାଛନ୍ତୁ' : 'Select',
    cancelBtn: language === 'hi' ? 'रद्द करें' : language === 'or' ? 'ବାତିଲ୍' : 'Cancel',
    combineBtn: language === 'hi' ? 'रिपोर्ट जोड़ें' : language === 'or' ? 'ରିପୋର୍ଟ ଯୋଡନ୍ତୁ' : 'Combine',
    savedGroupsTitle:
      language === 'hi'
        ? 'संयुक्त रिपोर्ट समूह'
        : language === 'or'
        ? 'ମିଳିତ ରିପୋର୍ଟ ଗୋଷ୍ଠୀ'
        : 'Combined Groups',
    scansLabel: language === 'hi' ? 'स्कैन' : language === 'or' ? 'ସ୍କାନ୍' : 'scans',
    ungroupLabel:
      language === 'hi' ? 'अलग करें' : language === 'or' ? 'ଅଲଗା କରନ୍ତୁ' : 'Ungroup',
    demoCombinedTitle:
      language === 'hi'
        ? 'संयुक्त रिपोर्ट डेमो (शुगर + थायरॉइड/लिवर)'
        : language === 'or'
        ? 'ମିଳିତ ରିପୋର୍ଟ ଡେମୋ'
        : 'Combined Report Preview',
  };

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = () => {
    setReports(getStoredReports());
    setGroups(getStoredReportGroups());
  };

  const handleDeleteOne = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteReportFromStorage(id);
    setSelectedIds((prev) => prev.filter((x) => x !== id));
    loadAll();
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCombineSelected = () => {
    const selectedReports = reports.filter((r) => selectedIds.includes(r.id));
    if (selectedReports.length < 2) return;
    setIsSelectMode(false);
    setSelectedIds([]);
    onCombineReports(selectedReports);
  };

  const handleOpenGroup = (group: ReportGroup) => {
    const groupReports = reports.filter((r) => group.reportIds.includes(r.id));
    if (groupReports.length === 0) return;
    onCombineReports(groupReports, {
      groupId: group.id,
      groupName: group.name,
      isDemo: group.isDemo,
    });
  };

  const handleCommitRename = (groupId: string) => {
    if (renameDraft.trim()) {
      renameReportGroup(groupId, renameDraft.trim());
    }
    setRenamingGroupId(null);
    loadAll();
  };

  const handleDeleteGroup = (e: React.MouseEvent, groupId: string) => {
    e.stopPropagation();
    deleteReportGroup(groupId);
    loadAll();
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar: Select / Combine mode */}
      {reports.length >= 2 && (
        <div className="flex items-center justify-between gap-2">
          {!isSelectMode ? (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsSelectMode(true);
                  setSelectedIds([]);
                }}
                className="rs-card inline-flex items-center gap-2 px-4 py-2 text-sm font-extrabold text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] transition"
              >
                <Layers className="w-4 h-4" />
                <span>{ui.selectBtn}</span>
              </button>
            </div>
          ) : (
            <div className="rs-card w-full p-3 flex items-center justify-between gap-2 bg-[var(--color-brand-soft)]/50">
              <button
                type="button"
                onClick={() => {
                  setIsSelectMode(false);
                  setSelectedIds([]);
                }}
                className="inline-flex items-center gap-1 rounded-[12px] px-3 py-2 text-sm font-bold text-[var(--color-text-secondary)]"
              >
                <X className="w-4 h-4" />
                <span>{ui.cancelBtn}</span>
              </button>

              <button
                type="button"
                disabled={selectedIds.length < 2}
                onClick={handleCombineSelected}
                className="rs-btn-primary px-4 py-2 text-sm font-extrabold disabled:opacity-45 inline-flex items-center gap-2"
              >
                <Layers className="w-4 h-4" />
                <span>
                  {ui.combineBtn} ({selectedIds.length})
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Saved Report Groups */}
      {groups.length > 0 && !isSelectMode && (
        <div className="space-y-2.5">
          <h3 className="text-sm font-extrabold text-[var(--color-text-secondary)] px-1">
            {ui.savedGroupsTitle}
          </h3>
          {groups.map((grp) => {
            const matchedCount = reports.filter((r) => grp.reportIds.includes(r.id)).length;
            if (matchedCount === 0) return null;
            const isRenaming = renamingGroupId === grp.id;

            return (
              <div
                key={grp.id}
                onClick={() => {
                  if (!isRenaming) handleOpenGroup(grp);
                }}
                className="rs-card p-4 hover:bg-[var(--color-brand-soft)]/40 cursor-pointer flex items-center justify-between gap-3 transition"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-[12px] bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {isRenaming ? (
                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          className="w-full rounded-[10px] border border-[var(--color-divider)] px-2.5 py-1.5 text-sm font-bold text-[var(--color-text)] bg-white"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleCommitRename(grp.id)}
                          className="p-2 rounded-[10px] bg-[var(--color-brand)] text-white"
                          aria-label="Save name"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h4 className="font-bold text-base text-[var(--color-text)] truncate">
                          {grp.name}
                        </h4>
                        <span className="text-sm font-medium text-[var(--color-text-secondary)] block truncate">
                          {matchedCount} {ui.scansLabel} •{' '}
                          {new Date(grp.updated_at || grp.created_at).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {!isRenaming && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingGroupId(grp.id);
                        setRenameDraft(grp.name);
                      }}
                      className="p-2 rounded-[10px] text-[var(--color-text-secondary)] hover:text-[var(--color-brand)]"
                      aria-label="Rename group"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteGroup(e, grp.id)}
                      className="p-2 rounded-[10px] text-[var(--color-text-secondary)] hover:text-[var(--color-danger)]"
                      aria-label={ui.ungroupLabel}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Individual Saved Reports */}
      {reports.length === 0 ? (
        <div className="rs-card p-10 text-center">
          <Calendar className="w-10 h-10 text-[var(--color-text-secondary)]/50 mx-auto mb-3" />
          <p className="text-base text-[var(--color-text-secondary)] font-semibold">
            {t.noPastReports}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((rep) => {
            const statusLabel =
              rep.overall_severity === 'green'
                ? t.statusGreen
                : rep.overall_severity === 'yellow'
                ? t.statusYellow
                : t.statusRed;

            const isChecked = selectedIds.includes(rep.id);

            return (
              <div
                key={rep.id}
                onClick={() => {
                  if (isSelectMode) {
                    toggleSelectId(rep.id);
                  } else {
                    onSelectReport(rep);
                  }
                }}
                className={`rs-card p-4 cursor-pointer flex items-center justify-between gap-3 transition ${
                  isSelectMode && isChecked
                    ? 'ring-2 ring-[var(--color-brand)] bg-[var(--color-brand-soft)]/30'
                    : 'hover:bg-[var(--color-brand-soft)]/40'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {isSelectMode ? (
                    <div
                      className={`w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 border-2 transition ${
                        isChecked
                          ? 'bg-[var(--color-brand)] border-[var(--color-brand)] text-white'
                          : 'bg-white border-[var(--color-text-secondary)]/40'
                      }`}
                    >
                      {isChecked && <Check className="w-4 h-4" />}
                    </div>
                  ) : (
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
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-[var(--color-text)] truncate">
                        {rep.translations?.[language]?.report_type || rep.report_type}
                      </h4>
                      {rep.isDemo && (
                        <span className="shrink-0 rounded-full bg-[var(--color-surface-subtle)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--color-text-secondary)]">
                          DEMO
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-[var(--color-text-secondary)] block truncate">
                      {statusLabel} • {new Date(rep.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {!isSelectMode && (
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
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Clearly labeled DEMO Combined Report Preview */}
      {!isSelectMode && (
        <div
          onClick={() =>
            onCombineReports(demoCombinedReportsPreview, {
              groupName: ui.demoCombinedTitle,
              isDemo: true,
            })
          }
          className="rs-card p-4 cursor-pointer flex items-center justify-between gap-3 bg-[var(--color-brand-soft)]/35 hover:bg-[var(--color-brand-soft)]/60 transition"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-[12px] bg-[var(--color-brand)] text-white flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[var(--color-brand)] text-white px-2 py-0.5 text-[10px] font-extrabold">
                  DEMO
                </span>
                <h4 className="font-bold text-base text-[var(--color-text)] truncate">
                  {ui.demoCombinedTitle}
                </h4>
              </div>
              <span className="text-sm font-medium text-[var(--color-text-secondary)] block truncate">
                2 {ui.scansLabel} • Body overview + multi-scan view
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[var(--color-brand)] shrink-0" />
        </div>
      )}
    </div>
  );
};
