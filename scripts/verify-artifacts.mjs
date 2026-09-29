#!/usr/bin/env node
/**
 * verify-artifacts.mjs — 产物闸门：按任务 ID 运行断言，判断任务是否真的做完了
 *
 * 用法：
 *   node scripts/verify-artifacts.mjs <task_id>
 *
 * 退出码：0 = 全部通过；1 = 有断言失败；2 = 用法错误
 *
 * 为什么需要它：
 *   `claude -p` 可能以 exit 0 退出却什么都没做（提示词被截断、模型直接答复等）。
 *   若仅凭退出码就标记任务完成，看板状态会失真，下游依赖被错误解锁。
 *   因此本项目的任务完成判定**以产物为准**，不以退出码为准。
 *
 * 为什么用 Node 而不是 shell 断言：
 *   早期版本用 `test -s` / `grep` 等 POSIX 命令，在 Windows PowerShell 下语义不同，
 *   导致闸门误报失败。Node 的 fs 在各平台行为一致，且无需依赖 shell。
 *
 * 新增任务时，在 ASSERTIONS 中加一项即可，不需要改动派单脚本。
 */

import { existsSync, statSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const REPO = process.cwd();

// ── 断言工具 ────────────────────────────────────────────────

const abs = (rel) => join(REPO, rel.replace(/\//g, "\\"));

const exists = (rel) => () => ({
  ok: existsSync(abs(rel)),
  detail: existsSync(abs(rel)) ? abs(rel) : `不存在：${abs(rel)}`,
});

const nonEmpty = (rel) => () => {
  const p = abs(rel);
  if (!existsSync(p)) return { ok: false, detail: `不存在：${p}` };
  const size = statSync(p).size;
  return size > 0
    ? { ok: true, detail: `${size} 字节` }
    : { ok: false, detail: `文件为空：${p}` };
};

/** 文件内容匹配正则 */
const content = (rel, re, label) => () => {
  const p = abs(rel);
  if (!existsSync(p)) return { ok: false, detail: `不存在：${p}` };
  const text = readFileSync(p, "utf8");
  return re.test(text)
    ? { ok: true, detail: `匹配 ${label ?? re}` }
    : { ok: false, detail: `${p} 中未找到 ${label ?? re}` };
};

/** 单个文件内容不匹配正则 */
const noContent = (rel, re, label) => () => {
  const p = abs(rel);
  if (!existsSync(p)) return { ok: false, detail: `不存在：${p}` };
  const hits = [];
  readFileSync(p, "utf8").split("\n").forEach((line, i) => {
    if (re.test(line)) hits.push(`第 ${i + 1} 行: ${line.trim()}`);
  });
  return hits.length === 0
    ? { ok: true, detail: `未发现 ${label ?? re}` }
    : { ok: false, detail: `发现 ${hits.length} 处：\n      ${hits.slice(0, 5).join("\n      ")}` };
};

/** 目录内所有文件都不匹配正则（递归） */
const noContentIn = (dir, re, label) => () => {
  const root = abs(dir);
  if (!existsSync(root)) return { ok: false, detail: `目录不存在：${root}` };
  const hits = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === "node_modules") continue;
      const full = join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(e.name)) {
        const text = readFileSync(full, "utf8");
        text.split("\n").forEach((line, i) => {
          if (re.test(line)) hits.push(`${full}:${i + 1}: ${line.trim()}`);
        });
      }
    }
  };
  walk(root);
  return hits.length === 0
    ? { ok: true, detail: `未发现 ${label ?? re}` }
    : { ok: false, detail: `发现 ${hits.length} 处：\n      ${hits.slice(0, 5).join("\n      ")}` };
};

// ── 各任务的断言 ────────────────────────────────────────────
// 键为看板任务 ID。新增任务时在此追加。

const ASSERTIONS = {
  // 0-1 契约冻结
  t_85252d36: [
    ["package.json 非空", nonEmpty("packages/shared/package.json")],
    ["tsconfig.json 非空", nonEmpty("packages/shared/tsconfig.json")],
    ["entities.ts 非空", nonEmpty("packages/shared/src/entities.ts")],
    ["api.ts 非空", nonEmpty("packages/shared/src/api.ts")],
    ["constants.ts 非空", nonEmpty("packages/shared/src/constants.ts")],
    ["index.ts 非空", nonEmpty("packages/shared/src/index.ts")],
    ["无 enum", noContentIn("packages/shared/src", /^\s*(export\s+)?enum\s/, "enum 声明")],
    ["无 namespace", noContentIn("packages/shared/src", /^\s*(export\s+)?namespace\s/, "namespace 声明")],
    ["entities 导出 VersionFingerprint", content("packages/shared/src/entities.ts", /VersionFingerprint/)],
    ["entities 导出 Champion", content("packages/shared/src/entities.ts", /\bChampion\b/)],
    ["entities 导出 Trait", content("packages/shared/src/entities.ts", /\bTrait\b/)],
    ["entities 导出 Item", content("packages/shared/src/entities.ts", /\bItem\b/)],
    ["entities 导出 GameState", content("packages/shared/src/entities.ts", /GameState/)],
    ["entities 导出 Comp", content("packages/shared/src/entities.ts", /\bComp\b/)],
    ["api 导出 ChatEvent", content("packages/shared/src/api.ts", /ChatEvent/)],
    ["api 导出 StructuredResult", content("packages/shared/src/api.ts", /StructuredResult/)],
    ["api 导出 MetaResponse", content("packages/shared/src/api.ts", /MetaResponse/)],
    ["api 导出 QuickAction", content("packages/shared/src/api.ts", /QuickAction/)],
    ["api 含 QUICK_ACTION_LABELS", content("packages/shared/src/api.ts", /QUICK_ACTION_LABELS/)],
    ["constants 含 COST_COLORS", content("packages/shared/src/constants.ts", /COST_COLORS/)],
    ["constants 含 TIER_ORDER", content("packages/shared/src/constants.ts", /TIER_ORDER/)],
    ["constants 含 BOARD_ROWS/COLS", content("packages/shared/src/constants.ts", /BOARD_ROWS[\s\S]*BOARD_COLS/)],
    // 真正的依赖方向约束：constants 只可依赖 entities，不可依赖 api（否则形成循环）
    ["constants 未反向依赖 api", noContent("packages/shared/src/constants.ts", /from\s+["']\.\/api/, "对 api.ts 的导入")],
    ["index.ts 有导出", content("packages/shared/src/index.ts", /export/)],
  ],
};

// ── 执行 ────────────────────────────────────────────────────

const taskId = process.argv[2];
if (!taskId) {
  console.error("用法: node scripts/verify-artifacts.mjs <task_id>");
  process.exit(2);
}

const list = ASSERTIONS[taskId];
if (!list) {
  console.error(`✗ 任务 ${taskId} 未在 scripts/verify-artifacts.mjs 的 ASSERTIONS 中登记断言。`);
  console.error(`  请在新增任务时一并登记，否则无法判定完成。`);
  process.exit(2);
}

console.log(`产物闸门：${taskId}（共 ${list.length} 项断言）\n`);

let failed = 0;
for (const [name, fn] of list) {
  let r;
  try {
    r = fn();
  } catch (e) {
    r = { ok: false, detail: `断言抛错：${e.message}` };
  }
  if (!r.ok) failed += 1;
  console.log(`  [${r.ok ? "PASS" : "FAIL"}] ${name}`);
  if (!r.ok) console.log(`         ${r.detail}`);
}

console.log(`\n结果：通过 ${list.length - failed} / ${list.length}，失败 ${failed}`);
process.exit(failed === 0 ? 0 : 1);
