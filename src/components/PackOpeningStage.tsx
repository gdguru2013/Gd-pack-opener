import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Eye, RotateCcw, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { GDLevelCard, PackDefinition, PackRatingMode, PackVariantMode } from '../types/gd';
import { PACK_MAP } from '../data/packs';
import { RATING_META, VARIANT_META, getVariantMeta } from '../data/variants';
import { DifficultyFace } from './DifficultyFace';
import { LevelCard } from './LevelCard';
import { soundFX } from '../utils/sound';

export type PackStagePhase = 'READY_TO_TEAR' | 'TEARING' | 'REVEALING';

interface PackOpeningStageProps {
  pack: PackDefinition;
  variantMode: PackVariantMode;
  ratingMode: PackRatingMode;
  effectiveCost: number;
  cards: GDLevelCard[];
  newCardIds: Set<string>;
  discoveryBonus: number;
  orbs: number;
  onBackToShop: () => void;
  onOpenAnother: () => void;
  onInspectCard: (card: GDLevelCard) => void;
  onSellCard: (card: GDLevelCard) => void;
  soldIds: Set<string>;
}

function isRareCard(card: GDLevelCard): boolean {
  const hasRareVariant = Boolean(card.variant && card.variant !== 'standard');
  const hasHighRating =
    card.rating === 'epic' || card.rating === 'legendary' || card.rating === 'mythic';
  const isHighDemon =
    card.difficulty === 'insane-demon' || card.difficulty === 'extreme-demon';
  const isTop10 =
    card.source === 'pointercrate' &&
    card.listPosition !== undefined &&
    card.listPosition <= 10;
  return hasRareVariant || hasHighRating || isHighDemon || Boolean(card.upgradedFrom) || isTop10;
}

function isUltraRareCard(card: GDLevelCard): boolean {
  const v = card.variant || 'standard';
  const isTop10 =
    card.source === 'pointercrate' &&
    card.listPosition !== undefined &&
    card.listPosition <= 10;
  return (
    v === 'rainbow' ||
    v === 'void' ||
    v === 'darkmatter' ||
    card.rating === 'legendary' ||
    card.rating === 'mythic' ||
    isTop10
  );
}

function getRareAccent(card: GDLevelCard): string {
  if (card.variant && card.variant !== 'standard') {
    return getVariantMeta(card.variant).accentHex;
  }
  if (card.rating === 'mythic') return '#38BDF8';
  if (card.rating === 'legendary') return '#EC4899';
  return PACK_MAP[card.difficulty]?.accentHex || '#F59E0B';
}

const BURST_SHARDS = [
  { x: -72, y: -56, rot: -35 },
  { x: 76, y: -52, rot: 40 },
  { x: -84, y: 18, rot: -65 },
  { x: 86, y: 24, rot: 55 },
  { x: -46, y: 74, rot: -20 },
  { x: 52, y: 76, rot: 25 },
];

export function PackOpeningStage({
  pack,
  variantMode,
  ratingMode,
  effectiveCost,
  cards,
  newCardIds,
  discoveryBonus,
  orbs,
  onBackToShop,
  onOpenAnother,
  onInspectCard,
  onSellCard,
  soldIds,
}: PackOpeningStageProps) {
  const [phase, setPhase] = useState<PackStagePhase>('READY_TO_TEAR');
  const [chargingIndices, setChargingIndices] = useState<Set<number>>(new Set());
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [burstIndices, setBurstIndices] = useState<Set<number>>(new Set());
  const prefersReducedMotion = useReducedMotion();
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      for (const t of timersRef.current) window.clearTimeout(t);
    };
  }, []);

  const allRevealed = revealedIndices.size >= cards.length;
  const canAffordAnother = orbs >= effectiveCost;
  const guaranteedVariantMeta = variantMode !== 'random' ? VARIANT_META[variantMode] : null;
  const guaranteedRatingMeta = ratingMode !== 'any' ? RATING_META[ratingMode] : null;
  const stageTitle = [
    guaranteedRatingMeta?.label,
    guaranteedVariantMeta?.label,
    pack.name,
  ]
    .filter(Boolean)
    .join(' ');
  const sealedBorderColor =
    guaranteedVariantMeta?.accentHex ?? guaranteedRatingMeta?.accentHex ?? pack.accentHex;
  const sealedBadgeText = [guaranteedRatingMeta?.label, guaranteedVariantMeta?.label]
    .filter(Boolean)
    .join(' · ');

  function schedule(fn: () => void, ms: number) {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  }

  function handleTearPack() {
    if (phase !== 'READY_TO_TEAR') return;
    setPhase('TEARING');
    soundFX.playPackTear();
    schedule(() => {
      setPhase('REVEALING');
    }, prefersReducedMotion ? 120 : 520);
  }

  function revealSingleCard(idx: number) {
    if (revealedIndices.has(idx) || chargingIndices.has(idx)) return;
    const card = cards[idx];
    const isDemon = card.difficulty.includes('demon');
    const isHigh =
      card.rating === 'epic' || card.rating === 'legendary' || card.rating === 'mythic';
    const isRareVariant = Boolean(card.variant && card.variant !== 'standard');
    const rare = isRareCard(card);
    const ultra = isUltraRareCard(card);

    if (!rare || prefersReducedMotion) {
      soundFX.playCardReveal(isDemon, isHigh, isRareVariant);
      setRevealedIndices((prev) => new Set(prev).add(idx));
      return;
    }

    // Play charging sound + anticipation tremor before springing open
    soundFX.playPackSelect();
    setChargingIndices((prev) => new Set(prev).add(idx));

    const chargeDuration = ultra ? 580 : 400;
    schedule(() => {
      soundFX.playCardReveal(isDemon, isHigh, isRareVariant || ultra);
      setChargingIndices((prev) => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
      setRevealedIndices((prev) => new Set(prev).add(idx));
      setBurstIndices((prev) => new Set(prev).add(idx));

      schedule(() => {
        setBurstIndices((prev) => {
          const next = new Set(prev);
          next.delete(idx);
          return next;
        });
      }, 900);
    }, chargeDuration);
  }

  function handleRevealAll() {
    cards.forEach((card, idx) => {
      if (revealedIndices.has(idx) || chargingIndices.has(idx)) return;
      const delay = isRareCard(card) && !prefersReducedMotion ? idx * 140 : 0;
      if (delay === 0) {
        revealSingleCard(idx);
      } else {
        schedule(() => revealSingleCard(idx), delay);
      }
    });
  }

  return (
    <section
      aria-label="Pack Opening Stage"
      className="rounded-xl border border-white/10 bg-[#131926] p-6 sm:p-8"
    >
      {/* Top Bar of Stage */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToShop}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Packs</span>
          </button>
          <div>
            <h2 className="font-display text-xl font-bold text-white">{stageTitle}</h2>
            <p className="text-xs text-slate-400">
              {phase === 'REVEALING'
                ? allRevealed
                  ? `All ${cards.length} levels revealed · +${discoveryBonus.toLocaleString()} Orbs new discovery bonus`
                  : 'Click each card to reveal your Geometry Dash levels'
                : 'Click the sealed booster pack to tear it open'}
            </p>
          </div>
        </div>

        {phase === 'REVEALING' && (
          <div className="flex items-center gap-2.5">
            {!allRevealed ? (
              <button
                type="button"
                onClick={handleRevealAll}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Eye className="h-4 w-4" />
                <span>Reveal All</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={!canAffordAnother}
                onClick={onOpenAnother}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
                  canAffordAnother
                    ? 'text-slate-950 bg-amber-500 hover:bg-amber-400'
                    : 'text-slate-400 bg-white/5 border border-white/10 cursor-not-allowed'
                }`}
              >
                <RotateCcw className="h-4 w-4" />
                <span>Open Another ({effectiveCost.toLocaleString()} Orbs)</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Phase 1 & 2: Sealed Booster Pack */}
      {phase !== 'REVEALING' && (
        <div className="py-12 flex flex-col items-center justify-center">
            <button
            type="button"
            onClick={handleTearPack}
            className={`group relative w-64 aspect-[3/4] rounded-2xl border-2 overflow-hidden transition-transform duration-200 focus-visible:outline-2 focus-visible:outline-amber-400 cursor-pointer ${
              guaranteedVariantMeta || guaranteedRatingMeta ? 'variant-shimmer ' : ''
            }${phase === 'TEARING' ? 'animate-pack-shake scale-105' : 'hover:scale-105'}`}
            style={{
              borderColor: sealedBorderColor,
              boxShadow: `0 24px 48px -12px ${sealedBorderColor}55`,
            }}
          >
            <img
              src={pack.foilImage}
              alt={stageTitle}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40" />
            <div className="absolute inset-0 flex flex-col items-center justify-between p-6 text-center">
              <span
                className="text-xs font-semibold tracking-wide"
                style={{
                  color:
                    guaranteedRatingMeta?.accentHex ??
                    guaranteedVariantMeta?.accentHex ??
                    '#FCD34D',
                }}
              >
                {sealedBadgeText
                  ? `Guaranteed ${sealedBadgeText} · 3 Levels`
                  : `${pack.stars} ${pack.stars === 1 ? 'Star' : 'Stars'} · 3 Levels`}
              </span>
              <DifficultyFace
                difficulty={pack.tier}
                rating={guaranteedRatingMeta?.id ?? (pack.isDemon ? 'mythic' : 'epic')}
                size={104}
                className="drop-shadow-2xl"
              />
              <div>
                <p className="font-display text-xl font-extrabold text-white">{stageTitle}</p>
                <p className="mt-1 text-xs font-medium text-slate-300">
                  {phase === 'TEARING' ? 'Opening...' : 'Click to Open Pack'}
                </p>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Phase 3: 3-Card Reveal Grid */}
      {phase === 'REVEALING' && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          {cards.map((card, idx) => {
            const isRevealed = revealedIndices.has(idx);
            const isCharging = chargingIndices.has(idx);
            const isBursting = burstIndices.has(idx);
            const isSold = soldIds.has(card.instanceId);
            const isNew = newCardIds.has(`${card.levelId}:${card.variant || 'standard'}:${card.rating}`);
            const variantMeta = getVariantMeta(card.variant);
            const isRareVariant = variantMeta.id !== 'standard';
            const rare = isRareCard(card);
            const ultra = isUltraRareCard(card);
            const accentHex = getRareAccent(card);

            if (!isRevealed) {
              return (
                <button
                  key={card.instanceId}
                  type="button"
                  onClick={() => revealSingleCard(idx)}
                  className={`group relative flex flex-col items-center justify-center min-h-[280px] rounded-xl border p-6 text-center transition-all duration-200 cursor-pointer ${
                    isCharging
                      ? 'animate-rare-charge'
                      : 'hover:-translate-y-1'
                  } ${
                    isRareVariant
                      ? `${variantMeta.cardClass} variant-shimmer hover:border-white/50`
                      : 'border-white/15 bg-[#0B0F17] hover:border-amber-400/60'
                  }`}
                  style={
                    isCharging
                      ? {
                          borderColor: accentHex,
                          boxShadow: `0 0 36px -4px ${accentHex}`,
                        }
                      : undefined
                  }
                >
                  {/* Expanding Energy Ring while charging rare card */}
                  {isCharging && (
                    <motion.span
                      aria-hidden="true"
                      initial={{ scale: 0.7, opacity: 0.9 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 0.45, repeat: Infinity }}
                      className="pointer-events-none absolute inset-4 rounded-xl border-2"
                      style={{ borderColor: accentHex }}
                    />
                  )}

                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10"
                    style={{ backgroundColor: pack.surfaceTint }}
                  >
                    <DifficultyFace difficulty={card.difficulty} rating={card.rating} size={56} />
                  </div>
                  <p className="mt-5 font-display text-lg font-bold text-white">
                    {isCharging
                      ? 'Unlocking Rare Pull...'
                      : isRareVariant
                        ? `${variantMeta.label} Pull`
                        : rare
                          ? 'Rare Level Pull'
                          : `Card ${idx + 1} Ready`}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {card.difficultyLabel} · {card.sourceLabel.split('#')[0].trim()}
                  </p>
                  {isRareVariant && (
                    <span
                      className="mt-2 text-xs font-semibold"
                      style={{ color: variantMeta.accentHex }}
                    >
                      {variantMeta.multiplier}x Orb Finish
                    </span>
                  )}
                  {card.upgradedFrom && (
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-300">
                      <Sparkles className="h-3.5 w-3.5" />
                      Rarity Upgrade!
                    </span>
                  )}
                  <span className="mt-5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 group-hover:bg-amber-400 rounded-lg transition-colors">
                    {isCharging ? 'Revealing...' : 'Reveal Level'}
                  </span>
                </button>
              );
            }

            return (
              <div key={card.instanceId} className="relative">
                {/* Shockwave & Geometric Shards on Rare Reveal */}
                {isBursting && !prefersReducedMotion && (
                  <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                    <motion.div
                      initial={{ scale: 0.55, opacity: 0.95 }}
                      animate={{ scale: ultra ? 1.38 : 1.22, opacity: 0 }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-0 rounded-xl border-2"
                      style={{
                        borderColor: accentHex,
                        boxShadow: `0 0 32px ${accentHex}`,
                      }}
                    />
                    {BURST_SHARDS.map((shard, sIdx) => (
                      <motion.span
                        key={sIdx}
                        initial={{ x: 0, y: 0, scale: 0.4, opacity: 1, rotate: 0 }}
                        animate={{
                          x: shard.x * (ultra ? 1.35 : 1),
                          y: shard.y * (ultra ? 1.35 : 1),
                          scale: ultra ? 1.15 : 0.9,
                          opacity: 0,
                          rotate: shard.rot,
                        }}
                        transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute h-3 w-3 rotate-45 rounded-[2px]"
                        style={{
                          backgroundColor: accentHex,
                          boxShadow: `0 0 12px ${accentHex}`,
                        }}
                      />
                    ))}
                  </div>
                )}

                <motion.div
                  initial={
                    prefersReducedMotion
                      ? false
                      : rare
                        ? { opacity: 0, scale: 0.84, rotateY: 70 }
                        : { opacity: 0, scale: 0.95, y: 8 }
                  }
                  animate={{ opacity: 1, scale: 1, rotateY: 0, y: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: rare ? 260 : 360,
                    damping: rare ? 18 : 26,
                  }}
                  className={isSold ? 'opacity-50' : ''}
                >
                  <LevelCard
                    card={card}
                    isNew={isNew}
                    onInspect={onInspectCard}
                    onSell={!isSold ? onSellCard : undefined}
                  />
                  {isSold && (
                    <p className="mt-2 text-center text-xs text-amber-300 font-medium tabular-nums">
                      Sold for +{card.orbValue.toLocaleString()} Orbs
                    </p>
                  )}
                </motion.div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
