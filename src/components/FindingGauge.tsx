import React from 'react';
import { Finding } from '../types/report';
import { SupportedLanguage, translations } from '../utils/translations';
import { computeFindingGauge } from '../utils/referenceRanges';
import { CheckCircle2, ArrowUp, ArrowDown, AlertOctagon, Info } from 'lucide-react';

interface FindingGaugeProps {
  finding: Finding;
  language: SupportedLanguage;
  isFocused?: boolean;
  onExplain?: (finding: Finding) => void;
}

export const FindingGauge: React.FC<FindingGaugeProps> = ({
  finding,
  language,
  isFocused = false,
  onExplain,
}) => {
  const t = translations[language];
  const displayName = finding.translations?.[language]?.name || finding.name;
  const gauge = computeFindingGauge(finding, language);

  const tapHint =
    language === 'hi'
      ? 'समझने के लिए टैप करें'
      : language === 'or'
      ? 'ବୁଝିବାକୁ ଚିପନ୍ତୁ'
      : 'Tap for explanation';

  const aiimsNote =
    language === 'hi'
      ? '(AIIMS सामान्य मान)'
      : language === 'or'
      ? '(AIIMS ସାଧାରଣ ମାନ)'
      : '(AIIMS ref)';

  const badge =
    finding.status === 'low'
      ? {
          textClass: 'text-[var(--color-text)]',
          icon: <ArrowDown className="w-4 h-4 text-[var(--color-caution)] shrink-0" />,
          label: t.valueLow,
        }
      : finding.status === 'high'
      ? {
          textClass: 'text-[var(--color-text)]',
          icon: <ArrowUp className="w-4 h-4 text-[var(--color-caution)] shrink-0" />,
          label: t.valueHigh,
        }
      : finding.status === 'critical'
      ? {
          textClass: 'text-[var(--color-danger)]',
          icon: <AlertOctagon className="w-4 h-4 text-[var(--color-danger)] shrink-0" />,
          label: language === 'hi' ? 'गंभीर' : language === 'or' ? 'ଅତ୍ୟଧିକ' : 'High',
        }
      : {
          textClass: 'text-[var(--color-normal)]',
          icon: <CheckCircle2 className="w-4 h-4 text-[var(--color-normal)] shrink-0" />,
          label: t.valueNormal,
        };

  const zoneBg = (tone: 'red' | 'yellow' | 'green') => {
    if (tone === 'green') return 'bg-[var(--color-normal)]';
    if (tone === 'yellow') return 'bg-[var(--color-caution)]/85';
    return 'bg-[var(--color-danger)]/85';
  };

  const content = (
    <>
      {/* Name + Value + Status (clean unboxed status, subtle tap hint) */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="font-bold text-[var(--color-text)] text-base leading-snug">
              {displayName}
            </h4>
            {onExplain && (
              <Info
                className="w-4 h-4 text-[var(--color-brand)] shrink-0 opacity-80"
                aria-hidden="true"
              />
            )}
          </div>

          {(finding.source_label || onExplain) && (
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] mt-0.5 flex-wrap">
              {finding.source_label && (
                <span className="font-semibold text-[var(--color-brand)]">
                  {finding.source_label}
                  {finding.source_date ? ` · ${finding.source_date}` : ''}
                </span>
              )}
              {finding.source_label && onExplain && <span aria-hidden="true">·</span>}
              {onExplain && <span>{tapHint}</span>}
            </div>
          )}

          <div className="flex items-baseline gap-2 mt-1.5 tabular-nums">
            <span className="text-2xl font-extrabold text-[var(--color-text)] font-mono">
              {finding.value}
            </span>
            {finding.unit && (
              <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
                {finding.unit}
              </span>
            )}
          </div>
        </div>

        <div
          className={`shrink-0 inline-flex items-center gap-1.5 pt-0.5 text-sm font-extrabold ${badge.textClass}`}
        >
          {badge.icon}
          <span>{badge.label}</span>
        </div>
      </div>

      {/* Numeric Multi-Zone Horizontal Gauge */}
      {gauge.isNumeric && gauge.zones.length > 0 && (
        <div className="space-y-1">
          <div className="relative h-2.5 w-full rounded-full bg-[var(--color-surface-subtle)] overflow-hidden flex">
            {gauge.zones.map((z, idx) => (
              <div
                key={idx}
                className={zoneBg(z.tone)}
                style={{ width: `${z.widthPercent}%` }}
              />
            ))}
          </div>
          <div className="relative h-3 w-full">
            <div
              className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${gauge.pointerPercent}%` }}
            >
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[7px] border-b-[var(--color-text)]" />
            </div>
          </div>
        </div>
      )}

      {/* Single summary line below gauge: "Your value: X. Normal: A to B." */}
      <p className="text-sm font-semibold text-[var(--color-text-secondary)] tabular-nums leading-snug">
        {gauge.summaryLine}
        {gauge.usedAiimsFallback && (
          <span className="ml-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
            {aiimsNote}
          </span>
        )}
      </p>
    </>
  );

  if (onExplain) {
    return (
      <button
        type="button"
        id={`finding-${finding.id}`}
        onClick={() => onExplain(finding)}
        className={`rs-card w-full text-left p-5 space-y-3 transition hover:bg-[var(--color-surface-subtle)]/40 active:scale-[0.995] focus-visible:outline-2 focus-visible:outline-[var(--color-brand)] ${
          isFocused ? 'ring-2 ring-[var(--color-brand)] ring-offset-2' : ''
        }`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      id={`finding-${finding.id}`}
      className={`rs-card p-5 space-y-3 transition ${
        isFocused ? 'ring-2 ring-[var(--color-brand)] ring-offset-2' : ''
      }`}
    >
      {content}
    </div>
  );
};
