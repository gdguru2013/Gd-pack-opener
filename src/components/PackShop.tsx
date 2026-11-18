import { Star, Globe, Sparkles, Crown } from 'lucide-react';
import type {
  DifficultyTier,
  PackDefinition,
  PackRatingMode,
  PackVariantMode,
  SourceFilter,
} from '../types/gd';
import { PACK_DEFINITIONS, WEBSITE_LABELS } from '../data/packs';
import {
  DUAL_GUARANTEE_SURGE,
  GUARANTEED_RATINGS,
  GUARANTEED_VARIANTS,
  RATING_META,
  VARIANT_META,
  getPackCost,
  getPackMultiplier,
} from '../data/variants';
import { DifficultyFace } from './DifficultyFace';

interface PackShopProps {
  orbs: number;
  sourceFilter: SourceFilter;
  onChangeSourceFilter: (next: SourceFilter) => void;
  variantMode: PackVariantMode;
  onChangeVariantMode: (next: PackVariantMode) => void;
  ratingMode: PackRatingMode;
  onChangeRatingMode: (next: PackRatingMode) => void;
  onSelectPack: (pack: PackDefinition) => void;
  openingTier: DifficultyTier | null;
}

const SOURCE_OPTIONS: Array<{ id: SourceFilter; label: string }> = [
  { id: 'mixed', label: 'All Websites' },
  { id: 'gdbrowser', label: 'GDBrowser' },
  { id: 'pointercrate', label: 'Pointercrate' },
  { id: 'aredl', label: 'AREDL' },
  { id: 'insanedemonlist', label: 'Insane Demon List' },
  { id: 'pemonlist', label: 'Pemonlist' },
];

export function PackShop({
  orbs,
  sourceFilter,
  onChangeSourceFilter,
  variantMode,
  onChangeVariantMode,
  ratingMode,
  onChangeRatingMode,
  onSelectPack,
  openingTier,
}: PackShopProps) {
  const visiblePacks = PACK_DEFINITIONS.filter((pack) => {
    if (sourceFilter === 'mixed') return true;
    return pack.supportedSources.includes(sourceFilter);
  });

  const activeVariantMeta = variantMode !== 'random' ? VARIANT_META[variantMode] : null;
  const activeRatingMeta = ratingMode !== 'any' ? RATING_META[ratingMode] : null;
  const totalMultiplier = getPackMultiplier(variantMode, ratingMode);
  const bothGuaranteed = Boolean(activeVariantMeta && activeRatingMeta);

  return (
    <section aria-label="Pack Shop">
      {/* Workspace Toolbar: Header + Source + Guaranteed Variant & Rating Selectors */}
      <div className="flex flex-col gap-3.5 pb-6 border-b border-white/8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-white">
              Difficulty Packs
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {bothGuaranteed && activeVariantMeta && activeRatingMeta
                ? `Dual Guarantee: ${activeRatingMeta.label} + ${activeVariantMeta.label} (${totalMultiplier}x cost, includes ${DUAL_GUARANTEE_SURGE}x combo surge).`
                : activeVariantMeta
                  ? `Guaranteed ${activeVariantMeta.label} Edition (${totalMultiplier}x pack cost) · Every pulled card is ${activeVariantMeta.label}.`
                  : activeRatingMeta
                    ? `Guaranteed ${activeRatingMeta.label} Rating (${totalMultiplier}x pack cost) · Every pulled card is ${activeRatingMeta.label}.`
                    : 'Pack cost scales with Geometry Dash difficulty rarity. Combine Variant and Rating guarantees for prestige packs.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#131926] border border-white/10 rounded-lg">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-400 whitespace-nowrap shrink-0">
              <Globe className="h-3.5 w-3.5" />
              Source:
            </span>
            {SOURCE_OPTIONS.map((opt) => {
              const active = sourceFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeSourceFilter(opt.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Guaranteed Variant Finish Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#131926] border border-white/10 rounded-lg">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-400 whitespace-nowrap shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Variant:
            </span>
            <button
              type="button"
              onClick={() => onChangeVariantMode('random')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                variantMode === 'random'
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Random (1x)
            </button>
            {GUARANTEED_VARIANTS.map((vId) => {
              const meta = VARIANT_META[vId];
              const active = variantMode === vId;
              return (
                <button
                  key={vId}
                  type="button"
                  onClick={() => onChangeVariantMode(vId)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
                    active
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{meta.label}</span>
                  <span className={active ? 'ml-1 text-slate-900' : 'ml-1 text-slate-400'}>
                    ({meta.packCostMultiplier}x)
                  </span>
                </button>
              );
            })}
          </div>

          {/* Guaranteed Rating Halo Selector (Featured -> Prismatic) */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#131926] border border-white/10 rounded-lg">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-400 whitespace-nowrap shrink-0">
              <Crown className="h-3.5 w-3.5 text-teal-400" />
              Rating:
            </span>
            <button
              type="button"
              onClick={() => onChangeRatingMode('any')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                ratingMode === 'any'
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Any (1x)
            </button>
            {GUARANTEED_RATINGS.map((rId) => {
              const meta = RATING_META[rId];
              const active = ratingMode === rId;
              return (
                <button
                  key={rId}
                  type="button"
                  onClick={() => onChangeRatingMode(rId)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
                    active
                      ? 'bg-teal-400 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{meta.label}</span>
                  <span className={active ? 'ml-1 text-slate-900' : 'ml-1 text-slate-400'}>
                    ({meta.packCostMultiplier}x)
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pack Grid */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {visiblePacks.map((pack) => {
          const effectiveCost = getPackCost(pack.cost, variantMode, ratingMode);
          const canAfford = orbs >= effectiveCost;
          const isOpening = openingTier === pack.tier;
          const sourceNames = pack.supportedSources.map((s) => WEBSITE_LABELS[s]).join(' · ');
          const faceRating =
            activeRatingMeta?.id ?? (pack.isDemon ? 'epic' : 'featured');

          const editionName = [
            activeRatingMeta?.label,
            activeVariantMeta?.label,
            activeRatingMeta || activeVariantMeta ? pack.difficultyLabel : pack.name,
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div
              key={pack.tier}
              className={`group relative flex flex-col justify-between rounded-xl border p-5 transition-all duration-200 hover:border-white/35 ${
                activeVariantMeta
                  ? `${activeVariantMeta.cardClass} variant-shimmer`
                  : 'border-white/10 bg-[#131926] hover:border-white/25'
              }`}
              style={
                !activeVariantMeta && activeRatingMeta
                  ? {
                      borderColor: `${activeRatingMeta.accentHex}70`,
                      boxShadow: `0 12px 30px -14px ${activeRatingMeta.accentHex}55`,
                    }
                  : undefined
              }
            >
              <div>
                {/* Top Meta Line */}
                <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1 text-amber-300 font-medium tabular-nums">
                    <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                    {pack.stars} {pack.stars === 1 ? 'Star' : 'Stars'}
                  </span>
                  <span
                    className="tabular-nums font-medium truncate"
                    style={{
                      color: activeRatingMeta?.accentHex ?? activeVariantMeta?.accentHex,
                    }}
                  >
                    {bothGuaranteed
                      ? `${totalMultiplier}x Combo`
                      : activeRatingMeta
                        ? `100% ${activeRatingMeta.label}`
                        : activeVariantMeta
                          ? `100% ${activeVariantMeta.label}`
                          : pack.upgradeChance > 0
                            ? `${Math.round(pack.upgradeChance * 100)}% Upgrade`
                            : 'Top Tier'}
                  </span>
                </div>

                {/* Foil Pack Thumbnail + Difficulty Face */}
                <div className="mt-4 relative flex items-center justify-center rounded-lg border border-white/8 bg-[#0B0F17] py-5 overflow-hidden">
                  <img
                    src={pack.foilImage}
                    alt={`${editionName} foil artwork`}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 h-full w-full object-cover opacity-35 transition-transform duration-300 group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `radial-gradient(circle at center, ${pack.surfaceTint} 0%, rgba(11,15,23,0.88) 78%)`,
                    }}
                  />
                  <div className="relative z-10 flex flex-col items-center">
                    <DifficultyFace
                      difficulty={pack.tier}
                      rating={faceRating}
                      size={74}
                      className="drop-shadow-lg transition-transform duration-200 group-hover:scale-105"
                    />
                  </div>
                </div>

                {/* Title & Summary */}
                <div className="mt-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-display text-lg font-bold text-white truncate">
                      {editionName}
                    </h3>
                    <span
                      className="text-xs font-semibold whitespace-nowrap shrink-0"
                      style={{ color: pack.accentHex }}
                    >
                      {pack.difficultyLabel}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400 line-clamp-2">
                    {bothGuaranteed && activeRatingMeta && activeVariantMeta
                      ? `3 guaranteed ${activeRatingMeta.label} ${activeVariantMeta.label} levels (${totalMultiplier}x pack multiplier).`
                      : activeRatingMeta
                        ? `3 guaranteed ${activeRatingMeta.label} levels (${activeRatingMeta.orbMultiplier}x Orb value) from ${pack.difficultyLabel} pools.`
                        : activeVariantMeta
                          ? `3 guaranteed ${activeVariantMeta.label} levels (${activeVariantMeta.multiplier}x Orb value) from ${pack.difficultyLabel} pools.`
                          : pack.summary}
                  </p>
                  <p className="mt-2.5 text-[11px] text-slate-500 truncate" title={sourceNames}>
                    Sites: {sourceNames}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3 border-t border-white/8">
                <button
                  type="button"
                  disabled={!canAfford || openingTier !== null}
                  onClick={() => onSelectPack(pack)}
                  className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-150 flex items-center justify-between whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
                    canAfford
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                      : 'bg-white/5 text-slate-400 cursor-not-allowed border border-white/8'
                  }`}
                >
                  <span>
                    {isOpening
                      ? 'Opening...'
                      : canAfford
                        ? 'Open Pack'
                        : `Need ${(effectiveCost - orbs).toLocaleString()} Orbs`}
                  </span>
                  <span className="font-mono font-bold">
                    {effectiveCost.toLocaleString()} Orbs
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
