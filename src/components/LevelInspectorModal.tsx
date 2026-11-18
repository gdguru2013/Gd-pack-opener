import { useState } from 'react';
import { X, ExternalLink, Star, Music, Download, ThumbsUp } from 'lucide-react';
import type { GDLevelCard } from '../types/gd';
import { PACK_MAP } from '../data/packs';
import { getVariantMeta } from '../data/variants';
import { DifficultyFace } from './DifficultyFace';

interface LevelInspectorModalProps {
  card: GDLevelCard | null;
  isOwned: boolean;
  onClose: () => void;
  onSell?: (card: GDLevelCard) => void;
}

export function LevelInspectorModal({
  card,
  isOwned,
  onClose,
  onSell,
}: LevelInspectorModalProps) {
  const [imgFailed, setImgFailed] = useState(false);

  if (!card) return null;

  const pack = PACK_MAP[card.difficulty];
  const variantMeta = getVariantMeta(card.variant);
  const isRareVariant = variantMeta.id !== 'standard';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={card.name}
    >
      <div
        className={`relative w-full max-w-xl rounded-2xl border p-6 shadow-2xl max-h-[90vh] overflow-y-auto ${variantMeta.cardClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <DifficultyFace difficulty={card.difficulty} rating={card.rating} size={64} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-400">
                {card.sourceLabel} · ID #{card.levelId}
                {isRareVariant && (
                  <span className="font-semibold" style={{ color: variantMeta.accentHex }}>
                    {' · '}
                    {variantMeta.label} ({variantMeta.multiplier}x)
                  </span>
                )}
              </p>
              <h2 className="mt-0.5 font-display text-2xl font-bold text-white truncate">
                {card.name}
              </h2>
              <p className="text-sm text-slate-300">
                Created by <span className="font-medium text-white">{card.creator}</span>
                {card.verifier ? ` · Verified by ${card.verifier}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close level details"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video Preview */}
        {card.thumbnailUrl && !imgFailed && (
          <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-[#0B0F17] aspect-video">
            <img
              src={card.thumbnailUrl}
              alt={`${card.name} showcase`}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* Stats Strip */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-white/10 text-sm">
          <div>
            <p className="text-xs text-slate-400">Difficulty</p>
            <p className="mt-0.5 font-semibold" style={{ color: pack?.accentHex }}>
              {card.difficultyLabel}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Stars</p>
            <p className="mt-0.5 font-mono font-semibold text-amber-300 tabular-nums inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
              {card.stars}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">
              {card.listPosition ? 'List Rank' : 'Downloads'}
            </p>
            <p className="mt-0.5 font-mono font-semibold text-white tabular-nums inline-flex items-center gap-1">
              {card.listPosition ? (
                `#${card.listPosition}`
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 text-slate-400" />
                  {(card.downloads ?? 0).toLocaleString()}
                </>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">
              {card.points ? 'List Points' : 'Likes'}
            </p>
            <p className="mt-0.5 font-mono font-semibold text-white tabular-nums inline-flex items-center gap-1">
              {card.points ? (
                `${card.points}`
              ) : (
                <>
                  <ThumbsUp className="h-3.5 w-3.5 text-slate-400" />
                  {(card.likes ?? 0).toLocaleString()}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Description / Song / Tags */}
        {card.description && (
          <div className="mt-4">
            <p className="text-xs font-medium text-slate-400">Level Notes</p>
            <p className="mt-1 text-sm text-slate-200 leading-relaxed">{card.description}</p>
          </div>
        )}

        {(card.songName || (card.tags && card.tags.length > 0)) && (
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-300">
            {card.songName && (
              <span className="inline-flex items-center gap-1.5">
                <Music className="h-3.5 w-3.5 text-amber-400" />
                <span>
                  {card.songName}
                  {card.songAuthor ? ` — ${card.songAuthor}` : ''}
                </span>
              </span>
            )}
            {card.tags && card.tags.length > 0 && (
              <span className="text-slate-400">{card.tags.join(' · ')}</span>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={card.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <span>View on {card.sourceLabel.split('#')[0].trim()}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            {card.source !== 'gdbrowser' &&
              !(card.source === 'pointercrate' && card.listPosition && card.listPosition <= 10) && (
              <a
                href={card.gdbrowserUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <span>GDBrowser</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {card.videoUrl && (
              <a
                href={card.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <span>Showcase Video</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          {isOwned && onSell && (
            <button
              type="button"
              onClick={() => {
                onSell(card);
                onClose();
              }}
              className="px-3.5 py-2 text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 rounded-lg transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer"
            >
              Sell for +{card.orbValue.toLocaleString()} Orbs
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
