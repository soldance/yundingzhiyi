#!/usr/bin/env node
/**
 * provision-board.mjs — 将批次 0 的四个任务卡写入 Hermes Kanban 看板
 *
 * 用法：
 *   node scripts/provision-board.mjs --dry-run    # 只打印，不创建
 *   node scripts/provision-board.mjs              # 实际创建
 *
 * 设计说明：
 *   - 任务卡的完整正文内联在本文件中（本文件即任务卡的可版本化副本）
 *   - 幂等：若看板已有任务，直接拒绝执行，不重复创建
 *   - 使用 spawnSync + 参数数组，避免 shell 引号转义问题
 *
 * 前置：HERMES_HOME 指向 Hermes 安装目录
 */

import { spawnSync } from "node:child_process";

const HERMES = "C:\\Users\\Administrator\\AppData\\Local\\hermes\\bin\\hermes.exe";
const BOARD = "yundingzhiyi";
const REPO = "D:\\claude-code-demo\\ai-云顶";
const GH = "https://github.com/soldance/yundingzhiyi/blob/main";

const dryRun = process.argv.includes("--dry-run");

/** 带继承 stdio 的执行；返回 stdout */
function run(args) {
  const r = spawnSync(HERMES, args, { encoding: "utf8" });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    throw new Error(
      `命令失败 (exit ${r.status}): hermes ${args.join(" ")}\n${r.stderr ?? ""}${r.stdout ?? ""}`,
    );
  }
  return (r.stdout ?? "").trim();
}

function runCapture(args) {
  const r = spawnSync(HERMES, args, { encoding: "utf8" });
  return { status: r.status, out: (r.stdout ?? "").trim(), err: (r.stderr ?? "").trim() };
}

// ─────────────────────────────────────────────────────────────
// 任务卡定义
// ─────────────────────────────────────────────────────────────

/**
 * 每张卡 = 五要素：目标 / 文件清单 / 契约引用 / 验收标准 / 禁止事项 / 阻塞处理
 */
const CARDS = [
  {
    key: "0-1",
    title: "0-1 契约冻结：packages/shared 类型层",
    assignee: "backend-developer",
    priority: 1,
    parents: [],
    gate: [
      "test -s packages/shared/package.json",
      "test -s packages/shared/tsconfig.json",
      "test -s packages/shared/src/entities.ts",
      "test -s packages/shared/src/api.ts",
      "test -s packages/shared/src/constants.ts",
      "test -s packages/shared/src/index.ts",
      "! grep -rq \"enum \" packages/shared/src",
      "! grep -rq \"namespace \" packages/shared/src",
      "grep -q \"VersionFingerprint\" packages/shared/src/entities.ts",
      "grep -q \"Champion\" packages/shared/src/entities.ts",
      "grep -q \"GameState\" packages/shared/src/entities.ts",
      "grep -q \"ChatEvent\" packages/shared/src/api.ts",
      "grep -q \"StructuredResult\" packages/shared/src/api.ts",
      "grep -q \"COST_COLORS\" packages/shared/src/constants.ts",
    ],
    body: `## 目标

把 \`docs/COMPONENT-API.md\` 中已冻结的类型定义，1:1 落成可编译的 TypeScript 代码，作为全部并行工作的唯一契约真源。

本卡是**纯翻译工作**，不做任何设计决策。文档写什么就落什么。

文档地址：${GH}/docs/COMPONENT-API.md

---

## 文件清单（只准动这些）

- \`packages/shared/package.json\`
- \`packages/shared/tsconfig.json\`
- \`packages/shared/src/entities.ts\`
- \`packages/shared/src/api.ts\`
- \`packages/shared/src/constants.ts\`
- \`packages/shared/src/index.ts\`

---

## 契约引用

必须实现 \`COMPONENT-API.md\` 的以下章节，**字段名与类型一字不差**：

| 章节 | 内容 |
|---|---|
| §2.1 | \`VersionFingerprint\` / \`Freshness\` |
| §2.2 | \`Champion\` / \`ChampionStats\` / \`Ability\` |
| §2.3 | \`TraitTier\` / \`TraitThreshold\` / \`Trait\` |
| §2.4 | \`ItemCategory\` / \`Item\` |
| §2.5 | \`AugmentRarity\` / \`Augment\` / \`Summon\` |
| §2.6 | \`ChangeDirection\` / \`ChangeTarget\` / \`PatchChange\` / \`PatchNote\` |
| §2.7 | \`Tier\` / \`ChampionRole\` / \`CompReason\` / \`ItemAssignment\` / \`Position\` / \`CompChampion\` / \`Comp\` |
| §2.8 | \`BoardUnit\` / \`HeldItems\` / \`OpponentInfo\` / \`GameState\` |
| §3 | \`Cost\` / \`COST_COLORS\` / \`TIER_ORDER\` / \`BOARD_ROWS\` / \`BOARD_COLS\` / \`TEAM_CODE_SUFFIX\` / \`EconomyTable\` |
| §4 | \`ResponseMeta\` / \`ApiError\` / \`MetaResponse\` / \`SetModule\` / 各 *Response / \`CreateSessionRequest\` / \`CreateSessionResponse\` / \`ChatStreamQuery\` / \`QuickAction\` / \`QUICK_ACTION_LABELS\` / \`ChatEvent\` / \`TargetUnit\` / \`ValidationIssue\` / \`StructuredResult\` |

---

## ⚠️ 两个文档中遗留的矛盾，必须按以下方式解决并在报告中说明

### 矛盾一：\`QuickAction\` 的定义位置

- §4.5 把 \`QuickAction\` 与 \`QUICK_ACTION_LABELS\` 都放在 \`api.ts\`
- §3 说明 \`constants.ts\` 是常量文件，且 \`QUICK_ACTION_LABELS\` 是常量

**若照搬会导致 \`constants.ts\` 反向 import \`api.ts\`，形成循环依赖。**

**处理方式**：把 \`QuickAction\` 与 \`QUICK_ACTION_LABELS\` 一并放进 \`constants.ts\`，并在 \`index.ts\` 统一导出。在报告的「契约偏差」一节写明此决定。

### 矛盾二：\`Freshness\` 与 \`Tier\` 等类型在 \`constants.ts\` 中被引用

§3 的 \`TIER_ORDER: Record<Tier, number>\` 引用了 §2.7 定义的 \`Tier\`。

**处理方式**：\`constants.ts\` 从 \`entities.ts\` import 类型（\`import type\`）。这是允许的方向（constants → entities），不得反向。若发现其他反向引用，一并上报。

---

## 验收标准（必须机械可判定）

逐条执行并记录**实际输出**：

- [ ] \`packages/shared/src/\` 下 4 个文件存在且非空：
      \`ls packages/shared/src\`
- [ ] **无 \`enum\`**：\`grep -rn "enum " packages/shared/src\` → 无输出
- [ ] **无 \`namespace\`**：\`grep -rn "namespace " packages/shared/src\` → 无输出
- [ ] 导出齐全（每条都应有输出）：
      \`grep -c "export" packages/shared/src/entities.ts\`
      \`grep -c "export" packages/shared/src/api.ts\`
      \`grep -c "export" packages/shared/src/constants.ts\`
      \`grep -c "export" packages/shared/src/index.ts\`
- [ ] **包内类型检查通过**（不依赖根 workspace）：
      \`cd packages/shared && npx --yes typescript@5 tsc --noEmit\` → exit 0
- [ ] \`package.json\` 中**无 dependencies 字段**（或为空对象）
- [ ] 报告须包含「契约偏差」一节：列出所有与文档不一致之处及理由；若无则写"无"

---

## 禁止事项

- 🔴 不得修改 \`docs/COMPONENT-API.md\` 或任何已在仓库中的文档
- 🔴 不得新增任何运行时依赖（契约层必须零依赖）
- 🔴 不得引入任何运行时逻辑：本包只有类型与常量
- 🔴 不得为了"更合理"而调整字段名或类型（本卡是翻译，不是设计）
- 🔴 不得使用 \`enum\` / \`namespace\` / 构造函数参数属性 / 旧式装饰器
- 不得创建 \`packages/shared\` 之外的任何文件

---

## 阻塞处理

遇到下列情况**停止工作并上报**，不要自行决定：

1. 文档中的类型存在无法在 TypeScript 中表达的结构
2. 除上述两处矛盾外，发现新的循环依赖或字段冲突
3. 文档对某字段的类型描述有歧义，且不同选择会导致前后端行为不同

上报格式：说明「文档中的问题 → 可选方案 → 建议」三段，等待决策后再动手。

---

## 交付报告要求

- 只报告实际观察到的结果，禁止推测
- 附上上述每条验收命令的**真实输出片段**
- 说明产物的绝对路径
- 明确写出当前工作目录（\`pwd\`），确认是 \`${REPO}\`
`,
  },

  {
    key: "0-2",
    title: "0-2 工程骨架：monorepo + 后端可启动",
    assignee: "backend-developer",
    priority: 2,
    parents: ["0-1"],
    gate: [
      "test -s package.json",
      "test -s pnpm-workspace.yaml",
      "test -s tsconfig.base.json",
      "test -s packages/server/package.json",
      "test -s packages/server/src/index.ts",
      "test -s packages/server/src/app.ts",
      "test -s packages/server/src/routes/health.ts",
      "grep -q \"@hono/node-server\" packages/server/package.json",
      "grep -q \"dev:server\" package.json",
      "grep -q \"typecheck\" package.json",
    ],
    body: `## 目标

建立可运行的 pnpm monorepo 骨架，使后端能启动并响应健康检查。

⚠️ **本项目后端是 Node.js 22 + Hono + TypeScript。不是 Java / Spring Cloud。** 角色描述中的技术栈不适用于本项目，以本卡为准。

---

## 文件清单（只准动这些）

- \`package.json\`（根）
- \`pnpm-workspace.yaml\`
- \`tsconfig.base.json\`
- \`packages/server/package.json\`
- \`packages/server/tsconfig.json\`
- \`packages/server/src/index.ts\`
- \`packages/server/src/app.ts\`
- \`packages/server/src/routes/health.ts\`
- \`.npmrc\`（仅用于设置国内镜像与 workspace 提升策略）

---

## 契约引用

- 必须 import 并使用 \`packages/shared\` 中的 \`MetaResponse\` 类型（见 \`docs/COMPONENT-API.md\` §4.2）
- \`/api/meta\` 的响应结构必须符合 \`MetaResponse\`

---

## 技术栈要求

| 项 | 要求 |
|---|---|
| 运行时 | Node.js 22 |
| 框架 | Hono + \`@hono/node-server\` |
| 开发运行 | \`tsx\`（不要用 nodemon） |
| 构建 | \`tsup\` |
| 测试框架 | **Vitest**（前后端统一，本卡只建立配置） |
| 包管理 | pnpm workspace |

### 根 \`package.json\` 必须提供以下 scripts

\`\`\`
dev            同时启动后端与前端（前端尚未就绪时可只起后端）
dev:server     仅后端
dev:web        仅前端（前端未就绪时可为占位）
build          构建全部
typecheck      跨 workspace 类型检查
test           运行单元测试
lint           代码检查（可用占位）
\`\`\`

---

## ⚠️ 一处必须处理的设计问题

\`packages/shared\` 是**纯类型 + 常量**包，没有构建产物。\`packages/server\` 如何在开发与构建时消费它（别名映射 / workspace 依赖 / 直接引用源码），需要你选择一种并说明理由。

**注意约束**：不得为 \`packages/shared\` 引入构建步骤（它是零依赖的纯类型包，加构建会破坏这一性质）。

---

## 验收标准（必须机械可判定）

- [ ] \`pnpm install\` 成功，退出码 0
- [ ] \`pnpm typecheck\` 退出码 0
- [ ] \`pnpm dev:server\` 能启动，且：
      \`curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health\` → \`200\`
- [ ] \`curl -s http://127.0.0.1:3000/api/meta\` 返回合法 JSON，且含 \`set\` / \`patch\` / \`freshness\` 三个字段
- [ ] \`pnpm build\` 成功产出后端产物
- [ ] \`.gitignore\` 已覆盖 \`node_modules\` / \`dist\`（已存在，核对而非重写）
- [ ] 报告须写明「shared 包的消费方式」及选择理由

---

## 禁止事项

- 🔴 不得引入 ORM、日志框架、DI 容器等重型依赖
- 🔴 不得修改 \`packages/shared/**\`（契约层只读）
- 🔴 不得改用 Express / Fastify / NestJS
- 🔴 不得在 \`app.ts\` 中写业务逻辑（它只做路由注册）
- 不得删除或修改仓库中已有的文档与配置

---

## 阻塞处理

1. 依赖安装失败 → 报告中附**完整错误输出**，不得改用源码复制替代
2. Hono 实际 API 与预期不符 → 附实际报错上报，不得降级为手写 \`http\`
3. \`/api/meta\` 所需的真实数据尚未就绪 → **返回占位数据**（\`patch: "unknown"\`、\`freshness: "unknown"\`）并在报告中说明；不得伪造赛季号

---

## 交付报告要求

- 只报告实际观察到的结果
- 附每条验收命令的真实输出
- 🔴 **完成后必须清理**：关闭启动的服务进程、删除 \`dist/\`，确认 \`git status\` 无意外残留
`,
  },

  {
    key: "0-3",
    title: "0-3 数据完整性校验工具",
    assignee: "tdd-guide",
    priority: 3,
    parents: ["0-2"],
    gate: [
      "test -s scripts/verify.ts",
      "test -s packages/data/package.json",
      "test -s packages/data/src/validate/verifyPack.ts",
      "test -s packages/data/src/validate/verifyPack.test.ts",
      "grep -q '\"verify\"' package.json",
    ],
    body: `## 目标

实现独立的数据完整性校验器，供后续所有数据类任务复用，并作为 CI 的一项检查。

⚠️ 本卡**不需要** TDD 流程，但**必须提供单元测试**覆盖验收条件中列出的场景。

---

## 文件清单（只准动这些）

- \`scripts/verify.ts\`
- \`packages/data/package.json\`
- \`packages/data/tsconfig.json\`
- \`packages/data/src/validate/verifyPack.ts\`
- \`packages/data/src/validate/verifyPack.test.ts\`
- \`package.json\`（根，仅新增 \`verify\` script）

---

## 契约引用

- 校验对象为 \`data/packs/set<N>/\` 下的数据包，字段见 \`docs/COMPONENT-API.md\` §2
- 校验项清单见 \`docs/DEVELOPMENT.md\` §7.3

---

## 校验项（来自 DEVELOPMENT.md §7.3，必须全部覆盖）

1. 版本指纹字段完整
2. 英雄数量在合理区间（当前赛季约 60~90）
3. 每个英雄的费用在 1~5
4. 每个英雄至少有一个羁绊（召唤物除外）
5. 每件成装的 \`composition\` 长度为 2
6. 每个纹章的 \`emblemTrait\` 都在羁绊列表中存在
7. **所有阵容引用的英雄、装备、羁绊名称都能在数据包中找到**

> 第 7 条最重要：它防止阵容库出现"引用了不存在的英雄"这类**静默错误**。

---

## ⚠️ 必须处理的一个矛盾（两处需求冲突）

- \`docs/TODO.md\` 0-3 验收要求：**数据包缺失时明确报错并退出非 0**
- 而 CI（任务 0-4）需要运行同一命令，且**在数据包尚未生成时不得让流水线失败**

**处理方式**：为 \`pnpm verify\` 实现两种模式，并在报告中说明：

| 模式 | 行为 |
|---|---|
| 默认（严格） | 数据包缺失 → 报错退出非 0 |
| \`--ci\` | 数据包缺失 → 输出跳过提示并退出 0；**数据包存在但校验不通过时仍退出非 0** |

---

## 验收标准（必须机械可判定）

- [ ] 数据包缺失时，默认模式退出非 0 且输出明确提到缺失路径：
      \`pnpm verify; echo "exit=$?"\` → \`exit=\` 非 0 值
- [ ] \`--ci\` 模式在数据包缺失时退出 0 并输出跳过提示
- [ ] \`pnpm test\` 全绿，且测试覆盖以下场景（每条一个用例）：
      - 正常数据包 → 通过
      - 缺字段 → 失败
      - 英雄数量异常（如仅 3 个）→ 失败
      - 阵容引用了不存在的英雄 → 失败
- [ ] 校验失败时输出**指出具体哪个文件、哪个字段**（不是只说"校验失败"）
- [ ] 报告须说明两种模式的实现方式

---

## 禁止事项

- 🔴 不得在校验失败时降级为警告（\`--ci\` 模式仅放宽"数据包缺失"这一种情况）
- 🔴 不得放宽阈值来让测试通过
- 🔴 不得引入 Vitest 以外的测试框架
- 不得修改 \`packages/shared/**\`
- 不得读取网络数据（本工具只校验已落盘的数据包）

---

## 阻塞处理

1. 某校验项依赖的字段尚不存在（如 \`economy.json\` 内容未定）→ 在报告中列出，并标记为待补；该字段存在时校验，不存在时跳过并**明确输出跳过原因**
2. 数据包格式文档与实际数据结构不符 → 停止上报，附实际结构片段

---

## 交付报告要求

- 只报告实际观察到的结果，禁止推测
- 附每条验收命令的真实输出
- 🔴 完成后清理临时产物，确认 \`git status\` 无意外残留
`,
  },

  {
    key: "0-4",
    title: "0-4 CI 流水线",
    assignee: "backend-developer",
    priority: 4,
    parents: ["0-2"],
    gate: [
      "test -s .github/workflows/ci.yml",
      "grep -q \"name:\" .github/workflows/ci.yml",
      "! grep -q \"pnpm sync\" .github/workflows/ci.yml",
      "grep -q \"typecheck\" .github/workflows/ci.yml",
      "grep -q \"verify\" .github/workflows/ci.yml",
    ],
    body: `## 目标

建立 GitHub Actions 流水线，使契约一致性、类型正确性、测试与数据完整性在每次推送时被自动检查。

参考先例：\`ai-cloud-notes\` 仓库的 \`.github/workflows/deploy.yml\`（注意：该文件在另一个仓库，**只可参考结构，本项目无部署阶段**）。

---

## 文件清单（只准动这些）

- \`.github/workflows/ci.yml\`
- \`package.json\`（根，仅新增 \`ci\` 等便捷 script，如需要）

---

## 检查项（五个，缺一不可）

| # | 检查 | 说明 |
|---|---|---|
| 1 | **契约完整性** | \`packages/shared/src\` 中无 \`enum\` / \`namespace\`；且 \`docs/COMPONENT-API.md\` 中出现的契约类型名，都能在 \`packages/shared/src\` 中找到对应导出 |
| 2 | **类型检查** | \`pnpm typecheck\` |
| 3 | **单元测试** | \`pnpm test\` |
| 4 | **数据完整性校验** | \`pnpm verify --ci\` |
| 5 | **构建** | \`pnpm build\` |

### 关于第 1 项（契约完整性）的实现建议

用脚本精确匹配，而不是宽泛的 \`grep -c "export"\`：

1. 从 \`docs/COMPONENT-API.md\` 的 ts 代码块中提取形如 \`export interface X\` / \`export type X\` / \`export const X\` 的名称
2. 在 \`packages/shared/src/**/*.ts\` 中查找每个名称的导出
3. 缺失即失败，并打印缺失清单

---

## 触发条件

- \`push\` 到任意分支
- \`pull_request\`

---

## 验收标准（必须机械可判定）

- [ ] \`.github/workflows/ci.yml\` 存在
- [ ] \`grep -c "name:" .github/workflows/ci.yml\` 输出 ≥ 5（五个检查项）
- [ ] CI 中**不出现** \`pnpm sync\`：
      \`grep -n "pnpm sync" .github/workflows/ci.yml\` → 无输出
- [ ] **本地执行一遍 CI 中会用到的全部命令，确认可用**（这是本卡的核心验收）：
      \`pnpm install\` / \`pnpm typecheck\` / \`pnpm test\` / \`pnpm verify --ci\` / \`pnpm build\`
      报告中附每条的 exit code
- [ ] YAML 语法合法：用 Node 的 \`yaml\` 包或等效方式解析并确认对象结构符合预期
- [ ] 报告须写明：CI 与本地执行的命令**完全一致**（列出对照表）

### 说明

你无法在本地运行 GitHub Actions，因此**不要求 CI 真的跑通**。但必须保证：CI 中每一条命令都在本地实际执行过，且退出码符合预期。若某条命令本地就无法通过，不允许用注释掉的方式"修好"。

---

## 禁止事项

- 🔴 **不得添加部署 / 发布 / SSH 步骤**（本项目是本地工具，无服务器）
- 🔴 **不得在 CI 中执行 \`pnpm sync\`**（需要网络、拉取约 23MB、依赖外部服务稳定性）
- 🔴 不得使用需要额外账号配置的第三方 Action
- 🔴 不得为了让流水线"看起来绿"而放宽任何已有校验
- 不得修改 \`packages/shared/**\` 或 \`docs/**\`

---

## 阻塞处理

1. 某检查项在 CI 环境中无法执行（如命令依赖本地路径）→ **报告中说明并结合任务归属上报**，不要直接删掉该检查
2. 需新增 CI 专用依赖（如 \`yaml\` 解析器）→ 在报告中说明理由与替代方案

---

## 交付报告要求

- 只报告实际观察到的结果
- 附本地执行五条命令的**真实输出与退出码**
- 附 CI 与本地命令的对照表
- 🔴 完成后清理 \`dist/\` 等临时产物，确认 \`git status\` 无意外残留
`,
  },
];

// ─────────────────────────────────────────────────────────────
// 执行
// ─────────────────────────────────────────────────────────────

/** 解析 `hermes kanban list --json` 的输出；返回状态非 archived 的任务数 */
function countActiveTasks(stdout) {
  const text = (stdout ?? "").trim();
  if (!text) return 0;
  const start = text.search(/[[{]/);
  if (start < 0) return 0;
  const json = text.slice(start).split("\n").filter((l) => !/^[a-zA-Z#]/.test(l.trim())).join("\n");
  try {
    const parsed = JSON.parse(json);
    const items = Array.isArray(parsed) ? parsed : (parsed.tasks ?? []);
    return items.filter((t) => t?.status !== "archived").length;
  } catch {
    // 解析不了就保守处理：只要非空即视为有任务
    return text.length > 2 ? 1 : 0;
  }
}

/**
 * 组装任务正文：在正文末尾追加机读的「验收命令」段。
 * 该段是派单脚本产物闸门的数据源，格式必须稳定（每行 `- <命令>`）。
 */
function buildBody(card) {
  const gateBlock = (card.gate ?? []).length
    ? `\n\n---\n\n## 验收命令\n\n`
      + `> 以下命令由派单脚本在任务结束后自动执行。**全部通过才算完成**，失败将把任务置为 blocked。\n`
      + `> 你也可以自行运行它们来提前确认结果。\n\n`
      + card.gate.map((c) => `- ${c}`).join("\n")
      + "\n"
    : "";
  return card.body + gateBlock;
}

function main() {
  console.log(`看板：${BOARD}`);
  console.log(`工作区：dir:${REPO}`);
  console.log(`模式：${dryRun ? "DRY-RUN（不创建）" : "实际创建"}\n`);

  // 幂等检查：忽略已归档任务
  const existing = runCapture(["kanban", "--board", BOARD, "list", "--json"]);
  if (existing.status !== 0) {
    console.error(`✗ 无法读取看板 ${BOARD}：${existing.err}`);
    process.exit(1);
  }
  const activeCount = countActiveTasks(existing.out);
  if (activeCount > 0) {
    console.error(`✗ 看板 ${BOARD} 已有 ${activeCount} 个活动任务，拒绝重复创建。`);
    console.error(`  如需重建，请先归档：hermes kanban --board ${BOARD} archive <id> ...`);
    process.exit(1);
  }
  console.log("✓ 看板无活动任务，可以创建\n");

  const created = {};
  for (const card of CARDS) {
    const parentArgs = card.parents.flatMap((p) => ["--parent", created[p]]);
    console.log(`── ${card.key}  ${card.title}`);
    console.log(`   负责人: ${card.assignee}   优先级: ${card.priority}   验收命令: ${(card.gate ?? []).length} 条`);
    if (card.parents.length) {
      console.log(`   依赖: ${card.parents.map((p) => `${p}=${created[p]}`).join(", ")}`);
    }

    if (dryRun) {
      console.log(`   [dry-run] 不创建\n`);
      created[card.key] = `<dry-${card.key}>`;
      continue;
    }

    const out = run([
      "kanban",
      "--board",
      BOARD,
      "create",
      card.title,
      "--body",
      buildBody(card),
      "--assignee",
      card.assignee,
      "--priority",
      String(card.priority),
      "--workspace",
      `dir:${REPO}`,
      ...parentArgs,
    ]);
    const idMatch = out.match(/t_[0-9a-f]+/);
    created[card.key] = idMatch ? idMatch[0] : "(未解析到 id)";
    console.log(`   创建成功: ${created[card.key]}\n`);
  }

  console.log("═══════════════════════════════════════");
  console.log("任务 ID 映射：");
  for (const [k, v] of Object.entries(created)) console.log(`  ${k}  →  ${v}`);

  if (!dryRun) {
    console.log("\n看板当前状态：");
    console.log(runCapture(["kanban", "--board", BOARD, "list"]).out);
  }
}

main();
