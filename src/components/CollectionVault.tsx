import { useMemo, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import type {
  CardVariant,
  DifficultyTier,
  GDLevelCard,
  LevelRating,
  WebsiteSource,
} from '../types/gd';
import { DIFFICULTY_ORDER, PACK_MAP, WEBSITE_LABELS } from '../data/packs';
import { RATING_META, VARIANT_META, VARIANT_ORDER } from '../data/variants';
import { LevelCard } from './LevelCard';

interface CollectionVaultProps {
  cards: GDLevelCard[];
  onInspectCard: (card: GDLevelCard) => void;
  onSellCard: (card: GDLevelCard) => void;
  onSellDuplicates: () => void;
  onGoToPacks: () => void;
}

type SortMode = 'newest' | 'rarity-desc' | 'variant-desc' | 'value-desc' | 'stars-desc';

const RATING_FILTER_OPTIONS: LevelRating[] = [
  'rated',
  'featured',
  'epic',
  'legendary',
  'mythic',
];

export function CollectionVault({
  cards,
  onInspectCard,
  onSellCard,
  onSellDuplicates,
  onGoToPacks,
}: CollectionVaultProps) {
  const [search, setSearch] = useState('');
  const [diffFilter, setDiffFilter] = useState<DifficultyTier | 'all'>('all');
  const [variantFilter, setVariantFilter] = useState<CardVariant | 'all'>('all');
  const [ratingFilter, setRatingFilter] = useState<LevelRating | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<WebsiteSource | 'all'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');

  const duplicateCount = useMemo(() => {
    const seen = new Set<string>();
    let dupes = 0;
    for (const card of cards) {
      const key = `${card.levelId}:${card.variant || 'standard'}:${card.rating}`;
      if (seen.has(key)) dupes++;
      else seen.add(key);
    }
    return dupes;
  }, [cards]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = cards.filter((card) => {
      const cardVariant = card.variant || 'standard';
      if (diffFilter !== 'all' && card.difficulty !== diffFilter) return false;
      if (variantFilter !== 'all' && cardVariant !== variantFilter) return false;
      if (ratingFilter !== 'all' && card.rating !== ratingFilter) return false;
      if (sourceFilter !== 'all' && card.source !== sourceFilter) return false;
      if (q) {
        const match =
          card.name.toLowerCase().includes(q) ||
          card.creator.toLowerCase().includes(q) ||
          card.levelId.includes(q) ||
          (card.verifier && card.verifier.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortMode === 'newest') return b.pulledAt - a.pulledAt;
      if (sortMode === 'value-desc') return b.orbValue - a.orbValue;
      if (sortMode === 'stars-desc') return b.stars - a.stars;
      if (sortMode === 'variant-desc') {
        return (
          VARIANT_ORDER.indexOf(b.variant || 'standard') -
          VARIANT_ORDER.indexOf(a.variant || 'standard')
        );
      }
      return DIFFICULTY_ORDER.indexOf(b.difficulty) - DIFFICULTY_ORDER.indexOf(a.difficulty);
    });
  }, [cards, diffFilter, variantFilter, ratingFilter, sourceFilter, search, sortMode]);

  if (cards.length === 0) {
    return (
      <section className="rounded-xl border border-white/10 bg-[#131926] p-10 text-center">
        <h2 className="font-display text-2xl font-bold text-white">Your Collection is Empty</h2>
        <p className="mt-2 max-w-md mx-auto text-sm text-slate-400">
          Open your first Geometry Dash pack to start collecting real levels from GDBrowser,
          Pointercrate, AREDL, Insane Demon List, and Pemonlist.
        </p>
        <button
          type="button"
          onClick={onGoToPacks}
          className="mt-6 px-5 py-2.5 text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors cursor-pointer"
        >
          Open First Pack
        </button>
      </section>
    );
  }

  return (
    <section aria-label="Level Collection">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-white/8">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">
            Collected Levels
          </h2>
          <p className="mt-1 text-sm text-slate-400 tabular-nums">
            {cards.length} total cards · {duplicateCount} exact duplicates available to sell
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {duplicateCount > 0 && (
            <button
              type="button"
              onClick={onSellDuplicates}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Sell {duplicateCount} Duplicates</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters Row */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search level name, creator, or ID..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#131926] border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={diffFilter}
          onChange={(e) => setDiffFilter(e.target.value as DifficultyTier | 'all')}
          aria-label="Filter by difficulty"
          className="px-3 py-2 text-sm bg-[#131926] border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
        >
          <option value="all">All Difficulties</option>
          {DIFFICULTY_ORDER.map((tier) => (
            <option key={tier} value={tier}>
              {PACK_MAP[tier].difficultyLabel}
            </option>
          ))}
        </select>

        <select
          value={variantFilter}
          onChange={(e) => setVariantFilter(e.target.value as CardVariant | 'all')}
          aria-label="Filter by variant"
          className="px-3 py-2 text-sm bg-[#131926] border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
        >
          <option value="all">All Variants</option>
          {VARIANT_ORDER.map((v) => (
            <option key={v} value={v}>
              {VARIANT_META[v].label}
            </option>
          ))}
        </select>

        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value as LevelRating | 'all')}
          aria-label="Filter by rating"
          className="px-3 py-2 text-sm bg-[#131926] border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
        >
          <option value="all">All Ratings</option>
          {RATING_FILTER_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {RATING_META[r].label}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as WebsiteSource | 'all')}
            aria-label="Filter by website source"
            className="flex-1 min-w-0 px-3 py-2 text-sm bg-[#131926] border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Sites</option>
            {(Object.keys(WEBSITE_LABELS) as WebsiteSource[]).map((src) => (
              <option key={src} value={src}>
                {WEBSITE_LABELS[src]}
              </option>
            ))}
          </select>

          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            aria-label="Sort collection"
            className="px-3 py-2 text-sm bg-[#131926] border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="newest">Newest</option>
            <option value="variant-desc">Rarest Variant</option>
            <option value="rarity-desc">Rarest Face</option>
            <option value="value-desc">Orb Value</option>
            <option value="stars-desc">Stars</option>
          </select>
        </div>
      </div>

      {/* Results Grid */}
      {filtered.length === 0 ? (
        <div className="mt-8 rounded-xl border border-white/10 bg-[#131926] p-8 text-center">
          <p className="text-sm text-slate-400">No collected levels match your current filters.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((card) => (
            <LevelCard
              key={card.instanceId}
              card={card}
              onInspect={onInspectCard}
              onSell={onSellCard}
            />
          ))}
        </div>
      )}
    </section>
  );
}
