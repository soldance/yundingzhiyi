/**
 * API 路由的请求与响应类型 —— 契约层。
 *
 * 每个 API 路由（除静态 SSE）都必须有明确的请求 / 响应类型，
 * 前后端通过本文件共享，禁止在业务代码中重复定义。
 *
 * 约束：
 * - 本文件不得被 `constants.ts` 依赖（避免循环）
 * - 本文件中 `QuickAction` / `QUICK_ACTION_LABELS` 与 API 路由语义紧密相关，
 *   因此放于此处而非 `constants.ts`
 */

import type {
  Champion,
  Comp,
  Freshness,
  GameState,
  Item,
  PatchNote,
  Position,
  Trait,
  Augment,
} from "./entities.ts";

// ─────────────────────────────────────────────────────────────────────────────
// §4.1 通用
// ─────────────────────────────────────────────────────────────────────────────

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
    | "SET_MISMATCH" // 赛季不一致 → 阻断
    | "PACK_MISSING" // 数据包缺失 → 需同步
    | "NOT_FOUND"
    | "INVALID_INPUT"
    | "UPSTREAM_ERROR";
  message: string;
  detail?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// §4.2 数据类路由
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/meta */
export interface MetaResponse extends ResponseMeta {
  /** 已知最新补丁（用于判断新鲜度） */
  latestKnownPatch?: string;
  syncedAt: string;
  sourceUrls: string[];
}

/** GET /api/set/:module —— module ∈ champions | traits | items | augments | emblems */
export type SetModule =
  | "champions"
  | "traits"
  | "items"
  | "augments"
  | "emblems";

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
  emblems: Item[]; // 纹章即 category === "emblem" 的 Item
}

/** GET /api/comp */
export interface CompListResponse extends ResponseMeta {
  comps: Comp[];
}

// ─────────────────────────────────────────────────────────────────────────────
// §4.3 补丁
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/patch/current */
export interface PatchResponse extends ResponseMeta {
  note: PatchNote;
}

// ─────────────────────────────────────────────────────────────────────────────
// §4.4 会话与对话
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// §4.5 快捷指令
// ─────────────────────────────────────────────────────────────────────────────

export type QuickAction =
  | "recommend" // 推荐当前最优方向与本回合操作
  | "augment" // 待选海克斯三选一
  | "roll" // 本回合 D 牌还是存钱 / 拉人口
  | "position" // 当前阵容最优站位
  | "counter" // 根据对手信息给针对思路
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

// ─────────────────────────────────────────────────────────────────────────────
// §4.6 SSE 事件
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// §4.7 结构化结果（含校验）
// ─────────────────────────────────────────────────────────────────────────────

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