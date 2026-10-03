# CS2-Skin-Mod v1.8.4

A local-only skin customization plugin for Counter-Strike 2.

## What's New in v1.8.4

### Fixed: a charm on a weapon could stop the skin from rendering
Applying a keychain (charm) wrote its attributes in a second pass, after the plugin had already told the client the item changed. The client composites one finish per item and caches it, so the finish it built at that moment was reused and the later charm data was ignored.

- Paint, stickers and the charm now go into the same pass, into both attribute lists, and the client is only notified once everything is in place. The mesh group is set last, matching Nereziel/cs2-WeaponPaints
- `keychain slot 0 seed` is now written as raw integer bits. It used to be converted to a plain float, which made the client read a garbage pattern value
- StatTrak quality is cleared on weapons without StatTrak

### Fixed: charms and stickers on a weapon with no skin
A charm, sticker, nametag or StatTrak counter on a weapon with no skin selected was never applied, because the plugin skipped weapons without a paint kit. Those weapons are now painted with kit 0 (the stock finish) so the attachment renders.

### New: clear all loadout data
Settings has a "Clear all loadout data" button that wipes every saved weapon skin, knife, glove, agent, music kit, sticker and charm for all slots, with a confirmation step. Items left unset fall back to the plugin's random defaults.

### Changed: CS2 folder detection
Modelled on the folder picker in [CS2-Bot-Improver](https://github.com/ed0ard/CS2-Bot-Improver):

- Every detected installation is listed and can be clicked to select it, instead of only the first one being offered
- A Browse button opens the native folder picker for installs detection cannot find
- The dialog distinguishes "no Steam library on this machine" from "Steam found, no CS2 installed", and lists the checked locations
- A folder that is not a CS2 install is rejected with a readable error, and a configured path that no longer exists is ignored in favour of a detected one

## Installation

1. Download and install the panel app for your platform
2. Launch the panel, set your CS2 path in Settings (the detected installs are listed)
3. Click "Deploy Addons" to install the plugin to your CS2 directory
4. Add `-insecure` to CS2 launch options
5. Customize your loadout and click "Apply Loadout"

Upgrading from an older version: open Settings and click "Deploy Addons" again. The panel detects the version mismatch and prompts you.

See the [README](https://github.com/kaecho/CS2-Skin-Forge/blob/main/README.md) for detailed instructions.

---

# 中文说明

## v1.8.4 更新内容

### 修复：挂饰可能导致枪械皮肤不显示
挂饰（挂件）的属性原来是在第二遍写入的，此时插件已经通知客户端物品发生变化。客户端会为每个物品合成一份外观并缓存，所以它当时合成的那份被复用，后来的挂饰数据被忽略。

- 涂装、贴纸、挂饰现在在同一次写入中完成，并且同时写入两个 attribute list，全部就绪后才通知客户端；网格组放在最后设置，与 Nereziel/cs2-WeaponPaints 一致
- `keychain slot 0 seed` 改为写入原始整型位。以前按普通浮点写入，客户端会读到错误的图案值
- 未启用 StatTrak 的武器会清除 StatTrak 品质

### 修复：没有皮肤的武器上的挂饰与贴纸
未选择皮肤的武器以前会被插件直接跳过，导致其挂饰、贴纸、改名标签或 StatTrak 计数器完全不生效。现在这类武器会以涂装 0（原厂外观）写入，挂饰可以正常显示。

### 新增：一键清除所有装备数据
设置中新增「清除所有装备数据」按钮，带二次确认，可清空所有槽位的武器皮肤、刀具、手套、探员、音乐盒、贴纸和挂饰。未设置的项目会回退为插件默认的随机选择。

### 改进：CS2 目录检测
参考 [CS2-Bot-Improver](https://github.com/ed0ard/CS2-Bot-Improver) 的目录选择方式：

- 列出所有检测到的安装位置，可直接点击选择，不再只提供第一个
- 新增「浏览」按钮，用系统文件夹选择器指定检测不到的安装
- 明确区分「本机没有 Steam 库」和「有 Steam 但没有安装 CS2」，并列出已检查的位置
- 不是 CS2 安装目录的路径会被拒绝并给出可读的错误提示；已配置但已不存在的路径会被忽略，改用检测到的安装

## 安装

1. 下载并安装对应平台的面板应用
2. 启动面板，在设置中确认 CS2 路径（检测到的安装会直接列出）
3. 点击「部署插件」安装到 CS2 目录
4. 在 CS2 启动项中加入 `-insecure`
5. 配置装备后点击「应用装备」即可

从旧版本升级：打开设置，再次点击「部署插件」。面板会检测到版本不一致并给出提示。

详细说明请查看 [中文文档](https://github.com/kaecho/CS2-Skin-Forge/blob/main/README_CN.md)。
