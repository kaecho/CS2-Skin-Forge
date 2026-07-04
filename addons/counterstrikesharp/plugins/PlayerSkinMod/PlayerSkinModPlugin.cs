using System.Drawing;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text.Json;
using CounterStrikeSharp.API;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Core.Attributes.Registration;
using CounterStrikeSharp.API.Modules.Memory;
using CounterStrikeSharp.API.Modules.Memory.DynamicFunctions;
using CounterStrikeSharp.API.Modules.Commands;
using CounterStrikeSharp.API.Modules.Utils;
using Microsoft.Extensions.Logging;
using PlayerSkinMod.Models;
using PlayerSkinMod.Data;
using PlayerSkinMod.Services;

namespace PlayerSkinMod;

public class PlayerSkinModPlugin : BasePlugin
{
    public override string ModuleName        => "PlayerSkinMod";
    public override string ModuleVersion     => "1.6.0";
    public override string ModuleAuthor      => "CS2-Skin-local-mod";
    public override string ModuleDescription => "Allow players to customize weapon skins, knives, gloves, agent models, music kits locally";

    private readonly Random _rng = new();
    private readonly Dictionary<int, PlayerLoadout> _playerLoadouts = new();
    private readonly Dictionary<int, string> _playerModels = new();

    private bool _handling = false;
    private MemoryFunctionVoid<nint, string, float>? _setAttrByName;
    private ulong _nextItemId = 0xF00DCAFE;
    private bool _skinErrorLogged = false;

    // Loadout file path - will be set in Load()
    private string _loadoutFilePath = "";

    // Legacy paint detection
    private readonly HashSet<(ushort DefIndex, int Paint)> _legacyPaints = new();

    // Gun paint cache per (player slot, weapon defindex)
    private readonly Dictionary<(int Slot, ushort DefIndex), int> _playerGunPaints = new();

    public override void Load(bool hotReload)
    {
        _skinErrorLogged = false;
        var loadedLegacy = LoadoutService.LoadLegacyPaints(ModuleDirectory, Logger);
        _legacyPaints.Clear();
        foreach (var p in loadedLegacy) _legacyPaints.Add(p);

        // Set up loadout file path - store in the plugin directory
        _loadoutFilePath = Path.Combine(ModuleDirectory, "player_loadout.json");
        Logger.LogInformation($"[PlayerSkinMod] Loadout file path: {_loadoutFilePath}");
        Logger.LogInformation($"[PlayerSkinMod] File exists: {File.Exists(_loadoutFilePath)}");
        Logger.LogInformation($"[PlayerSkinMod] Plugin directory: {ModuleDirectory}");

        // Load any saved loadout from the panel
        LoadoutService.LoadFromFile(_loadoutFilePath, _playerLoadouts, Logger);
        Logger.LogInformation($"[PlayerSkinMod] Loaded loadouts: {_playerLoadouts.Count} entries");

        // Set up a file watcher to reload when the panel saves a new loadout
        try
        {
            var watcher = new FileSystemWatcher(ModuleDirectory, "player_loadout.json")
            {
                NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.CreationTime,
                EnableRaisingEvents = true
            };
            watcher.Changed += (sender, e) =>
            {
                // Small delay to ensure file is fully written
                System.Threading.Thread.Sleep(100);
                LoadoutService.LoadFromFile(_loadoutFilePath, _playerLoadouts, Logger);
                _playerModels.Clear(); // Clear cached models so agent changes take effect
                _playerGunPaints.Clear(); // Clear cached weapon paints so changes take effect
                Logger.LogInformation("[PlayerSkinMod] Loadout file changed, reloaded");
            };
            watcher.Created += (sender, e) =>
            {
                System.Threading.Thread.Sleep(100);
                LoadoutService.LoadFromFile(_loadoutFilePath, _playerLoadouts, Logger);
                _playerModels.Clear(); // Clear cached models so agent changes take effect
                _playerGunPaints.Clear(); // Clear cached weapon paints so changes take effect
                Logger.LogInformation("[PlayerSkinMod] Loadout file created, loaded");
            };
        }
        catch (Exception ex)
        {
            Logger.LogWarning($"[PlayerSkinMod] Could not set up file watcher: {ex.Message}");
        }

        try
        {
            _setAttrByName = new MemoryFunctionVoid<nint, string, float>(
                RuntimeInformation.IsOSPlatform(OSPlatform.Linux)
                    ? "55 48 89 E5 41 57 41 56 49 89 FE 41 55 41 54 53 48 89 F3 48 83 EC ? F3 0F 11 85"
                    : "40 53 55 41 56 48 81 EC 90 00 00 00");
            Logger.LogInformation($"[PlayerSkinMod] SetOrAddAttributeValueByName loaded: {_setAttrByName != null}");
        }
        catch (Exception ex)
        {
            _setAttrByName = null;
            Logger.LogError($"[PlayerSkinMod] SetOrAddAttributeValueByName signature failed: {ex.Message} (skins/gloves disabled)");
        }

        RegisterListener<Listeners.OnMapStart>(_ =>
        {
            _playerModels.Clear();
            foreach (var m in StaticData.CtModels) Server.PrecacheModel(m);
            foreach (var m in StaticData.TModels)  Server.PrecacheModel(m);
        });

        RegisterEventHandler<EventPlayerSpawn>(OnPlayerSpawn);
        RegisterEventHandler<EventRoundMvp>(OnRoundMvp, HookMode.Pre);
        RegisterEventHandler<EventPlayerTeam>(OnPlayerTeam);
        RegisterEventHandler<EventItemPickup>(OnItemPickup);

        VirtualFunctions.GiveNamedItemFunc.Hook(OnGiveNamedItemPost, HookMode.Post);

        // Register commands for players to customize their loadout
        AddCommand("skin_menu", "Open skin customization menu", OnSkinMenuCommand);
        AddCommand("skin_random", "Enable random skin mode", OnSkinRandomCommand);
        AddCommand("skin_reset", "Reset all skins to default", OnSkinResetCommand);

        Logger.LogInformation("[PlayerSkinMod] Plugin loaded successfully");
    }

    public override void Unload(bool hotReload)
    {
        VirtualFunctions.GiveNamedItemFunc.Unhook(OnGiveNamedItemPost, HookMode.Post);
    }

    // Command handlers
    private void OnSkinMenuCommand(CCSPlayerController? player, CommandInfo command)
    {
        if (player == null || !player.IsValid) return;
        // Reload loadout from file in case panel saved while in-game
        LoadoutService.LoadFromFile(_loadoutFilePath, _playerLoadouts, Logger);

        // Diagnostic info
        var loadout = GetOrCreateLoadout(player.Slot);
        player.PrintToChat(" \x04[PlayerSkinMod]\x01 --- Diagnostic Info ---");
        player.PrintToChat($" \x04[PlayerSkinMod]\x01 Slot: {player.Slot}");
        player.PrintToChat($" \x04[PlayerSkinMod]\x01 Loadout file: {_loadoutFilePath}");
        player.PrintToChat($" \x04[PlayerSkinMod]\x01 File exists: {File.Exists(_loadoutFilePath)}");
        player.PrintToChat($" \x04[PlayerSkinMod]\x01 Loaded loadouts: {_playerLoadouts.Count}");
        player.PrintToChat($" \x04[PlayerSkinMod]\x01 Knife: {loadout.KnifeIndex}, GloveCT: {loadout.GloveIndexCt}, GloveT: {loadout.GloveIndexT}, AgentCT: {loadout.AgentModelCt}, AgentT: {loadout.AgentModelT}");
        player.PrintToChat($" \x04[PlayerSkinMod]\x01 UseRandom: {loadout.UseRandom}, Weapons: {loadout.WeaponPaints.Count}, Keychains: {loadout.WeaponKeychains.Count}");
        player.PrintToChat($" \x04[PlayerSkinMod]\x01 SetAttrByName: {_setAttrByName != null}");
        player.PrintToChat(" \x04[PlayerSkinMod]\x01 --- End Diagnostic ---");
        player.PrintToChat(" \x04[PlayerSkinMod]\x10 Respawn to apply skins.");
    }

    private void OnSkinRandomCommand(CCSPlayerController? player, CommandInfo command)
    {
        if (player == null || !player.IsValid) return;
        var loadout = GetOrCreateLoadout(player.Slot);
        loadout.UseRandom = true;
        player.PrintToChat(" \x04[PlayerSkinMod]\x01 Random skin mode enabled!");
    }

    private void OnSkinResetCommand(CCSPlayerController? player, CommandInfo command)
    {
        if (player == null || !player.IsValid) return;
        _playerLoadouts.Remove(player.Slot);
        player.PrintToChat(" \x04[PlayerSkinMod]\x01 All skins reset to default!");
    }

    private PlayerLoadout GetOrCreateLoadout(int slot)
    {
        if (!_playerLoadouts.TryGetValue(slot, out var loadout))
        {
            loadout = new PlayerLoadout();
            _playerLoadouts[slot] = loadout;
        }
        return loadout;
    }

    [GameEventHandler]
    public HookResult OnPlayerSpawn(EventPlayerSpawn @event, GameEventInfo info)
    {
        var player = @event.Userid;

        if (player == null
            || !player.IsValid
            || player.IsBot
            || player.PlayerPawn == null
            || !player.PlayerPawn.IsValid
            || player.PlayerPawn.Value == null
            || !player.PlayerPawn.Value.IsValid)
            return HookResult.Continue;

        if ((CsTeam)player.TeamNum != CsTeam.CounterTerrorist
            && (CsTeam)player.TeamNum != CsTeam.Terrorist)
            return HookResult.Continue;

        var loadout = GetOrCreateLoadout(player.Slot);
        Logger.LogInformation($"[PlayerSkinMod] Player {player.Slot} spawned. Loadout: knife={loadout.KnifeIndex}, gloveCT={loadout.GloveIndexCt}, gloveT={loadout.GloveIndexT}, agentCT={loadout.AgentModelCt}, agentT={loadout.AgentModelT}, music={loadout.MusicKit}, random={loadout.UseRandom}, weapons={loadout.WeaponPaints.Count}, setAttrByName={_setAttrByName != null}");

        bool isCT = (CsTeam)player.TeamNum == CsTeam.CounterTerrorist;

        if (!_playerModels.TryGetValue(player.Slot, out string? model))
        {
            string[] pool;
            int agentIdx;
            string agentPath;
            if (isCT)
            {
                pool = StaticData.CtModels;
                agentIdx = loadout.AgentModelCt;
                agentPath = loadout.AgentModelPathCt;
            }
            else
            {
                pool = StaticData.TModels;
                agentIdx = loadout.AgentModelT;
                agentPath = loadout.AgentModelPathT;
            }

            // Path-based lookup is the primary method (panel sends model path)
            // This is more reliable than index-based because panel and StaticData arrays
            // may have different orderings
            if (!string.IsNullOrEmpty(agentPath))
            {
                var normalizedPath = agentPath.Replace('/', '\\');
                var found = Array.FindIndex(pool, m => m.Equals(normalizedPath, StringComparison.OrdinalIgnoreCase));
                if (found >= 0)
                {
                    model = pool[found];
                    Logger.LogInformation($"[PlayerSkinMod] Agent resolved by path: {agentPath} -> index {found}");
                }
                else
                {
                    // Path not found in pool - log warning and fall back to random
                    Logger.LogWarning($"[PlayerSkinMod] Agent path not found in pool: {agentPath} (pool has {pool.Length} models)");
                }
            }

            // Only use index-based fallback if NO path was provided (legacy behavior)
            if (model == null && string.IsNullOrEmpty(agentPath) && agentIdx >= 0)
            {
                model = pool[Math.Min(agentIdx, pool.Length - 1)];
                Logger.LogInformation($"[PlayerSkinMod] Agent resolved by index (no path): {agentIdx} -> {model}");
            }

            // Final fallback: random model
            if (model == null)
            {
                model = pool[_rng.Next(pool.Length)];
                Logger.LogInformation($"[PlayerSkinMod] Agent resolved randomly -> {model}");
            }

            _playerModels[player.Slot] = model;
        }

        int kitId = loadout.MusicKit >= 0 ? StaticData.KitIds[Math.Min(loadout.MusicKit, StaticData.KitIds.Length - 1)] : StaticData.KitIds[_rng.Next(StaticData.KitIds.Length)];

        // Per-team knife selection (v1.6.0+); legacy shared fields are mirrored
        // into the per-team fields by LoadoutService.
        int knifeIndexSel = isCT ? loadout.KnifeIndexCt : loadout.KnifeIndexT;
        int knifePaintSel = isCT ? loadout.KnifePaintCt : loadout.KnifePaintT;
        int knifeSeedSel = isCT ? loadout.KnifeSeedCt : loadout.KnifeSeedT;
        float knifeWearSel = isCT ? loadout.KnifeWearCt : loadout.KnifeWearT;
        int knifeIdx = knifeIndexSel >= 0 ? Math.Min(knifeIndexSel, StaticData.Knives.Length - 1) : _rng.Next(StaticData.Knives.Length);
        int knifePaint = knifePaintSel >= 0 ? knifePaintSel : StaticData.KnifePaints[_rng.Next(StaticData.KnifePaints.Length)];

        // Use per-team glove configuration
        ushort gloveDefIndex;
        int glovePaint;
        int gloveSeed;
        float gloveWear;
        if (isCT)
        {
            // Prefer direct DefIndex from panel (v1.4.4+), fallback to StaticData index lookup
            if (loadout.GloveDefIndexCt > 0)
            {
                gloveDefIndex = loadout.GloveDefIndexCt;
            }
            else
            {
                // GloveIndex maps to panel's glove TYPE array (0=Bloodhound, 1=Sport, etc.)
                int gloveIdx = loadout.GloveIndexCt >= 0 ? Math.Min(loadout.GloveIndexCt, StaticData.GloveTypes.Length - 1) : _rng.Next(StaticData.GloveTypes.Length);
                gloveDefIndex = StaticData.GloveTypes[gloveIdx];
            }
            glovePaint = loadout.GlovePaintCt >= 0 ? loadout.GlovePaintCt : StaticData.Gloves[0].PaintKit;
            gloveSeed = loadout.GloveSeedCt;
            gloveWear = loadout.GloveWearCt;
        }
        else
        {
            if (loadout.GloveDefIndexT > 0)
            {
                gloveDefIndex = loadout.GloveDefIndexT;
            }
            else
            {
                // GloveIndex maps to panel's glove TYPE array (0=Bloodhound, 1=Sport, etc.)
                int gloveIdx = loadout.GloveIndexT >= 0 ? Math.Min(loadout.GloveIndexT, StaticData.GloveTypes.Length - 1) : _rng.Next(StaticData.GloveTypes.Length);
                gloveDefIndex = StaticData.GloveTypes[gloveIdx];
            }
            glovePaint = loadout.GlovePaintT >= 0 ? loadout.GlovePaintT : StaticData.Gloves[0].PaintKit;
            gloveSeed = loadout.GloveSeedT;
            gloveWear = loadout.GloveWearT;
        }

        var pawn = player.PlayerPawn.Value;
        var assignedModel = model;
        var knife = StaticData.Knives[knifeIdx];

        Server.NextFrame(() =>
        {
            if (pawn == null || !pawn.IsValid) return;

            pawn.SetModel(assignedModel);
            Utilities.SetStateChanged(pawn, "CBaseEntity", "m_CBodyComponent");

            var c = pawn.Render;
            pawn.Render = Color.FromArgb(255, c.R, c.G, c.B);
            Utilities.SetStateChanged(pawn, "CBaseModelEntity", "m_clrRender");

            if (player == null || !player.IsValid) return;

            player.MusicKitID = kitId;
            Utilities.SetStateChanged(player, "CCSPlayerController", "m_iMusicKitID");

            // Apply knife + gloves via deferred wearables.
            // Knife is applied on both passes (immediate + 0.10f) for reliability.
            // Gloves are also applied on both passes — the second call is a safety net
            // in case the first call hit a timing issue (model not fully loaded, etc.).
            ApplyWearables(player, pawn, knife.DefIndex, knifePaint, knifeSeedSel, knifeWearSel, gloveDefIndex, glovePaint, gloveSeed, gloveWear, applyGloves: true);
            AddTimer(0.10f, () => { if (pawn != null && pawn.IsValid) ApplyWearables(player, pawn, knife.DefIndex, knifePaint, knifeSeedSel, knifeWearSel, gloveDefIndex, glovePaint, gloveSeed, gloveWear, applyGloves: true); });

            // Re-apply gun skins to weapons already in the inventory. Weapons
            // carried across round restarts never pass through GiveNamedItem,
            // so without this pass they would keep the previous (or default)
            // skin — one source of the intermittent default-texture reports.
            AddTimer(0.20f, () =>
            {
                if (player == null || !player.IsValid || pawn == null || !pawn.IsValid) return;
                ReapplyHeldWeaponSkins(player, pawn);
            });
        });

        return HookResult.Continue;
    }

    private void ReapplyHeldWeaponSkins(CCSPlayerController player, CCSPlayerPawn pawn)
    {
        try
        {
            var weapons = pawn.WeaponServices?.MyWeapons;
            if (weapons == null) return;

            int slot = player.Slot;
            ulong steamId = player.SteamID;
            var team = (CsTeam)player.TeamNum;

            foreach (var handle in weapons)
            {
                var w = handle.Value;
                if (w == null || !w.IsValid) continue;
                ApplySkinForPlayer(slot, w, steamId, team);
            }
        }
        catch (Exception ex)
        {
            Logger.LogError($"[PlayerSkinMod] ReapplyHeldWeaponSkins failed: {ex.Message}");
        }
    }

    private void ApplyWearables(CCSPlayerController player, CCSPlayerPawn pawn, ushort knifeDefIndex, int knifePaintKit, int knifeSeed, float knifeWear, ushort gloveDefIndex, int glovePaintKit, int gloveSeed, float gloveWear, bool applyGloves = true)
    {
        if (player == null || !player.IsValid || pawn == null || !pawn.IsValid)
            return;

        if (_setAttrByName == null) return;

        WeaponService.ReplaceKnife(player, pawn, knifeDefIndex, knifePaintKit, _legacyPaints, _setAttrByName, knifeSeed, knifeWear);
        if (applyGloves)
            WeaponService.ApplyGloves(player, pawn, gloveDefIndex, glovePaintKit, _setAttrByName, gloveSeed, gloveWear, (delay, cb) => AddTimer(delay, cb));
    }

    private HookResult OnGiveNamedItemPost(DynamicHook hook)
    {
        if (_setAttrByName == null)
            return HookResult.Continue;

        try
        {
            var itemServices = hook.GetParam<CCSPlayer_ItemServices>(0);
            var weapon = hook.GetReturn<CBasePlayerWeapon>();

            if (weapon == null || !weapon.IsValid)
                return HookResult.Continue;

            var name = weapon.DesignerName;
            if (string.IsNullOrEmpty(name) || !name.Contains("weapon"))
                return HookResult.Continue;

            var player = WeaponService.GetPlayerFromItemServices(itemServices);
            if (player == null || !player.IsValid || player.IsBot)
                return HookResult.Continue;

            int slot = player.Slot;
            ulong steamId = player.SteamID;
            var team = (CsTeam)player.TeamNum;
            ApplySkinForPlayer(slot, weapon, steamId, team);

            // Re-apply on the next frame and once more shortly after: entity
            // creation timing varies, and a single pass occasionally loses the
            // race against the client's initial snapshot (skin shows default).
            Server.NextFrame(() =>
            {
                if (weapon != null && weapon.IsValid)
                    ApplySkinForPlayer(slot, weapon, steamId, team);
            });
            AddTimer(0.25f, () =>
            {
                if (weapon != null && weapon.IsValid)
                    ApplySkinForPlayer(slot, weapon, steamId, team);
            });
        }
        catch (Exception ex)
        {
            Logger.LogError($"[PlayerSkinMod] OnGiveNamedItemPost failed: {ex.Message}");
        }

        return HookResult.Continue;
    }

    private void ApplySkinForPlayer(int slot, CBasePlayerWeapon? weapon, ulong steamId = 0, CsTeam team = CsTeam.None)
    {
        if (_setAttrByName == null || weapon == null || !weapon.IsValid) return;

        var loadout = GetOrCreateLoadout(slot);

        var name = weapon.DesignerName;
        if (string.IsNullOrEmpty(name)) return;
        if (name.Contains("knife") || name == "weapon_bayonet") return;

        ushort defIndex = weapon.AttributeManager?.Item?.ItemDefinitionIndex ?? 0;
        if (defIndex == 0) return;

        // Per-team paint maps (v1.6.0+); LoadoutService mirrors legacy shared
        // maps into both team maps, so these are the single lookup source.
        bool isCT = team == CsTeam.CounterTerrorist;
        var paints = isCT ? loadout.WeaponPaintsCt : loadout.WeaponPaintsT;
        var seeds = isCT ? loadout.WeaponSeedsCt : loadout.WeaponSeedsT;
        var wears = isCT ? loadout.WeaponWearsCt : loadout.WeaponWearsT;

        int paint;
        if (paints.TryGetValue(defIndex, out int selectedPaint))
        {
            paint = selectedPaint;
        }
        else if (loadout.UseRandom && StaticData.GunPaints.TryGetValue(defIndex, out int[]? gunPaints) && gunPaints.Length > 0)
        {
            var key = (slot, defIndex);
            if (!_playerGunPaints.TryGetValue(key, out paint))
            {
                paint = gunPaints[_rng.Next(gunPaints.Length)];
                _playerGunPaints[key] = paint;
            }
        }
        else
        {
            return;
        }

        int seed = seeds.TryGetValue(defIndex, out int s) ? s : 0;
        float wear = wears.TryGetValue(defIndex, out float w) ? w : 0.01f;

        // Get nametag and stattrak if configured
        string? nametag = loadout.WeaponNametags.TryGetValue(defIndex, out string? nt) ? nt : null;
        StatTrakInfo? statTrak = loadout.WeaponStatTrak.TryGetValue(defIndex, out StatTrakInfo? st) ? st : null;

        ApplySkinToWeaponInternal(weapon, defIndex, paint, seed, wear, steamId, nametag, statTrak);

        // Apply stickers if configured
        if (loadout.WeaponStickers.TryGetValue(defIndex, out var stickers) && stickers.Count > 0)
            ApplyStickersInternal(weapon, stickers);

        // Apply keychain if configured
        if (loadout.WeaponKeychains.TryGetValue(defIndex, out var keychain))
            ApplyKeychainInternal(weapon, keychain);
    }

    private void ApplySkinToWeaponInternal(CEconEntity weapon, ushort defIndex, int paintKit, int seed = 0, float wear = 0.01f, ulong steamId = 0, string? nametag = null, StatTrakInfo? statTrak = null)
    {
        if (_setAttrByName == null) return;

        try
        {
            var item = weapon.AttributeManager?.Item;
            if (item == null) return;

            item.AttributeList.Attributes.RemoveAll();
            item.NetworkedDynamicAttributes.Attributes.RemoveAll();
            AssignItemId(item);
            if (steamId > 0) item.AccountID = (uint)steamId;

            weapon.FallbackPaintKit = paintKit;
            weapon.FallbackSeed = seed;
            weapon.FallbackWear = wear;

            // Mark fallback netvars dirty so they are (re)sent to clients.
            // Without this, whether the client sees the skin depends on whether the
            // initial entity snapshot happened to include these values — which is
            // why skins would intermittently render as the default texture even
            // though the inspect description showed the custom skin.
            Utilities.SetStateChanged(weapon, "CEconEntity", "m_nFallbackPaintKit");
            Utilities.SetStateChanged(weapon, "CEconEntity", "m_nFallbackSeed");
            Utilities.SetStateChanged(weapon, "CEconEntity", "m_flFallbackWear");

            _setAttrByName.Invoke(item.NetworkedDynamicAttributes.Handle, "set item texture prefab", paintKit);
            _setAttrByName.Invoke(item.NetworkedDynamicAttributes.Handle, "set item texture seed", (float)seed);
            _setAttrByName.Invoke(item.NetworkedDynamicAttributes.Handle, "set item texture wear", wear);

            _setAttrByName.Invoke(item.AttributeList.Handle, "set item texture prefab", paintKit);
            _setAttrByName.Invoke(item.AttributeList.Handle, "set item texture seed", (float)seed);
            _setAttrByName.Invoke(item.AttributeList.Handle, "set item texture wear", wear);

            // Apply nametag
            if (!string.IsNullOrEmpty(nametag))
            {
                item.CustomName = nametag;
            }

            // Apply StatTrak. The kill count must be written as raw uint bits
            // reinterpreted as float ("kill eater" attributes store integers in
            // float storage). Passing a plain float here makes the client read
            // garbage bits, which rendered as the capped 99999 display value.
            if (statTrak != null && statTrak.Enabled)
            {
                uint count = (uint)Math.Max(0, statTrak.Count);
                item.EntityQuality = 9; // StatTrak quality
                weapon.FallbackStatTrak = (int)count;
                Utilities.SetStateChanged(weapon, "CEconEntity", "m_nFallbackStatTrak");
                _setAttrByName.Invoke(item.NetworkedDynamicAttributes.Handle, "kill eater", UIntToFloat(count));
                _setAttrByName.Invoke(item.NetworkedDynamicAttributes.Handle, "kill eater score type", UIntToFloat(0));
                _setAttrByName.Invoke(item.AttributeList.Handle, "kill eater", UIntToFloat(count));
                _setAttrByName.Invoke(item.AttributeList.Handle, "kill eater score type", UIntToFloat(0));
            }

            Utilities.SetStateChanged(weapon, "CEconEntity", "m_AttributeManager");

            bool isLegacy = _legacyPaints.Contains((defIndex, paintKit));
            weapon.AcceptInput("SetBodygroup", value: $"body,{(isLegacy ? 1 : 0)}");
            Utilities.SetStateChanged(weapon, "CBaseModelEntity", "m_CBodyComponent");
        }
        catch (Exception ex)
        {
            if (!_skinErrorLogged)
            {
                _skinErrorLogged = true;
                Logger.LogError($"[PlayerSkinMod] ApplySkinToWeapon failed: {ex.Message}");
            }
        }
    }

    private void ApplyStickersInternal(CBasePlayerWeapon weapon, List<StickerInfo> stickers)
    {
        if (_setAttrByName == null || stickers.Count == 0) return;
        var item = weapon.AttributeManager?.Item;
        if (item == null) return;

        for (int i = 0; i < Math.Min(stickers.Count, 5); i++)
        {
            var s = stickers[i];
            if (s.Id == 0) continue;
            var handle = item.NetworkedDynamicAttributes.Handle;
            _setAttrByName.Invoke(handle, $"sticker slot {i} id", UIntToFloat(s.Id));
            if (s.OffsetX != 0 || s.OffsetY != 0)
                _setAttrByName.Invoke(handle, $"sticker slot {i} schema", 0f);
            _setAttrByName.Invoke(handle, $"sticker slot {i} offset x", s.OffsetX);
            _setAttrByName.Invoke(handle, $"sticker slot {i} offset y", s.OffsetY);
            _setAttrByName.Invoke(handle, $"sticker slot {i} wear", s.Wear);
            _setAttrByName.Invoke(handle, $"sticker slot {i} scale", s.Scale);
            _setAttrByName.Invoke(handle, $"sticker slot {i} rotation", s.Rotation);
        }
    }

    private void ApplyKeychainInternal(CBasePlayerWeapon weapon, KeychainInfo keychain)
    {
        if (_setAttrByName == null || keychain.Id == 0) return;
        var item = weapon.AttributeManager?.Item;
        if (item == null) return;

        var handle = item.NetworkedDynamicAttributes.Handle;
        _setAttrByName.Invoke(handle, "keychain slot 0 id", UIntToFloat(keychain.Id));
        _setAttrByName.Invoke(handle, "keychain slot 0 offset x", keychain.OffsetX);
        _setAttrByName.Invoke(handle, "keychain slot 0 offset y", keychain.OffsetY);
        _setAttrByName.Invoke(handle, "keychain slot 0 offset z", keychain.OffsetZ);
        if (keychain.Seed > 0)
            _setAttrByName.Invoke(handle, "keychain slot 0 seed", (float)keychain.Seed);
    }

    private static float UIntToFloat(uint value) => BitConverter.Int32BitsToSingle((int)value);

    private void AssignItemId(CEconItemView item)
    {
        var id = unchecked(_nextItemId++);
        item.ItemID = id;
        item.ItemIDLow = (uint)(id & 0xFFFFFFFF);
        item.ItemIDHigh = (uint)(id >> 32);
    }

    [GameEventHandler]
    public HookResult OnItemPickup(EventItemPickup @event, GameEventInfo info)
    {
        var player = @event.Userid;
        if (player == null || !player.IsValid || player.IsBot)
            return HookResult.Continue;

        var item = @event.Item;
        if (string.IsNullOrEmpty(item) || !(item.Contains("knife") || item.Contains("bayonet")))
            return HookResult.Continue;

        var pawn = player.PlayerPawn?.Value;
        if (pawn == null || !pawn.IsValid)
            return HookResult.Continue;

        Server.NextFrame(() => SyncPickedUpKnife(pawn));
        AddTimer(0.10f, () => { if (pawn != null && pawn.IsValid) SyncPickedUpKnife(pawn); });
        AddTimer(0.25f, () => { if (pawn != null && pawn.IsValid) SyncPickedUpKnife(pawn); });
        return HookResult.Continue;
    }

    private void SyncPickedUpKnife(CCSPlayerPawn pawn)
    {
        try
        {
            if (pawn == null || !pawn.IsValid) return;

            var weapons = pawn.WeaponServices?.MyWeapons;
            if (weapons == null) return;

            foreach (var handle in weapons)
            {
                var w = handle.Value;
                if (w == null || !w.IsValid) continue;

                var name = w.DesignerName;
                if (string.IsNullOrEmpty(name)) continue;

                if (!StaticData.KnifeDefIndexByName.TryGetValue(name, out ushort defIndex)) continue;

                var item = w.AttributeManager?.Item;
                if (item == null) continue;

                w.AcceptInput("ChangeSubclass", value: defIndex.ToString());
                item.ItemDefinitionIndex = defIndex;
                Utilities.SetStateChanged(w, "CEconEntity", "m_AttributeManager");
            }
        }
        catch (Exception ex)
        {
            Logger.LogError($"[PlayerSkinMod] SyncPickedUpKnife failed: {ex.Message}");
        }
    }

    [GameEventHandler]
    public HookResult OnPlayerTeam(EventPlayerTeam @event, GameEventInfo info)
    {
        var player = @event.Userid;
        if (player == null || !player.IsValid || player.IsBot)
            return HookResult.Continue;

        int slot = player.Slot;
        _playerModels.Remove(slot);
        foreach (var key in _playerGunPaints.Keys.Where(k => k.Slot == slot).ToList())
            _playerGunPaints.Remove(key);

        return HookResult.Continue;
    }

    [GameEventHandler(HookMode.Pre)]
    public HookResult OnRoundMvp(EventRoundMvp @event, GameEventInfo info)
    {
        if (_handling)
            return HookResult.Continue;

        var player = @event.Userid;

        if (player == null || !player.IsValid || player.IsBot)
            return HookResult.Continue;

        var loadout = GetOrCreateLoadout(player.Slot);
        int kitId = loadout.MusicKit >= 0 ? StaticData.KitIds[Math.Min(loadout.MusicKit, StaticData.KitIds.Length - 1)] : StaticData.KitIds[_rng.Next(StaticData.KitIds.Length)];

        info.DontBroadcast = true;
        _handling = true;

        if (player.MusicKitID != kitId)
        {
            player.MusicKitID = kitId;
            Utilities.SetStateChanged(player, "CCSPlayerController", "m_iMusicKitID");
        }

        EventRoundMvp? newEvent = null;
        try
        {
            newEvent = new EventRoundMvp(true)
            {
                Userid     = player,
                Musickitid = kitId,
                Nomusic    = 0,
                Reason     = @event.Reason,
                Value      = @event.Value,
            };

            foreach (var human in Utilities.GetPlayers()
                         .Where(p => p.IsValid && !p.IsHLTV && !p.IsBot))
            {
                try { newEvent.FireEventToClient(human); }
                catch { }
            }
        }
        finally
        {
            try { newEvent?.Free(); } catch { }
            _handling = false;
        }

        return HookResult.Continue;
    }
}
