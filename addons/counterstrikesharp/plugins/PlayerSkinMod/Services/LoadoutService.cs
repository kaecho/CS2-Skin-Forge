using System.Text.Json;
using Microsoft.Extensions.Logging;
using PlayerSkinMod.Models;

namespace PlayerSkinMod.Services;

public static class LoadoutService
{
    public static void LoadFromFile(
        string filePath,
        Dictionary<int, PlayerLoadout> playerLoadouts,
        ILogger logger)
    {
        try
        {
            if (!File.Exists(filePath))
            {
                logger.LogInformation($"[PlayerSkinMod] Loadout file not found: {filePath} (will use random skins)");
                return;
            }

            var json = File.ReadAllText(filePath);
            if (string.IsNullOrWhiteSpace(json))
            {
                logger.LogInformation("[PlayerSkinMod] Loadout file is empty");
                return;
            }

            logger.LogInformation($"[PlayerSkinMod] Read loadout file ({json.Length} bytes): {json.Substring(0, Math.Min(200, json.Length))}");

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            foreach (var prop in root.EnumerateObject())
            {
                if (!int.TryParse(prop.Name, out int slot))
                {
                    logger.LogWarning($"[PlayerSkinMod] Skipping non-numeric key: {prop.Name}");
                    continue;
                }
                var loadoutEl = prop.Value;

                var loadout = new PlayerLoadout();

                if (loadoutEl.TryGetProperty("useRandom", out var useRandomEl))
                    loadout.UseRandom = useRandomEl.GetBoolean();

                if (loadoutEl.TryGetProperty("knifeIndex", out var knifeIdxEl) && knifeIdxEl.GetInt32() >= 0)
                    loadout.KnifeIndex = knifeIdxEl.GetInt32();

                if (loadoutEl.TryGetProperty("knifePaint", out var knifePaintEl) && knifePaintEl.GetInt32() >= 0)
                    loadout.KnifePaint = knifePaintEl.GetInt32();

                if (loadoutEl.TryGetProperty("knifeWear", out var knifeWearEl))
                    loadout.KnifeWear = (float)knifeWearEl.GetDouble();

                if (loadoutEl.TryGetProperty("knifeSeed", out var knifeSeedEl))
                    loadout.KnifeSeed = knifeSeedEl.GetInt32();

                // Per-team knives (v1.6.0+)
                if (loadoutEl.TryGetProperty("knifeIndexCt", out var knifeIdxCtEl) && knifeIdxCtEl.GetInt32() >= 0)
                    loadout.KnifeIndexCt = knifeIdxCtEl.GetInt32();
                if (loadoutEl.TryGetProperty("knifePaintCt", out var knifePaintCtEl) && knifePaintCtEl.GetInt32() >= 0)
                    loadout.KnifePaintCt = knifePaintCtEl.GetInt32();
                if (loadoutEl.TryGetProperty("knifeWearCt", out var knifeWearCtEl))
                    loadout.KnifeWearCt = (float)knifeWearCtEl.GetDouble();
                if (loadoutEl.TryGetProperty("knifeSeedCt", out var knifeSeedCtEl))
                    loadout.KnifeSeedCt = knifeSeedCtEl.GetInt32();
                if (loadoutEl.TryGetProperty("knifeIndexT", out var knifeIdxTEl) && knifeIdxTEl.GetInt32() >= 0)
                    loadout.KnifeIndexT = knifeIdxTEl.GetInt32();
                if (loadoutEl.TryGetProperty("knifePaintT", out var knifePaintTEl) && knifePaintTEl.GetInt32() >= 0)
                    loadout.KnifePaintT = knifePaintTEl.GetInt32();
                if (loadoutEl.TryGetProperty("knifeWearT", out var knifeWearTEl))
                    loadout.KnifeWearT = (float)knifeWearTEl.GetDouble();
                if (loadoutEl.TryGetProperty("knifeSeedT", out var knifeSeedTEl))
                    loadout.KnifeSeedT = knifeSeedTEl.GetInt32();

                // Backward compat: old shared knife fields → apply to both teams
                if (loadout.KnifeIndexCt < 0 && loadout.KnifeIndexT < 0 && loadout.KnifeIndex >= 0)
                {
                    loadout.KnifeIndexCt = loadout.KnifeIndex;
                    loadout.KnifeIndexT = loadout.KnifeIndex;
                    loadout.KnifePaintCt = loadout.KnifePaint;
                    loadout.KnifePaintT = loadout.KnifePaint;
                    loadout.KnifeWearCt = loadout.KnifeWear;
                    loadout.KnifeWearT = loadout.KnifeWear;
                    loadout.KnifeSeedCt = loadout.KnifeSeed;
                    loadout.KnifeSeedT = loadout.KnifeSeed;
                }

                // Per-team gloves
                if (loadoutEl.TryGetProperty("gloveIndexCt", out var gloveIdxCtEl) && gloveIdxCtEl.GetInt32() >= 0)
                    loadout.GloveIndexCt = gloveIdxCtEl.GetInt32();
                if (loadoutEl.TryGetProperty("glovePaintCt", out var glovePaintCtEl) && glovePaintCtEl.GetInt32() >= 0)
                    loadout.GlovePaintCt = glovePaintCtEl.GetInt32();
                if (loadoutEl.TryGetProperty("gloveWearCt", out var gloveWearCtEl))
                    loadout.GloveWearCt = (float)gloveWearCtEl.GetDouble();
                if (loadoutEl.TryGetProperty("gloveSeedCt", out var gloveSeedCtEl))
                    loadout.GloveSeedCt = gloveSeedCtEl.GetInt32();
                if (loadoutEl.TryGetProperty("gloveDefIndexCt", out var gloveDefIdxCtEl) && gloveDefIdxCtEl.GetUInt16() > 0)
                    loadout.GloveDefIndexCt = gloveDefIdxCtEl.GetUInt16();

                if (loadoutEl.TryGetProperty("gloveIndexT", out var gloveIdxTEl) && gloveIdxTEl.GetInt32() >= 0)
                    loadout.GloveIndexT = gloveIdxTEl.GetInt32();
                if (loadoutEl.TryGetProperty("glovePaintT", out var glovePaintTEl) && glovePaintTEl.GetInt32() >= 0)
                    loadout.GlovePaintT = glovePaintTEl.GetInt32();
                if (loadoutEl.TryGetProperty("gloveWearT", out var gloveWearTEl))
                    loadout.GloveWearT = (float)gloveWearTEl.GetDouble();
                if (loadoutEl.TryGetProperty("gloveSeedT", out var gloveSeedTEl))
                    loadout.GloveSeedT = gloveSeedTEl.GetInt32();
                if (loadoutEl.TryGetProperty("gloveDefIndexT", out var gloveDefIdxTEl) && gloveDefIdxTEl.GetUInt16() > 0)
                    loadout.GloveDefIndexT = gloveDefIdxTEl.GetUInt16();

                // Backward compat: old single glove fields → use for both teams
                if (loadout.GloveIndexCt < 0 && loadout.GloveIndexT < 0)
                {
                    if (loadoutEl.TryGetProperty("gloveIndex", out var oldGloveIdxEl) && oldGloveIdxEl.GetInt32() >= 0)
                    {
                        loadout.GloveIndexCt = oldGloveIdxEl.GetInt32();
                        loadout.GloveIndexT = oldGloveIdxEl.GetInt32();
                    }
                }
                if (loadout.GlovePaintCt < 0 && loadout.GlovePaintT < 0)
                {
                    if (loadoutEl.TryGetProperty("glovePaint", out var oldGlovePaintEl) && oldGlovePaintEl.GetInt32() >= 0)
                    {
                        loadout.GlovePaintCt = oldGlovePaintEl.GetInt32();
                        loadout.GlovePaintT = oldGlovePaintEl.GetInt32();
                    }
                }
                // Backward compat: old singular gloveDefIndex (pre-v1.4.0 panels)
                if (loadout.GloveDefIndexCt == 0 && loadout.GloveDefIndexT == 0)
                {
                    if (loadoutEl.TryGetProperty("gloveDefIndex", out var oldGloveDefIdxEl) && oldGloveDefIdxEl.GetUInt16() > 0)
                    {
                        loadout.GloveDefIndexCt = oldGloveDefIdxEl.GetUInt16();
                        loadout.GloveDefIndexT = oldGloveDefIdxEl.GetUInt16();
                    }
                }
                // For wear/seed backward compat, only apply if old fields exist and new ones are default
                if (loadoutEl.TryGetProperty("gloveWear", out var oldGloveWearEl))
                {
                    var oldWear = (float)oldGloveWearEl.GetDouble();
                    if (loadout.GloveWearCt == 0.01f) loadout.GloveWearCt = oldWear;
                    if (loadout.GloveWearT == 0.01f) loadout.GloveWearT = oldWear;
                }
                if (loadoutEl.TryGetProperty("gloveSeed", out var oldGloveSeedEl))
                {
                    var oldSeed = oldGloveSeedEl.GetInt32();
                    if (loadout.GloveSeedCt == 0) loadout.GloveSeedCt = oldSeed;
                    if (loadout.GloveSeedT == 0) loadout.GloveSeedT = oldSeed;
                }

                // New: separate CT/T agent models
                if (loadoutEl.TryGetProperty("agentModelCt", out var agentCtEl) && agentCtEl.GetInt32() >= 0)
                    loadout.AgentModelCt = agentCtEl.GetInt32();
                if (loadoutEl.TryGetProperty("agentModelT", out var agentTEl) && agentTEl.GetInt32() >= 0)
                    loadout.AgentModelT = agentTEl.GetInt32();
                // New: model path for direct lookup (more reliable than index)
                if (loadoutEl.TryGetProperty("agentModelPathCt", out var agentPathCtEl))
                {
                    var p = agentPathCtEl.GetString();
                    if (!string.IsNullOrEmpty(p)) loadout.AgentModelPathCt = p;
                }
                if (loadoutEl.TryGetProperty("agentModelPathT", out var agentPathTEl))
                {
                    var p = agentPathTEl.GetString();
                    if (!string.IsNullOrEmpty(p)) loadout.AgentModelPathT = p;
                }
                // Backward compat: if old agentModel exists and new fields don't, use old value for both
                if (loadout.AgentModelCt < 0 && loadout.AgentModelT < 0 && loadoutEl.TryGetProperty("agentModel", out var oldAgentEl) && oldAgentEl.GetInt32() >= 0)
                {
                    loadout.AgentModelCt = oldAgentEl.GetInt32();
                    loadout.AgentModelT = oldAgentEl.GetInt32();
                }

                if (loadoutEl.TryGetProperty("musicKit", out var musicEl) && musicEl.GetInt32() >= 0)
                    loadout.MusicKit = musicEl.GetInt32();

                if (loadoutEl.TryGetProperty("weaponPaints", out var wpEl))
                {
                    foreach (var wp in wpEl.EnumerateObject())
                    {
                        if (ushort.TryParse(wp.Name, out ushort defIndex) && wp.Value.GetInt32() >= 0)
                            loadout.WeaponPaints[defIndex] = wp.Value.GetInt32();
                    }
                }

                // NEW: Load weapon seeds (backward-compatible, missing = 0)
                if (loadoutEl.TryGetProperty("weaponSeeds", out var wsEl))
                {
                    foreach (var ws in wsEl.EnumerateObject())
                    {
                        if (ushort.TryParse(ws.Name, out ushort defIndex))
                            loadout.WeaponSeeds[defIndex] = ws.Value.GetInt32();
                    }
                }

                // NEW: Load weapon wears (backward-compatible, missing = 0.01f)
                if (loadoutEl.TryGetProperty("weaponWears", out var wwEl))
                {
                    foreach (var ww in wwEl.EnumerateObject())
                    {
                        if (ushort.TryParse(ww.Name, out ushort defIndex))
                            loadout.WeaponWears[defIndex] = (float)ww.Value.GetDouble();
                    }
                }

                // Per-team weapon skins (v1.6.0+)
                ParseUShortIntMap(loadoutEl, "weaponPaintsCt", loadout.WeaponPaintsCt);
                ParseUShortIntMap(loadoutEl, "weaponSeedsCt", loadout.WeaponSeedsCt);
                ParseUShortFloatMap(loadoutEl, "weaponWearsCt", loadout.WeaponWearsCt);
                ParseUShortIntMap(loadoutEl, "weaponPaintsT", loadout.WeaponPaintsT);
                ParseUShortIntMap(loadoutEl, "weaponSeedsT", loadout.WeaponSeedsT);
                ParseUShortFloatMap(loadoutEl, "weaponWearsT", loadout.WeaponWearsT);

                // Backward compat: old shared weapon maps → apply to both teams
                if (loadout.WeaponPaintsCt.Count == 0 && loadout.WeaponPaintsT.Count == 0 && loadout.WeaponPaints.Count > 0)
                {
                    foreach (var kv in loadout.WeaponPaints)
                    {
                        loadout.WeaponPaintsCt[kv.Key] = kv.Value;
                        loadout.WeaponPaintsT[kv.Key] = kv.Value;
                    }
                    foreach (var kv in loadout.WeaponSeeds)
                    {
                        loadout.WeaponSeedsCt[kv.Key] = kv.Value;
                        loadout.WeaponSeedsT[kv.Key] = kv.Value;
                    }
                    foreach (var kv in loadout.WeaponWears)
                    {
                        loadout.WeaponWearsCt[kv.Key] = kv.Value;
                        loadout.WeaponWearsT[kv.Key] = kv.Value;
                    }
                }

                if (loadoutEl.TryGetProperty("weaponStickers", out var wstEl))
                {
                    foreach (var ws in wstEl.EnumerateObject())
                    {
                        if (!ushort.TryParse(ws.Name, out ushort defIdx)) continue;
                        var stickerList = new List<StickerInfo>();
                        foreach (var sEl in ws.Value.EnumerateArray())
                        {
                            var si = new StickerInfo();
                            if (sEl.TryGetProperty("id", out var idEl)) si.Id = (uint)idEl.GetInt32();
                            if (sEl.TryGetProperty("offsetX", out var oxEl)) si.OffsetX = (float)oxEl.GetDouble();
                            if (sEl.TryGetProperty("offsetY", out var oyEl)) si.OffsetY = (float)oyEl.GetDouble();
                            if (sEl.TryGetProperty("wear", out var wEl)) si.Wear = (float)wEl.GetDouble();
                            if (sEl.TryGetProperty("scale", out var scEl)) si.Scale = (float)scEl.GetDouble();
                            if (sEl.TryGetProperty("rotation", out var rEl)) si.Rotation = (float)rEl.GetDouble();
                            stickerList.Add(si);
                        }
                        if (stickerList.Count > 0)
                            loadout.WeaponStickers[defIdx] = stickerList;
                    }
                }

                // NEW: Load weapon keychains
                if (loadoutEl.TryGetProperty("weaponKeychains", out var wkEl))
                {
                    foreach (var wk in wkEl.EnumerateObject())
                    {
                        if (!ushort.TryParse(wk.Name, out ushort defIdx)) continue;
                        var kc = new KeychainInfo();
                        var kcEl = wk.Value;
                        if (kcEl.TryGetProperty("id", out var kcIdEl)) kc.Id = (uint)kcIdEl.GetInt32();
                        if (kcEl.TryGetProperty("offsetX", out var kcOxEl)) kc.OffsetX = (float)kcOxEl.GetDouble();
                        if (kcEl.TryGetProperty("offsetY", out var kcOyEl)) kc.OffsetY = (float)kcOyEl.GetDouble();
                        if (kcEl.TryGetProperty("offsetZ", out var kcOzEl)) kc.OffsetZ = (float)kcOzEl.GetDouble();
                        if (kcEl.TryGetProperty("seed", out var kcSeedEl)) kc.Seed = kcSeedEl.GetInt32();
                        if (kc.Id > 0)
                            loadout.WeaponKeychains[defIdx] = kc;
                    }
                }

                // NEW: Load weapon nametags
                if (loadoutEl.TryGetProperty("weaponNametags", out var wnEl))
                {
                    foreach (var wn in wnEl.EnumerateObject())
                    {
                        if (ushort.TryParse(wn.Name, out ushort defIdx))
                        {
                            var name = wn.Value.GetString();
                            if (!string.IsNullOrEmpty(name))
                                loadout.WeaponNametags[defIdx] = name;
                        }
                    }
                }

                // NEW: Load weapon stattrak
                if (loadoutEl.TryGetProperty("weaponStatTrak", out var wst2El))
                {
                    foreach (var ws in wst2El.EnumerateObject())
                    {
                        if (!ushort.TryParse(ws.Name, out ushort defIdx)) continue;
                        var st = new StatTrakInfo();
                        var stEl = ws.Value;
                        if (stEl.TryGetProperty("enabled", out var enEl)) st.Enabled = enEl.GetBoolean();
                        if (stEl.TryGetProperty("count", out var cntEl)) st.Count = cntEl.GetInt32();
                        if (st.Enabled)
                            loadout.WeaponStatTrak[defIdx] = st;
                    }
                }

                playerLoadouts[slot] = loadout;
                logger.LogInformation($"[PlayerSkinMod] Loaded loadout for slot {slot}: knife={loadout.KnifeIndex}, gloveCT={loadout.GloveIndexCt}, gloveT={loadout.GloveIndexT}, agentCT={loadout.AgentModelCt}, agentT={loadout.AgentModelT}, music={loadout.MusicKit}, weapons={loadout.WeaponPaints.Count}, keychains={loadout.WeaponKeychains.Count}, random={loadout.UseRandom}");
            }
        }
        catch (Exception ex)
        {
            logger.LogError($"[PlayerSkinMod] LoadLoadoutFromFile failed: {ex.Message}");
        }
    }

    private static void ParseUShortIntMap(JsonElement parent, string propName, Dictionary<ushort, int> target)
    {
        if (!parent.TryGetProperty(propName, out var mapEl) || mapEl.ValueKind != JsonValueKind.Object) return;
        foreach (var kv in mapEl.EnumerateObject())
        {
            if (ushort.TryParse(kv.Name, out ushort defIndex) && kv.Value.GetInt32() >= 0)
                target[defIndex] = kv.Value.GetInt32();
        }
    }

    private static void ParseUShortFloatMap(JsonElement parent, string propName, Dictionary<ushort, float> target)
    {
        if (!parent.TryGetProperty(propName, out var mapEl) || mapEl.ValueKind != JsonValueKind.Object) return;
        foreach (var kv in mapEl.EnumerateObject())
        {
            if (ushort.TryParse(kv.Name, out ushort defIndex))
                target[defIndex] = (float)kv.Value.GetDouble();
        }
    }

    public static HashSet<(ushort DefIndex, int Paint)> LoadLegacyPaints(string moduleDirectory, ILogger logger)
    {
        var legacyPaints = new HashSet<(ushort DefIndex, int Paint)>();
        try
        {
            var path = Path.Combine(moduleDirectory, "skins_en.json");
            if (!File.Exists(path))
            {
                logger.LogWarning("[PlayerSkinMod] skins_en.json not found; weapon skins may map to the wrong model position");
                return legacyPaints;
            }

            using var doc = JsonDocument.Parse(File.ReadAllText(path));
            foreach (var el in doc.RootElement.EnumerateArray())
            {
                if (!el.TryGetProperty("legacy_model", out var legacyEl)
                    || legacyEl.ValueKind != JsonValueKind.True)
                    continue;
                if (!el.TryGetProperty("weapon_defindex", out var defEl)) continue;
                if (!el.TryGetProperty("paint", out var paintEl)) continue;

                legacyPaints.Add(((ushort)ReadInt(defEl), ReadInt(paintEl)));
            }
        }
        catch (Exception ex)
        {
            logger.LogError($"[PlayerSkinMod] LoadLegacyPaints failed: {ex.Message}");
        }

        return legacyPaints;

        static int ReadInt(JsonElement e) =>
            e.ValueKind == JsonValueKind.Number
                ? e.GetInt32()
                : int.TryParse(e.GetString(), out var v) ? v : 0;
    }
}
