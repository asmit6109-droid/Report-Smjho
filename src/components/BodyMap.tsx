import React, { useState } from 'react';
import { BodyRegionId, Finding, SeverityLevel } from '../types/report';
import { SupportedLanguage, translations } from '../utils/translations';
import { CheckCircle2, AlertTriangle, AlertOctagon, Droplets } from 'lucide-react';

interface BodyMapProps {
  affectedRegions: BodyRegionId[];
  findings: Finding[];
  overallSeverity: SeverityLevel;
  language: SupportedLanguage;
}

export const BodyMap: React.FC<BodyMapProps> = ({
  affectedRegions,
  findings,
  overallSeverity,
  language,
}) => {
  const [viewMode, setViewMode] = useState<'front' | 'back'>('front');
  const [selectedRegion, setSelectedRegion] = useState<BodyRegionId | null>(
    affectedRegions.length > 0 ? affectedRegions[0] : null
  );

  const t = translations[language];

  const getRegionFindings = (region: BodyRegionId) => {
    return findings.filter((f) => f.body_region === region);
  };

  const getRegionSeverity = (region: BodyRegionId): 'normal' | 'caution' | 'danger' => {
    const list = getRegionFindings(region);
    if (list.length === 0) return 'normal';
    const hasRed = list.some((f) => f.status === 'critical' || overallSeverity === 'red');
    if (hasRed) return 'danger';
    const hasYellow = list.some((f) => f.status === 'high' || f.status === 'low');
    if (hasYellow) return 'caution';
    return 'normal';
  };

  const getRegionColor = (region: BodyRegionId) => {
    const list = getRegionFindings(region);
    if (list.length === 0) return '#D1D5DB';
    const sev = getRegionSeverity(region);
    if (sev === 'danger') return '#DC2626';
    if (sev === 'caution') return '#F59E0B';
    return '#16A34A';
  };

  const isAffected = (region: BodyRegionId) => affectedRegions.includes(region);
  const selectedFindings = selectedRegion ? getRegionFindings(selectedRegion) : [];
  const selectedSev = selectedRegion ? getRegionSeverity(selectedRegion) : 'normal';

  const renderStatusIcon = (sev: 'normal' | 'caution' | 'danger') => {
    if (sev === 'danger') return <AlertOctagon className="w-5 h-5 text-[var(--color-danger)] shrink-0" />;
    if (sev === 'caution') return <AlertTriangle className="w-5 h-5 text-[var(--color-caution)] shrink-0" />;
    return <CheckCircle2 className="w-5 h-5 text-[var(--color-normal)] shrink-0" />;
  };

  const bloodSev = getRegionSeverity('blood_system');

  return (
    <div className="rs-card p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-extrabold text-[var(--color-text)] text-base">{t.bodyMapTitle}</h3>

        <div className="inline-flex rounded-[12px] bg-[var(--color-surface-subtle)] p-1 text-base font-bold">
          <button
            type="button"
            onClick={() => setViewMode('front')}
            className={`rounded-[10px] px-3.5 py-1.5 transition ${
              viewMode === 'front'
                ? 'bg-[var(--color-surface)] text-[var(--color-brand)] shadow-[var(--shadow-card)]'
                : 'text-[var(--color-text-secondary)]'
            }`}
          >
            {t.frontView}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('back')}
            className={`rounded-[10px] px-3.5 py-1.5 transition ${
              viewMode === 'back'
                ? 'bg-[var(--color-surface)] text-[var(--color-brand)] shadow-[var(--shadow-card)]'
                : 'text-[var(--color-text-secondary)]'
            }`}
          >
            {t.backView}
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-2">
        {isAffected('blood_system') && (
          <button
            type="button"
            onClick={() => setSelectedRegion('blood_system')}
            className={`mb-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-base font-bold ${
              bloodSev === 'danger'
                ? 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
                : bloodSev === 'caution'
                ? 'bg-[var(--color-caution-soft)] text-[var(--color-text)]'
                : 'bg-[var(--color-normal-soft)] text-[var(--color-normal)]'
            }`}
          >
            <Droplets
              className="w-4 h-4 shrink-0"
              style={{ color: getRegionColor('blood_system') }}
            />
            <span>Blood</span>
          </button>
        )}

        {/* Clean light gray body outline, affected areas highlighted in severity color */}
        <svg
          viewBox="0 0 240 380"
          className="w-48 h-auto select-none"
          aria-label="Human body map diagram"
        >
          <g fill="#F3F4F6" stroke="#E5E7EB" strokeWidth="2.5" strokeLinejoin="round">
            <circle cx="120" cy="42" r="24" />
            <path d="M 112 65 L 112 80 L 128 80 L 128 65 Z" />
            <path d="M 88 80 L 152 80 L 146 170 L 94 170 Z" />
            <path d="M 94 170 L 146 170 L 140 205 L 100 205 Z" />
            <path d="M 88 84 L 64 150 L 56 215 L 68 215 L 76 154 L 92 90 Z" />
            <path d="M 152 84 L 176 150 L 184 215 L 172 215 L 164 154 L 148 90 Z" />
            <path d="M 100 205 L 94 285 L 90 350 L 108 350 L 116 285 L 118 205 Z" />
            <path d="M 122 205 L 124 285 L 132 350 L 150 350 L 146 285 L 140 205 Z" />
          </g>

          {viewMode === 'front' && (
            <g className="cursor-pointer">
              <circle
                cx="120"
                cy="42"
                r="22"
                fill={isAffected('head') ? getRegionColor('head') : '#E5E7EB'}
                fillOpacity={isAffected('head') ? 0.85 : 0.35}
                stroke="#FFFFFF"
                strokeWidth="2"
                onClick={() => setSelectedRegion('head')}
              />
              <rect
                x="110"
                y="66"
                width="20"
                height="16"
                rx="4"
                fill={isAffected('neck_cervical') ? getRegionColor('neck_cervical') : '#E5E7EB'}
                fillOpacity={isAffected('neck_cervical') ? 0.85 : 0.35}
                stroke="#FFFFFF"
                strokeWidth="2"
                onClick={() => setSelectedRegion('neck_cervical')}
              />
              <path
                d="M 94 88 Q 120 86 146 88 L 144 125 Q 120 128 96 125 Z"
                fill={isAffected('chest_lungs') ? getRegionColor('chest_lungs') : '#E5E7EB'}
                fillOpacity={isAffected('chest_lungs') ? 0.85 : 0.35}
                stroke="#FFFFFF"
                strokeWidth="2"
                onClick={() => setSelectedRegion('chest_lungs')}
              />
              <circle
                cx="128"
                cy="104"
                r="12"
                fill={isAffected('heart') ? getRegionColor('heart') : '#E5E7EB'}
                fillOpacity={isAffected('heart') ? 0.88 : 0.35}
                stroke="#FFFFFF"
                strokeWidth="2"
                onClick={() => setSelectedRegion('heart')}
              />
              <path
                d="M 96 128 Q 120 129 144 128 L 142 165 Q 120 166 98 165 Z"
                fill={isAffected('abdomen_liver') ? getRegionColor('abdomen_liver') : '#E5E7EB'}
                fillOpacity={isAffected('abdomen_liver') ? 0.85 : 0.35}
                stroke="#FFFFFF"
                strokeWidth="2"
                onClick={() => setSelectedRegion('abdomen_liver')}
              />
              <g onClick={() => setSelectedRegion('kidney')}>
                <circle
                  cx="104"
                  cy="146"
                  r="7"
                  fill={isAffected('kidney') ? getRegionColor('kidney') : '#D1D5DB'}
                  fillOpacity={isAffected('kidney') ? 0.92 : 0.45}
                />
                <circle
                  cx="136"
                  cy="146"
                  r="7"
                  fill={isAffected('kidney') ? getRegionColor('kidney') : '#D1D5DB'}
                  fillOpacity={isAffected('kidney') ? 0.92 : 0.45}
                />
              </g>
              <path
                d="M 98 172 Q 120 173 142 172 L 138 200 Q 120 205 102 200 Z"
                fill={isAffected('pelvis') ? getRegionColor('pelvis') : '#E5E7EB'}
                fillOpacity={isAffected('pelvis') ? 0.85 : 0.35}
                onClick={() => setSelectedRegion('pelvis')}
              />
              <circle
                cx="84"
                cy="88"
                r="10"
                fill={isAffected('shoulder_left') ? getRegionColor('shoulder_left') : '#E5E7EB'}
                fillOpacity={isAffected('shoulder_left') ? 0.9 : 0.35}
                onClick={() => setSelectedRegion('shoulder_left')}
              />
              <circle
                cx="156"
                cy="88"
                r="10"
                fill={isAffected('shoulder_right') ? getRegionColor('shoulder_right') : '#E5E7EB'}
                fillOpacity={isAffected('shoulder_right') ? 0.9 : 0.35}
                onClick={() => setSelectedRegion('shoulder_right')}
              />
              <circle
                cx="105"
                cy="282"
                r="11"
                fill={isAffected('knee_left') ? getRegionColor('knee_left') : '#E5E7EB'}
                fillOpacity={isAffected('knee_left') ? 0.9 : 0.35}
                onClick={() => setSelectedRegion('knee_left')}
              />
              <circle
                cx="135"
                cy="282"
                r="11"
                fill={isAffected('knee_right') ? getRegionColor('knee_right') : '#E5E7EB'}
                fillOpacity={isAffected('knee_right') ? 0.9 : 0.35}
                onClick={() => setSelectedRegion('knee_right')}
              />
            </g>
          )}

          {viewMode === 'back' && (
            <g className="cursor-pointer">
              <circle
                cx="120"
                cy="42"
                r="22"
                fill={isAffected('head') ? getRegionColor('head') : '#E5E7EB'}
                fillOpacity={isAffected('head') ? 0.85 : 0.35}
                onClick={() => setSelectedRegion('head')}
              />
              <line x1="120" y1="65" x2="120" y2="195" stroke="#D1D5DB" strokeWidth="4" strokeLinecap="round" />
              <rect
                x="108"
                y="66"
                width="24"
                height="26"
                rx="6"
                fill={isAffected('neck_cervical') ? getRegionColor('neck_cervical') : '#E5E7EB'}
                fillOpacity={isAffected('neck_cervical') ? 0.9 : 0.35}
                onClick={() => setSelectedRegion('neck_cervical')}
              />
              <rect
                x="110"
                y="96"
                width="20"
                height="44"
                rx="4"
                fill={isAffected('chest_lungs') ? getRegionColor('chest_lungs') : '#E5E7EB'}
                fillOpacity={isAffected('chest_lungs') ? 0.85 : 0.35}
                onClick={() => setSelectedRegion('chest_lungs')}
              />
              <rect
                x="108"
                y="144"
                width="24"
                height="34"
                rx="5"
                fill={isAffected('spine_lumbar') ? getRegionColor('spine_lumbar') : '#E5E7EB'}
                fillOpacity={isAffected('spine_lumbar') ? 0.9 : 0.35}
                onClick={() => setSelectedRegion('spine_lumbar')}
              />
              <path
                d="M 110 182 L 130 182 L 124 204 L 116 204 Z"
                fill={isAffected('pelvis') ? getRegionColor('pelvis') : '#E5E7EB'}
                fillOpacity={isAffected('pelvis') ? 0.85 : 0.35}
                onClick={() => setSelectedRegion('pelvis')}
              />
            </g>
          )}
        </svg>

        {/* Single short line for selected body region paired with icon and label */}
        {selectedRegion && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[var(--color-bg)] px-4 py-1.5 text-base font-bold text-[var(--color-text)]">
            {renderStatusIcon(selectedSev)}
            <span className="capitalize">{selectedRegion.replace('_', ' ')}</span>
            {selectedFindings.length > 0 && (
              <span className="text-[var(--color-text-secondary)]">
                • {selectedFindings[0].translations?.[language]?.name || selectedFindings[0].name}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
