/**
 * 实体类型定义 —— 契约层。
 *
 * 本文件是前后端共享的实体类型真源。
 * 任何字段的增删都必须先在 docs/COMPONENT-API.md 中修订，再同步代码。
 *
 * 约定：
 * - 仅使用 `type` / `interface`，不使用 `enum` / `namespace`
 * - 中文展示字段命名为 `name`，内部标识为 `apiName`
 * - 可选字段显式标注 `?`，禁止用空字符串代替缺失
 */

import type { Cost } from "./constants.ts";

// ─────────────────────────────────────────────────────────────────────────────
// §2.1 版本指纹
// ─────────────────────────────────────────────────────────────────────────────

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
  | "fresh" // 与已知最新补丁一致
  | "stale" // 落后于已知最新补丁，需在界面警告
  | "unknown"; // 无法判断（如离线且无已知最新补丁记录）

// ─────────────────────────────────────────────────────────────────────────────
// §2.2 英雄
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// §2.3 羁绊
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// §2.4 装备
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// §2.5 海克斯与召唤物
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// §2.6 补丁改动
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// §2.7 阵容
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// §2.8 局面状态
// ─────────────────────────────────────────────────────────────────────────────

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