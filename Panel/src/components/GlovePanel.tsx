import { useState } from 'react';
import { Loadout, Team } from '../utils/types';
import { gloves, getGloveTypeImage } from '../data/skins';
import { getGloveLocalizedName, getGlovePaintLocalizedName } from '../data/localNames';
import { useT } from '../i18n';
import TeamToggle from './TeamToggle';
import WearSeedControls from './WearSeedControls';
import SkinPickerModal from './SkinPickerModal';

interface GlovePanelProps {
  loadout: Loadout;
  updateLoadout: (updates: Partial<Loadout>) => void;
}

export default function GlovePanel({ loadout, updateLoadout }: GlovePanelProps) {
  const { t, lang } = useT();
  const [selectedTeam, setSelectedTeam] = useState<Team>('ct');
  const [selectedGlove, setSelectedGlove] = useState<number | null>(() => {
    const idx = loadout.gloveIndexCt;
    return idx >= 0 ? idx : null;
  });
  const [showSkinModal, setShowSkinModal] = useState(false);

  const getIndexField = () => selectedTeam === 'ct' ? 'gloveIndexCt' : 'gloveIndexT';
  const getPaintField = () => selectedTeam === 'ct' ? 'glovePaintCt' : 'glovePaintT';
  const getWearField = () => selectedTeam === 'ct' ? 'gloveWearCt' : 'gloveWearT';
  const getSeedField = () => selectedTeam === 'ct' ? 'gloveSeedCt' : 'gloveSeedT';

  const currentPaint = selectedTeam === 'ct' ? loadout.glovePaintCt : loadout.glovePaintT;
  const currentWear = selectedTeam === 'ct' ? loadout.gloveWearCt : loadout.gloveWearT;
  const currentSeed = selectedTeam === 'ct' ? loadout.gloveSeedCt : loadout.gloveSeedT;

  const handleGloveSelect = (index: number) => {
    setSelectedGlove(index);
    const glove = gloves[index];
    // Validate: if current paint is not valid for this glove type, reset to first valid paint
    const validPaintIds = glove.paints.map(p => p.id);
    const isPaintValid = validPaintIds.includes(currentPaint);
    const newPaint = isPaintValid ? currentPaint : glove.paints[0].id;

    updateLoadout({
      [getIndexField()]: index,
      [getPaintField()]: newPaint,
      ...(selectedTeam === 'ct'
        ? { gloveDefIndexCt: glove.defindex }
        : { gloveDefIndexT: glove.defindex }),
      useRandom: false,
    } as any);
  };

  const handlePaintSelect = (paintId: number) => {
    const glove = gloves[selectedGlove!];
    updateLoadout({
      [getPaintField()]: paintId,
      ...(selectedTeam === 'ct'
        ? { gloveDefIndexCt: glove.defindex }
        : { gloveDefIndexT: glove.defindex }),
      useRandom: false,
    } as any);
  };

  const handleWearChange = (wear: number) => {
    updateLoadout({ [getWearField()]: wear } as any);
  };

  const handleSeedChange = (seed: number) => {
    updateLoadout({ [getSeedField()]: seed } as any);
  };

  const handleRandom = () => {
    setSelectedGlove(null);
    updateLoadout({
      gloveIndexCt: -1, glovePaintCt: -1,
      gloveIndexT: -1, glovePaintT: -1,
      useRandom: true,
    });
  };

  // Find glove names for both teams (localized)
  const getGloveName = (idx: number) => {
    if (idx < 0 || idx >= gloves.length) return t("preview.random");
    return getGloveLocalizedName(gloves[idx].defindex, gloves[idx].name, lang);
  };

  const selectedCtName = getGloveName(loadout.gloveIndexCt);
  const selectedTName = getGloveName(loadout.gloveIndexT);

  return (
    <div className="space-y-3">
      {/* Team toggle */}
      <TeamToggle
        team={selectedTeam}
        onChange={(team) => {
          setSelectedTeam(team);
          const idx = team === 'ct' ? loadout.gloveIndexCt : loadout.gloveIndexT;
          setSelectedGlove(idx >= 0 ? idx : null);
        }}
        ctLabel={t("glove.ct")}
        tLabel={t("glove.t")}
      />

      {/* Current selections for both teams */}
      <div className="flex gap-2 text-xs">
        <div className="flex-1 rounded-lg bg-black/20 border border-white/[0.06] px-3 py-2">
          <span className="text-sky-400 font-semibold">{t("glove.ct")}:</span>{' '}
          <span className="text-gray-200">{selectedCtName}</span>
        </div>
        <div className="flex-1 rounded-lg bg-black/20 border border-white/[0.06] px-3 py-2">
          <span className="text-orange-400 font-semibold">{t("glove.t")}:</span>{' '}
          <span className="text-gray-200">{selectedTName}</span>
        </div>
      </div>

      <button
        onClick={handleRandom}
        className={`card card-hover w-full text-center py-3 ${
          loadout.gloveIndexCt === -1 && loadout.gloveIndexT === -1 ? 'card-selected' : ''
        }`}
      >
        <div className="text-sm font-semibold text-white">{t("preview.random")}</div>
        <div className="text-xs text-gray-500 mt-0.5">{t("glove.selectType")}</div>
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {gloves.map((glove, index) => (
          <button
            key={glove.defindex}
            onClick={() => handleGloveSelect(index)}
            className={`card card-hover !p-3 text-left ${selectedGlove === index ? 'card-selected' : ''}`}
          >
            <div className="flex items-center space-x-2">
              <img
                src={getGloveTypeImage(glove.defindex, glove.codename)}
                alt={glove.name}
                className="w-10 h-10 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div>
                <div className="text-xs font-semibold text-white">
                  {getGloveLocalizedName(glove.defindex, glove.name, lang)}
                </div>
                <div className="text-xs text-gray-500">{glove.paints.length} {t("tab.gloves").toLowerCase()}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedGlove !== null && (
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-3">
            {getGloveLocalizedName(gloves[selectedGlove].defindex, gloves[selectedGlove].name, lang)} - {t("glove.selectPaint")}
            <span className={`ml-2 text-[11px] font-bold ${selectedTeam === 'ct' ? 'text-sky-400' : 'text-orange-400'}`}>
              {selectedTeam === 'ct' ? t('team.ct') : t('team.t')}
            </span>
          </h3>

          {/* Wear + Seed controls (with manual input) */}
          <div className="mb-4">
            <WearSeedControls
              wear={currentWear}
              seed={currentSeed}
              onWearChange={handleWearChange}
              onSeedChange={handleSeedChange}
            />
          </div>

          {/* Selected paint preview + Choose Skin button */}
          <div className="mb-4">
            {currentPaint >= 0 ? (
              <div className="flex items-center gap-3 p-2.5 bg-amber-500/[0.08] rounded-lg border border-amber-500/20">
                {(() => {
                  const paint = gloves[selectedGlove].paints.find(p => p.id === currentPaint);
                  return (
                    <>
                      {paint?.image && (
                        <img src={paint.image} alt={paint.name}
                          className="w-14 h-14 object-contain rounded"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-amber-200 truncate">
                          {getGlovePaintLocalizedName(gloves[selectedGlove].defindex, currentPaint, paint?.name || `Paint #${currentPaint}`, lang)}
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
      {showSkinModal && selectedGlove !== null && (
        <SkinPickerModal
          title={`${getGloveLocalizedName(gloves[selectedGlove].defindex, gloves[selectedGlove].name, lang)} - ${selectedTeam === 'ct' ? t('team.ct') : t('team.t')}`}
          items={gloves[selectedGlove].paints.map(p => ({
            id: p.id,
            name: getGlovePaintLocalizedName(gloves[selectedGlove].defindex, p.id, p.name, lang),
            image: p.image,
          }))}
          selectedId={currentPaint >= 0 ? currentPaint : null}
          onSelect={(id) => { handlePaintSelect(id); setShowSkinModal(false); }}
          onClose={() => setShowSkinModal(false)}
        />
      )}
    </div>
  );
}
