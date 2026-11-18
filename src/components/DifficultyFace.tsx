import { useId } from 'react';
import type { DifficultyTier, LevelRating } from '../types/gd';

interface DifficultyFaceProps {
  difficulty: DifficultyTier;
  rating?: LevelRating;
  size?: number;
  className?: string;
}

export function DifficultyFace({
  difficulty,
  rating = 'rated',
  size = 56,
  className = '',
}: DifficultyFaceProps) {
  const uid = useId().replace(/:/g, '');

  const isDemon =
    difficulty === 'easy-demon' ||
    difficulty === 'medium-demon' ||
    difficulty === 'hard-demon' ||
    difficulty === 'insane-demon' ||
    difficulty === 'extreme-demon';

  const palette: Record<DifficultyTier, { top: string; bottom: string; rim: string; horn?: string; eye: string }> = {
    auto: { top: '#FDE68A', bottom: '#D97706', rim: '#78350F', eye: '#1E293B' },
    easy: { top: '#7DD3FC', bottom: '#0284C7', rim: '#0C4A6E', eye: '#0F172A' },
    normal: { top: '#86EFAC', bottom: '#16A34A', rim: '#14532D', eye: '#0F172A' },
    hard: { top: '#FEF08A', bottom: '#CA8A04', rim: '#713F12', eye: '#0F172A' },
    harder: { top: '#FDBA74', bottom: '#EA580C', rim: '#7C2D12', eye: '#0F172A' },
    insane: { top: '#F5D0FE', bottom: '#C026D3', rim: '#701A75', eye: '#0F172A' },
    'easy-demon': { top: '#A5B4FC', bottom: '#4F46E5', rim: '#312E81', horn: '#C7D2FE', eye: '#FFFFFF' },
    'medium-demon': { top: '#E9D5FF', bottom: '#9333EA', rim: '#581C87', horn: '#F3E8FF', eye: '#FFFFFF' },
    'hard-demon': { top: '#FCA5A5', bottom: '#DC2626', rim: '#7F1D1D', horn: '#FECACA', eye: '#FEF08A' },
    'insane-demon': { top: '#F87171', bottom: '#B91C1C', rim: '#450A0A', horn: '#FCA5A5', eye: '#FEF08A' },
    'extreme-demon': { top: '#EF4444', bottom: '#7F1D1D', rim: '#2A0505', horn: '#FDE047', eye: '#FFFBEB' },
  };

  const c = palette[difficulty];

  const ratingRingColor: Record<LevelRating, string | null> = {
    rated: null,
    featured: '#FBBF24',
    epic: '#F97316',
    legendary: '#EC4899',
    mythic: '#38BDF8',
  };

  const ringColor = ratingRingColor[rating];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`shrink-0 select-none ${className}`}
      aria-label={`${difficulty} difficulty face`}
    >
      <defs>
        <linearGradient id={`grad-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={c.top} />
          <stop offset="100%" stopColor={c.bottom} />
        </linearGradient>
        <radialGradient id={`halo-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor={ringColor || 'transparent'} stopOpacity="0.45" />
          <stop offset="100%" stopColor={ringColor || 'transparent'} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Rating Glow / Flame Halo */}
      {ringColor && (
        <>
          <circle cx="50" cy="52" r="48" fill={`url(#halo-${uid})`} />
          {(rating === 'epic' || rating === 'legendary' || rating === 'mythic') && (
            <g stroke={ringColor} strokeWidth="2.5" strokeLinecap="round" opacity="0.85">
              <path d="M50 4 L50 11" />
              <path d="M50 91 L50 97" />
              <path d="M5 52 L12 52" />
              <path d="M88 52 L95 52" />
              <path d="M18 20 L23 25" />
              <path d="M82 20 L77 25" />
              <path d="M18 84 L23 79" />
              <path d="M82 84 L77 79" />
            </g>
          )}
          <circle
            cx="50"
            cy="52"
            r="39"
            fill="none"
            stroke={ringColor}
            strokeWidth={rating === 'featured' ? '2.5' : '3.5'}
            strokeDasharray={rating === 'mythic' ? '6 3' : undefined}
          />
        </>
      )}

      {/* Demon Horns */}
      {isDemon && (
        <g fill={c.horn || c.top} stroke={c.rim} strokeWidth="3" strokeLinejoin="round">
          {difficulty === 'extreme-demon' ? (
            <>
              <path d="M24 38 C12 24, 14 10, 26 6 C25 18, 30 26, 36 30 Z" />
              <path d="M76 38 C88 24, 86 10, 74 6 C75 18, 70 26, 64 30 Z" />
              <path d="M18 54 L8 48 L17 62 Z" />
              <path d="M82 54 L92 48 L83 62 Z" />
            </>
          ) : difficulty === 'insane-demon' || difficulty === 'hard-demon' ? (
            <>
              <path d="M25 36 C16 22, 18 12, 29 10 C28 20, 32 26, 37 30 Z" />
              <path d="M75 36 C84 22, 82 12, 71 10 C72 20, 68 26, 63 30 Z" />
            </>
          ) : (
            <>
              <path d="M28 34 L21 15 L37 26 Z" />
              <path d="M72 34 L79 15 L63 26 Z" />
            </>
          )}
        </g>
      )}

      {/* Auto Gear Teeth */}
      {difficulty === 'auto' && (
        <g fill={c.bottom} stroke={c.rim} strokeWidth="2.5">
          <rect x="45" y="12" width="10" height="9" rx="2" />
          <rect x="45" y="83" width="10" height="9" rx="2" />
          <rect x="10" y="47" width="9" height="10" rx="2" />
          <rect x="81" y="47" width="9" height="10" rx="2" />
        </g>
      )}

      {/* Base Face Circle */}
      <circle
        cx="50"
        cy="52"
        r="32"
        fill={`url(#grad-${uid})`}
        stroke={c.rim}
        strokeWidth="4"
      />

      {/* Inner Highlight */}
      <path
        d="M27 39 A25 25 0 0 1 73 39"
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Expressions per difficulty */}
      {difficulty === 'auto' && (
        <g>
          <rect x="30" y="40" width="14" height="12" rx="3" fill={c.eye} />
          <rect x="56" y="40" width="14" height="12" rx="3" fill={c.eye} />
          <circle cx="37" cy="46" r="2.5" fill="#FDE68A" />
          <circle cx="63" cy="46" r="2.5" fill="#FDE68A" />
          <path d="M36 65 H64" stroke={c.eye} strokeWidth="4" strokeLinecap="round" />
          <path d="M43 65 V70 M50 65 V70 M57 65 V70" stroke={c.eye} strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}

      {difficulty === 'easy' && (
        <g>
          <path d="M32 39 Q38 35 43 39" fill="none" stroke={c.rim} strokeWidth="3" strokeLinecap="round" />
          <path d="M57 39 Q62 35 68 39" fill="none" stroke={c.rim} strokeWidth="3" strokeLinecap="round" />
          <circle cx="38" cy="47" r="4.5" fill={c.eye} />
          <circle cx="62" cy="47" r="4.5" fill={c.eye} />
          <path d="M36 62 Q50 74 64 62" fill="none" stroke={c.eye} strokeWidth="4" strokeLinecap="round" />
        </g>
      )}

      {difficulty === 'normal' && (
        <g>
          <circle cx="38" cy="46" r="5" fill={c.eye} />
          <circle cx="62" cy="46" r="5" fill={c.eye} />
          <circle cx="39.5" cy="44.5" r="1.5" fill="#FFFFFF" />
          <circle cx="63.5" cy="44.5" r="1.5" fill="#FFFFFF" />
          <path d="M35 61 Q50 72 65 61" fill="none" stroke={c.eye} strokeWidth="4.2" strokeLinecap="round" />
        </g>
      )}

      {difficulty === 'hard' && (
        <g>
          <path d="M30 37 L44 41" stroke={c.rim} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M70 37 L56 41" stroke={c.rim} strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="38" cy="48" r="4.8" fill={c.eye} />
          <circle cx="62" cy="48" r="4.8" fill={c.eye} />
          <path d="M35 63 Q50 67 65 63" fill="none" stroke={c.eye} strokeWidth="4" strokeLinecap="round" />
        </g>
      )}

      {difficulty === 'harder' && (
        <g>
          <path d="M29 36 L45 43" stroke={c.rim} strokeWidth="4" strokeLinecap="round" />
          <path d="M71 36 L55 43" stroke={c.rim} strokeWidth="4" strokeLinecap="round" />
          <circle cx="38" cy="49" r="5" fill={c.eye} />
          <circle cx="62" cy="49" r="5" fill={c.eye} />
          <path d="M35 67 Q50 58 65 67" fill="none" stroke={c.eye} strokeWidth="4.2" strokeLinecap="round" />
        </g>
      )}

      {difficulty === 'insane' && (
        <g>
          <path d="M28 35 L44 42" stroke={c.rim} strokeWidth="4" strokeLinecap="round" />
          <path d="M72 35 L56 42" stroke={c.rim} strokeWidth="4" strokeLinecap="round" />
          <circle cx="38" cy="49" r="6" fill="#FFFFFF" stroke={c.rim} strokeWidth="2.5" />
          <circle cx="62" cy="49" r="6" fill="#FFFFFF" stroke={c.rim} strokeWidth="2.5" />
          <circle cx="38" cy="49" r="2.6" fill={c.eye} />
          <circle cx="62" cy="49" r="2.6" fill={c.eye} />
          <path d="M34 66 Q50 57 66 66 Z" fill={c.eye} />
          <path d="M40 64 H60" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}

      {isDemon && (
        <g>
          <path d="M28 37 L45 45" stroke={c.rim} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M72 37 L55 45" stroke={c.rim} strokeWidth="4.5" strokeLinecap="round" />
          <ellipse cx="38" cy="50" rx="5.5" ry="4.5" fill={c.eye} />
          <ellipse cx="62" cy="50" rx="5.5" ry="4.5" fill={c.eye} />
          {(difficulty === 'insane-demon' || difficulty === 'extreme-demon') && (
            <>
              <circle cx="38" cy="50" r="2" fill={c.rim} />
              <circle cx="62" cy="50" r="2" fill={c.rim} />
            </>
          )}
          <path d="M33 67 Q50 57 67 67 Q50 73 33 67 Z" fill={c.rim} />
          {/* Fangs */}
          <path d="M38 64 L41 70 L44 63 Z" fill="#FFFFFF" />
          <path d="M56 63 L59 70 L62 64 Z" fill="#FFFFFF" />
        </g>
      )}
    </svg>
  );
}
