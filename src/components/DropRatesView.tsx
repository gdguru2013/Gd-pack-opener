import { PACK_DEFINITIONS, WEBSITE_LABELS } from '../data/packs';
import {
  DUAL_GUARANTEE_SURGE,
  RATING_META,
  VARIANT_META,
  VARIANT_ORDER,
} from '../data/variants';
import type { LevelRating } from '../types/gd';
import { DifficultyFace } from './DifficultyFace';

const RATING_LIST: LevelRating[] = ['rated', 'featured', 'epic', 'legendary', 'mythic'];

export function DropRatesView() {
  return (
    <section aria-label="Pack Pricing and Drop Rates">
      <div className="pb-6 border-b border-white/8">
        <h2 className="font-display text-2xl font-bold tracking-tight text-white">
          Pack Pricing &amp; Rarity Table
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Every Geometry Dash difficulty face has a dedicated pack tier, ascending Orb cost,
          slot-3 upgrade chance, and combinable Variant + Rating guarantees.
        </p>
      </div>

      {/* Pricing & Odds Table */}
      <div className="mt-6 overflow-x-auto rounded-xl border border-white/10 bg-[#131926]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-xs font-semibold text-slate-400">
              <th className="py-3.5 px-4">Difficulty Face</th>
              <th className="py-3.5 px-4">Stars</th>
              <th className="py-3.5 px-4">Pack Price</th>
              <th className="py-3.5 px-4">Slot 3 Upgrade</th>
              <th className="py-3.5 px-4">Base Salvage</th>
              <th className="py-3.5 px-4">Live Websites</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8 text-sm">
            {PACK_DEFINITIONS.map((pack) => {
              const baseSalvage = Math.round(pack.cost * 0.3);
              return (
                <tr key={pack.tier} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <DifficultyFace difficulty={pack.tier} rating={pack.isDemon ? 'epic' : 'featured'} size={36} />
                      <div>
                        <p className="font-display font-bold text-white whitespace-nowrap">{pack.name}</p>
                        <p className="text-xs text-slate-400">{pack.difficultyLabel}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-amber-300">
                    {pack.stars}★
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold tabular-nums text-white">
                    {pack.cost.toLocaleString()} Orbs
                  </td>
                  <td className="py-3 px-4 tabular-nums text-slate-300">
                    {pack.upgradeChance > 0
                      ? `${Math.round(pack.upgradeChance * 100)}% → next tier`
                      : 'Max tier'}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-slate-300">
                    ~{baseSalvage.toLocaleString()}+ Orbs
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-400">
                    {pack.supportedSources.map((s) => WEBSITE_LABELS[s]).join(' · ')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Card Variants */}
      <div className="mt-8">
        <h3 className="font-display text-lg font-bold text-white">
          Card Variants &amp; Foil Finishes
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Any level pulled from a pack can roll a special variant finish. Buying a guaranteed
          Variant combined with a guaranteed Rating multiplies both pack costs plus a{' '}
          {DUAL_GUARANTEE_SURGE}x combo surge.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {VARIANT_ORDER.map((id) => {
            const v = VARIANT_META[id];
            const isRare = id !== 'standard';
            return (
              <div
                key={v.id}
                className={`rounded-xl border p-4 ${v.cardClass} ${isRare ? 'variant-shimmer' : ''}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="font-display font-bold" style={{ color: isRare ? v.accentHex : '#FFFFFF' }}>
                    {v.label}
                  </h4>
                  <span className="font-mono text-xs font-semibold text-amber-300 tabular-nums">
                    {v.multiplier.toFixed(2)}x
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-slate-300 tabular-nums">
                  Drop rate: {v.baseChanceLabel}
                  {isRare ? ` · Pack: ${v.packCostMultiplier}x` : ''}
                </p>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">{v.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rating Multipliers */}
      <div className="mt-8">
        <h3 className="font-display text-lg font-bold text-white">
          Level Rating Multipliers &amp; Guarantees
        </h3>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {RATING_LIST.map((rId) => {
            const tier = RATING_META[rId];
            return (
              <div
                key={tier.id}
                className="rounded-xl border border-white/10 bg-[#131926] p-4"
                style={
                  tier.id === 'mythic'
                    ? { borderColor: `${tier.accentHex}60` }
                    : undefined
                }
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h4
                    className="font-display font-bold"
                    style={{ color: tier.id === 'rated' ? '#FFFFFF' : tier.accentHex }}
                  >
                    {tier.label}
                  </h4>
                  <span className="font-mono text-xs font-semibold text-amber-400 tabular-nums">
                    {tier.orbMultiplier.toFixed(2)}x
                  </span>
                </div>
                {tier.id !== 'rated' && (
                  <p className="mt-1 font-mono text-xs text-slate-300 tabular-nums">
                    Pack: {tier.packCostMultiplier}x
                  </p>
                )}
                <p className="mt-1.5 text-xs text-slate-400">{tier.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
