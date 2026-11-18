export type DifficultyTier =
  | 'auto'
  | 'easy'
  | 'normal'
  | 'hard'
  | 'harder'
  | 'insane'
  | 'easy-demon'
  | 'medium-demon'
  | 'hard-demon'
  | 'insane-demon'
  | 'extreme-demon';

export type WebsiteSource =
  | 'gdbrowser'
  | 'pointercrate'
  | 'aredl'
  | 'insanedemonlist'
  | 'pemonlist';

export type LevelRating = 'rated' | 'featured' | 'epic' | 'legendary' | 'mythic';

export type PackRatingMode = 'any' | Exclude<LevelRating, 'rated'>;

export type CardVariant = 'standard' | 'gold-holo' | 'rainbow' | 'void' | 'darkmatter';

export type PackVariantMode = 'random' | Exclude<CardVariant, 'standard'>;

export type SourceFilter = 'mixed' | WebsiteSource;

export interface GDLevelCard {
  instanceId: string;
  levelId: string;
  name: string;
  creator: string;
  verifier?: string;
  difficulty: DifficultyTier;
  difficultyLabel: string;
  stars: number;
  rating: LevelRating;
  variant?: CardVariant;
  source: WebsiteSource;
  sourceLabel: string;
  sourceUrl: string;
  gdbrowserUrl: string;
  downloads?: number;
  likes?: number;
  length?: string;
  platformer?: boolean;
  songName?: string;
  songAuthor?: string;
  description?: string;
  listPosition?: number;
  points?: number;
  tags?: string[];
  thumbnailUrl?: string;
  videoUrl?: string;
  orbValue: number;
  upgradedFrom?: DifficultyTier;
  pulledAt: number;
}

export interface PackDefinition {
  tier: DifficultyTier;
  name: string;
  difficultyLabel: string;
  stars: number;
  cost: number;
  isDemon: boolean;
  accentHex: string;
  surfaceTint: string;
  cardCount: number;
  upgradeChance: number;
  nextTier?: DifficultyTier;
  supportedSources: WebsiteSource[];
  foilImage: string;
  summary: string;
}

export interface WebsiteInfo {
  id: WebsiteSource;
  name: string;
  url: string;
  focus: string;
  supportedTiers: DifficultyTier[];
}

export interface PackOpenResponse {
  packTier: DifficultyTier;
  cards: GDLevelCard[];
  discoveryBonusOrbs: number;
}

export interface SourcesLevelsResponse {
  source: WebsiteSource;
  difficulty: DifficultyTier | 'all';
  levels: GDLevelCard[];
  totalCached: number;
}
