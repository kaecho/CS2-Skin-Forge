# CS2-Skin-Mod v1.8.3

A local-only skin customization plugin for Counter-Strike 2.

## What's New in v1.8.3

### Fixed: weapon skins, gloves and knife paints stopped applying
The September 2026 CS2 update moved `CAttributeList::SetOrAddAttributeValueByName`, the engine function every paint, sticker and keychain write goes through. The plugin still carried the old byte signature, so the resolved function pointer was null and each call was rejected at runtime. Knife models kept changing (the model swap runs before the paint) while gun skins and gloves silently did nothing.

- Updated the signature and kept the previous one as a fallback, so servers that have not updated yet keep working
- The signature is now validated at load: a null handle disables the skin paths instead of invoking a null pointer, and the server log says exactly what happened
- `skin_menu` reports whether the attribute setter resolved
- Knife paint failures are logged instead of being swallowed

### Fixed: first run on a new machine
- **Auto Detect** now searches every drive letter, custom library folders such as `D:\Games\SteamLibrary`, and each library registered in `libraryfolders.vdf`
- When detection finds nothing, the settings dialog says so and lists the locations it checked, instead of appearing to do nothing
- The CS2 path is saved before deploying, so a freshly detected or typed path works without a separate save
- Deploy rejects a path that is not a CS2 install with a readable error instead of creating an empty folder tree somewhere unrelated
- Plugin status shows "CS2 path not set" instead of three missing files when no path is configured

### Data sync
- **+673 stickers**: the full IEM Cologne 2026 set, the Auto Racing collection, and the Fruits And Veggies collection
- **+8 music kits** (Beartooth, Blitz Kids, Hundredth, Neck Deep, Roam, Twin Atlantic, Skog, Starjunk 95), with names in all six panel languages
- Random music now also includes kit 104
- `scripts/sync_csgo_api.py` regenerates the sticker and music kit data from the ByMykel CSGO-API, so the next sync is one command

### Dependencies
- CounterStrikeSharp.API 1.0.313 to 1.0.365
- Tauri API, CLI and plugins to the current 2.x releases
- Rust crates `dirs` and `zip` to their current majors

The plugin still targets .NET 8, which loads on both older CounterStrikeSharp hosts and the .NET 10 runtime that CounterStrikeSharp 1.0.370 and later ship.

## Installation

1. Download and install the panel app for your platform
2. Launch the panel, set your CS2 path in Settings (Auto Detect should find it)
3. Click "Deploy Addons" to install the plugin to your CS2 directory
4. Add `-insecure` to CS2 launch options
5. Customize your loadout and click "Apply Loadout"

Upgrading from an older version: open Settings and click "Deploy Addons" again. The panel detects the version mismatch and prompts you.

See the [README](https://github.com/kaecho/CS2-Skin-Forge/blob/main/README.md) for detailed instructions.

---

# 中文说明

## v1.8.3 更新内容

### 修复：枪械皮肤、手套、刀具涂装无法生效
2026 年 9 月的 CS2 更新移动了 `CAttributeList::SetOrAddAttributeValueByName`，这是所有涂装、贴纸和挂件属性写入所调用的引擎函数。插件仍在使用旧的字节特征码，解析出来的函数指针为空，运行时报错。刀模型仍能更换（换模型在涂装之前执行），但枪皮和手套完全没有反应。

- 已更新特征码，并保留旧特征码作为回退，未更新的服务器同样可用
- 加载时会校验特征码：句柄为空时禁用皮肤相关逻辑，而不是调用空指针，并在服务器日志中明确说明原因
- `skin_menu` 会显示属性函数是否解析成功
- 刀具涂装失败现在会记录日志，不再静默忽略

### 修复：新电脑首次部署
- **自动检测** 现在会扫描所有盘符、自定义库目录（如 `D:\Games\SteamLibrary`）以及 `libraryfolders.vdf` 中登记的每个库
- 检测失败时设置面板会给出提示并列出已检查的位置，不再毫无反应
- 部署前会先保存 CS2 路径，刚检测到或手动输入的路径无需再单独保存
- 路径不是 CS2 安装目录时会直接报错，不再在错误位置创建空目录
- 未配置路径时，插件状态显示「未设置 CS2 路径」，而不是三个缺失文件

### 数据同步
- **+673 张贴纸**：IEM Cologne 2026 全套、赛车系列、果蔬系列
- **+8 个音乐盒**（Beartooth、Blitz Kids、Hundredth、Neck Deep、Roam、Twin Atlantic、Skog、Starjunk 95），并补齐六种语言的名称
- 随机音乐池加入音乐盒 104
- 新增 `scripts/sync_csgo_api.py`，一条命令即可从 ByMykel CSGO-API 重新生成贴纸与音乐盒数据

### 依赖更新
- CounterStrikeSharp.API 1.0.313 升级至 1.0.365
- Tauri API、CLI 及插件升级至当前 2.x 版本
- Rust 依赖 `dirs`、`zip` 升级至当前主版本

插件仍以 .NET 8 为目标，既可在旧版 CounterStrikeSharp 上加载，也可运行在 CounterStrikeSharp 1.0.370 及之后版本的 .NET 10 运行时上。

## 安装

1. 下载并安装对应平台的面板应用
2. 启动面板，在设置中配置 CS2 路径（自动检测通常可以直接找到）
3. 点击「部署插件」安装到 CS2 目录
4. 在 CS2 启动项中加入 `-insecure`
5. 配置装备后点击「应用装备」即可

从旧版本升级：打开设置，再次点击「部署插件」。面板会检测到版本不一致并给出提示。

详细说明请查看 [中文文档](https://github.com/kaecho/CS2-Skin-Forge/blob/main/README_CN.md)。
