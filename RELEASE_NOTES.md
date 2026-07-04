# CS2-Skin-Mod v1.8.0

A local-only skin customization plugin for Counter-Strike 2.

## What's New in v1.8.0

### Redesigned skin selection
- Clicking a weapon, knife, or glove now opens a **full-size editor window** — no more cramped inline pickers
- Much larger skin grid with search and lazy loading
- Weapon editor is organized into tabs: **Skin / Stickers / Keychain / Details** (nametag + StatTrak)
- Wear/seed controls and the selected-skin preview stay visible in a side panel while you browse
- Switch CT/T directly inside the editor; copy a config to the other team with one click

### Fixes
- **Music kits**: the selected music kit now actually plays — the plugin previously mixed up kit IDs and array indexes, so a different kit than selected was applied
- **Language switching** now applies instantly across the whole UI (previously required a restart)
- **Loadout reload race**: the plugin now reloads `player_loadout.json` on the game thread with debouncing, fixing potential crashes/corruption when saving from the panel mid-match
- Loadout files from older versions (or partially written files) no longer fail to load
- Improved CS2 path auto-detection: reads Steam `libraryfolders.vdf`, supports Flatpak Steam on Linux

### Internal
- Deduplicated skin application code between the plugin and WeaponService
- Shared modal/picker UI components; full i18n coverage for all new UI (EN/简中/繁中/日本語/한국어/Русский)
- Release notes now maintained in `RELEASE_NOTES.md` (no more stale changelogs)

## Installation

1. Download and install the panel app for your platform
2. Launch the panel, set your CS2 path in Settings
3. Click "Deploy Addons" to install the plugin to your CS2 directory
4. Add `-insecure` to CS2 launch options
5. Customize your loadout and click "Apply Loadout"!

See the [README](https://github.com/emptysuns/CS2-Skin-Forge/blob/main/README.md) for detailed instructions.

---

# 中文说明

## v1.8.0 更新内容

### 皮肤选择界面重设计
- 点击武器 / 刀具 / 手套后**直接弹出大号编辑窗口**，告别狭小的内嵌选择器
- 皮肤网格更大，支持搜索和分页加载
- 武器编辑器分为四个标签页：**皮肤 / 贴纸 / 挂件 / 详情**（命名 + StatTrak）
- 浏览皮肤时，磨损/种子设置和已选皮肤预览固定在侧栏，始终可见
- 编辑器内可直接切换 CT/T，一键复制配置到另一队伍

### 修复
- **音乐盒**：修复选中的音乐盒和实际播放不一致的问题（插件此前把音乐盒 ID 误当作数组索引）
- **语言切换**现在立即在全部界面生效（此前需要重启）
- **装备重载竞态**：插件现在在游戏主线程上防抖地重载 `player_loadout.json`，修复对局中从面板保存可能导致的崩溃/数据异常
- 旧版本的装备文件（或写入不完整的文件）不再导致加载失败
- 改进 CS2 路径自动检测：解析 Steam `libraryfolders.vdf`，支持 Linux 上的 Flatpak Steam

### 内部改进
- 合并插件与 WeaponService 之间重复的皮肤应用代码
- 统一的弹窗/选择器 UI 组件；所有新界面完整支持 6 种语言
- 发布说明改由 `RELEASE_NOTES.md` 维护（不再出现过期的更新日志）

## 安装说明

1. 下载并安装适合您平台的面板应用
2. 启动面板，在设置中设置 CS2 路径
3. 点击"部署插件"将插件安装到 CS2 目录
4. 在 CS2 启动选项中添加 `-insecure`
5. 自定义你的装备，点击"应用装备"即可!

详细说明请查看 [中文文档](https://github.com/emptysuns/CS2-Skin-Forge/blob/main/README_CN.md)。
