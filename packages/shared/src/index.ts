/**
 * 契约层统一入口。
 *
 * 业务代码统一从 `@yundingzhiyi/shared` 导入，禁止跨过此入口
 * 直接引用 `entities.ts` / `api.ts` / `constants.ts`，以便后续
 * 重构模块边界时不影响调用方。
 */

export * from "./entities.ts";
export * from "./constants.ts";
export * from "./api.ts";