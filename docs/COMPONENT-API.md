# 契约层与 API 定义

> **本文件定义唯一的契约真源。** 实现代码必须严格遵循此处的类型定义，不得自行增删字段。
>
> 🔒 **契约层是只读的**（见 [AGENTS.md §4](../AGENTS.md#4-契约层是只读的)）。发现设计问题时**停止工作并上报**，不得自行修改。
>
> 对应的实现落点：`packages/shared/src/`

---

## 1. 契约层文件划分

| 文件 | 内容 |
|---|---|
| `entities.ts` | 游戏实体与业务实体类型 |
| `api.ts` | 每个 API 路由的请求与响应类型 |
| `constants.ts` | 常量：费用、梯队、阈值、默认值 |

**统一约定**：

- 全部使用 `type` / `interface`，**不使用 `enum`**（改用联合类型，避免运行时对象与类型擦除问题）
- 所有面向前端的字段使用中文可读名称（`name`），内部标识使用 `apiName`
- 所有可选字段显式标注 `?`，禁止用空字符串代替缺失

---

## 2. `entities.ts`

### 2.1 版本指纹

```ts
/** 数据包版本指纹。每个赛季数据包一份，位于 data/packs/set<N>/version.json */
export interface VersionFingerprint {
  /** 赛季编号，如 18 */
  set: number;
  /** 补丁版本，如 "18.3" */
  patch: string;
  /** 数据同步时间（ISO 8601） */
  syncedAt: string;
  /** Community Dragon 内容版本 */
  cdragonVersion: string;
  /** 游戏客户端版本（若可获得） */
  gameVersion?: string;
  /** 数据来源链接，供人工核对 */
  sourceUrls: string[];
  /** 数据包内容哈希，用于一致性检查 */
  hash: string;
}

/** 数据新鲜度 */
export type Freshness =
  | "fresh"   // 与已知最新补丁一致
  | "stale"   // 落后于已知最新补丁，需在界面警告
  | "unknown";// 无法判断（如离线且无已知最新补丁记录）
```

### 2.2 英雄

```ts
/** 英雄（棋子） */
export interface Champion {
  /** 内部标识，如 "TFT18_Lux" */
  apiName: string;
  /** 中文名，如 "拉克丝" */
  name: string;
  /** 费用，1-5 */
  cost: Cost;
  /** 所属羁绊名称（中文） */
  traits: string[];
  /** 方形头像 URL */
  icon: string;
  /** 基础属性 */
  stats: ChampionStats;
  /** 技能 */
  ability: Ability;
  /**
   * 多形态英雄的形态列表（如拉克丝的 9 种羁绊形态）。
   * 仅当存在形态时提供；此时本条目为"基础名"，各形态为独立条目并带 formOf 指向本条目。
   */
  forms?: string[];
  /** 若本条目是某英雄的形态变体，指向其基础名的 apiName */
  formOf?: string;
}

export interface ChampionStats {
  hp: number;
  armor: number;
  magicResist: number;
  /** 攻击力 */
  damage: number;
  /** 攻击速度（次/秒） */
  attackSpeed: number;
  /** 攻击距离（格） */
  range: number;
  /** 技能所需法力值 */
  mana: number;
  /** 初始法力值 */
  initialMana: number;
}

export interface Ability {
  /** 技能名 */
  name: string;
  /** 技能描述（已清理占位符与标记） */
  desc: string;
}
```

### 2.3 羁绊

```ts
/** 羁绊激活档位的样式等级。对应数据源的 style 字段。 */
export type TraitTier = 1 | 2 | 3 | 4 | 5 | 6;

/** 羁绊的一个激活档位 */
export interface TraitThreshold {
  /** 激活所需单位数 */
  minUnits: number;
  /** 该档位的等级 */
  tier: TraitTier;
  /** 该档位的效果描述（已清理占位符） */
  effect: string;
}

export interface Trait {
  apiName: string;
  /** 中文名，如 "永恒之森" */
  name: string;
  /** 所有激活档位，按 minUnits 升序 */
  thresholds: TraitThreshold[];
  /** 羁绊整体描述 */
  desc: string;
  icon: string;
  /** 具有该羁绊的单位名称列表 */
  units: string[];
  /**
   * 是否为"唯一羁绊"（如大元素使、宝石骑士），
   * 这类羁绊只对特定单位生效，不参与常规计数展示
   */
  isUnique?: boolean;
}
```

### 2.4 装备

```ts
/**
 * 装备分类。分类互斥且完备。
 * emblem（纹章）单独成类，因为它提供羁绊计数，在核验中需特殊处理。
 */
export type ItemCategory =
  | "component"
  | "craftable"
  | "artifact"
  | "support"
  | "radiant"
  | "emblem";

export interface Item {
  apiName: string;
  /** 中文名，如 "无尽之刃" */
  name: string;
  category: ItemCategory;
  icon: string;
  /** 效果描述（已清理占位符） */
  desc: string;
  /**
   * 合成配方（散件名称）。
   * craftable 与 emblem 通常有配方；其余分类为空数组。
   */
  composition: string[];
  /**
   * 若本装备为纹章，其提供的羁绊名称。
   * 仅 category === "emblem" 时存在。
   */
  emblemTrait?: string;
}
```

### 2.5 海克斯与召唤物

```ts
/** 海克斯等级 */
export type AugmentRarity = "silver" | "gold" | "prismatic";

export interface Augment {
  apiName: string;
  name: string;
  icon: string;
  desc: string;
  rarity: AugmentRarity;
  /** 关联羁绊（仅羁绊转职类海克斯有值） */
  traits: string[];
}

/**
 * 召唤物 / 非英雄单位。
 *
 * 🔴 单独存储的原因：它们会被阵容引用，但**不计入羁绊计数**。
 * 若混入 Champion，羁绊核验会算错，且错得不明显。
 */
export interface Summon {
  apiName: string;
  name: string;
  icon: string;
  /** 关联羁绊名称，仅供展示，不参与计数 */
  traits: string[];
  /** 召唤来源英雄名称（若可确定） */
  summonerOf?: string;
}
```

### 2.6 补丁改动

```ts
/** 改动方向 */
export type ChangeDirection = "buff" | "nerf" | "adjust" | "new" | "removed";

/** 被改动的实体类型 */
export type ChangeTarget = "champion" | "trait" | "item" | "augment" | "system";

/** 单条改动 */
export interface PatchChange {
  /** 稳定 ID。格式：`<patch>:<序号>`，被 Comp.reasons 引用 */
  id: string;
  patch: string;
  target: ChangeTarget;
  /** 被改动实体名称，如 "凯特琳" */
  targetName: string;
  /** 被改动的属性，如 "攻击力"；无具体属性时为 null */
  field: string | null;
  before: string | null;
  after: string | null;
  /** 改动方向（由解析结果判定） */
  direction: ChangeDirection;
  /** 官方原文片段，用于人工核对 */
  rawText: string;
  /** 官方公告链接 */
  sourceUrl: string;
}

export interface PatchNote {
  patch: string;
  /** 公告标题 */
  title: string;
  /** 公告发布日期（ISO 8601） */
  publishedAt: string;
  sourceUrl: string;
  changes: PatchChange[];
}
```

### 2.7 阵容

```ts
/** 梯队 */
export type Tier = "T0" | "T1" | "T2" | "T3";

/** 英雄在阵容中的角色 */
export type ChampionRole = "carry" | "tank" | "support" | "flex";

/** 阵容强度依据。这是"可溯源"的实现基础，reasons 必须非空。 */
export interface CompReason {
  /** 指向 PatchChange.id */
  patchChangeId: string;
  /** 该改动影响到的实体名称 */
  entityName: string;
  /** 该改动对本套阵容的强度贡献（正为增强，负为削弱） */
  delta: number;
  /** 展示给用户的一句话说明 */
  explanation: string;
}

/** 阵容中的一件装备分配 */
export interface ItemAssignment {
  /** 装备名称 */
  itemName: string;
  /** 归属的英雄名称 */
  championName: string;
  /** 优先级，1 为最高 */
  priority: number;
  /** 是否为可选替代 */
  optional?: boolean;
}

/** 站位坐标 */
export interface Position {
  championName: string;
  /** 0 = 最前排，3 = 最后排 */
  row: 0 | 1 | 2 | 3;
  /** 0 = 最左，6 = 最右 */
  col: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

/** 阵容骨架中的核心成员 */
export interface CompChampion {
  championName: string;
  role: ChampionRole;
  /** 目标星级 */
  targetStar: 1 | 2 | 3;
}

/**
 * 阵容。
 *
 * tier 与 score 是**推导结果**，不是录入值。
 * 由 baseline + 补丁增量计算得出，见 ARCHITECTURE.md §8。
 */
export interface Comp {
  /** 稳定 ID */
  id: string;
  name: string;
  /** 推导得出的梯队 */
  tier: Tier;
  /** 推导得出的强度分（基准分 + 增量之和） */
  score: number;
  /** 人工维护的基准分（数据包/知识层中定义） */
  baseline: number;
  /** 强度依据。**必须非空**，否则失去可溯源性 */
  reasons: CompReason[];
  /** 核心成员 */
  champions: CompChampion[];
  /** 完整阵容成员（含非核心） */
  fullBoard: string[];
  /** 装备分配 */
  items: ItemAssignment[];
  /** 站位 */
  positioning: Position[];
  /** 运营节奏说明 */
  notes: string;
  /** 被克制的阵容名称 */
  counteredBy: string[];
  /** 克制 的阵容名称 */
  counters: string[];
}
```

### 2.8 局面状态

```ts
/** 场上或备战席的一个单位 */
export interface BoardUnit {
  /** 单位名称。可能是英雄，也可能是召唤物 */
  name: string;
  star: 1 | 2 | 3;
  /** 携带的装备名称 */
  items: string[];
  /** 站位。row 0 = 前排；未上场则为 null */
  pos: { row: number; col: number } | null;
}

/** 按分类持有的未装备装备 */
export interface HeldItems {
  component: string[];
  craftable: string[];
  artifact: string[];
  support: string[];
  radiant: string[];
  emblem: string[];
}

/** 对手信息 */
export interface OpponentInfo {
  board: BoardUnit[];
  hp?: number;
  note?: string;
}

/**
 * 局面状态。所有字段可选，缺失即不渲染。
 *
 * 提交时机：通过 POST /api/session 绑定到会话，
 * GET /api/chat/stream 仅携带会话 ID（见 ARCHITECTURE.md §7.1）。
 */
export interface GameState {
  /** 阶段，如 "3-2" */
  stage?: string;
  level?: number;
  gold?: number;
  hp?: number;
  /** 连胜连败，如 "W3" / "L2" */
  streak?: string;
  /** 已选海克斯名称 */
  augments?: string[];
  /** 当前待选的海克斯（三选一） */
  pendingAugments?: string[];
  /** 持有的纹章名称 */
  emblems?: string[];
  /** 未装备的持有装备，按分类 */
  items?: HeldItems;
  /** 场上单位 */
  board?: BoardUnit[];
  /** 备战席单位 */
  bench?: BoardUnit[];
  /** 当前商店的 5 个位置 */
  shop?: string[];
  /** 对手信息 */
  opponent?: OpponentInfo;
  /** 自由备注 */
  note?: string;
}
```

---

## 3. `constants.ts`

```ts
/** 费用。用联合类型而非 enum，见文件头约定。 */
export type Cost = 1 | 2 | 3 | 4 | 5;

/** 费用对应的主题色。与游戏内一致，前端直接使用。 */
export const COST_COLORS: Record<Cost, string> = {
  1: "#9AA4B2",  // 灰
  2: "#3E9B4F",  // 绿
  3: "#2E7CD6",  // 蓝
  4: "#A24BD6",  // 紫
  5: "#E0B24C",  // 金
};

/** 梯队排序权重，用于稳定排序 */
export const TIER_ORDER: Record<Tier, number> = { T0: 0, T1: 1, T2: 2, T3: 3 };

/** 棋盘尺寸 */
export const BOARD_ROWS = 4;
export const BOARD_COLS = 7;

/** 游戏内可粘贴的阵容码后缀，用于生成与校验阵容码 */
export const TEAM_CODE_SUFFIX = "TFTSet18";
```

### 3.1 经济与刷新概率

```ts
/**
 * 经济与刷新概率表。
 *
 * ⚠️【待核准】这些数值需在数据同步实现后，按实际游戏数据核准，
 * 不得在未核准前作为事实使用。
 *
 * 结构先行定义，具体数值由数据同步填充到 data/packs/set<N>/economy.json。
 */
export interface EconomyTable {
  /** 升到某等级所需经验 */
  levelXp: Record<number, number>;
  /** 各等级刷新出各费用英雄的概率，键为等级，值为 5 个费用档的概率 */
  shopOdds: Record<number, [number, number, number, number, number]>;
  /** 利息规则说明 */
  interestNote: string;
}
```

---

## 4. `api.ts`

### 4.1 通用

```ts
/** 所有数据类响应共有的元信息 */
export interface ResponseMeta {
  set: number;
  patch: string;
  freshness: Freshness;
  /** freshness 为 stale 时的提示文案 */
  warning?: string;
}

export interface ApiError {
  code:
    | "SET_MISMATCH"    // 赛季不一致 → 阻断
    | "PACK_MISSING"    // 数据包缺失 → 需同步
    | "NOT_FOUND"
    | "INVALID_INPUT"
    | "UPSTREAM_ERROR";
  message: string;
  detail?: string;
}
```

### 4.2 数据类路由

```ts
/** GET /api/meta */
export interface MetaResponse extends ResponseMeta {
  /** 已知最新补丁（用于判断新鲜度） */
  latestKnownPatch?: string;
  syncedAt: string;
  sourceUrls: string[];
}

/** GET /api/set/:module —— module ∈ champions | traits | items | augments | emblems */
export type SetModule = "champions" | "traits" | "items" | "augments" | "emblems";

export interface ChampionsResponse extends ResponseMeta {
  champions: Champion[];
}
export interface TraitsResponse extends ResponseMeta {
  traits: Trait[];
}
export interface ItemsResponse extends ResponseMeta {
  items: Item[];
}
export interface AugmentsResponse extends ResponseMeta {
  augments: Augment[];
}
export interface EmblemsResponse extends ResponseMeta {
  emblems: Item[];   // 纹章即 category === "emblem" 的 Item
}

/** GET /api/comp */
export interface CompListResponse extends ResponseMeta {
  comps: Comp[];
}
```

### 4.3 补丁

```ts
/** GET /api/patch/current */
export interface PatchResponse extends ResponseMeta {
  note: PatchNote;
}
```

### 4.4 会话与对话

```ts
/** POST /api/session */
export interface CreateSessionRequest {
  /** 初始局面，可省略 */
  state?: GameState;
}
export interface CreateSessionResponse {
  sessionId: string;
}

/** GET /api/chat/stream 的查询参数 */
export interface ChatStreamQuery {
  session: string;
  /** 快捷指令。与 message 可并存，也可都不传（此时使用默认指令） */
  action?: QuickAction;
  /** 自由提问文本 */
  message?: string;
  /** 深度思考模式 */
  deep?: boolean;
}
```

### 4.5 快捷指令

```ts
export type QuickAction =
  | "recommend"   // 推荐当前最优方向与本回合操作
  | "augment"     // 待选海克斯三选一
  | "roll"        // 本回合 D 牌还是存钱 / 拉人口
  | "position"    // 当前阵容最优站位
  | "counter"     // 根据对手信息给针对思路
  | "transition"; // 是否转型

/** 指令的中文展示文案 */
export const QUICK_ACTION_LABELS: Record<QuickAction, string> = {
  recommend: "推荐方向",
  augment: "海克斯选择",
  roll: "D 牌决策",
  position: "站位建议",
  counter: "对手针对",
  transition: "是否转型",
};
```

### 4.6 SSE 事件

```ts
/**
 * 服务端推送事件。
 * 传输格式：每行 `data: <JSON>\n\n`
 */
export type ChatEvent =
  | { type: "session"; sessionId: string }
  | { type: "delta"; text: string }
  | { type: "tool"; text: string }
  | { type: "done"; structured: StructuredResult | null }
  | { type: "error"; text: string };
```

### 4.7 结构化结果（含校验）

```ts
/** 模型输出的单个阵容成员 */
export interface TargetUnit {
  unit: string;
  star: 1 | 2 | 3;
  items: string[];
}

/** 单个名称的校验结果 */
export interface ValidationIssue {
  /** 出现问题的字段：champion | trait | item | evidence */
  kind: "champion" | "trait" | "item" | "evidence";
  /** 模型给出的原始名称 */
  raw: string;
  /** 问题类型 */
  problem: "unknown_name" | "missing_evidence" | "trait_count_mismatch";
  /** 说明文案 */
  message: string;
}

/**
 * 结构化结果。
 *
 * 🔴 这是**校验后**的结果。校验发现的问题记录在 issues 中，
 * 前端必须把 issues 可视化（例如标红），不得静默丢弃。
 */
export interface StructuredResult {
  /** 模型给出的目标阵容 */
  targetComp: TargetUnit[];
  /** 站位建议。无变化时可为空数组 */
  positioning: Position[];
  /**
   * 服务端对目标阵容重新计算得到的羁绊结果。
   * 🔴 以服务端计算结果为准，不以模型给出的为准。
   */
  traitCheck: string[];
  /** 校验发现的问题。为空数组表示全部通过 */
  issues: ValidationIssue[];
  /** 游戏内可粘贴导入的阵容码。无法生成时缺省 */
  teamCode?: string;
}
```

---

## 5. API 契约速查

| 方法 | 路径 | 请求类型 | 响应类型 | 需要模型 |
|---|---|---|---|---|
| `GET` | `/api/meta` | — | `MetaResponse` | 否 |
| `GET` | `/api/set/champions` | — | `ChampionsResponse` | 否 |
| `GET` | `/api/set/traits` | — | `TraitsResponse` | 否 |
| `GET` | `/api/set/items` | — | `ItemsResponse` | 否 |
| `GET` | `/api/set/augments` | — | `AugmentsResponse` | 否 |
| `GET` | `/api/set/emblems` | — | `EmblemsResponse` | 否 |
| `GET` | `/api/comp` | — | `CompListResponse` | 否 |
| `GET` | `/api/patch/current` | — | `PatchResponse` | 否 |
| `POST` | `/api/session` | `CreateSessionRequest` | `CreateSessionResponse` | 否 |
| `GET` | `/api/chat/stream` | `ChatStreamQuery` | `ChatEvent`（SSE） | **是** |

**约定**：**除 `/api/chat/stream` 外的全部路由都不依赖语言模型**，模型不可用时必须保持完全可用。

---

## 6. 契约变更流程

契约层冻结后，任何变更必须走以下流程：

1. **停止当前工作**，不要带着问题继续实现
2. 说明：现有定义的什么问题、建议的变更、影响哪些模块
3. 变更合并后，**同步更新本文件**
4. 通知受影响的模块重新对齐

> 擅自修改契约会导致所有基于旧契约完成的工作作废，且往往在集成时才发现。
