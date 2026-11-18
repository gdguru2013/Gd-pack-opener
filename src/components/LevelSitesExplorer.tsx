import { useEffect, useState } from 'react';
import { ExternalLink, Search, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import type { DifficultyTier, GDLevelCard, SourcesLevelsResponse, WebsiteSource } from '../types/gd';
import { DIFFICULTY_ORDER, PACK_MAP, WEBSITE_DIRECTORY } from '../data/packs';
import { LevelCard } from './LevelCard';

interface LevelSitesExplorerProps {
  ownedLevelIds: Set<string>;
  onInspectCard: (card: GDLevelCard) => void;
  onJumpToPack: (tier: DifficultyTier) => void;
}

export function LevelSitesExplorer({
  ownedLevelIds,
  onInspectCard,
  onJumpToPack,
}: LevelSitesExplorerProps) {
  const [selectedSite, setSelectedSite] = useState<WebsiteSource>('gdbrowser');
  const [difficulty, setDifficulty] = useState<DifficultyTier | 'all'>('easy-demon');
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [levels, setLevels] = useState<GDLevelCard[]>([]);
  const [totalCached, setTotalCached] = useState(0);

  const siteInfo = WEBSITE_DIRECTORY.find((s) => s.id === selectedSite)!;

  useEffect(() => {
    // Keep difficulty aligned when switching to single-tier sites
    if (selectedSite === 'pointercrate' || selectedSite === 'aredl') {
      setDifficulty('extreme-demon');
    } else if (selectedSite === 'insanedemonlist') {
      setDifficulty('insane-demon');
    } else if (selectedSite === 'pemonlist') {
      setDifficulty('all');
    } else if (difficulty === 'all') {
      setDifficulty('easy-demon');
    }
    setPage(0);
  }, [selectedSite]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          source: selectedSite,
          difficulty,
          search: activeSearch,
          page: String(page),
        });
        const res = await fetch(`/api/sources/levels?${params.toString()}`);
        if (!res.ok) throw new Error('Unable to reach Geometry Dash level website.');
        const data = (await res.json()) as SourcesLevelsResponse;
        if (!cancelled) {
          setLevels(data.levels);
          setTotalCached(data.totalCached);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load levels.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedSite, difficulty, activeSearch, page]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    setActiveSearch(searchInput.trim());
  }

  return (
    <section aria-label="Geometry Dash Level Websites">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pb-6 border-b border-white/8">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">
            Connected Geometry Dash Websites
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Browse live levels directly from five real Geometry Dash community databases.
          </p>
        </div>

        <a
          href={siteInfo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:text-white bg-[#131926] border border-white/10 hover:border-white/25 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <span>Visit {siteInfo.name}</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Website Tabs */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {WEBSITE_DIRECTORY.map((site) => {
          const active = selectedSite === site.id;
          return (
            <button
              key={site.id}
              type="button"
              onClick={() => setSelectedSite(site.id)}
              className={`text-left p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
                active
                  ? 'bg-[#192132] border-amber-500/70'
                  : 'bg-[#131926] border-white/10 hover:border-white/25'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-base font-bold text-white whitespace-nowrap">
                  {site.name}
                </span>
                {active && (
                  <span className="text-[11px] font-semibold text-amber-400 whitespace-nowrap">
                    Active
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {site.focus}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={`Search levels on ${siteInfo.name}...`}
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#131926] border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <select
            value={difficulty}
            onChange={(e) => {
              setPage(0);
              setDifficulty(e.target.value as DifficultyTier | 'all');
            }}
            aria-label="Filter website difficulty"
            className="px-3 py-2 text-sm bg-[#131926] border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
          >
            {selectedSite !== 'gdbrowser' && <option value="all">All Site Difficulties</option>}
            {DIFFICULTY_ORDER.filter((t) => siteInfo.supportedTiers.includes(t)).map((tier) => (
              <option key={tier} value={tier}>
                {PACK_MAP[tier].difficultyLabel}
              </option>
            ))}
          </select>

          {difficulty !== 'all' && (
            <button
              type="button"
              onClick={() => onJumpToPack(difficulty)}
              className="px-3.5 py-2 text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Open {PACK_MAP[difficulty].difficultyLabel} Pack
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-52 rounded-xl border border-white/8 bg-[#131926] animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      ) : levels.length === 0 ? (
        <div className="mt-6 rounded-xl border border-white/10 bg-[#131926] p-8 text-center">
          <p className="text-sm text-slate-400">
            No levels found for that query on {siteInfo.name}.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {levels.map((level) => {
              const owned = ownedLevelIds.has(level.levelId);
              return (
                <div key={`${level.source}-${level.levelId}`} className="relative">
                  <LevelCard card={level} onInspect={onInspectCard} />
                  {owned && (
                    <div className="mt-1.5 flex items-center gap-1 text-xs font-medium text-emerald-400 px-1">
                      <Check className="h-3.5 w-3.5" />
                      <span>Collected in your vault</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/8">
            <span className="text-xs text-slate-400 tabular-nums">
              Page {page + 1} · {totalCached > 0 ? `${totalCached} levels indexed` : `${levels.length} shown`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-200 bg-[#131926] border border-white/10 rounded-lg disabled:opacity-40 hover:border-white/25 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>
              <button
                type="button"
                disabled={levels.length < 20}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-200 bg-[#131926] border border-white/10 rounded-lg disabled:opacity-40 hover:border-white/25 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
