import { useEffect, useMemo, useState } from 'react';
import { Volume2, VolumeX, RotateCcw } from 'lucide-react';
import type {
  DifficultyTier,
  GDLevelCard,
  PackDefinition,
  PackOpenResponse,
  PackRatingMode,
  PackVariantMode,
  SourceFilter,
} from './types/gd';
import { PACK_MAP, VAULT_HERO_IMAGE } from './data/packs';
import { getPackCost } from './data/variants';
import { PackShop } from './components/PackShop';
import { PackOpeningStage } from './components/PackOpeningStage';
import { CollectionVault } from './components/CollectionVault';
import { LevelSitesExplorer } from './components/LevelSitesExplorer';
import { DropRatesView } from './components/DropRatesView';
import { LevelInspectorModal } from './components/LevelInspectorModal';
import { DifficultyFace } from './components/DifficultyFace';
import { soundFX } from './utils/sound';

type ActiveTab = 'packs' | 'collection' | 'sites' | 'rates';

interface SaveState {
  orbs: number;
  packsOpened: number;
  collection: GDLevelCard[];
  muted: boolean;
}

const STORAGE_KEY = 'dashpacks_save_v1';
const STARTING_ORBS = 2000;
const CLAIM_AMOUNT = 500;
const CLAIM_COOLDOWN_SEC = 12;

function loadSave(): SaveState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { orbs: STARTING_ORBS, packsOpened: 0, collection: [], muted: false };
    }
    const parsed = JSON.parse(raw) as Partial<SaveState>;
    return {
      orbs: typeof parsed.orbs === 'number' ? parsed.orbs : STARTING_ORBS,
      packsOpened: typeof parsed.packsOpened === 'number' ? parsed.packsOpened : 0,
      collection: Array.isArray(parsed.collection) ? parsed.collection : [],
      muted: Boolean(parsed.muted),
    };
  } catch {
    return { orbs: STARTING_ORBS, packsOpened: 0, collection: [], muted: false };
  }
}

export default function App() {
  const [save, setSave] = useState<SaveState>(() => loadSave());
  const [activeTab, setActiveTab] = useState<ActiveTab>('packs');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('mixed');
  const [variantMode, setVariantMode] = useState<PackVariantMode>('random');
  const [ratingMode, setRatingMode] = useState<PackRatingMode>('any');

  const [openingTier, setOpeningTier] = useState<DifficultyTier | null>(null);
  const [activeStage, setActiveStage] = useState<{
    pack: PackDefinition;
    variantMode: PackVariantMode;
    ratingMode: PackRatingMode;
    effectiveCost: number;
    cards: GDLevelCard[];
    newCardIds: Set<string>;
    discoveryBonus: number;
    soldIds: Set<string>;
  } | null>(null);

  const [inspectedCard, setInspectedCard] = useState<GDLevelCard | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [claimCooldown, setClaimCooldown] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    soundFX.setMuted(save.muted);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    } catch {
      // Ignore storage quota errors
    }
  }, [save]);

  useEffect(() => {
    if (claimCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setClaimCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [claimCooldown]);

  const ownedLevelIds = useMemo(
    () => new Set(save.collection.map((c) => c.levelId)),
    [save.collection],
  );

  const uniqueStats = useMemo(() => {
    const uniqueMap = new Map<string, GDLevelCard>();
    const sitesSet = new Set<string>();
    for (const card of save.collection) {
      if (!uniqueMap.has(card.levelId)) {
        uniqueMap.set(card.levelId, card);
      }
      sitesSet.add(card.source);
    }
    let totalStars = 0;
    for (const c of uniqueMap.values()) {
      totalStars += c.stars;
    }
    return {
      uniqueCount: uniqueMap.size,
      totalStars,
      sitesCount: sitesSet.size,
    };
  }, [save.collection]);

  async function handleOpenPack(
    pack: PackDefinition,
    overrideVariantMode?: PackVariantMode,
    overrideRatingMode?: PackRatingMode,
  ) {
    if (openingTier !== null) return;
    const vMode = overrideVariantMode ?? variantMode;
    const rMode = overrideRatingMode ?? ratingMode;
    const effectiveCost = getPackCost(pack.cost, vMode, rMode);

    if (save.orbs < effectiveCost) {
      setErrorMsg(`You need ${(effectiveCost - save.orbs).toLocaleString()} more Orbs for this pack.`);
      return;
    }

    setErrorMsg(null);
    setOpeningTier(pack.tier);
    soundFX.playPackSelect();

    try {
      const res = await fetch('/api/packs/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: pack.tier,
          sourceFilter,
          guaranteedVariant: vMode === 'random' ? undefined : vMode,
          guaranteedRating: rMode === 'any' ? undefined : rMode,
        }),
      });

      const payload = (await res.json()) as PackOpenResponse & { error?: string };
      if (!res.ok || !Array.isArray(payload.cards) || payload.cards.length === 0) {
        throw new Error(payload.error || 'Could not pull levels from Geometry Dash servers.');
      }

      const existingKeys = new Set(
        save.collection.map((c) => `${c.levelId}:${c.variant || 'standard'}:${c.rating}`),
      );
      const newCardIds = new Set<string>();
      let discoveryBonus = 0;

      for (const card of payload.cards) {
        const key = `${card.levelId}:${card.variant || 'standard'}:${card.rating}`;
        if (!existingKeys.has(key) && !newCardIds.has(key)) {
          newCardIds.add(key);
          discoveryBonus += Math.max(15, Math.round(card.orbValue * 0.25));
        }
      }

      setSave((prev) => ({
        ...prev,
        orbs: prev.orbs - effectiveCost + discoveryBonus,
        packsOpened: prev.packsOpened + 1,
        collection: [...payload.cards, ...prev.collection],
      }));

      setActiveStage({
        pack,
        variantMode: vMode,
        ratingMode: rMode,
        effectiveCost,
        cards: payload.cards,
        newCardIds,
        discoveryBonus,
        soldIds: new Set<string>(),
      });
      setActiveTab('packs');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to open pack.');
    } finally {
      setOpeningTier(null);
    }
  }

  function handleSellCard(card: GDLevelCard) {
    soundFX.playOrbsGain();
    setSave((prev) => ({
      ...prev,
      orbs: prev.orbs + card.orbValue,
      collection: prev.collection.filter((c) => c.instanceId !== card.instanceId),
    }));
    setActiveStage((prev) => {
      if (!prev) return null;
      const nextSold = new Set(prev.soldIds);
      nextSold.add(card.instanceId);
      return { ...prev, soldIds: nextSold };
    });
  }

  function handleSellDuplicates() {
    const seen = new Set<string>();
    const kept: GDLevelCard[] = [];
    let gainedOrbs = 0;

    for (const card of save.collection) {
      const key = `${card.levelId}:${card.variant || 'standard'}:${card.rating}`;
      if (!seen.has(key)) {
        seen.add(key);
        kept.push(card);
      } else {
        gainedOrbs += card.orbValue;
      }
    }

    if (gainedOrbs > 0) {
      soundFX.playOrbsGain();
      setSave((prev) => ({
        ...prev,
        orbs: prev.orbs + gainedOrbs,
        collection: kept,
      }));
    }
  }

  function handleClaimOrbs() {
    if (claimCooldown > 0 && save.orbs >= 100) return;
    soundFX.playOrbsGain();
    setSave((prev) => ({ ...prev, orbs: prev.orbs + CLAIM_AMOUNT }));
    setClaimCooldown(CLAIM_COOLDOWN_SEC);
  }

  function handleJumpToPack(tier: DifficultyTier) {
    const pack = PACK_MAP[tier];
    setActiveStage(null);
    setActiveTab('packs');
    if (pack && save.orbs >= getPackCost(pack.cost, variantMode, ratingMode)) {
      void handleOpenPack(pack);
    }
  }

  function handleResetSave() {
    if (!confirmReset) {
      setConfirmReset(true);
      window.setTimeout(() => setConfirmReset(false), 3500);
      return;
    }
    setConfirmReset(false);
    setActiveStage(null);
    setSave({
      orbs: STARTING_ORBS,
      packsOpened: 0,
      collection: [],
      muted: save.muted,
    });
  }

  const claimDisabled = claimCooldown > 0 && save.orbs >= 100;

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 gd-grid-bg flex flex-col">
      {/* Top Bar Contract: 3 Zones (Brand — 4 Single-line Nav Links — 1 Primary Action) */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B0F17]/90 backdrop-blur-md">
        <div className="mx-auto max-w-[1280px] flex items-center justify-between gap-8 px-4 sm:px-6 h-16">
          {/* Zone 1: Single-element Brand Wordmark */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('packs');
              setActiveStage(null);
            }}
            className="font-display text-xl font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            DashPacks
          </button>

          {/* Zone 2: 4 concise single-line nav links */}
          <nav className="flex items-center gap-4 sm:gap-6 overflow-x-auto text-sm font-medium">
            {(
              [
                { id: 'packs', label: 'Open Packs' },
                { id: 'collection', label: 'Collection' },
                { id: 'sites', label: 'Level Sites' },
                { id: 'rates', label: 'Drop Rates' },
              ] as const
            ).map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
                    active
                      ? 'text-white border-amber-500'
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              disabled={claimDisabled}
              onClick={handleClaimOrbs}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
                claimDisabled
                  ? 'bg-white/5 text-slate-400 border border-white/10 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              {claimDisabled ? `Cooldown ${claimCooldown}s` : `Claim +${CLAIM_AMOUNT} Orbs`}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 sm:px-6 py-6 sm:py-8">
        {/* Error Banner */}
        {errorMsg && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-xs font-semibold text-red-100 underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Hero Banner (shown on Packs Shop view when not tearing a pack) */}
        {activeTab === 'packs' && !activeStage && (
          <section className="relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-[#131926]">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
              <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-medium text-amber-400">
                    GDBrowser · Pointercrate · AREDL · Insane Demon List · Pemonlist
                  </p>
                  <h1 className="mt-2 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white [text-wrap:balance]">
                    Open Geometry Dash Packs. Collect Real Community Levels.
                  </h1>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
                    Spend Mana Orbs on 11 difficulty face tiers—from 1-Star Auto packs up to
                    Extreme Demon verification legends pulled live across five Geometry Dash
                    websites.
                  </p>
                </div>

                {/* Utility Controls in Workspace (Sound + Reset) */}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSave((prev) => ({ ...prev, muted: !prev.muted }))}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {save.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                    <span>{save.muted ? 'Sound Off' : 'Sound On'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetSave}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>{confirmReset ? 'Click again to reset' : 'Reset Vault'}</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 relative min-h-[200px] lg:h-full bg-[#0B0F17] overflow-hidden">
                <img
                  src={VAULT_HERO_IMAGE}
                  alt="Geometry Dash golden cube and orb vault"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#131926] via-transparent to-transparent lg:block hidden" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#131926]/90 via-transparent to-transparent flex items-end justify-end p-5">
                  <div className="flex items-center gap-3">
                    <DifficultyFace difficulty="normal" rating="featured" size={38} />
                    <DifficultyFace difficulty="harder" rating="epic" size={40} />
                    <DifficultyFace difficulty="extreme-demon" rating="mythic" size={44} />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 4-Column Resource & Progress Strip */}
        <section
          aria-label="Player Progress"
          className="mb-8 grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div className="rounded-xl border border-white/10 bg-[#131926] px-5 py-4">
            <p className="text-xs text-slate-400">Mana Orbs</p>
            <p className="mt-1 font-mono text-2xl font-bold text-amber-400 tabular-nums">
              {save.orbs.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#131926] px-5 py-4">
            <p className="text-xs text-slate-400">Collected Stars</p>
            <p className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
              {uniqueStats.totalStars.toLocaleString()}★
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#131926] px-5 py-4">
            <p className="text-xs text-slate-400">Unique Levels</p>
            <p className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
              {uniqueStats.uniqueCount.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#131926] px-5 py-4">
            <p className="text-xs text-slate-400">Packs Opened</p>
            <p className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
              {save.packsOpened.toLocaleString()}
            </p>
          </div>
        </section>

        {/* Active View */}
        {activeTab === 'packs' && activeStage && (
          <PackOpeningStage
            key={activeStage.cards.map((c) => c.instanceId).join('-')}
            pack={activeStage.pack}
            variantMode={activeStage.variantMode}
            ratingMode={activeStage.ratingMode}
            effectiveCost={activeStage.effectiveCost}
            cards={activeStage.cards}
            newCardIds={activeStage.newCardIds}
            discoveryBonus={activeStage.discoveryBonus}
            orbs={save.orbs}
            onBackToShop={() => setActiveStage(null)}
            onOpenAnother={() =>
              void handleOpenPack(
                activeStage.pack,
                activeStage.variantMode,
                activeStage.ratingMode,
              )
            }
            onInspectCard={setInspectedCard}
            onSellCard={handleSellCard}
            soldIds={activeStage.soldIds}
          />
        )}

        {activeTab === 'packs' && !activeStage && (
          <PackShop
            orbs={save.orbs}
            sourceFilter={sourceFilter}
            onChangeSourceFilter={setSourceFilter}
            variantMode={variantMode}
            onChangeVariantMode={setVariantMode}
            ratingMode={ratingMode}
            onChangeRatingMode={setRatingMode}
            onSelectPack={(pack) => void handleOpenPack(pack)}
            openingTier={openingTier}
          />
        )}

        {activeTab === 'collection' && (
          <CollectionVault
            cards={save.collection}
            onInspectCard={setInspectedCard}
            onSellCard={handleSellCard}
            onSellDuplicates={handleSellDuplicates}
            onGoToPacks={() => setActiveTab('packs')}
          />
        )}

        {activeTab === 'sites' && (
          <LevelSitesExplorer
            ownedLevelIds={ownedLevelIds}
            onInspectCard={setInspectedCard}
            onJumpToPack={handleJumpToPack}
          />
        )}

        {activeTab === 'rates' && <DropRatesView />}
      </main>

      <footer className="border-t border-white/8 py-6 text-center text-xs text-slate-500">
        DashPacks · Live Geometry Dash level data via GDBrowser, Pointercrate, AREDL, Insane Demon List, and Pemonlist
      </footer>

      <LevelInspectorModal
        card={inspectedCard}
        isOwned={Boolean(
          inspectedCard && save.collection.some((c) => c.instanceId === inspectedCard.instanceId),
        )}
        onClose={() => setInspectedCard(null)}
        onSell={handleSellCard}
      />
    </div>
  );
}
