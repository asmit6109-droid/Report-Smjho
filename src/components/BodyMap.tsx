import React, { useState } from 'react';
import { BodyRegionId, Finding, SeverityLevel } from '../types/report';
import { SupportedLanguage, translations } from '../utils/translations';
import { Sparkles, Info } from 'lucide-react';

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

  // Helper to check if region has findings and get worst status
  const getRegionFindings = (region: BodyRegionId) => {
    return findings.filter((f) => f.body_region === region);
  };

  const getRegionColor = (region: BodyRegionId) => {
    const list = getRegionFindings(region);
    if (list.length === 0) return '#94a3b8'; // neutral muted slate
    const hasRed = list.some((f) => f.status === 'critical' || overallSeverity === 'red');
    if (hasRed) return '#ef4444'; // Red
    const hasYellow = list.some((f) => f.status === 'high' || f.status === 'low');
    if (hasYellow) return '#f59e0b'; // Amber
    return '#10b981'; // Green
  };

  const isAffected = (region: BodyRegionId) => affectedRegions.includes(region);

  const selectedFindings = selectedRegion ? getRegionFindings(selectedRegion) : [];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span>{t.bodyMapTitle}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{t.bodyMapSub}</p>
        </div>

        {/* View toggle (Front / Spine Back) */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setViewMode('front')}
            className={`rounded-lg px-2.5 py-1 transition ${
              viewMode === 'front'
                ? 'bg-white text-teal-800 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.frontView}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('back')}
            className={`rounded-lg px-2.5 py-1 transition ${
              viewMode === 'back'
                ? 'bg-white text-teal-800 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.backView}
          </button>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div className="relative mt-3 flex flex-col items-center justify-center bg-radial from-teal-50/40 via-slate-50/20 to-transparent rounded-xl py-4">
        {/* Whole-body blood system glow banner if blood_system affected */}
        {isAffected('blood_system') && (
          <button
            onClick={() => setSelectedRegion('blood_system')}
            className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold shadow-xs transition active:scale-95 ${
              selectedRegion === 'blood_system'
                ? 'bg-teal-700 text-white ring-2 ring-teal-400'
                : 'bg-teal-50 text-teal-800 border border-teal-200'
            }`}
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: getRegionColor('blood_system') }}
            />
            <span>Blood & Circulation (Whole Body)</span>
          </button>
        )}

        <svg
          viewBox="0 0 240 380"
          className="w-48 sm:w-56 h-auto drop-shadow-sm select-none"
          aria-label="Human body map diagram"
        >
          <defs>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glowYellow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background silhouette outline */}
          <g fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" strokeLinejoin="round">
            {/* Head */}
            <circle cx="120" cy="42" r="24" />

            {/* Neck */}
            <path d="M 112 65 L 112 80 L 128 80 L 128 65 Z" />

            {/* Torso */}
            <path d="M 88 80 L 152 80 L 146 170 L 94 170 Z" />

            {/* Pelvis */}
            <path d="M 94 170 L 146 170 L 140 205 L 100 205 Z" />

            {/* Left Arm (viewer's left = anatomical right) */}
            <path d="M 88 84 L 64 150 L 56 215 L 68 215 L 76 154 L 92 90 Z" />

            {/* Right Arm */}
            <path d="M 152 84 L 176 150 L 184 215 L 172 215 L 164 154 L 148 90 Z" />

            {/* Left Leg */}
            <path d="M 100 205 L 94 285 L 90 350 L 108 350 L 116 285 L 118 205 Z" />

            {/* Right Leg */}
            <path d="M 122 205 L 124 285 L 132 350 L 150 350 L 146 285 L 140 205 Z" />
          </g>

          {/* FRONT VIEW ANATOMICAL REGIONS */}
          {viewMode === 'front' && (
            <g className="cursor-pointer">
              {/* Head region */}
              <circle
                cx="120"
                cy="42"
                r="22"
                fill={isAffected('head') ? getRegionColor('head') : '#e2e8f0'}
                fillOpacity={isAffected('head') ? (selectedRegion === 'head' ? 0.95 : 0.75) : 0.3}
                stroke={isAffected('head') ? '#ffffff' : '#94a3b8'}
                strokeWidth={isAffected('head') ? 3 : 1}
                filter={isAffected('head') ? 'url(#glowYellow)' : undefined}
                onClick={() => setSelectedRegion('head')}
                className="transition-all hover:opacity-100"
              />

              {/* Neck & Cervical */}
              <rect
                x="110"
                y="66"
                width="20"
                height="16"
                rx="4"
                fill={isAffected('neck_cervical') ? getRegionColor('neck_cervical') : '#e2e8f0'}
                fillOpacity={isAffected('neck_cervical') ? (selectedRegion === 'neck_cervical' ? 0.95 : 0.8) : 0.3}
                stroke={isAffected('neck_cervical') ? '#ffffff' : '#94a3b8'}
                strokeWidth={isAffected('neck_cervical') ? 3 : 1}
                onClick={() => setSelectedRegion('neck_cervical')}
                className="transition-all hover:opacity-100"
              />

              {/* Chest / Lungs */}
              <path
                d="M 94 88 Q 120 86 146 88 L 144 125 Q 120 128 96 125 Z"
                fill={isAffected('chest_lungs') ? getRegionColor('chest_lungs') : '#e2e8f0'}
                fillOpacity={isAffected('chest_lungs') ? (selectedRegion === 'chest_lungs' ? 0.95 : 0.75) : 0.25}
                stroke={isAffected('chest_lungs') ? '#ffffff' : '#cbd5e1'}
                strokeWidth={isAffected('chest_lungs') ? 3 : 1}
                onClick={() => setSelectedRegion('chest_lungs')}
                className="transition-all hover:opacity-100"
              />

              {/* Heart (slightly left of center) */}
              <circle
                cx="128"
                cy="104"
                r="12"
                fill={isAffected('heart') ? getRegionColor('heart') : '#e2e8f0'}
                fillOpacity={isAffected('heart') ? (selectedRegion === 'heart' ? 0.95 : 0.8) : 0.2}
                stroke={isAffected('heart') ? '#ffffff' : '#cbd5e1'}
                strokeWidth={isAffected('heart') ? 3 : 1}
                onClick={() => setSelectedRegion('heart')}
                className="transition-all hover:opacity-100"
              />

              {/* Abdomen & Liver */}
              <path
                d="M 96 128 Q 120 129 144 128 L 142 165 Q 120 166 98 165 Z"
                fill={isAffected('abdomen_liver') ? getRegionColor('abdomen_liver') : '#e2e8f0'}
                fillOpacity={isAffected('abdomen_liver') ? (selectedRegion === 'abdomen_liver' ? 0.95 : 0.75) : 0.2}
                stroke={isAffected('abdomen_liver') ? '#ffffff' : '#cbd5e1'}
                strokeWidth={isAffected('abdomen_liver') ? 3 : 1}
                onClick={() => setSelectedRegion('abdomen_liver')}
                className="transition-all hover:opacity-100"
              />

              {/* Kidneys (bilateral dots in flank) */}
              <g onClick={() => setSelectedRegion('kidney')} className="transition-all hover:opacity-100">
                <circle
                  cx="104"
                  cy="146"
                  r="7"
                  fill={isAffected('kidney') ? getRegionColor('kidney') : '#cbd5e1'}
                  fillOpacity={isAffected('kidney') ? 0.9 : 0.3}
                  stroke={isAffected('kidney') ? '#ffffff' : 'none'}
                  strokeWidth="2"
                />
                <circle
                  cx="136"
                  cy="146"
                  r="7"
                  fill={isAffected('kidney') ? getRegionColor('kidney') : '#cbd5e1'}
                  fillOpacity={isAffected('kidney') ? 0.9 : 0.3}
                  stroke={isAffected('kidney') ? '#ffffff' : 'none'}
                  strokeWidth="2"
                />
              </g>

              {/* Pelvis */}
              <path
                d="M 98 172 Q 120 173 142 172 L 138 200 Q 120 205 102 200 Z"
                fill={isAffected('pelvis') ? getRegionColor('pelvis') : '#e2e8f0'}
                fillOpacity={isAffected('pelvis') ? (selectedRegion === 'pelvis' ? 0.95 : 0.75) : 0.2}
                stroke={isAffected('pelvis') ? '#ffffff' : '#cbd5e1'}
                strokeWidth={isAffected('pelvis') ? 2 : 1}
                onClick={() => setSelectedRegion('pelvis')}
                className="transition-all hover:opacity-100"
              />

              {/* Left Shoulder */}
              <circle
                cx="84"
                cy="88"
                r="10"
                fill={isAffected('shoulder_left') ? getRegionColor('shoulder_left') : '#e2e8f0'}
                fillOpacity={isAffected('shoulder_left') ? 0.9 : 0.2}
                stroke={isAffected('shoulder_left') ? '#ffffff' : '#cbd5e1'}
                strokeWidth="2"
                onClick={() => setSelectedRegion('shoulder_left')}
                className="transition-all hover:opacity-100"
              />

              {/* Right Shoulder */}
              <circle
                cx="156"
                cy="88"
                r="10"
                fill={isAffected('shoulder_right') ? getRegionColor('shoulder_right') : '#e2e8f0'}
                fillOpacity={isAffected('shoulder_right') ? 0.9 : 0.2}
                stroke={isAffected('shoulder_right') ? '#ffffff' : '#cbd5e1'}
                strokeWidth="2"
                onClick={() => setSelectedRegion('shoulder_right')}
                className="transition-all hover:opacity-100"
              />

              {/* Left Knee */}
              <circle
                cx="105"
                cy="282"
                r="11"
                fill={isAffected('knee_left') ? getRegionColor('knee_left') : '#e2e8f0'}
                fillOpacity={isAffected('knee_left') ? 0.9 : 0.2}
                stroke={isAffected('knee_left') ? '#ffffff' : '#cbd5e1'}
                strokeWidth="2"
                onClick={() => setSelectedRegion('knee_left')}
                className="transition-all hover:opacity-100"
              />

              {/* Right Knee */}
              <circle
                cx="135"
                cy="282"
                r="11"
                fill={isAffected('knee_right') ? getRegionColor('knee_right') : '#e2e8f0'}
                fillOpacity={isAffected('knee_right') ? 0.9 : 0.2}
                stroke={isAffected('knee_right') ? '#ffffff' : '#cbd5e1'}
                strokeWidth="2"
                onClick={() => setSelectedRegion('knee_right')}
                className="transition-all hover:opacity-100"
              />
            </g>
          )}

          {/* BACK / SPINE VIEW */}
          {viewMode === 'back' && (
            <g className="cursor-pointer">
              {/* Back of Head */}
              <circle
                cx="120"
                cy="42"
                r="22"
                fill={isAffected('head') ? getRegionColor('head') : '#e2e8f0'}
                fillOpacity={isAffected('head') ? 0.8 : 0.2}
                stroke={isAffected('head') ? '#ffffff' : '#94a3b8'}
                strokeWidth="2"
                onClick={() => setSelectedRegion('head')}
              />

              {/* Entire Spine Column Background Line */}
              <line x1="120" y1="65" x2="120" y2="195" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />

              {/* Cervical Spine (C1-C7, including C3-C4) */}
              <g onClick={() => setSelectedRegion('neck_cervical')}>
                <rect
                  x="108"
                  y="66"
                  width="24"
                  height="26"
                  rx="6"
                  fill={isAffected('neck_cervical') ? getRegionColor('neck_cervical') : '#e2e8f0'}
                  fillOpacity={isAffected('neck_cervical') ? 0.95 : 0.3}
                  stroke={isAffected('neck_cervical') ? '#ffffff' : '#64748b'}
                  strokeWidth={isAffected('neck_cervical') ? 3 : 1.5}
                />
                <text x="120" y="82" textAnchor="middle" fontSize="8" fontWeight="bold" fill={isAffected('neck_cervical') ? '#ffffff' : '#64748b'}>
                  C1-C7
                </text>
              </g>

              {/* Thoracic Spine (T1-T12) */}
              <g onClick={() => setSelectedRegion('chest_lungs')}>
                <rect
                  x="110"
                  y="96"
                  width="20"
                  height="44"
                  rx="4"
                  fill={isAffected('chest_lungs') ? getRegionColor('chest_lungs') : '#e2e8f0'}
                  fillOpacity={isAffected('chest_lungs') ? 0.8 : 0.25}
                  stroke={isAffected('chest_lungs') ? '#ffffff' : '#64748b'}
                  strokeWidth="1.5"
                />
                <text x="120" y="122" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#64748b">
                  T1-12
                </text>
              </g>

              {/* Lumbar Spine (L1-L5) */}
              <g onClick={() => setSelectedRegion('spine_lumbar')}>
                <rect
                  x="108"
                  y="144"
                  width="24"
                  height="34"
                  rx="5"
                  fill={isAffected('spine_lumbar') ? getRegionColor('spine_lumbar') : '#e2e8f0'}
                  fillOpacity={isAffected('spine_lumbar') ? 0.95 : 0.3}
                  stroke={isAffected('spine_lumbar') ? '#ffffff' : '#64748b'}
                  strokeWidth={isAffected('spine_lumbar') ? 3 : 1.5}
                />
                <text x="120" y="164" textAnchor="middle" fontSize="8" fontWeight="bold" fill={isAffected('spine_lumbar') ? '#ffffff' : '#64748b'}>
                  L1-L5
                </text>
              </g>

              {/* Sacrum & Pelvis Back */}
              <path
                d="M 110 182 L 130 182 L 124 204 L 116 204 Z"
                fill={isAffected('pelvis') ? getRegionColor('pelvis') : '#e2e8f0'}
                fillOpacity={isAffected('pelvis') ? 0.8 : 0.25}
                stroke="#64748b"
                strokeWidth="1.5"
                onClick={() => setSelectedRegion('pelvis')}
              />
            </g>
          )}

          {/* Interactive Ping Pin Indicator over the currently selected region */}
          {selectedRegion && selectedRegion !== 'blood_system' && (
            <g
              transform={`translate(${
                selectedRegion === 'head' ? '120,40' :
                selectedRegion === 'neck_cervical' ? '120,74' :
                selectedRegion === 'heart' ? '128,104' :
                selectedRegion === 'chest_lungs' ? '120,105' :
                selectedRegion === 'abdomen_liver' ? '120,140' :
                selectedRegion === 'kidney' ? '104,146' :
                selectedRegion === 'spine_lumbar' ? '120,160' :
                selectedRegion === 'pelvis' ? '120,186' :
                selectedRegion === 'shoulder_left' ? '84,88' :
                selectedRegion === 'shoulder_right' ? '156,88' :
                selectedRegion === 'knee_left' ? '105,282' :
                selectedRegion === 'knee_right' ? '135,282' : '120,120'
              })`}
            >
              <circle r="14" fill="none" stroke={getRegionColor(selectedRegion)} strokeWidth="2" opacity="0.6">
                <animate attributeName="r" values="8;18;8" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle r="4" fill="#ffffff" stroke={getRegionColor(selectedRegion)} strokeWidth="2.5" />
            </g>
          )}
        </svg>

        {/* Selected Region Finding Popup Banner */}
        <div className="w-full max-w-sm mt-3 px-2">
          {selectedRegion ? (
            <div className="rounded-xl border border-teal-200 bg-teal-50/90 p-3 text-slate-800 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: getRegionColor(selectedRegion) }}
                  />
                  <span className="font-bold text-xs uppercase tracking-wider text-teal-950">
                    {selectedRegion.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded-full">
                  {selectedFindings.length} {selectedFindings.length === 1 ? 'Finding' : 'Findings'}
                </span>
              </div>

              {selectedFindings.length > 0 ? (
                <div className="mt-2 space-y-1.5">
                  {selectedFindings.map((f) => (
                    <div key={f.id} className="text-xs text-slate-700 bg-white/80 rounded-lg p-2 border border-teal-100">
                      <div className="font-semibold text-slate-900">
                        {f.translations?.[language]?.name || f.name}
                      </div>
                      <div className="text-slate-600 mt-0.5 leading-snug">
                        {f.translations?.[language]?.short_explanation || f.short_explanation}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-1.5 text-xs text-slate-600 italic">
                  No abnormal findings in this specific area on this report.
                </p>
              )}
            </div>
          ) : (
            <div className="text-center text-xs text-slate-500 py-1 flex items-center justify-center gap-1">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>{t.tapBodyPartHint}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
