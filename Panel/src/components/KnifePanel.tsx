import { useState } from 'react';
import { Loadout, Team } from '../utils/types';
import { knives, getKnifeImageUrl } from '../data/knives';
import { knifeSkinsByType } from '../data/knifeSkins';
import { useT } from '../i18n';
import TeamToggle from './TeamToggle';
import WearSeedControls from './WearSeedControls';
import SkinPickerModal from './SkinPickerModal';

interface KnifePanelProps {
  loadout: Loadout;
  updateLoadout: (updates: Partial<Loadout>) => void;
}

export default function KnifePanel({ loadout, updateLoadout }: KnifePanelProps) {
  const { t, lang } = useT();
  const isChinese = lang === 'schinese' || lang === 'tchinese';
  const [team, setTeam] = useState<Team>('ct');
  const [copied, setCopied] = useState(false);
  const [showSkinModal, setShowSkinModal] = useState(false);

  // Per-team field accessors
  const indexKey = team === 'ct' ? 'knifeIndexCt' : 'knifeIndexT';
  const paintKey = team === 'ct' ? 'knifePaintCt' : 'knifePaintT';
  const wearKey = team === 'ct' ? 'knifeWearCt' : 'knifeWearT';
  const seedKey = team === 'ct' ? 'knifeSeedCt' : 'knifeSeedT';
  const currentIndex = loadout[indexKey];
  const currentPaint = loadout[paintKey];
  const currentWear = loadout[wearKey];
  const currentSeed = loadout[seedKey];

  const handleKnifeSelect = (index: number) => {
    updateLoadout({
      [indexKey]: index,
      useRandom: false,
    } as Partial<Loadout>);
  };

  const handlePaintSelect = (paintId: number) => {
    updateLoadout({ [paintKey]: paintId, useRandom: false } as Partial<Loadout>);
  };

  const handleRandom = () => {
    updateLoadout({
      knifeIndexCt: -1, knifePaintCt: -1,
      knifeIndexT: -1, knifePaintT: -1,
      useRandom: true,
    });
  };

  const handleWearChange = (wear: number) => {
    updateLoadout({ [wearKey]: wear } as Partial<Loadout>);
  };

  const handleSeedChange = (seed: number) => {
    updateLoadout({ [seedKey]: seed } as Partial<Loadout>);
  };

  /** Copy the active team's knife selection to the other team. */
  const copyToOtherTeam = () => {
    if (currentIndex < 0) return;
    const updates: Partial<Loadout> = team === 'ct'
      ? { knifeIndexT: currentIndex, knifePaintT: currentPaint, knifeWearT: currentWear, knifeSeedT: currentSeed }
      : { knifeIndexCt: currentIndex, knifePaintCt: currentPaint, knifeWearCt: currentWear, knifeSeedCt: currentSeed };
    updateLoadout(updates);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const getKnifeName = (idx: number) => {
    if (idx < 0 || idx >= knives.length) return t('preview.random');
    return isChinese ? knives[idx].nameZh : knives[idx].name;
  };

  // Get the selected knife's defindex for looking up per-knife-type skins
  const selectedKnifeDefindex = currentIndex >= 0 ? knives[currentIndex]?.defindex : null;
  const skinsForSelectedKnife = selectedKnifeDefindex ? (knifeSkinsByType[selectedKnifeDefindex] || []) : [];

  return (
    <div className="space-y-3">
      {/* Team selector: knives are configured per team */}
      <TeamToggle team={team} onChange={setTeam} ctLabel={t('knife.ct')} tLabel={t('knife.t')} />

      {/* Current selections for both teams */}
      <div className="flex gap-2 text-xs">
        <div className="flex-1 rounded-lg bg-black/20 border border-white/[0.06] px-3 py-2">
          <span className="text-sky-400 font-semibold">{t('knife.ct')}:</span>{' '}
          <span className="text-gray-200">{getKnifeName(loadout.knifeIndexCt)}</span>
        </div>
        <div className="flex-1 rounded-lg bg-black/20 border border-white/[0.06] px-3 py-2">
          <span className="text-orange-400 font-semibold">{t('knife.t')}:</span>{' '}
          <span className="text-gray-200">{getKnifeName(loadout.knifeIndexT)}</span>
        </div>
      </div>

      <button
        onClick={handleRandom}
        className={`card card-hover w-full text-center py-3 ${
          loadout.knifeIndexCt === -1 && loadout.knifeIndexT === -1 ? 'card-selected' : ''
        }`}
      >
        <div className="text-sm font-semibold text-white">{t("preview.random")}</div>
        <div className="text-xs text-gray-500 mt-0.5">{t("knife.selectType")}</div>
      </button>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {knives.map((knife, index) => (
          <button
            key={knife.defindex}
            onClick={() => handleKnifeSelect(index)}
            className={`card card-hover !p-3 text-center ${currentIndex === index ? 'card-selected' : ''}`}
          >
            <img
              src={getKnifeImageUrl(knife.defindex)}
              alt={knife.name}
              className="w-full h-12 object-contain mb-1 opacity-90"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="text-xs font-semibold text-white">{isChinese ? knife.nameZh : knife.name}</div>
          </button>
        ))}
      </div>

      {currentIndex >= 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h3 className="text-sm font-semibold text-white truncate">
              {getKnifeName(currentIndex)}
              <span className={`ml-2 text-[11px] font-bold ${team === 'ct' ? 'text-sky-400' : 'text-orange-400'}`}>
                {team === 'ct' ? t('team.ct') : t('team.t')}
              </span>
            </h3>
            <button onClick={copyToOtherTeam}
              className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded-md bg-white/[0.05] border border-white/[0.08] transition-colors shrink-0">
              {copied ? t('team.copied') : (team === 'ct' ? t('team.copyToT') : t('team.copyToCt'))}
            </button>
          </div>

          {/* Wear + Seed controls (with manual input) */}
          <div className="mb-4">
            <WearSeedControls
              wear={currentWear}
              seed={currentSeed}
              onWearChange={handleWearChange}
              onSeedChange={handleSeedChange}
            />
          </div>

          {/* Selected skin preview + Choose Skin button */}
          <div className="mb-4">
            {currentPaint >= 0 ? (
              <div className="flex items-center gap-3 p-2.5 bg-amber-500/[0.08] rounded-lg border border-amber-500/20">
                {(() => {
                  const paint = skinsForSelectedKnife.find(p => p.id === currentPaint);
                  return (
                    <>
                      {paint?.image && (
                        <img src={paint.image} alt={paint.name}
                          className="w-14 h-14 object-contain rounded"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-amber-200 truncate">
                          {paint?.name || `Paint #${currentPaint}`}
                        </div>
                        <div className="text-[10px] text-amber-400/60">Selected skin</div>
                      </div>
                    </>
                  );
                })()}
                <button onClick={() => setShowSkinModal(true)}
                  className="text-xs text-amber-300 hover:text-amber-100 px-3 py-1.5 rounded-md bg-amber-500/[0.12] border border-amber-500/30 transition-colors shrink-0">
                  Change
                </button>
              </div>
            ) : (
              <button onClick={() => setShowSkinModal(true)}
                className="w-full py-3 text-sm text-gray-300 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg border border-dashed border-white/[0.1] hover:border-amber-500/30 transition-all">
                + Choose Skin
              </button>
            )}
          </div>
        </div>
      )}

      {/* Skin Picker Modal */}
      {showSkinModal && currentIndex >= 0 && (
        <SkinPickerModal
          title={`${getKnifeName(currentIndex)} - ${team === 'ct' ? t('team.ct') : t('team.t')}`}
          items={skinsForSelectedKnife.map(p => ({ id: p.id, name: p.name, image: p.image }))}
          selectedId={currentPaint >= 0 ? currentPaint : null}
          onSelect={(id) => { handlePaintSelect(id); setShowSkinModal(false); }}
          onClose={() => setShowSkinModal(false)}
        />
      )}
    </div>
  );
}
