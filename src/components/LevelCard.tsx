import { useState } from 'react';
import { ExternalLink, Star, Download, ThumbsUp, Sparkles } from 'lucide-react';
import type { GDLevelCard } from '../types/gd';
import { PACK_MAP } from '../data/packs';
import { getRatingMeta, getVariantMeta } from '../data/variants';
import { DifficultyFace } from './DifficultyFace';

interface LevelCardProps {
  card: GDLevelCard;
  isNew?: boolean;
  onInspect?: (card: GDLevelCard) => void;
  onSell?: (card: GDLevelCard) => void;
  compact?: boolean;
}

const RATING_LABELS: Record<GDLevelCard['rating'], string> = {
  rated: 'Rated',
  featured: 'Featured',
  epic: 'Epic',
  legendary: 'Legendary',
  mythic: 'Mythic',
};

function formatCompactNumber(num?: number): string {
  if (num === undefined || num === null) return '—';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

export function LevelCard({ card, isNew = false, onInspect, onSell, compact = false }: LevelCardProps) {
  const [imgError, setImgError] = useState(false);
  const pack = PACK_MAP[card.difficulty];
  const accent = pack?.accentHex || '#F59E0B';
  const variantMeta = getVariantMeta(card.variant);
  const ratingMeta = getRatingMeta(card.rating);
  const isRareVariant = variantMeta.id !== 'standard';
  const isMythic = card.rating === 'mythic';

  return (
    <article
      onClick={() => onInspect?.(card)}
      className={`group relative flex flex-col justify-between rounded-xl border transition-all duration-200 hover:border-white/40 hover:-translate-y-0.5 ${
        variantMeta.cardClass
      } ${isRareVariant ? 'variant-shimmer' : ''} ${
        onInspect ? 'cursor-pointer' : ''
      } ${compact ? 'p-4' : 'p-5'}`}
      style={{
        boxShadow:
          !isRareVariant && (isMythic || card.rating === 'legendary')
            ? `0 0 0 1px ${(isMythic ? ratingMeta.accentHex : accent)}45, 0 16px 32px -16px ${(isMythic ? ratingMeta.accentHex : accent)}55`
            : undefined,
      }}
    >
      <div>
        {/* Clean text-only kicker (zero-pill discipline) */}
        <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-medium text-slate-200 truncate">{card.sourceLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-400">#{card.levelId}</span>
            {isRareVariant && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold whitespace-nowrap" style={{ color: variantMeta.accentHex }}>
                  {variantMeta.label}
                </span>
              </>
            )}
          </div>
          {isNew && (
            <span className="text-xs font-semibold text-amber-400 whitespace-nowrap shrink-0">
              New Pull
            </span>
          )}
        </div>

        {/* Visual Showcase: Difficulty Face Crest + Title */}
        <div className="mt-3.5 flex items-center gap-4">
          <div
            className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-white/10"
            style={{
              backgroundColor: isRareVariant
                ? 'rgba(11, 15, 23, 0.72)'
                : pack?.surfaceTint || 'rgba(255,255,255,0.04)',
              borderColor: isRareVariant ? `${variantMeta.accentHex}55` : undefined,
            }}
          >
            <DifficultyFace difficulty={card.difficulty} rating={card.rating} size={54} />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-bold leading-tight text-white truncate">
              {card.name}
            </h3>
            <p className="mt-1 text-sm text-slate-400 truncate">
              by <span className="text-slate-200">{card.creator}</span>
              {card.verifier ? ` · Verifier: ${card.verifier}` : ''}
            </p>
            <div className="mt-1.5 flex items-center gap-2 text-xs font-medium">
              <span style={{ color: accent }}>{card.difficultyLabel}</span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-amber-300 tabular-nums">
                <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                {card.stars}
              </span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span
                className={isMythic ? 'font-semibold' : 'text-slate-300'}
                style={isMythic ? { color: ratingMeta.accentHex } : undefined}
              >
                {RATING_LABELS[card.rating] ?? 'Mythic'}
              </span>
            </div>
          </div>
        </div>

        {/* Optional Video Preview Strip for Pointercrate / IDL / Pemonlist */}
        {card.thumbnailUrl && !imgError && !compact && (
          <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-[#0B0F17] aspect-video">
            <img
              src={card.thumbnailUrl}
              alt={`${card.name} verification preview`}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover opacity-90 transition-opacity duration-200 group-hover:opacity-100"
            />
          </div>
        )}

        {/* Upgraded callout (unboxed text line) */}
        {card.upgradedFrom && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-300">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>Upgraded from {PACK_MAP[card.upgradedFrom]?.difficultyLabel}</span>
          </p>
        )}

        {/* Description or Tags */}
        {!compact && (card.description || (card.tags && card.tags.length > 0)) && (
          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-400">
            {card.description || card.tags?.join(' · ')}
          </p>
        )}
      </div>

      {/* Footer Telemetry & Actions */}
      <div className="mt-4 pt-3 border-t border-white/8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-slate-400 tabular-nums">
          {card.downloads !== undefined && card.downloads > 0 ? (
            <>
              <span className="inline-flex items-center gap-1">
                <Download className="h-3.5 w-3.5 text-slate-500" />
                {formatCompactNumber(card.downloads)}
              </span>
              <span className="inline-flex items-center gap-1">
                <ThumbsUp className="h-3.5 w-3.5 text-slate-500" />
                {formatCompactNumber(card.likes)}
              </span>
            </>
          ) : card.points ? (
            <span>{card.points} pts</span>
          ) : card.songName ? (
            <span className="truncate max-w-[140px]">{card.songName}</span>
          ) : (
            <span>{card.length || 'Level'}</span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {onSell && (
            <button
              type="button"
              onClick={() => onSell(card)}
              className="px-2.5 py-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 rounded-md transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer"
            >
              Sell +{card.orbValue.toLocaleString()} Orbs
            </button>
          )}
          <a
            href={card.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <span>Open</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </article>
  );
}
