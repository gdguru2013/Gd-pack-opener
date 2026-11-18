import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  CardVariant,
  DifficultyTier,
  GDLevelCard,
  LevelRating,
  SourceFilter,
  WebsiteSource,
} from './src/types/gd.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const CACHE_TTL_MS = 15 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

const gdbCache = new Map<string, CacheEntry<GDLevelCard[]>>();
let pointercrateCache: CacheEntry<GDLevelCard[]> | null = null;
let aredlCache: CacheEntry<GDLevelCard[]> | null = null;
let idlCache: CacheEntry<GDLevelCard[]> | null = null;
let pemonlistCache: CacheEntry<GDLevelCard[]> | null = null;

const DIFFICULTY_BASE_VALUE: Record<DifficultyTier, number> = {
  auto: 30,
  easy: 45,
  normal: 75,
  hard: 120,
  harder: 195,
  insane: 300,
  'easy-demon': 480,
  'medium-demon': 720,
  'hard-demon': 1100,
  'insane-demon': 1700,
  'extreme-demon': 2800,
};

const RATING_MULTIPLIER: Record<LevelRating, number> = {
  rated: 1.0,
  featured: 1.15,
  epic: 1.4,
  legendary: 1.8,
  mythic: 2.5,
};

const VARIANT_MULTIPLIER: Record<CardVariant, number> = {
  standard: 1.0,
  'gold-holo': 1.75,
  rainbow: 2.5,
  void: 4.0,
  darkmatter: 6.5,
};

function rollCardVariant(tier: DifficultyTier): CardVariant {
  const isDemon = tier.includes('demon');
  const isTopDemon = tier === 'insane-demon' || tier === 'extreme-demon';
  const r = Math.random();

  const darkmatterOdds = isTopDemon ? 0.022 : isDemon ? 0.015 : 0.01;
  const voidOdds = isTopDemon ? 0.042 : isDemon ? 0.032 : 0.022;
  const rainbowOdds = isTopDemon ? 0.075 : isDemon ? 0.06 : 0.048;
  const goldHoloOdds = isTopDemon ? 0.16 : isDemon ? 0.145 : 0.13;

  if (r < darkmatterOdds) return 'darkmatter';
  if (r < darkmatterOdds + voidOdds) return 'void';
  if (r < darkmatterOdds + voidOdds + rainbowOdds) return 'rainbow';
  if (r < darkmatterOdds + voidOdds + rainbowOdds + goldHoloOdds) return 'gold-holo';
  return 'standard';
}

const DIFFICULTY_LABELS: Record<DifficultyTier, string> = {
  auto: 'Auto',
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  harder: 'Harder',
  insane: 'Insane',
  'easy-demon': 'Easy Demon',
  'medium-demon': 'Medium Demon',
  'hard-demon': 'Hard Demon',
  'insane-demon': 'Insane Demon',
  'extreme-demon': 'Extreme Demon',
};

const DIFFICULTY_STARS: Record<DifficultyTier, number> = {
  auto: 1,
  easy: 2,
  normal: 3,
  hard: 4,
  harder: 6,
  insane: 8,
  'easy-demon': 10,
  'medium-demon': 10,
  'hard-demon': 10,
  'insane-demon': 10,
  'extreme-demon': 10,
};

const NEXT_TIER: Partial<Record<DifficultyTier, DifficultyTier>> = {
  auto: 'easy',
  easy: 'normal',
  normal: 'hard',
  hard: 'harder',
  harder: 'insane',
  insane: 'easy-demon',
  'easy-demon': 'medium-demon',
  'medium-demon': 'hard-demon',
  'hard-demon': 'insane-demon',
  'insane-demon': 'extreme-demon',
};

function computeOrbValue(tier: DifficultyTier, rating: LevelRating, listPosition?: number): number {
  const base = DIFFICULTY_BASE_VALUE[tier];
  const mult = RATING_MULTIPLIER[rating];
  let listBonus = 0;
  if (listPosition && listPosition <= 150) {
    listBonus = Math.round((151 - listPosition) * 8);
  }
  return Math.round(base * mult + listBonus);
}

function makeInstanceId(levelId: string, source: WebsiteSource): string {
  return `${source}-${levelId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'DashPacks/1.0 (Geometry Dash Level Collector)',
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${url}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function mapGdbDifficulty(rawDiff: string | undefined, fallback: DifficultyTier): DifficultyTier {
  const norm = (rawDiff || '').toLowerCase().trim();
  if (norm === 'auto') return 'auto';
  if (norm === 'easy') return 'easy';
  if (norm === 'normal') return 'normal';
  if (norm === 'hard') return 'hard';
  if (norm === 'harder') return 'harder';
  if (norm === 'insane') return 'insane';
  if (norm === 'easy demon') return 'easy-demon';
  if (norm === 'medium demon') return 'medium-demon';
  if (norm === 'hard demon') return 'hard-demon';
  if (norm === 'insane demon') return 'insane-demon';
  if (norm === 'extreme demon') return 'extreme-demon';
  return fallback;
}

function mapGdbRating(item: Record<string, unknown>): LevelRating {
  if (item.mythic || item.legendary) return 'legendary';
  if (item.epic) return 'epic';
  if (item.featured) return 'featured';
  return 'rated';
}

function getGdbQueryParams(tier: DifficultyTier): string {
  switch (tier) {
    case 'auto':
      return 'diff=-3';
    case 'easy':
      return 'diff=1';
    case 'normal':
      return 'diff=2';
    case 'hard':
      return 'diff=3';
    case 'harder':
      return 'diff=4';
    case 'insane':
      return 'diff=5';
    case 'easy-demon':
      return 'diff=-2&demonFilter=1';
    case 'medium-demon':
      return 'diff=-2&demonFilter=2';
    case 'hard-demon':
      return 'diff=-2&demonFilter=3';
    case 'insane-demon':
      return 'diff=-2&demonFilter=4';
    case 'extreme-demon':
      return 'diff=-2&demonFilter=5';
  }
}

async function getPointercrateTop10Filter(): Promise<{ ids: Set<string>; names: Set<string> }> {
  const pc = pointercrateCache?.data?.length
    ? pointercrateCache.data
    : await fetchPointercratePool();
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const level of pc) {
    if (level.listPosition !== undefined && level.listPosition <= 10) {
      ids.add(level.levelId);
      names.add(level.name.toLowerCase().trim());
    }
  }
  return { ids, names };
}

async function fetchGDBrowserPool(tier: DifficultyTier, page = 0, search = ''): Promise<GDLevelCard[]> {
  const trimmedSearch = search.trim();
  const cacheKey = `${tier}:${page}:${trimmedSearch.toLowerCase()}`;
  const cached = gdbCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const queryText = trimmedSearch ? encodeURIComponent(trimmedSearch) : '*';
  const diffParams = getGdbQueryParams(tier);
  const url = `https://gdbrowser.com/api/search/${queryText}?${diffParams}&count=25&page=${page}`;

  try {
    const [raw, top10] = await Promise.all([
      fetchJsonWithTimeout<Array<Record<string, unknown>>>(url),
      tier === 'extreme-demon' || trimmedSearch.length > 0
        ? getPointercrateTop10Filter()
        : Promise.resolve({ ids: new Set<string>(), names: new Set<string>() }),
    ]);
    if (!Array.isArray(raw)) return [];

    const mapped: GDLevelCard[] = raw
      .filter((item) => {
        if (!item || !item.id || !item.name) return false;
        const levelId = String(item.id);
        const levelName = String(item.name).toLowerCase().trim();
        if (top10.ids.has(levelId) || top10.names.has(levelName)) {
          return false;
        }
        return true;
      })
      .map((item) => {
        const diff = mapGdbDifficulty(String(item.difficulty || ''), tier);
        const rating = mapGdbRating(item);
        const levelId = String(item.id);
        return {
          instanceId: makeInstanceId(levelId, 'gdbrowser'),
          levelId,
          name: String(item.name),
          creator: String(item.author || 'Unknown'),
          difficulty: diff,
          difficultyLabel: DIFFICULTY_LABELS[diff],
          stars: Number(item.stars) || DIFFICULTY_STARS[diff],
          rating,
          source: 'gdbrowser',
          sourceLabel: 'GDBrowser',
          sourceUrl: `https://gdbrowser.com/${levelId}`,
          gdbrowserUrl: `https://gdbrowser.com/${levelId}`,
          downloads: Number(item.downloads) || 0,
          likes: Number(item.likes) || 0,
          length: String(item.length || 'Long'),
          platformer: Boolean(item.platformer),
          songName: item.songName ? String(item.songName) : undefined,
          songAuthor: item.songAuthor ? String(item.songAuthor) : undefined,
          description: item.description ? String(item.description) : undefined,
          orbValue: computeOrbValue(diff, rating),
          pulledAt: Date.now(),
        };
      });

    gdbCache.set(cacheKey, { data: mapped, fetchedAt: Date.now() });
    return mapped;
  } catch (err) {
    console.error(`GDBrowser fetch failed for ${cacheKey}:`, err);
    return cached?.data ?? [];
  }
}

async function fetchPointercratePool(): Promise<GDLevelCard[]> {
  if (pointercrateCache && Date.now() - pointercrateCache.fetchedAt < CACHE_TTL_MS) {
    return pointercrateCache.data;
  }

  try {
    const [page1, page2] = await Promise.all([
      fetchJsonWithTimeout<Array<Record<string, unknown>>>('https://pointercrate.com/api/v2/demons/listed/?limit=75&after=0'),
      fetchJsonWithTimeout<Array<Record<string, unknown>>>('https://pointercrate.com/api/v2/demons/listed/?limit=75&after=75').catch(() => []),
    ]);

    const combined = [...(Array.isArray(page1) ? page1 : []), ...(Array.isArray(page2) ? page2 : [])];
    const mapped: GDLevelCard[] = combined
      .filter((item) => item && item.name && item.level_id)
      .map((item) => {
        const levelId = String(item.level_id);
        const pos = Number(item.position) || 150;
        const publisher = (item.publisher as { name?: string } | undefined)?.name || 'Unknown';
        const verifier = (item.verifier as { name?: string } | undefined)?.name;
        const rating: LevelRating = pos <= 10 ? 'mythic' : pos <= 75 ? 'legendary' : 'epic';
        return {
          instanceId: makeInstanceId(levelId, 'pointercrate'),
          levelId,
          name: String(item.name),
          creator: publisher,
          verifier,
          difficulty: 'extreme-demon',
          difficultyLabel: 'Extreme Demon',
          stars: 10,
          rating,
          source: 'pointercrate',
          sourceLabel: `Pointercrate #${pos}`,
          sourceUrl: `https://pointercrate.com/demonlist/${pos}`,
          gdbrowserUrl: `https://gdbrowser.com/${levelId}`,
          listPosition: pos,
          thumbnailUrl: item.thumbnail ? String(item.thumbnail) : undefined,
          videoUrl: item.video ? String(item.video) : undefined,
          description: `Official Pointercrate Demonlist #${pos}${verifier ? ` · Verified by ${verifier}` : ''}`,
          orbValue: computeOrbValue('extreme-demon', rating, pos),
          pulledAt: Date.now(),
        };
      });

    if (mapped.length > 0) {
      pointercrateCache = { data: mapped, fetchedAt: Date.now() };
    }
    return mapped;
  } catch (err) {
    console.error('Pointercrate fetch failed:', err);
    return pointercrateCache?.data ?? [];
  }
}

async function fetchAredlPool(): Promise<GDLevelCard[]> {
  if (aredlCache && Date.now() - aredlCache.fetchedAt < CACHE_TTL_MS) {
    return aredlCache.data;
  }

  try {
    const raw = await fetchJsonWithTimeout<Array<Record<string, unknown>>>('https://api.aredl.net/v2/api/aredl/levels', 12000);
    if (!Array.isArray(raw)) return [];

    const mapped: GDLevelCard[] = raw
      .filter((item) => item && item.name && item.level_id)
      .map((item) => {
        const levelId = String(item.level_id);
        const pos = Number(item.position) || 500;
        const points = Number(item.points) || 0;
        const rating: LevelRating = pos <= 150 ? 'legendary' : pos <= 400 ? 'epic' : 'featured';
        const tags = Array.isArray(item.tags) ? item.tags.map(String).slice(0, 5) : undefined;
        return {
          instanceId: makeInstanceId(levelId, 'aredl'),
          levelId,
          name: String(item.name),
          creator: 'AREDL Rated Creator',
          difficulty: 'extreme-demon',
          difficultyLabel: 'Extreme Demon',
          stars: 10,
          rating,
          source: 'aredl',
          sourceLabel: `AREDL #${pos}`,
          sourceUrl: `https://aredl.net/list/${levelId}`,
          gdbrowserUrl: `https://gdbrowser.com/${levelId}`,
          listPosition: pos,
          points,
          tags,
          description: item.description ? String(item.description) : undefined,
          orbValue: computeOrbValue('extreme-demon', rating, pos <= 150 ? pos : undefined),
          pulledAt: Date.now(),
        };
      });

    if (mapped.length > 0) {
      aredlCache = { data: mapped, fetchedAt: Date.now() };
    }
    return mapped;
  } catch (err) {
    console.error('AREDL fetch failed:', err);
    return aredlCache?.data ?? [];
  }
}

async function fetchInsaneDemonListPool(): Promise<GDLevelCard[]> {
  if (idlCache && Date.now() - idlCache.fetchedAt < CACHE_TTL_MS) {
    return idlCache.data;
  }

  try {
    const raw = await fetchJsonWithTimeout<Array<Record<string, unknown>>>('https://insanedemonlist.com/api/levels');
    if (!Array.isArray(raw)) return [];

    const mapped: GDLevelCard[] = raw
      .filter((item) => item && item.name && item.gdId)
      .slice(0, 300)
      .map((item) => {
        const levelId = String(item.gdId);
        const pos = Number(item.position) || 100;
        const ytcode = item.ytcode ? String(item.ytcode) : undefined;
        const rating: LevelRating = pos <= 20 ? 'legendary' : pos <= 75 ? 'epic' : 'featured';
        const packs = Array.isArray(item.packs)
          ? (item.packs as Array<{ name?: string }>).map((p) => p.name).filter(Boolean).slice(0, 3) as string[]
          : undefined;
        return {
          instanceId: makeInstanceId(levelId, 'insanedemonlist'),
          levelId,
          name: String(item.name),
          creator: String(item.publisher || 'Unknown'),
          difficulty: 'insane-demon',
          difficultyLabel: 'Insane Demon',
          stars: 10,
          rating,
          source: 'insanedemonlist',
          sourceLabel: `Insane Demon List #${pos}`,
          sourceUrl: 'https://insanedemonlist.com/',
          gdbrowserUrl: `https://gdbrowser.com/${levelId}`,
          listPosition: pos,
          songName: item.songName ? String(item.songName) : undefined,
          tags: packs && packs.length > 0 ? packs : undefined,
          thumbnailUrl: ytcode ? `https://i.ytimg.com/vi/${ytcode}/mqdefault.jpg` : undefined,
          videoUrl: ytcode ? `https://www.youtube.com/watch?v=${ytcode}` : undefined,
          description: `Insane Demon List Rank #${pos}`,
          orbValue: computeOrbValue('insane-demon', rating, pos <= 150 ? pos : undefined),
          pulledAt: Date.now(),
        };
      });

    if (mapped.length > 0) {
      idlCache = { data: mapped, fetchedAt: Date.now() };
    }
    return mapped;
  } catch (err) {
    console.error('Insane Demon List fetch failed:', err);
    return idlCache?.data ?? [];
  }
}

async function fetchPemonlistPool(): Promise<GDLevelCard[]> {
  if (pemonlistCache && Date.now() - pemonlistCache.fetchedAt < CACHE_TTL_MS) {
    return pemonlistCache.data;
  }

  try {
    const raw = await fetchJsonWithTimeout<{ data?: Array<Record<string, unknown>> }>('https://pemonlist.com/api/list?limit=150');
    const list = Array.isArray(raw?.data) ? raw.data : [];

    const mapped: GDLevelCard[] = list
      .filter((item) => item && item.name && item.level_id)
      .map((item) => {
        const levelId = String(item.level_id);
        const pos = Number(item.placement) || 100;
        const diff: DifficultyTier =
          pos <= 50
            ? 'extreme-demon'
            : pos <= 90
              ? 'insane-demon'
              : pos <= 120
                ? 'hard-demon'
                : pos <= 140
                  ? 'medium-demon'
                  : 'easy-demon';
        const rating: LevelRating = pos <= 60 ? 'legendary' : 'epic';
        const verifier = (item.verifier as { name?: string } | undefined)?.name;
        const topRecord = item.top_record as { formatted_time?: string; player?: { name?: string } } | undefined;
        const videoId = item.video_id ? String(item.video_id) : undefined;
        return {
          instanceId: makeInstanceId(levelId, 'pemonlist'),
          levelId,
          name: String(item.name),
          creator: String(item.creator || 'Unknown'),
          verifier,
          difficulty: diff,
          difficultyLabel: DIFFICULTY_LABELS[diff],
          stars: 10,
          rating,
          source: 'pemonlist',
          sourceLabel: `Pemonlist #${pos}`,
          sourceUrl: 'https://pemonlist.com/',
          gdbrowserUrl: `https://gdbrowser.com/${levelId}`,
          listPosition: pos,
          platformer: true,
          length: 'Platformer',
          thumbnailUrl: videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : undefined,
          videoUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined,
          description: topRecord?.formatted_time
            ? `Platformer Demon #${pos} · Top time ${topRecord.formatted_time}${topRecord.player?.name ? ` by ${topRecord.player.name}` : ''}`
            : `Platformer Demon List #${pos}`,
          orbValue: computeOrbValue(diff, rating, pos <= 150 ? pos : undefined),
          pulledAt: Date.now(),
        };
      });

    if (mapped.length > 0) {
      pemonlistCache = { data: mapped, fetchedAt: Date.now() };
    }
    return mapped;
  } catch (err) {
    console.error('Pemonlist fetch failed:', err);
    return pemonlistCache?.data ?? [];
  }
}

async function getCandidatePool(tier: DifficultyTier, sourceFilter: SourceFilter): Promise<GDLevelCard[]> {
  const randomPage = Math.floor(Math.random() * 8);

  if (sourceFilter === 'pointercrate') {
    const pc = await fetchPointercratePool();
    if (pc.length > 0) return pc;
  }

  if (sourceFilter === 'aredl') {
    const aredl = await fetchAredlPool();
    if (aredl.length > 0) return aredl;
  }

  if (sourceFilter === 'insanedemonlist') {
    const idl = await fetchInsaneDemonListPool();
    if (idl.length > 0) return idl;
  }

  if (sourceFilter === 'pemonlist') {
    const pem = await fetchPemonlistPool();
    const filtered = pem.filter((l) => l.difficulty === tier);
    if (filtered.length > 0) return filtered;
    if (pem.length > 0) return pem;
  }

  if (sourceFilter === 'gdbrowser') {
    const gdb = await fetchGDBrowserPool(tier, randomPage);
    if (gdb.length > 0) return gdb;
    return fetchGDBrowserPool(tier, 0);
  }

  // Mixed mode across all eligible websites for this difficulty tier
  const promises: Array<Promise<GDLevelCard[]>> = [fetchGDBrowserPool(tier, randomPage)];
  if (tier === 'extreme-demon') {
    promises.push(fetchPointercratePool(), fetchAredlPool(), fetchPemonlistPool());
  } else if (tier === 'insane-demon') {
    promises.push(fetchInsaneDemonListPool(), fetchPemonlistPool());
  } else if (tier === 'hard-demon' || tier === 'medium-demon' || tier === 'easy-demon') {
    promises.push(fetchPemonlistPool());
  }

  const settled = await Promise.all(promises);
  let pool = settled.flat().filter((card) => card.difficulty === tier);

  if (pool.length === 0) {
    pool = await fetchGDBrowserPool(tier, 0);
  }
  return pool;
}

function pickRandomCard(
  pool: GDLevelCard[],
  usedIds: Set<string>,
  preferredSource?: WebsiteSource,
  packTier: DifficultyTier = 'auto',
  guaranteedVariant?: CardVariant,
  guaranteedRating?: LevelRating,
): GDLevelCard | null {
  if (pool.length === 0) return null;
  let candidates = pool.filter((c) => !usedIds.has(c.levelId));
  if (candidates.length === 0) candidates = pool;

  let usedTop10Mythic = false;
  if (guaranteedRating === 'mythic') {
    const top10Mythic = candidates.filter(
      (c) => c.source === 'pointercrate' && c.listPosition !== undefined && c.listPosition <= 10,
    );
    if (top10Mythic.length > 0) {
      candidates = top10Mythic;
      usedTop10Mythic = true;
    }
  }

  if (preferredSource && !usedTop10Mythic) {
    const sourceFiltered = candidates.filter((c) => c.source === preferredSource);
    if (sourceFiltered.length > 0) {
      candidates = sourceFiltered;
    }
  }

  if (guaranteedRating && !usedTop10Mythic) {
    const ratingFiltered = candidates.filter((c) => c.rating === guaranteedRating);
    if (ratingFiltered.length > 0) {
      candidates = ratingFiltered;
    }
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  usedIds.add(chosen.levelId);

  const variant = guaranteedVariant ?? rollCardVariant(packTier);
  const finalRating: LevelRating = guaranteedRating ?? chosen.rating;

  const baseValue = computeOrbValue(chosen.difficulty, finalRating, chosen.listPosition);
  const scaledOrbValue = Math.round(baseValue * VARIANT_MULTIPLIER[variant]);

  return {
    ...chosen,
    rating: finalRating,
    variant,
    orbValue: scaledOrbValue,
    instanceId: makeInstanceId(chosen.levelId, chosen.source),
    pulledAt: Date.now(),
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Warm up key demon list caches gently in the background on startup
  void Promise.allSettled([
    fetchGDBrowserPool('auto', 0),
    fetchGDBrowserPool('easy', 0),
    fetchPointercratePool(),
    fetchInsaneDemonListPool(),
  ]);

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      caches: {
        gdbrowserPages: gdbCache.size,
        pointercrate: pointercrateCache?.data.length ?? 0,
        aredl: aredlCache?.data.length ?? 0,
        insanedemonlist: idlCache?.data.length ?? 0,
        pemonlist: pemonlistCache?.data.length ?? 0,
      },
    });
  });

  app.post('/api/packs/open', async (req, res) => {
    try {
      const tier = (req.body?.tier as DifficultyTier) || 'auto';
      const sourceFilter = (req.body?.sourceFilter as SourceFilter) || 'mixed';
      const rawVariant = req.body?.guaranteedVariant as CardVariant | undefined;
      const validVariants: CardVariant[] = ['gold-holo', 'rainbow', 'void', 'darkmatter'];
      const guaranteedVariant = rawVariant && validVariants.includes(rawVariant) ? rawVariant : undefined;

      const rawRating = req.body?.guaranteedRating as LevelRating | undefined;
      const validRatings: LevelRating[] = ['featured', 'epic', 'legendary', 'mythic'];
      const guaranteedRating = rawRating && validRatings.includes(rawRating) ? rawRating : undefined;

      const upgradeChanceMap: Partial<Record<DifficultyTier, number>> = {
        auto: 0.14,
        easy: 0.14,
        normal: 0.15,
        hard: 0.15,
        harder: 0.16,
        insane: 0.16,
        'easy-demon': 0.14,
        'medium-demon': 0.14,
        'hard-demon': 0.13,
        'insane-demon': 0.12,
      };

      const usedIds = new Set<string>();
      const basePool = await getCandidatePool(tier, sourceFilter);
      const cards: GDLevelCard[] = [];

      // Slot 1 & 2: Base tier (when mixed on Demon tiers, diversify websites across slots)
      const availableSourcesInPool = Array.from(new Set(basePool.map((c) => c.source)));
      for (let slot = 0; slot < 2; slot++) {
        const preferred =
          sourceFilter === 'mixed' && availableSourcesInPool.length > 1
            ? availableSourcesInPool[slot % availableSourcesInPool.length]
            : undefined;
        const picked = pickRandomCard(basePool, usedIds, preferred, tier, guaranteedVariant, guaranteedRating);
        if (picked) cards.push(picked);
      }

      // Slot 3: Chance to upgrade to next rarity tier
      const nextTier = NEXT_TIER[tier];
      const chance = upgradeChanceMap[tier] ?? 0;
      const didUpgrade = Boolean(nextTier && Math.random() < chance);

      if (didUpgrade && nextTier) {
        const upgradePool = await getCandidatePool(nextTier, sourceFilter);
        const picked =
          pickRandomCard(upgradePool, usedIds, undefined, nextTier, guaranteedVariant, guaranteedRating) ??
          pickRandomCard(basePool, usedIds, undefined, tier, guaranteedVariant, guaranteedRating);
        if (picked) {
          picked.upgradedFrom = picked.difficulty !== tier ? tier : undefined;
          cards.push(picked);
        }
      } else {
        const preferred =
          sourceFilter === 'mixed' && availableSourcesInPool.length > 2
            ? availableSourcesInPool[2]
            : undefined;
        const picked = pickRandomCard(basePool, usedIds, preferred, tier, guaranteedVariant, guaranteedRating);
        if (picked) cards.push(picked);
      }

      if (cards.length === 0) {
        res.status(503).json({ error: 'Unable to fetch Geometry Dash levels right now. Please try again.' });
        return;
      }

      res.json({
        packTier: tier,
        cards,
      });
    } catch (err) {
      console.error('Pack open error:', err);
      res.status(500).json({ error: 'Failed to open pack from Geometry Dash sources.' });
    }
  });

  app.get('/api/sources/levels', async (req, res) => {
    try {
      const source = (String(req.query.source || 'gdbrowser') as WebsiteSource);
      const difficulty = String(req.query.difficulty || 'all') as DifficultyTier | 'all';
      const search = String(req.query.search || '').trim();
      const page = Math.max(0, Number(req.query.page || 0));

      let levels: GDLevelCard[] = [];

      if (source === 'gdbrowser') {
        const targetDiff: DifficultyTier = difficulty === 'all' ? 'easy-demon' : difficulty;
        levels = await fetchGDBrowserPool(targetDiff, page, search);
      } else if (source === 'pointercrate') {
        levels = await fetchPointercratePool();
      } else if (source === 'aredl') {
        levels = await fetchAredlPool();
      } else if (source === 'insanedemonlist') {
        levels = await fetchInsaneDemonListPool();
      } else if (source === 'pemonlist') {
        levels = await fetchPemonlistPool();
      }

      if (difficulty !== 'all' && source !== 'gdbrowser') {
        levels = levels.filter((l) => l.difficulty === difficulty);
      }

      if (search && source !== 'gdbrowser') {
        const q = search.toLowerCase();
        levels = levels.filter(
          (l) =>
            l.name.toLowerCase().includes(q) ||
            l.creator.toLowerCase().includes(q) ||
            l.levelId.includes(q) ||
            (l.verifier && l.verifier.toLowerCase().includes(q)),
        );
      }

      const pageSize = 24;
      const sliced = source === 'gdbrowser' ? levels : levels.slice(page * pageSize, (page + 1) * pageSize);

      res.json({
        source,
        difficulty,
        levels: sliced,
        totalCached: levels.length,
      });
    } catch (err) {
      console.error('Source levels error:', err);
      res.status(500).json({ error: 'Failed to load levels from website source.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DashPacks server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server error:', err);
  process.exit(1);
});
