import { useState, useEffect } from "react";
import { useT } from "../i18n";
import { api, type AppConfig, type PluginCheckResult } from "../lib/api";
import Modal from "./ui/Modal";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: (config: AppConfig) => void;
}

export default function SettingsPanel({ isOpen, onClose, onConfigSaved }: SettingsPanelProps) {
  const { t, lang, changeLanguage, languages } = useT();
  const [config, setConfig] = useState<AppConfig>({ language: lang, cs2Path: null });
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{ success: boolean; message: string } | null>(null);
  const [pathNotice, setPathNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [pluginStatus, setPluginStatus] = useState<PluginCheckResult | null>(null);

  const refreshStatus = async () => {
    try {
      const check = await api.checkPluginFiles();
      setPluginStatus(check);
    } catch {
      setPluginStatus(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      api.getConfig().then(setConfig).catch(console.error);
      setDeployResult(null);
      setPathNotice(null);
      refreshStatus();
    }
  }, [isOpen]);

  const handleDetect = async () => {
    setDetecting(true);
    setPathNotice(null);
    try {
      const result = await api.detectCs2Path();
      if (result.path) {
        setConfig(prev => ({ ...prev, cs2Path: result.path }));
        setPathNotice({ kind: "success", text: t("settings.detectSuccess", { path: result.path }) });
      } else {
        setPathNotice({
          kind: "error",
          text: result.searched.length > 0
            ? t("settings.detectNotFound", { paths: result.searched.join("\n") })
            : t("settings.detectNoSteam"),
        });
      }
    } catch (e) {
      setPathNotice({ kind: "error", text: t("settings.detectFailed", { error: String(e) }) });
    }
    setDetecting(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const newConfig = { ...config, language: lang };
      await api.saveConfig(newConfig);
      onConfigSaved(newConfig);
      onClose();
    } catch (e) {
      console.error("Failed to save config:", e);
    }
    setSaving(false);
  };

  const handleDeploy = async () => {
    setDeploying(true);
    setDeployResult(null);
    try {
      // Deploy reads the config from disk, so persist the current path first.
      // Otherwise a freshly detected or typed path is ignored on first run.
      const newConfig = { ...config, language: lang };
      await api.saveConfig(newConfig);
      onConfigSaved(newConfig);

      const deployMsg = await api.deployAddons();
      // Post-deploy verification: check files are actually present
      let verifyMsg = "";
      let verifySuccess = true;
      try {
        const check = await api.checkPluginFiles();
        if (!check.allPresent) {
          verifySuccess = false;
          verifyMsg = check.missingFiles.length > 0
            ? t("status.deployVerifyFailed")
            : check.versionMismatch
              ? t("status.pluginVersionMismatch")
              : t("status.deployError");
        } else {
          verifyMsg = t("status.pluginAllGood");
        }
        setPluginStatus(check);
      } catch {
        verifyMsg = t("status.deployError");
        verifySuccess = false;
      }
      setDeployResult({
        success: verifySuccess,
        message: deployMsg + "\n" + verifyMsg,
      });
    } catch (e) {
      setDeployResult({ success: false, message: String(e) });
    }
    setDeploying(false);
  };

  if (!isOpen) return null;

  return (
    <Modal
      size="md"
      title={t("settings.title")}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">
            {t("btn.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex-1"
          >
            {saving ? t("common.loading") : t("btn.save")}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Language Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            {t("settings.language")}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => changeLanguage(l.code)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  lang === l.code
                    ? "bg-amber-500/[0.12] border border-amber-500/40 text-amber-200"
                    : "bg-white/[0.04] border border-white/[0.08] text-gray-300 hover:bg-white/[0.08]"
                }`}
              >
                <span className="text-xs font-mono bg-black/30 px-1 rounded">{l.flag}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* CS2 Path */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            {t("settings.cs2Path")}
          </label>
          <p className="text-xs text-gray-500">{t("settings.cs2PathHint")}</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={config.cs2Path ?? ""}
              onChange={(e) => { setPathNotice(null); setConfig(prev => ({ ...prev, cs2Path: e.target.value || null })); }}
              placeholder="/path/to/game/csgo"
              className="input-field flex-1"
            />
            <button
              onClick={handleDetect}
              disabled={detecting}
              className="btn-secondary text-sm px-3"
            >
              {detecting ? "..." : t("settings.detect")}
            </button>
          </div>
          {pathNotice && (
            <div className={`text-xs whitespace-pre-wrap ${pathNotice.kind === "success" ? "text-green-400" : "text-red-400"}`}>
              {pathNotice.text}
            </div>
          )}
        </div>

        {/* Deploy Addons */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            {t("settings.deployAddons")}
          </label>
          <p className="text-xs text-gray-500">{t("settings.deployAddonsHint")}</p>
          <button
            onClick={handleDeploy}
            disabled={deploying}
            className="btn-secondary w-full text-sm"
          >
            {deploying ? t("common.loading") : t("settings.deployAddons")}
          </button>
          {deployResult && (
            <div className={`text-xs ${deployResult.success ? 'text-green-400' : 'text-red-400'} whitespace-pre-wrap`}>
              {deployResult.success ? t("status.deployed") : t("status.deployError")}
              <br />
              <span className="opacity-70">{deployResult.message}</span>
            </div>
          )}
        </div>

        {/* Plugin Status */}
        {pluginStatus && (
          <div className="space-y-1.5 px-3 py-2 bg-black/20 rounded-lg border border-white/[0.06]">
            <p className="text-xs font-medium text-gray-400">{t("settings.pluginStatus")}</p>
            <div className="flex items-center gap-2 text-xs">
              <span className={pluginStatus.counterstrikesharpInstalled ? "text-green-400" : "text-red-400"}>
                {pluginStatus.counterstrikesharpInstalled ? "✓" : "✗"}
              </span>
              <span className="text-gray-300">CounterStrikeSharp</span>
              <span className="text-gray-500">
                ({pluginStatus.counterstrikesharpInstalled ? t("settings.installed") : t("settings.notInstalled")})
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className={pluginStatus.allPresent ? "text-green-400" : "text-red-400"}>
                {pluginStatus.allPresent ? "✓" : "✗"}
              </span>
              <span className="text-gray-300">PlayerSkinMod</span>
              <span className="text-gray-500">
                {!pluginStatus.pathConfigured
                  ? `(${t("status.pathNotConfigured")})`
                  : pluginStatus.allPresent
                    ? `(v${pluginStatus.deployedVersion || "?"})`
                    : pluginStatus.missingFiles.length > 0
                      ? `(${t("settings.missingFiles", { files: pluginStatus.missingFiles.join(", ") })})`
                      : pluginStatus.versionMismatch
                        ? `(${t("settings.versionMismatchShort")})`
                        : `(${t("common.unknown")})`}
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
