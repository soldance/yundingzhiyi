# 任务与优先级

> **领取工作前先读本文件。** 任务卡的格式规范见 [DEVELOPMENT.md §5](DEVELOPMENT.md#5-任务卡格式)。

**当前状态**：设计阶段已完成，**下一项可推进工作：任务 0-1（契约冻结）**

---

## 1. 总览

| 批次 | 任务数 | 状态 | 说明 |
|---|---|---|---|
| **批次 0 · 地基** | 3 | ⬜ 未开始 | 串行，必须最先完成 |
| **批次 1 · 数据线** | 3 | ⬜ 未开始 | 依赖 0-1 |
| **批次 1 · 后端线** | 3 | ⬜ 未开始 | 依赖 0-2 |
| **批次 1 · 前端线** | 6 | ⬜ 未开始 | 仅依赖 0-1 |
| **批次 2 · 模型线** | 5 | ⬜ 未开始 | 依赖数据线与后端线 |
| **批次 3 · 集成** | 2 | ⬜ 未开始 | 依赖全部 |

**图例**：⬜ 未开始 ｜ 🔵 进行中 ｜ ✅ 已完成 ｜ ⛔ 阻塞 ｜ ❌ 取消

---

## 2. 依赖关系

```
0-1 契约 ──┬─→ 0-2 骨架 ──→ 1-B1 ──→ 1-B2 ──→ 1-B3
           │
           ├─→ 数据线 (1-D1 → 1-D2 → 1-D3)
           │
           ├─→ 2-P1 / 2-P2 ──→ 2-P3 强度推导 ──→ 2-P4 校验闸门
           │
           └─→ 前端线 (2-F1 → 2-F2 → 2-F3 ~ 2-F6)   ← 不依赖后端实现
```

**关键路径**：`0-1 → 0-2 → 1-B1 → 1-B2 → 2-P3 → 2-P4 → 3-1`

**并行机会**：契约（0-1）冻结后，数据线、后端线、前端线可同时开工。

---

## 3. 批次 0 · 地基（串行）

### 0-1 契约冻结 🔴 最高优先级

| 项 | 内容 |
|---|---|
| **目标** | 把 `docs/COMPONENT-API.md` 的类型定义落成可编译的 TypeScript 代码，作为全部并行工作的前提 |
| **文件清单** | `packages/shared/package.json`<br>`packages/shared/tsconfig.json`<br>`packages/shared/src/entities.ts`<br>`packages/shared/src/api.ts`<br>`packages/shared/src/constants.ts`<br>`packages/shared/src/index.ts` |
| **契约引用** | 完整实现 [COMPONENT-API.md](COMPONENT-API.md) §2 / §3 / §4 的全部类型 |
| **验收标准** | [ ] `pnpm typecheck` 退出码为 0<br>[ ] `packages/shared/src/` 下 4 个文件均存在且非空<br>[ ] 无任何 `enum`（用 `grep -r "enum " packages/shared/src` 应无输出）<br>[ ] `entities.ts` 导出 `Champion` / `Trait` / `Item` / `Augment` / `Comp` / `PatchChange` / `GameState` / `VersionFingerprint`<br>[ ] `api.ts` 导出 `ResponseMeta` / `MetaResponse` / `ChatEvent` / `StructuredResult` / `QuickAction` |
| **禁止事项** | 不得添加依赖（契约层应为零依赖）<br>不得偏离 COMPONENT-API.md 的字段定义<br>不得引入运行时逻辑（纯类型与常量） |
| **阻塞处理** | 发现文档中的类型定义有问题（如循环引用、字段冲突）→ **停止并上报**，说明问题与建议方案，等待决策后再动手 |

---

### 0-2 工程骨架

| 项 | 内容 |
|---|---|
| **目标** | 建立可运行的 monorepo 骨架，后端能启动并响应健康检查 |
| **文件清单** | `package.json`<br>`pnpm-workspace.yaml`<br>`tsconfig.base.json`<br>`packages/server/package.json`<br>`packages/server/tsconfig.json`<br>`packages/server/src/index.ts`<br>`packages/server/src/app.ts` |
| **契约引用** | `/api/meta` 返回 `MetaResponse`（可先返回占位数据） |
| **验收标准** | [ ] `pnpm install` 成功<br>[ ] `pnpm typecheck` 退出码为 0<br>[ ] `pnpm dev:server` 能启动，且 `GET /api/meta` 返回 HTTP 200 与合法 JSON<br>[ ] `.gitignore` 已覆盖 `node_modules` / `dist` |
| **禁止事项** | 不得引入 ORM、日志框架等重型依赖<br>不得修改 `packages/shared/**` |
| **阻塞处理** | 依赖安装失败 → 报告中附完整错误，不得擅自从源码复制替代实现 |

---

### 0-3 数据校验工具

| 项 | 内容 |
|---|---|
| **目标** | 实现独立的数据完整性校验器，供后续所有数据类任务使用 |
| **文件清单** | `scripts/verify.ts`<br>`packages/data/src/validate/verifyPack.ts`<br>`packages/data/src/validate/verifyPack.test.ts` |
| **契约引用** | 校验对象为 `data/packs/set<N>/` 下的数据包，字段见 [COMPONENT-API.md](COMPONENT-API.md) §2 |
| **验收标准** | [ ] `pnpm verify` 在数据包缺失时**明确报错并退出非 0**，而非静默通过<br>[ ] 校验项覆盖 [DEVELOPMENT.md §7.3](DEVELOPMENT.md#73-校验器要求) 列出的全部检查<br>[ ] `pnpm test` 覆盖：正常数据包通过、缺字段失败、英雄数量异常失败、阵容引用不存在的英雄失败<br>[ ] 校验失败时输出指出**具体哪个文件、哪个字段** |
| **禁止事项** | 不得在校验失败时降级为警告<br>不得放宽阈值来"修好"测试 |
| **阻塞处理** | 校验项无法实现（如字段尚不存在）→ 报告中说明，并标记为待补 |

---

## 4. 批次 1 · 数据线

### 1-D1 抓取与赛季定位 🔴 高风险

| 项 | 内容 |
|---|---|
| **目标** | 从 Community Dragon 抓取原始数据，正确定位当前赛季并落盘 |
| **文件清单** | `packages/data/src/fetch/cdragon.ts`<br>`packages/data/src/fetch/locateSet.ts`<br>`packages/data/src/fetch/locateSet.test.ts` |
| **契约引用** | 产出物的赛季编号须匹配 `VersionFingerprint.set` |
| **验收标准** | [ ] **用 `number` 字段定位赛季**，代码中不存在按 `name` 字段筛选的逻辑<br>[ ] `apiName` 前缀二次校验，匹配数不足时显式抛错<br>[ ] 日志明确输出定位到的赛季编号与英雄数量<br>[ ] 单测覆盖：正常定位、多份同号码快照取最后一份、前缀不匹配时抛错<br>[ ] 原始数据落盘至 `data/cache/`（不入 git） |
| **禁止事项** | 🔴 **不得按 `setData[].name` 筛选赛季**（该字段实测会撒谎，见 [AGENTS.md §2](../AGENTS.md#2-已知的数据陷阱务必先读)）<br>不得在校验失败时降级返回 |
| **阻塞处理** | 数据结构与文档描述不符 → **停止并上报**，附实际结构片段，不得猜测适配 |

---

### 1-D2 清洗与规范化

| 项 | 内容 |
|---|---|
| **目标** | 把原始数据清洗为 `data/packs/set18/` 下的分模块数据包 |
| **文件清单** | `packages/data/src/normalize/champions.ts`<br>`packages/data/src/normalize/traits.ts`<br>`packages/data/src/normalize/items.ts`<br>`packages/data/src/normalize/text.ts`<br>`packages/data/src/normalize/*.test.ts` |
| **契约引用** | 产出须严格符合 `Champion` / `Trait` / `Item` / `Augment` / `Summon`（[COMPONENT-API.md](COMPONENT-API.md) §2.2~§2.5） |
| **验收标准** | [ ] 产出 8 个文件：`version.json` `champions.json` `traits.json` `items.json` `augments.json` `emblems.json` `summons.json` `economy.json`<br>[ ] 非英雄条目（道具、召唤物）已正确分流，**不在 `champions.json` 中**<br>[ ] 羁绊档位从 `@{minUnits=2;maxUnits=3;style=1}` 解析为结构化数组<br>[ ] 描述文本占位符已清理，无法解析的保留原文并标注<br>[ ] 资源路径 `.tex` / `.dds` 已改写为 `.png` 且小写<br>[ ] `pnpm verify` 通过 |
| **禁止事项** | 不得丢失原始信息（无法解析的占位符须保留而非删除）<br>不得虚构数值 |
| **阻塞处理** | 某字段语义不明 → 报告中列出该字段的实际取值样例，标记为待确认，不要猜 |

---

### 1-D3 缓存与版本指纹

| 项 | 内容 |
|---|---|
| **目标** | 避免重复拉取大数据文件，并生成完整的版本指纹 |
| **文件清单** | `packages/data/src/fetch/cache.ts`<br>`packages/data/src/fetch/fingerprint.ts`<br>`packages/data/src/fetch/fingerprint.test.ts`<br>`scripts/sync.ts` |
| **契约引用** | 生成 `VersionFingerprint`（[COMPONENT-API.md](COMPONENT-API.md) §2.1） |
| **验收标准** | [ ] 版本未变时 `pnpm sync` **不重复下载**大数据文件（可通过日志或耗时验证）<br>[ ] 生成的 `version.json` 含全部字段：`set` `patch` `syncedAt` `cdragonVersion` `sourceUrls` `hash`<br>[ ] `hash` 在数据未变时保持稳定，数据变化时改变<br>[ ] 首次同步与二次同步的耗时差异可观测 |
| **禁止事项** | 不得在缓存判断失败时直接全量重新下载而不记录原因 |
| **阻塞处理** | 版本元数据接口不可用 → 报告中说明，并实现"退化为全量下载但记录警告"的路径 |

---

## 5. 批次 1 · 后端线

### 1-B1 HTTP 服务与路由框架

| 项 | 内容 |
|---|---|
| **目标** | 建立路由框架、统一错误处理与静态资源托管 |
| **文件清单** | `packages/server/src/routes/health.ts`<br>`packages/server/src/middleware/error.ts`<br>`packages/server/src/middleware/meta.ts`<br>`packages/server/src/app.ts`（仅追加路由注册） |
| **契约引用** | 错误响应遵循 `ApiError`（[COMPONENT-API.md](COMPONENT-API.md) §4.1） |
| **验收标准** | [ ] `GET /api/health` 返回 200<br>[ ] 未匹配路由返回 404，响应体为合法 `ApiError`<br>[ ] 处理器抛错时返回 500，响应体为合法 `ApiError`，且不泄露堆栈到响应<br>[ ] `pnpm typecheck` 通过 |
| **禁止事项** | 不得引入 Express / Fastify 等替代框架<br>不得在 `app.ts` 中写业务逻辑 |
| **阻塞处理** | Hono 版本 API 与文档不符 → 附实际报错上报 |

---

### 1-B2 数据访问层

| 项 | 内容 |
|---|---|
| **目标** | 实现唯一的数据读入口，含内存缓存与版本指纹校验 |
| **文件清单** | `packages/server/src/store/loadPack.ts`<br>`packages/server/src/store/index.ts`<br>`packages/server/src/store/loadPack.test.ts` |
| **契约引用** | 返回类型为 `Champion[]` / `Trait[]` / `Item[]` / `Augment[]` / `VersionFingerprint` |
| **验收标准** | [ ] 提供 `loadSet(module)` 统一入口，业务代码无直接文件读取<br>[ ] 首次读取后数据常驻内存，二次读取不重复解析（单测验证）<br>[ ] **赛季不一致时抛错**，错误信息含期望赛季与实际赛季<br>[ ] 补丁落后时正常返回，但在返回值中标记 `freshness: "stale"`<br>[ ] 数据包缺失时抛错，错误信息含期望路径 |
| **禁止事项** | 🔴 **不得降级**：赛季不一致必须抛错，不允许返回旧赛季数据<br>不得在 store 之外读写数据文件 |
| **阻塞处理** | `data/packs/` 尚无数据（依赖数据线）→ 可用最小 fixture 完成单测，并在报告中说明 |

---

### 1-B3 数据类 API

| 项 | 内容 |
|---|---|
| **目标** | 暴露全部数据类路由 |
| **文件清单** | `packages/server/src/routes/meta.ts`<br>`packages/server/src/routes/set.ts`<br>`packages/server/src/routes/comp.ts`<br>`packages/server/src/routes/patch.ts` |
| **契约引用** | `MetaResponse` / `ChampionsResponse` / `TraitsResponse` / `ItemsResponse` / `AugmentsResponse` / `EmblemsResponse` / `CompListResponse` / `PatchResponse` |
| **验收标准** | [ ] 8 个路由全部返回 200 且响应体含 `ResponseMeta` 字段<br>[ ] `/api/set/unknown` 返回 400 与合法 `ApiError`<br>[ ] 赛季不一致时返回 409 与 `code: "SET_MISMATCH"`<br>[ ] 每个响应都含 `freshness` 字段 |
| **禁止事项** | 不得在路由中写数据读取逻辑（必须经 store）<br>不得返回未在契约中定义的字段 |
| **阻塞处理** | 阵容数据尚不存在（依赖 2-P3）→ `/api/comp` 可先返回空数组，报告中明确说明 |

---

## 6. 批次 1 · 前端线

> 前端线**仅依赖契约（0-1）**，不依赖后端实现。开发期可使用种子数据。

### 2-F1 应用外壳与视图切换

| 项 | 内容 |
|---|---|
| **目标** | 建立 Vue 应用外壳、三视图切换、版本状态条 |
| **文件清单** | `packages/web/package.json`<br>`packages/web/vite.config.ts`<br>`packages/web/index.html`<br>`packages/web/src/main.ts`<br>`packages/web/src/App.vue` |
| **契约引用** | 版本状态条消费 `MetaResponse` |
| **验收标准** | [ ] `pnpm dev:web` 启动，页面可访问<br>[ ] 三个视图可切换<br>[ ] 版本状态条显示赛季与补丁<br>[ ] `freshness === "stale"` 时状态条显示警告样式<br>[ ] `pnpm build` 成功产出静态文件 |
| **禁止事项** | 不得引入 UI 组件库（见 [TECH-STACK.md §3.1](TECH-STACK.md#31-为什么不引入组件库)）<br>不得引入状态管理库 |
| **阻塞处理** | 后端未就绪 → 使用本地 mock 数据，报告中说明 |

---

### 2-F2 状态模块

| 项 | 内容 |
|---|---|
| **目标** | 实现**纯逻辑、不碰 DOM** 的状态模块 |
| **文件清单** | `packages/web/src/state/store.ts`<br>`packages/web/src/state/store.test.ts`<br>`packages/web/src/api/client.ts` |
| **契约引用** | 状态类型基于 `GameState` / `Comp` / `MetaResponse` |
| **验收标准** | [ ] `store.ts` 中**不出现任何 DOM 或 Vue 组件 API**（不得 import `vue` 的组件相关导出）<br>[ ] 单测覆盖：状态初始化、局部更新、局面字段增删、重置<br>[ ] `api/client.ts` 封装全部数据类路由调用，且类型来自契约层 |
| **禁止事项** | 不得在状态模块中做业务判断（判断属于推导引擎）<br>不得直接 `fetch` 而不经 `api/client.ts` |
| **阻塞处理** | 契约字段不足 → 停止上报，不得自行扩展 |

---

### 2-F3 阵容卡片组件

| 项 | 内容 |
|---|---|
| **目标** | 阵容卡片：费用描边头像、羁绊徽章、装备图标、梯队标记 |
| **文件清单** | `packages/web/src/components/CompCard.vue`<br>`packages/web/src/components/ChampionAvatar.vue`<br>`packages/web/src/components/TraitBadge.vue` |
| **契约引用** | 消费 `Comp` / `Champion` / `Trait` / `Item`；费用色使用 `COST_COLORS` 常量 |
| **验收标准** | [ ] 头像按费用显示对应描边色（使用契约层 `COST_COLORS`，不自行定义颜色）<br>[ ] 头像加载失败时降级为文字，不出现破图<br>[ ] 徽章区分激活 / 未激活两态<br>[ ] `pnpm build` 通过 |
| **禁止事项** | 不得硬编码费用颜色<br>不得引入图标库以外的 UI 依赖 |
| **阻塞处理** | 数据包未就绪 → 使用种子数据，报告中说明 |

---

### 2-F4 阵容详情与溯源面板

| 项 | 内容 |
|---|---|
| **目标** | 「为什么是 T0」展开面板，展示依据的补丁改动与官方来源 |
| **文件清单** | `packages/web/src/views/CompDetail.vue`<br>`packages/web/src/components/ReasonList.vue` |
| **契约引用** | 消费 `Comp.reasons: CompReason[]` 与 `PatchChange` |
| **验收标准** | [ ] 默认折叠，点击可展开<br>[ ] 每条依据显示：影响的实体、增减方向（用色彩区分）、一句话说明<br>[ ] 每条依据提供官方公告**外链**（`target="_blank"` 且带 `rel="noopener"`）<br>[ ] `reasons` 为空时显示"本补丁未影响该阵容"，而非空白 |
| **禁止事项** | 不得伪造来源链接<br>不得在依据缺失时静默隐藏面板 |
| **阻塞处理** | 补丁数据未就绪 → 显示占位状态，报告中说明 |

---

### 2-F5 棋盘网格组件

| 项 | 内容 |
|---|---|
| **目标** | 4×7 棋盘，奇数行错位模拟六边形 |
| **文件清单** | `packages/web/src/components/BoardGrid.vue` |
| **契约引用** | 消费 `Position`；尺寸使用 `BOARD_ROWS` / `BOARD_COLS` 常量 |
| **验收标准** | [ ] 渲染 4 行 × 7 列<br>[ ] 奇数行有横向偏移<br>[ ] 可传入 `Position[]` 正确落子<br>[ ] 同一格多个单位时有可见提示（不静默覆盖）<br>[ ] 使用契约层的棋盘尺寸常量，不硬编码 4/7 |
| **禁止事项** | 不得硬编码棋盘尺寸 |
| **阻塞处理** | 站位语义不明 → 按 `row 0 = 最前排` 实现并上报确认 |

---

### 2-F6 数据速查表

| 项 | 内容 |
|---|---|
| **目标** | 英雄 / 羁绊 / 装备 / 海克斯的可搜索列表 |
| **文件清单** | `packages/web/src/views/DataBrowser.vue`<br>`packages/web/src/components/EntityTable.vue` |
| **契约引用** | 消费 `Champion` / `Trait` / `Item` / `Augment` |
| **验收标准** | [ ] 四个分类可切换<br>[ ] 支持按名称搜索<br>[ ] 支持按费用筛选（英雄）<br>[ ] 显示完整数值字段<br>[ ] 空结果时显示明确提示 |
| **禁止事项** | 不得引入表格组件库 |
| **阻塞处理** | 数据未就绪 → 用种子数据，报告中说明 |

---

## 7. 批次 2 · 模型线

### 2-P1 补丁说明抓取与结构化

| 项 | 内容 |
|---|---|
| **目标** | 抓取官方补丁公告，产出带来源链接的结构化改动清单 |
| **文件清单** | `packages/data/src/patch/fetchNotes.ts`<br>`packages/data/src/patch/parseNotes.ts`<br>`data/packs/set18/patch.json` |
| **契约引用** | 产出 `PatchNote` 与 `PatchChange[]`（[COMPONENT-API.md](COMPONENT-API.md) §2.6） |
| **验收标准** | [ ] 每条 `PatchChange` 都有 `id` `patch` `targetName` `direction` `rawText` `sourceUrl`<br>[ ] `id` 格式为 `<patch>:<序号>`，且在一份 PatchNote 内唯一<br>[ ] `rawText` 保留官方原文片段，可用于人工核对<br>[ ] 解析失败的公告**显式报错**，不产出残缺数据 |
| **禁止事项** | 不得编写脆弱的 HTML 选择器爬虫（公告结构变动即失效）<br>不得虚构改动数值 |
| **阻塞处理** | 公告页面结构无法可靠解析 → 上报并建议改为"人工粘贴原文"的半自动方案 |

---

### 2-P2 LLM 代理与工具

| 项 | 内容 |
|---|---|
| **目标** | 流式调用模型，暴露确定性工具 |
| **文件清单** | `packages/server/src/llm/client.ts`<br> `packages/server/src/llm/tools.ts`<br>`packages/server/src/routes/chat.ts` |
| **契约引用** | 推送 `ChatEvent`；工具入参出参须与契约一致 |
| **验收标准** | [ ] 密钥仅从**环境变量**读取，代码与响应中均不出现密钥<br>[ ] `GET /api/chat/stream` 返回 `text/event-stream`，事件符合 `ChatEvent` 联合类型<br>[ ] 无密钥时推送 `error` 事件，且**数据类路由不受影响**<br>[ ] 提供两个确定性工具：实体查询、羁绊核验<br>[ ] 羁绊核验的入参为英雄名称数组，出参为每羁绊的数量与激活档 |
| **禁止事项** | 🔴 不得把密钥返回给前端或写入日志<br>不得让模型直接访问数据文件 |
| **阻塞处理** | 无可用模型路由 → 实现完整逻辑但用 mock 测试，报告中说明 |

---

### 2-P3 阵容强度推导引擎 🔴 核心算法

| 项 | 内容 |
|---|---|
| **目标** | 实现补丁改动到阵容梯队推导 |
| **文件清单** | `packages/server/src/engine/derive.ts`<br>`packages/server/src/engine/mapChanges.ts`<br>`packages/server/src/engine/derive.test.ts`<br>`data/knowledge/comps.md` |
| **契约引用** | 产出 `Comp[]`，其中 `tier` / `score` / `reasons` 为推导结果 |
| **验收标准** | [ ] 输入（阵容基线 + 补丁改动 + 数据包）→ 输出 `Comp[]`<br>[ ] 每套阵容的 `reasons` **非空**（除非该补丁确实未影响任何成员）<br>[ ] `score` = `baseline` + Σ`delta`，可单测验证<br>[ ] 梯队划分由排序得出，**代码中不存在硬编码梯队表**<br>[ ] 单测覆盖：改动命中核心卡、命中挂件、命中无关英雄三种情形 |
| **禁止事项** | 🔴 **不得硬编码梯队**（梯队必须是算出来的）<br>不得让推导依赖网络或模型 |
| **阻塞处理** | 映射规则未定 → 先用可替换的默认规则实现并用测试固定行为，报告中明确标注规则待定 |

---

### 2-P4 输出校验闸门

| 项 | 内容 |
|---|---|
| **目标** | 校验模型输出的结构化结果，拦截幻觉 |
| **文件清单** | `packages/server/src/guard/validateOutput.ts`<br>`packages/server/src/guard/validateOutput.test.ts` |
| **契约引用** | 产出 `StructuredResult`，问题记录在 `issues: ValidationIssue[]` |
| **验收标准** | [ ] 模型给出不存在的英雄名 → 产生 `unknown_name` 问题并记录原始名称<br>[ ] `evidence` 指向不存在的改动 ID → 产生 `missing_evidence`<br>[ ] `traitCheck` **由服务端重算**，不以模型给出为准<br>[ ] 单测覆盖：全部合法、含编造英雄、含编造羁绊、羁绊数不符四种情形<br>[ ] 校验不通过时**仍返回结果**，并非丢弃 |
| **禁止事项** | 🔴 不得静默丢弃非法项（必须记录到 `issues` 供前端可视化）<br>不得信任模型给出的羁绊计数 |
| **阻塞处理** | 白名单来源（数据包）未就绪 → 用 fixture 完成单测 |

---

### 2-P5 问答界面

| 项 | 内容 |
|---|---|
| **目标** | 局面输入表单 + 流式对话 + 校验结果可视化 |
| **文件清单** | `packages/web/src/views/ChatPanel.vue`<br>`packages/web/src/components/GameStateForm.vue`<br>`packages/web/src/components/IssueList.vue` |
| **契约引用** | 消费 `GameState` / `ChatEvent` / `StructuredResult` / `ValidationIssue` |
| **验收标准** | [ ] 表单字段与 `GameState` 一一对应<br>[ ] 6 个快捷指令按钮，文案取自 `QUICK_ACTION_LABELS`<br>[ ] SSE 流式渲染，支持中途停止<br>[ ] `issues` **必须可视化**（如标红并注明原因）<br>[ ] 模型不可用时显示明确提示，且不影响其他视图 |
| **禁止事项** | 🔴 不得静默隐藏 `issues`<br>不得在前端做名称校验（校验属于后端） |
| **阻塞处理** | 后端未就绪 → 用 mock SSE 流，报告中说明 |

---

## 8. 批次 3 · 集成

### 3-1 端到端串联

| 项 | 内容 |
|---|---|
| **目标** | 真实数据打通全链路 |
| **验收标准** | [ ] `pnpm sync` → `pnpm build` → 启动 → 浏览器全流程可用<br>[ ] 阵容总览显示推导得出的梯队，并含依据<br>[ ] 数据速查可查到真实数值<br>[ ] 版本状态条显示正确赛季与补丁<br>[ ] 关闭模型配置后，阵容总览与数据速查仍完全可用 |
| **禁止事项** | 不得为通过验收而放宽数据校验 |
| **阻塞处理** | 按失败环节归属上报 |

---

### 3-2 幻觉专项测试

| 项 | 内容 |
|---|---|
| **目标** | 验证编造名称确实被拦截并可视化 |
| **验收标准** | [ ] 构造含编造英雄名的模型输出，确认被标记为 `unknown_name`<br>[ ] 构造羁绊计数错误的输出，确认被服务端重算修正<br>[ ] 构造无依据的结论，确认被标记 `missing_evidence`<br>[ ] 前端确认 `issues` 实际渲染出来（截图或 DOM 断言） |
| **禁止事项** | 不得只测后端不测前端渲染 |
| **阻塞处理** | 无法构造测试场景 → 上报说明 |

---

## 9. 决策记录

| 编号 | 决策 | 状态 |
|---|---|---|
| D-01 | 目标版本为端游 Set 18（非手游「金铲铲之战」） | ✅ 已定 |
| D-02 | 产品形态为本地 Web 应用（后端 + 前端） | ✅ 已定 |
| D-03 | 数据路线为「补丁驱动推导」，暂不接入真实统计 | ✅ 已定 |
| D-04 | 许可证为 MIT | ✅ 已定 |
| D-05 | 后端 Node + Hono + TypeScript；前端 Vue 3 + Vite + Tailwind，不引入组件库 | ✅ 已定 |
| D-06 | 数据分三种存储：JSON 数据包 / Markdown 知识层 / SQLite 动态数据 | ✅ 已定 |
| D-07 | 仓库结构采用 monorepo，目录承担文件所有权边界 | ✅ 已定 |
| **D-08** | **改动到强度的映射规则** | ⬜ **待定**（影响 2-P3） |
| **D-09** | **阵容基准线的来源与维护方式** | ⬜ **待定**（影响 2-P3） |
| **D-10** | **语言模型的路由与密钥来源** | ⬜ **待定**（影响 2-P2） |
| **D-11** | **是否提供 MCP 服务形态** | ⬜ **待定**（不影响当前批次） |

> 待定项不阻塞批次 0 与批次 1。相关任务已给出"先用可替换实现并固定行为"的推进方式。

---

## 10. 看板任务 ID 映射

任务已创建到 Hermes Kanban 看板 **`yundingzhiyi`**，工作区模式为 `dir:`（直接以仓库目录为工作区）。

| 任务 | 看板 ID | 负责人 | 依赖 | 创建时间 |
|---|---|---|---|---|
| 0-1 契约冻结 | `t_e5ac8b02` | backend-developer | — | 2026-09-29 |
| 0-2 工程骨架 | `t_82ac9bd7` | backend-developer | 0-1 | 2026-09-29 |
| 0-3 数据完整性校验工具 | `t_d4a1a099` | tdd-guide | 0-2 | 2026-09-29 |
| 0-4 CI 流水线 | `t_c245f8c1` | backend-developer | 0-2 | 2026-09-29 |

### 常用命令

```bash
hermes kanban --board yundingzhiyi list                 # 全部任务
hermes kanban --board yundingzhiyi list --status done   # 已完成
hermes kanban --board yundingzhiyi stats                # 状态与负责人汇总
hermes kanban --board yundingzhiyi show <id>            # 详情、评论、审计轨迹
```

### 批次 1 及之后

批次 1（数据线 / 后端线 / 前端线）与批次 2、3 的任务**尚未创建到看板**，将在批次 0 完成后创建——原因是其中的前端视觉规格、阵容基线格式等需用批次 0 产出的真实数据补齐（见 §9 待定项 D-08 / D-09）。

### 重建方式

任务卡正文内联在 `scripts/provision-board.mjs` 中，该脚本是任务卡的可版本化副本，且具备幂等保护（看板非空时拒绝重复创建）。

```bash
node scripts/provision-board.mjs --dry-run   # 预览
node scripts/provision-board.mjs             # 创建
```
