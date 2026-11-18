import type { CardVariant, LevelRating, PackRatingMode, PackVariantMode } from '../types/gd';

export interface VariantMeta {
  id: CardVariant;
  label: string;
  multiplier: number;
  packCostMultiplier: number;
  baseChanceLabel: string;
  accentHex: string;
  cardClass: string;
  desc: string;
}

export interface RatingMeta {
  id: LevelRating;
  label: string;
  orbMultiplier: number;
  packCostMultiplier: number;
  accentHex: string;
  desc: string;
}

export const VARIANT_ORDER: CardVariant[] = [
  'standard',
  'gold-holo',
  'rainbow',
  'void',
  'darkmatter',
];

export const GUARANTEED_VARIANTS: Array<Exclude<CardVariant, 'standard'>> = [
  'gold-holo',
  'rainbow',
  'void',
  'darkmatter',
];

export const GUARANTEED_RATINGS: Array<Exclude<LevelRating, 'rated'>> = [
  'featured',
  'epic',
  'legendary',
  'mythic',
];

export const VARIANT_META: Record<CardVariant, VariantMeta> = {
  standard: {
    id: 'standard',
    label: 'Standard',
    multiplier: 1.0,
    packCostMultiplier: 1.0,
    baseChanceLabel: '~78%',
    accentHex: '#94A3B8',
    cardClass: 'bg-[#131926] border-white/10',
    desc: 'Classic dark slate finish with standard Orb value.',
  },
  'gold-holo': {
    id: 'gold-holo',
    label: 'Gold Holo',
    multiplier: 1.75,
    packCostMultiplier: 1.5,
    baseChanceLabel: '~13%',
    accentHex: '#FBBF24',
    cardClass: 'variant-gold-holo border-amber-400/50',
    desc: 'Brushed metallic gold foil sheen across the card.',
  },
  rainbow: {
    id: 'rainbow',
    label: 'Rainbow',
    multiplier: 2.5,
    packCostMultiplier: 2.0,
    baseChanceLabel: '~5%',
    accentHex: '#38BDF8',
    cardClass: 'variant-rainbow border-sky-400/50',
    desc: 'Iridescent prismatic spectrum refraction.',
  },
  void: {
    id: 'void',
    label: 'Void',
    multiplier: 4.0,
    packCostMultiplier: 3.0,
    baseChanceLabel: '~2.5%',
    accentHex: '#A78BFA',
    cardClass: 'variant-void border-violet-400/60',
    desc: 'Abyssal singularity finish with deep violet rim.',
  },
  darkmatter: {
    id: 'darkmatter',
    label: 'Darkmatter',
    multiplier: 6.5,
    packCostMultiplier: 4.0,
    baseChanceLabel: '~1.2%',
    accentHex: '#FB7185',
    cardClass: 'variant-darkmatter border-rose-500/70',
    desc: 'Ultra-rare cosmic obsidian energy and crimson aura.',
  },
};

export const RATING_META: Record<LevelRating, RatingMeta> = {
  rated: {
    id: 'rated',
    label: 'Rated',
    orbMultiplier: 1.0,
    packCostMultiplier: 1.0,
    accentHex: '#94A3B8',
    desc: 'Standard star-rated level.',
  },
  featured: {
    id: 'featured',
    label: 'Featured',
    orbMultiplier: 1.15,
    packCostMultiplier: 1.2,
    accentHex: '#FBBF24',
    desc: 'Golden featured ring.',
  },
  epic: {
    id: 'epic',
    label: 'Epic',
    orbMultiplier: 1.4,
    packCostMultiplier: 1.6,
    accentHex: '#F97316',
    desc: 'Blazing amber flame halo.',
  },
  legendary: {
    id: 'legendary',
    label: 'Legendary',
    orbMultiplier: 1.8,
    packCostMultiplier: 2.2,
    accentHex: '#EC4899',
    desc: 'Magenta crown or Top 75 List.',
  },
  mythic: {
    id: 'mythic',
    label: 'Mythic',
    orbMultiplier: 2.5,
    packCostMultiplier: 3.0,
    accentHex: '#38BDF8',
    desc: 'Pointercrate Top 10 demon levels.',
  },
};

export function getVariantMeta(variant?: CardVariant): VariantMeta {
  return VARIANT_META[variant || 'standard'] || VARIANT_META.standard;
}

export function getRatingMeta(rating?: LevelRating): RatingMeta {
  return RATING_META[rating || 'rated'] || RATING_META.rated;
}

export const DUAL_GUARANTEE_SURGE = 1.25;

export function getPackMultiplier(
  variantMode: PackVariantMode,
  ratingMode: PackRatingMode,
): number {
  const vMult = variantMode === 'random' ? 1 : VARIANT_META[variantMode].packCostMultiplier;
  const rMult = ratingMode === 'any' ? 1 : RATING_META[ratingMode].packCostMultiplier;
  const surge = variantMode !== 'random' && ratingMode !== 'any' ? DUAL_GUARANTEE_SURGE : 1;
  return Number((vMult * rMult * surge).toFixed(2));
}

export function getPackCost(
  baseCost: number,
  variantMode: PackVariantMode,
  ratingMode: PackRatingMode = 'any',
): number {
  return Math.round(baseCost * getPackMultiplier(variantMode, ratingMode));
}
