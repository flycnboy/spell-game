# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

---

# 梓晏的单词学习（spell-game）

面向小学生的纯前端英语单词学习 PWA（React + TypeScript + Vite + Tailwind + Zustand），无后端，浏览器打开即用，可「添加到主屏幕」当 App 用。

## 功能

- **两种模式**：拼写（字母打乱点选拼词）、听写（听发音手写输入，可设 1/2/3 遍）
- **自适应复习**：复习间隔按单词「错误次数」加权 —— 错得越多复习越频繁（0 错→30 天，1→15，2→7，3→3，≥4→每日）。答对会使错误计数衰减，长期掌握的词逐渐延长间隔。
- **词库管理**：新建本地词库、从 Gist Raw URL 拉取、JSON 导入/导出、跨库导入、勾选另存。
- **释义录入**：可手动录入中文释义/英文释义/例句（**离线可用**），也可联网自动获取并填补空缺字段（不覆盖手动内容）。
- **错词本 + 统计 + 强化练习**：自动记录错题与历史，支持「强化练习错词」。
- **跨设备云端同步**：在「设置 → 跨设备云端同步」中填写 GitHub Token 与 Gist ID，将词库 / 统计 / 释义缓存 / 学习进度打包上传到 GitHub Gist，换设备、清缓存、换浏览器都不丢数据。「上传备份」覆盖云端，「下载备份」覆盖本机（词库按 id 合并，其余后写覆盖）。

## 云端同步说明

- 需要一个带 `gist` 权限的 GitHub Personal Access Token，仅保存在本机浏览器 `localStorage`。
- 首次「上传备份」若未填 Gist ID，会自动新建一个 Gist 并回填 ID。
- 跨设备同步采用「最后写入覆盖」策略（词库为并集合并），建议在一个设备「上传」后再到另一个设备「下载」。

## 本地开发

```bash
npm install
npm run dev      # 本地开发
npm run build    # 类型检查 + 生产构建
```

