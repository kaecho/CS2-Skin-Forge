import { useState, useMemo, useEffect } from 'react';
import { Loadout, Team } from '../utils/types';
import { weapons, weaponCategories, getWeaponsByCategory } from '../data/weapons';
import { weaponPaints } from '../data/skins';
import { allStickers, getStickerImageUrl } from '../data/stickers';
import { allKeychains, getKeychainImageUrl, type KeychainData } from '../data/keychains';
import { getWeaponDefaultImage } from '../data/weaponImages';
import { skinNamesEn } from '../data/skinNamesEn';
import { useT } from '../i18n';
import TeamToggle from './TeamToggle';
import WearSeedControls from './WearSeedControls';

interface WeaponPanelProps {
  loadout: Loadout;
  updateLoadout: (updates: Partial<Loadout>) => void;
}

export default function WeaponPanel({ loadout, updateLoadout }: WeaponPanelProps) {
  const { t, lang } = useT();
  const [team, setTeam] = useState<Team>('ct');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedWeapon, setSelectedWeapon] = useState<number | null>(null);
  const [activeStickerSlot, setActiveStickerSlot] = useState(0);
  const [stickerSearch, setStickerSearch] = useState('');
  const [stickerLimit, setStickerLimit] = useState(100);
  const [keychainSearch, setKeychainSearch] = useState('');
  const [keychainLimit, setKeychainLimit] = useState(100);
  const [copied, setCopied] = useState(false);

  const filteredWeapons = getWeaponsByCategory(selectedCategory);
  const isChinese = lang === 'schinese' || lang === 'tchinese';

  // Per-team map accessors
  const paintsKey = team === 'ct' ? 'weaponPaintsCt' : 'weaponPaintsT';
  const wearsKey = team === 'ct' ? 'weaponWearsCt' : 'weaponWearsT';
  const seedsKey = team === 'ct' ? 'weaponSeedsCt' : 'weaponSeedsT';
  const paints = loadout[paintsKey];
  const wears = loadout[wearsKey];
  const seeds = loadout[seedsKey];
  const otherPaintsKey = team === 'ct' ? 'weaponPaintsT' : 'weaponPaintsCt';
  const otherWearsKey = team === 'ct' ? 'weaponWearsT' : 'weaponWearsCt';
  const otherSeedsKey = team === 'ct' ? 'weaponSeedsT' : 'weaponSeedsCt';

  const getPaintName = (defindex: number, paintId: number, fallbackName: string): string => {
    if (isChinese) return fallbackName;
    return skinNamesEn[defindex]?.[paintId] || fallbackName;
  };

  const translateStickerName = (name: string): string => {
    if (!isChinese) return name;
    return name
      .replace(/\(Holo\)/g, '(全息)')
      .replace(/\(Foil\)/g, '(箔金)')
      .replace(/\(Gold\)/g, '(金色)')
      .replace(/\(Glitter\)/g, '(闪亮)')
      .replace(/\(Paper\)/g, '(纸贴)')
      .replace(/\(Lenticular\)/g, '(光栅)');
  };

  const getDisplayName = (weapon: { name: string; nameZh: string }) => {
    return isChinese ? weapon.nameZh : weapon.name;
  };

  const getKeychainName = (kc: KeychainData) => {
    return isChinese ? (kc.nameZh || kc.name) : kc.name;
  };

  const handlePaintSelect = (defindex: number, paintId: number) => {
    updateLoadout({
      [paintsKey]: { ...paints, [defindex]: paintId },
      useRandom: false,
    } as Partial<Loadout>);
  };

  const clearWeaponPaint = (defindex: number) => {
    const removeKey = (map: Record<number, unknown>) => {
      const next = { ...map };
      delete next[defindex];
      return next;
    };
    const newPaintsCt = removeKey(loadout.weaponPaintsCt);
    const newPaintsT = removeKey(loadout.weaponPaintsT);
    updateLoadout({
      weaponPaintsCt: newPaintsCt as Record<number, number>,
      weaponPaintsT: newPaintsT as Record<number, number>,
      weaponWearsCt: removeKey(loadout.weaponWearsCt) as Record<number, number>,
      weaponWearsT: removeKey(loadout.weaponWearsT) as Record<number, number>,
      weaponSeedsCt: removeKey(loadout.weaponSeedsCt) as Record<number, number>,
      weaponSeedsT: removeKey(loadout.weaponSeedsT) as Record<number, number>,
      weaponStickers: removeKey(loadout.weaponStickers) as Loadout['weaponStickers'],
      weaponKeychains: removeKey(loadout.weaponKeychains) as Loadout['weaponKeychains'],
      weaponNametags: removeKey(loadout.weaponNametags) as Record<number, string>,
      weaponStatTrak: removeKey(loadout.weaponStatTrak) as Loadout['weaponStatTrak'],
      useRandom: Object.keys(newPaintsCt).length === 0 && Object.keys(newPaintsT).length === 0,
    });
  };

  /** Copy the selected weapon's paint/wear/seed from the active team to the other team. */
  const copyToOtherTeam = (defindex: number) => {
    if (paints[defindex] === undefined) return;
    updateLoadout({
      [otherPaintsKey]: { ...loadout[otherPaintsKey], [defindex]: paints[defindex] },
      [otherWearsKey]: { ...loadout[otherWearsKey], [defindex]: wears[defindex] ?? 0.01 },
      [otherSeedsKey]: { ...loadout[otherSeedsKey], [defindex]: seeds[defindex] ?? 0 },
    } as Partial<Loadout>);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleStickerSelect = (defindex: number, stickerId: number) => {
    const existing = loadout.weaponStickers[defindex] ? [...loadout.weaponStickers[defindex]] : [{ id: 0 }, { id: 0 }, { id: 0 }, { id: 0 }, { id: 0 }];
    existing[activeStickerSlot] = { id: stickerId, scale: 1, wear: 0, rotation: 0, offsetX: 0, offsetY: 0 };
    updateLoadout({
      weaponStickers: { ...loadout.weaponStickers, [defindex]: existing },
    });
  };

  const clearStickerSlot = (defindex: number, slot: number) => {
    const existing = loadout.weaponStickers[defindex] ? [...loadout.weaponStickers[defindex]] : [{ id: 0 }, { id: 0 }, { id: 0 }, { id: 0 }, { id: 0 }];
    existing[slot] = { id: 0 };
    updateLoadout({
      weaponStickers: { ...loadout.weaponStickers, [defindex]: existing },
    });
  };

  const handleWearChange = (defindex: number, wear: number) => {
    updateLoadout({ [wearsKey]: { ...wears, [defindex]: wear } } as Partial<Loadout>);
  };

  const handleSeedChange = (defindex: number, seed: number) => {
    updateLoadout({ [seedsKey]: { ...seeds, [defindex]: seed } } as Partial<Loadout>);
  };

  // Keychain handlers
  const handleKeychainSelect = (defindex: number, keychainId: number) => {
    const existing = loadout.weaponKeychains[defindex] || { id: 0, offsetX: 0, offsetY: 0, offsetZ: 0, seed: 0 };
    updateLoadout({
      weaponKeychains: { ...loadout.weaponKeychains, [defindex]: { ...existing, id: keychainId } },
    });
  };

  const clearKeychain = (defindex: number) => {
    const newKeychains = { ...loadout.weaponKeychains };
    delete newKeychains[defindex];
    updateLoadout({ weaponKeychains: newKeychains });
  };

  // Nametag handlers
  const handleNametagChange = (defindex: number, name: string) => {
    const newNametags = { ...loadout.weaponNametags };
    if (name.trim() === '') {
      delete newNametags[defindex];
    } else {
      newNametags[defindex] = name;
    }
    updateLoadout({ weaponNametags: newNametags });
  };

  // StatTrak handlers
  const handleStatTrakToggle = (defindex: number) => {
    const existing = loadout.weaponStatTrak[defindex] || { enabled: false, count: 0 };
    const newStatTrak = { ...loadout.weaponStatTrak };
    if (existing.enabled) {
      delete newStatTrak[defindex];
    } else {
      newStatTrak[defindex] = { enabled: true, count: 0 };
    }
    updateLoadout({ weaponStatTrak: newStatTrak });
  };

  const handleStatTrakCountChange = (defindex: number, count: number) => {
    const existing = loadout.weaponStatTrak[defindex] || { enabled: true, count: 0 };
    updateLoadout({
      weaponStatTrak: { ...loadout.weaponStatTrak, [defindex]: { ...existing, count } },
    });
  };

  const getCategoryLabel = (category: string) => {
    const keyMap: Record<string, string> = {
      'All': 'weapon.all', 'Pistols': 'weapon.pistols', 'Rifles': 'weapon.rifles',
      'Snipers': 'weapon.snipers', 'SMGs': 'weapon.smgs', 'Heavy': 'weapon.heavy',
    };
    return t(keyMap[category] as any) || category;
  };

  // Filter stickers based on search
  const allFilteredStickers = useMemo(() => {
    let filtered = allStickers;
    if (stickerSearch.trim()) {
      const query = stickerSearch.toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(query));
    }
    return filtered;
  }, [stickerSearch]);

  // Filter keychains based on search
  const allFilteredKeychains = useMemo(() => {
    let filtered = allKeychains;
    if (keychainSearch.trim()) {
      const query = keychainSearch.toLowerCase();
      filtered = filtered.filter(k => k.name.toLowerCase().includes(query));
    }
    return filtered;
  }, [keychainSearch]);

  // Reset limits when search changes
  useEffect(() => {
    setStickerLimit(100);
  }, [stickerSearch]);

  useEffect(() => {
    setKeychainLimit(100);
  }, [keychainSearch]);

  const filteredStickers = useMemo(() => {
    return allFilteredStickers.slice(0, stickerLimit);
  }, [allFilteredStickers, stickerLimit]);

  const filteredKeychains = useMemo(() => {
    return allFilteredKeychains.slice(0, keychainLimit);
  }, [allFilteredKeychains, keychainLimit]);

  return (
    <div className="space-y-3">
      {/* Team selector: weapon skins are configured per team */}
      <TeamToggle team={team} onChange={setTeam} ctLabel={t('team.ct')} tLabel={t('team.t')} />

      <div className="flex flex-wrap gap-1.5">
        {weaponCategories.map(category => (
          <button key={category} onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 ${
              selectedCategory === category
                ? 'bg-amber-500 text-black'
                : 'bg-white/[0.05] text-gray-300 hover:bg-white/10 border border-white/[0.06]'
            }`}>
            {getCategoryLabel(category)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {filteredWeapons.map(weapon => {
          const hasCt = loadout.weaponPaintsCt[weapon.defindex] !== undefined;
          const hasT = loadout.weaponPaintsT[weapon.defindex] !== undefined;
          const isSelected = selectedWeapon === weapon.defindex;
          return (
            <button key={weapon.defindex} onClick={() => setSelectedWeapon(isSelected ? null : weapon.defindex)}
              className={`card card-hover !p-2 text-left cursor-pointer overflow-hidden relative
                ${isSelected ? 'card-selected' : ''}`}>
              {(hasCt || hasT) && (
                <div className="absolute top-1.5 right-1.5 flex gap-1">
                  {hasCt && <span className="w-2 h-2 rounded-full bg-sky-400" title="CT" />}
                  {hasT && <span className="w-2 h-2 rounded-full bg-orange-400" title="T" />}
                </div>
              )}
              <img src={getWeaponDefaultImage(weapon.defindex)} alt={weapon.name}
                className="w-full h-12 object-contain mb-1 opacity-90"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className="text-xs font-semibold text-white truncate">{getDisplayName(weapon)}</div>
            </button>
          );
        })}
      </div>

      {selectedWeapon && weaponPaints[selectedWeapon] && (
        <div className="card">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h3 className="text-sm font-semibold text-white truncate">
              {getDisplayName(weapons.find(w => w.defindex === selectedWeapon)!)}
              <span className={`ml-2 text-[11px] font-bold ${team === 'ct' ? 'text-sky-400' : 'text-orange-400'}`}>
                {team === 'ct' ? t('team.ct') : t('team.t')}
              </span>
            </h3>
            <div className="flex items-center gap-2 shrink-0">
              {paints[selectedWeapon] !== undefined && (
                <button onClick={() => copyToOtherTeam(selectedWeapon)}
                  className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded-md bg-white/[0.05] border border-white/[0.08] transition-colors">
                  {copied ? t('team.copied') : (team === 'ct' ? t('team.copyToT') : t('team.copyToCt'))}
                </button>
              )}
              {(loadout.weaponPaintsCt[selectedWeapon] !== undefined || loadout.weaponPaintsT[selectedWeapon] !== undefined) && (
                <button onClick={() => clearWeaponPaint(selectedWeapon)} className="text-xs text-red-400 hover:text-red-300">
                  {t("btn.reset")}
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
            {weaponPaints[selectedWeapon].map(paint => (
              <button key={paint.id} onClick={() => handlePaintSelect(selectedWeapon, paint.id)}
                className={`flex flex-col items-center p-2 rounded-lg text-xs font-medium transition-colors duration-150 border ${
                  paints[selectedWeapon] === paint.id
                    ? 'bg-amber-500/[0.12] text-amber-200 border-amber-500/50'
                    : 'bg-white/[0.04] text-gray-300 hover:bg-white/[0.08] border-white/[0.05]'
                }`}>
                {paint.image && (
                  <img src={paint.image} alt={paint.name}
                    className="w-full h-12 object-contain mb-1"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                <span className="truncate w-full text-center">{getPaintName(selectedWeapon, paint.id, paint.name)}</span>
              </button>
            ))}
          </div>

          {/* Wear & Seed controls (with manual input) */}
          {paints[selectedWeapon] !== undefined && (
            <div className="mt-4 border-t border-white/[0.06] pt-3 space-y-3">
              <h4 className="section-label">{t("weapon.settings")}</h4>
              <WearSeedControls
                wear={wears[selectedWeapon] ?? 0.01}
                seed={seeds[selectedWeapon] ?? 0}
                onWearChange={(w) => handleWearChange(selectedWeapon, w)}
                onSeedChange={(s) => handleSeedChange(selectedWeapon, s)}
              />

              <div className="space-y-3 p-3 bg-black/20 rounded-lg border border-white/[0.04]">
                {/* Nametag */}
                <div>
                  <label className="text-xs text-gray-400 block mb-1">{t("weapon.nametag")}</label>
                  <input
                    type="text"
                    placeholder={t("weapon.nametagPlaceholder")}
                    value={loadout.weaponNametags[selectedWeapon] ?? ''}
                    onChange={(e) => handleNametagChange(selectedWeapon, e.target.value)}
                    maxLength={64}
                    className="input-field !text-xs"
                  />
                </div>

                {/* StatTrak */}
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">{t("weapon.stattrak")}</label>
                  <button
                    onClick={() => handleStatTrakToggle(selectedWeapon)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                      loadout.weaponStatTrak[selectedWeapon]?.enabled
                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                        : 'bg-white/[0.05] text-gray-400 hover:bg-white/10 border border-white/[0.08]'
                    }`}
                  >
                    {loadout.weaponStatTrak[selectedWeapon]?.enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                {loadout.weaponStatTrak[selectedWeapon]?.enabled && (
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-400">{t("weapon.stattrakCount")}</label>
                    <input
                      type="number"
                      min="0"
                      max="999999"
                      value={loadout.weaponStatTrak[selectedWeapon]?.count ?? 0}
                      onChange={(e) => handleStatTrakCountChange(selectedWeapon, parseInt(e.target.value) || 0)}
                      className="num-input !w-24"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sticker Section */}
          <div className="mt-4 border-t border-white/[0.06] pt-3">
            <h4 className="section-label mb-2">Stickers</h4>
            <div className="flex gap-1.5 mb-2">
              {[0,1,2,3,4].map(slot => {
                const stickers = loadout.weaponStickers[selectedWeapon] || [];
                const hasSticker = stickers[slot]?.id > 0;
                return (
                  <button key={slot} onClick={() => setActiveStickerSlot(slot)}
                    className={`relative px-2.5 py-1 rounded-md text-xs transition-colors ${
                      activeStickerSlot === slot
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-white/[0.05] text-gray-400 hover:bg-white/10 border border-white/[0.06]'
                    }`}>
                    {slot + 1}
                    {hasSticker && <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full" />}
                  </button>
                );
              })}
            </div>

            {/* Current sticker in slot */}
            {(() => {
              const stickers = loadout.weaponStickers[selectedWeapon] || [];
              const current = stickers[activeStickerSlot];
              if (current?.id > 0) {
                const stickerData = allStickers.find(s => s.id === current.id);
                return (
                  <div className="flex items-center gap-2 mb-2 p-2 bg-black/20 rounded-lg border border-white/[0.04]">
                    <img src={getStickerImageUrl(stickerData?.image || `econ/stickers/community01`)}
                      alt={stickerData?.name || 'Sticker'} className="w-10 h-10 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <span className="text-xs text-white">{translateStickerName(stickerData?.name || `Sticker #${current.id}`)}</span>
                    <button onClick={() => clearStickerSlot(selectedWeapon, activeStickerSlot)}
                      className="ml-auto text-xs text-red-400 hover:text-red-300">✕</button>
                  </div>
                );
              }
              return <p className="text-xs text-gray-600 mb-2">Empty slot</p>;
            })()}

            {/* Sticker search */}
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder={t("weapon.stickerSearch")}
                value={stickerSearch}
                onChange={(e) => setStickerSearch(e.target.value)}
                className="input-field !text-xs"
              />
            </div>

            {/* Sticker grid */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-48 overflow-y-auto">
              {filteredStickers.map(sticker => (
                <button key={sticker.id} onClick={() => handleStickerSelect(selectedWeapon, sticker.id)}
                  className="flex flex-col items-center p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.04] transition-colors"
                  title={sticker.name}>
                  <img src={getStickerImageUrl(sticker.image)} alt={sticker.name}
                    className="w-8 h-8 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <span className="text-[10px] text-gray-400 truncate w-full text-center mt-0.5">{translateStickerName(sticker.name.split(' - ').pop() || sticker.name)}</span>
                </button>
              ))}
              {filteredStickers.length === 0 && (
                <div className="col-span-full text-center text-xs text-gray-600 py-2">
                  No stickers found
                </div>
              )}
            </div>
            {allFilteredStickers.length > stickerLimit && (
              <button
                onClick={() => setStickerLimit(prev => prev + 100)}
                className="w-full mt-2 py-1.5 text-xs text-gray-300 bg-white/[0.05] hover:bg-white/10 rounded-lg border border-white/[0.06] transition-colors"
              >
                Load More ({filteredStickers.length} / {allFilteredStickers.length})
              </button>
            )}
          </div>

          {/* Keychain Section */}
          <div className="mt-4 border-t border-white/[0.06] pt-3">
            <h4 className="section-label mb-2">{t("weapon.keychain")}</h4>

            {/* Current keychain */}
            {(() => {
              const current = loadout.weaponKeychains[selectedWeapon];
              if (current?.id > 0) {
                const keychainData = allKeychains.find(k => k.id === current.id);
                return (
                  <div className="flex items-center gap-2 mb-2 p-2 bg-black/20 rounded-lg border border-white/[0.04]">
                    <img src={getKeychainImageUrl(keychainData?.image || '')}
                      alt={keychainData ? getKeychainName(keychainData) : 'Keychain'} className="w-10 h-10 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <span className="text-xs text-white">{keychainData ? getKeychainName(keychainData) : `Keychain #${current.id}`}</span>
                    <button onClick={() => clearKeychain(selectedWeapon)}
                      className="ml-auto text-xs text-red-400 hover:text-red-300">✕</button>
                  </div>
                );
              }
              return <p className="text-xs text-gray-600 mb-2">No keychain equipped</p>;
            })()}

            {/* Keychain search */}
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder={t("weapon.keychainSearch")}
                value={keychainSearch}
                onChange={(e) => setKeychainSearch(e.target.value)}
                className="input-field !text-xs"
              />
            </div>

            {/* Keychain grid */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-48 overflow-y-auto">
              {filteredKeychains.map(keychain => (
                <button key={keychain.id} onClick={() => handleKeychainSelect(selectedWeapon, keychain.id)}
                  className={`flex flex-col items-center p-1.5 rounded-lg border transition-colors ${
                    loadout.weaponKeychains[selectedWeapon]?.id === keychain.id
                      ? 'bg-amber-500/[0.12] border-amber-500/50'
                      : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/[0.04]'
                  }`}
                  title={getKeychainName(keychain)}>
                  <img src={getKeychainImageUrl(keychain.image)} alt={getKeychainName(keychain)}
                    className="w-8 h-8 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <span className="text-[10px] text-gray-400 truncate w-full text-center mt-0.5">{getKeychainName(keychain).split(' | ').pop() || getKeychainName(keychain)}</span>
                </button>
              ))}
              {filteredKeychains.length === 0 && (
                <div className="col-span-full text-center text-xs text-gray-600 py-2">
                  No keychains found
                </div>
              )}
            </div>
            {allFilteredKeychains.length > keychainLimit && (
              <button
                onClick={() => setKeychainLimit(prev => prev + 100)}
                className="w-full mt-2 py-1.5 text-xs text-gray-300 bg-white/[0.05] hover:bg-white/10 rounded-lg border border-white/[0.06] transition-colors"
              >
                Load More ({filteredKeychains.length} / {allFilteredKeychains.length})
              </button>
            )}
          </div>
        </div>
      )}

      {selectedWeapon && !weaponPaints[selectedWeapon] && (
        <div className="card text-center py-6">
          <p className="text-sm text-gray-400">{t("weapon.noPaint")}</p>
        </div>
      )}
    </div>
  );
}
