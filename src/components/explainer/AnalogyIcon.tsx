import React from 'react';

interface AnalogyIconProps {
  name?: string;
  className?: string;
}

/**
 * Clean 2-color SVG line-art icons illustrating medical analogies.
 * Strict max 2 colors (brand teal #0F766E + dark slate #1F2937). Zero emojis.
 */
export const AnalogyIcon: React.FC<AnalogyIconProps> = ({
  name = 'battery_energy',
  className = 'w-12 h-12',
}) => {
  const teal = '#0F766E';
  const slate = '#1F2937';

  switch (name) {
    case 'bike_throttle':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
          <circle cx="24" cy="26" r="14" stroke={slate} strokeWidth="2.2" />
          <path d="M15 33 A11 11 0 1 1 33 33" stroke={teal} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M24 26 L32 18" stroke={teal} strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="24" cy="26" r="2.8" fill={slate} />
          <path d="M19 8 H29" stroke={slate} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    case 'key_lock':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
          <rect x="21" y="21" width="19" height="17" rx="4" stroke={slate} strokeWidth="2.2" />
          <path d="M25 21 V16 A5.5 5.5 0 0 1 36 16 V21" stroke={slate} strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="14" cy="18" r="5" stroke={teal} strokeWidth="2.4" />
          <path d="M14 23 V35 H18 M14 30 H17" stroke={teal} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="30.5" cy="29.5" r="2" fill={teal} />
        </svg>
      );

    case 'oxygen_truck':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
          <rect x="6" y="15" width="22" height="16" rx="3" stroke={slate} strokeWidth="2.2" />
          <path d="M28 20 H36 L41 25 V31 H28 V20 Z" stroke={slate} strokeWidth="2.2" strokeLinejoin="round" />
          <circle cx="15" cy="34" r="4" stroke={teal} strokeWidth="2.4" fill="white" />
          <circle cx="34" cy="34" r="4" stroke={teal} strokeWidth="2.4" fill="white" />
          <path d="M13 23 H21 M17 19 V27" stroke={teal} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    case 'soldier_shield':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
          <path
            d="M24 7 L38 12 V23 C38 31.5 32 37.5 24 41 C16 37.5 10 31.5 10 23 V12 L24 7 Z"
            stroke={slate}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path d="M18 24 L22.5 28.5 L31 19" stroke={teal} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'repair_patch':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
          <rect
            x="9"
            y="18"
            width="30"
            height="12"
            rx="6"
            transform="rotate(-35 24 24)"
            stroke={slate}
            strokeWidth="2.2"
          />
          <circle cx="22" cy="22" r="1.4" fill={teal} />
          <circle cx="26" cy="26" r="1.4" fill={teal} />
          <circle cx="26" cy="22" r="1.4" fill={teal} />
          <circle cx="22" cy="26" r="1.4" fill={teal} />
        </svg>
      );

    case 'water_filter':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
          <path d="M10 11 H38 L27 25 V36 L21 39 V25 L10 11 Z" stroke={slate} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M17 16 H31" stroke={teal} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M24 39 C24 39 29 43 24 44 C19 43 24 39 24 39 Z" stroke={teal} strokeWidth="2" />
        </svg>
      );

    case 'kitchen_factory':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
          <path d="M11 20 H37 V31 C37 35 33 38 24 38 C15 38 11 35 11 31 V20 Z" stroke={slate} strokeWidth="2.2" />
          <path d="M8 20 H40" stroke={slate} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M18 11 C18 14 16 15 16 17 M24 9 C24 12 22 14 22 16 M30 11 C30 14 28 15 28 17" stroke={teal} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    case 'pipe_flow':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
          <path d="M7 18 H41 M7 30 H41" stroke={slate} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M14 24 H32 M27 20 L33 24 L27 28" stroke={teal} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'sun_bone':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
          <circle cx="34" cy="14" r="5" stroke={teal} strokeWidth="2.2" />
          <path d="M34 6 V7.5 M34 20.5 V22 M26 14 H27.5 M40.5 14 H42" stroke={teal} strokeWidth="2" strokeLinecap="round" />
          <path
            d="M12 31 C9 31 8 34 10 36 C8 38 11 41 14 39 L28 28 C31 30 34 27 32 25 C34 22 31 19 28 21 L14 32 Z"
            stroke={slate}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'heart_pump':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
          <path
            d="M24 39 C24 39 9 29.5 9 19 C9 13.5 13 10 17.8 10 C20.7 10 22.8 11.4 24 13.4 C25.2 11.4 27.3 10 30.2 10 C35 10 39 13.5 39 19 C39 29.5 24 39 24 39 Z"
            stroke={slate}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path d="M14 24 H19 L22 19 L26 28 L29 24 H34" stroke={teal} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'air_bellows':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
          <path d="M24 8 V20 M24 16 L18 20 M24 16 L30 20" stroke={teal} strokeWidth="2.2" strokeLinecap="round" />
          <path
            d="M20 19 C13 20 9 26 9 34 C9 37 12 38 16 37 C19 36 21 33 21 28 V19 Z"
            stroke={slate}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path
            d="M28 19 C35 20 39 26 39 34 C39 37 36 38 32 37 C29 36 27 33 27 28 V19 Z"
            stroke={slate}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'spine_cushion':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
          <rect x="14" y="9" width="20" height="7" rx="2.5" stroke={slate} strokeWidth="2.2" />
          <rect x="16" y="19" width="16" height="4" rx="2" stroke={teal} strokeWidth="2.2" />
          <rect x="14" y="26" width="20" height="7" rx="2.5" stroke={slate} strokeWidth="2.2" />
          <rect x="16" y="36" width="16" height="4" rx="2" stroke={teal} strokeWidth="2.2" />
        </svg>
      );

    case 'battery_energy':
    default:
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
          <rect x="9" y="15" width="26" height="18" rx="3.5" stroke={slate} strokeWidth="2.2" />
          <path d="M37 21 V27" stroke={slate} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M23 18 L18.5 24.5 H23 L21 30 L26.5 23.5 H22 L23 18 Z" stroke={teal} strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
  }
};
