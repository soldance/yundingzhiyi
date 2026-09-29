#!/usr/bin/env node
/**
 * dispatch-task.mjs — 派单包装：把看板任务交给 Claude Code 角色执行，同步看板状态
 *
 * 用法：
 *   node scripts/dispatch-task.mjs <task_id> <agent_name> [--timeout-ms N] [--force]
 *
 * 流程：
 *   1. 从看板读取任务正文与验收命令
 *   2. kanban unblock + claim  → 看板显示 running
 *   3. 把提示词写入文件，通过 stdin 传给 `claude --agent <name> -p`
 *   4. 【产物闸门】运行任务卡声明的验收命令
 *   5. 闸门通过 → complete；不通过或 claude 非 0 退出 → block
 *
 * 设计要点（均为实际踩坑后的修正）：
 *
 *   ⚠️ 教训一：提示词必须走 stdin。
 *   早期版本用 spawnSync(..., { shell: true }) 把长提示词作为命令行参数传入，
 *   被 shell 引号截断，Claude 只收到第一句，却仍然以 exit 0 退出。
 *
 *   ⚠️ 教训二：exit 0 不等于任务完成。
 *   上一条的后果是任务被误标为完成、看板状态错误、下游依赖被错误解锁。
 *   因此本脚本不再信任 claude 的退出码，而是**以产物为准**：
 *   任务卡必须声明 `## 验收命令` 段，其中的命令全部通过才算完成。
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, posix } from "node:path";

const REPO = "D:\\claude-code-demo\\ai-云顶";
const BOARD = "yundingzhiyi";
const HERMES = "hermes";

const argv = process.argv.slice(2);
const force = argv.includes("--force");
const positional = argv.filter((a) => !a.startsWith("--"));
const [taskId, agentName] = positional;
const timeoutIdx = argv.indexOf("--timeout-ms");
const timeoutMs = timeoutIdx > -1 ? Number(argv[timeoutIdx + 1]) : 45 * 60 * 1000;

if (!taskId || !agentName) {
  console.error("用法: node scripts/dispatch-task.mjs <task_id> <agent_name> [--timeout-ms N] [--force]");
  process.exit(2);
}

const log = (m) => console.log(`[${new Date().toTimeString().slice(0, 8)}] ${m}`);

function hermes(args) {
  return spawnSync(HERMES, ["kanban", "--board", BOARD, ...args], {
    encoding: "utf8",
    cwd: REPO,
    env: process.env,
  });
}

// ── 1. 读取任务 ────────────────────────────────────────────
log(`读取任务 ${taskId}`);
const show = hermes(["show", taskId]);
if (show.status !== 0) {
  console.error(`✗ 无法读取任务 ${taskId}\n${show.stderr}`);
  process.exit(2);
}
const taskText = show.stdout;
const body = (taskText.split(/^Body:\s*$/m)[1] ?? "")
  .split(/^(?:Events|Latest summary|Comments|Diagnostics)\b/m)[0]
  .trim();

if (body.length < 100) {
  console.error(`✗ 未能解析出任务正文（长度 ${body.length}）。任务可能没有 --body。`);
  process.exit(2);
}
log(`任务正文 ${body.length} 字符`);

// ── 2. 认领 ────────────────────────────────────────────────
log(`unblock + claim ${taskId}`);
hermes(["unblock", taskId]);
const claim = hermes(["claim", taskId, "--ttl", "7200"]);
if (claim.status !== 0) {
  console.error(`✗ 认领失败\n${claim.stderr}`);
  process.exit(2);
}
log("已认领 → 看板 running");

// ── 3. 组装提示词并派发（经 stdin） ─────────────────────────
const prompt = `你被派发执行一项已登记在 Hermes Kanban 看板上的工程任务。

工作区（当前目录）：${REPO}
看板任务 ID：${taskId}
查看任务：hermes kanban --board ${BOARD} show ${taskId}

======================= 任务卡正文 =======================

${body}

=========================================================

## 执行前必须完成的动作

1. 先确认当前目录是 \`${REPO}\`。若不是，立即停止并报告。
2. 阅读 \`AGENTS.md\`（项目硬约束：文件所有权、契约只读、数据陷阱）。
3. 阅读任务卡「契约引用」指向的文档章节。
4. **只允许创建或修改任务卡「文件清单」内的文件。**
5. 严格遵守任务卡「禁止事项」。

## 交付报告格式（在最终回复中输出）

### 一、结论
一句话说明任务是否完成。

### 二、产出文件
实际创建的文件的**绝对路径**。

### 三、验收结果
任务卡「验收标准」的**每一个勾选项**，逐条给出：
- 状态：通过 / 未通过 / 未验证
- 实际执行的命令
- 命令的**真实输出**（关键片段）

禁止使用"功能正常""应该没问题"这类无法验证的表述。

### 四、契约偏差
任务卡要求处理的矛盾，你如何解决的、理由是什么。

### 五、未完成 / 未验证项
如有，说明内容与原因。没有则写"无"。

### 六、遗留问题
发现但未处理的问题。没有则写"无"。

## 硬性要求

- **只报告实际观察到的结果，禁止推测。**
- 不要执行 git 提交（由编排者统一处理）。
- 完成后清理临时产物（关闭服务、删除构建产物）。

现在开始执行任务。`;

const logDir = join(REPO, ".dispatch-logs");
mkdirSync(logDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const promptFile = join(logDir, `${taskId}-${stamp}.prompt.txt`);
const outFile = join(logDir, `${taskId}-${agentName}-${stamp}.log`);
writeFileSync(promptFile, prompt, "utf8");

log(`派发 claude --agent ${agentName}（stdin 传参，超时 ${Math.round(timeoutMs / 60000)} 分钟）`);

const cmd = `Get-Content -Raw '${promptFile}' | claude --agent ${agentName} -p`;
const started = Date.now();
// ⚠️ 教训三：必须用 `powershell` 而不是 `pwsh`。
//   DSH 自身用 pwsh，但 Node 的 PATH 中通常没有 pwsh，spawnSync 会以 ENOENT 静默失败
//   （status=null、耗时 0s）。Windows PowerShell 5.1 一定存在，且同样支持管道传参。
const res = spawnSync("powershell", ["-NoProfile", "-Command", cmd], {
  cwd: REPO,
  encoding: "utf8",
  timeout: timeoutMs,
  maxBuffer: 64 * 1024 * 1024,
  env: { ...process.env, CLAUDE_CODE_MAX_OUTPUT_TOKENS: "32000" },
});
const elapsed = Math.round((Date.now() - started) / 1000);
const stdout = res.stdout ?? "";
const stderr = res.stderr ?? "";
const exitCode = res.status;
const spawnError = res.error ? `${res.error.code}: ${res.error.message}` : null;

if (spawnError) {
  console.error(`\n✗ 子进程启动失败：${spawnError}`);
  console.error("  常见原因：可执行文件不在 PATH（Node 的 PATH 可能少于交互式 shell）。");
}

console.log("\n================ claude 输出开始 ================\n");
console.log(stdout || "(stdout 为空)");
if (stderr.trim()) console.log(`\n---------------- stderr ----------------\n${stderr}`);
console.log("\n================= claude 输出结束 =================");

// ── 4. 产物闸门 ────────────────────────────────────────────
// 闸门不看 claude 的退出码，只看产物。断言定义在 scripts/verify-artifacts.mjs。
let gatePass = false;
let gateOutput = "";
let gateStatus = null;

if (force) {
  log("⚠️ --force：跳过产物闸门（不推荐，仅用于调试）");
  gatePass = true;
  gateOutput = "(skipped by --force)";
  gateStatus = 0;
} else {
  console.log("\n================= 产物闸门 =================");
  const g = spawnSync(process.execPath, [join(REPO, "scripts", "verify-artifacts.mjs"), taskId], {
    cwd: REPO,
    encoding: "utf8",
    timeout: 5 * 60 * 1000,
  });
  gateStatus = g.status;
  gateOutput = `${g.stdout ?? ""}${g.stderr ?? ""}`.trim();
  console.log(gateOutput);
  if (g.error) console.error(`✗ 闸门脚本执行失败：${g.error.code}: ${g.error.message}`);
  gatePass = g.status === 0;
  console.log("============================================");
}

writeFileSync(
  outFile,
  `# dispatch ${taskId} @ ${agentName}\n`
  + `# claude exit=${exitCode ?? "null"} elapsed=${elapsed}s\n`
  + (spawnError ? `# spawn error=${spawnError}\n` : "")
  + `# gate exit=${gateStatus ?? "null"} result=${gatePass ? "PASS" : "FAIL"}\n`
  + `\n===== GATE OUTPUT =====\n${gateOutput}\n`
  + `\n===== STDOUT =====\n${stdout}\n\n===== STDERR =====\n${stderr}\n`,
  "utf8",
);

log(`claude exit=${exitCode ?? "null"}  耗时=${elapsed}s  闸门=${gatePass ? "PASS" : "FAIL"}  日志=${outFile}`);

// ── 5. 回写看板 ────────────────────────────────────────────
// 判定以闸门为准：即便 claude 退出码非 0，只要产物齐备也算完成；
// 反之 exit 0 但产物缺失，一律判失败。
const succeeded = gatePass && (!spawnError || force);

if (succeeded) {
  log(`回写看板：complete ${taskId}`);
  const r = hermes([
    "complete", taskId,
    "--summary", `由 claude --agent ${agentName} 完成；产物闸门通过（耗时 ${elapsed}s）`,
    "--result", `log=${outFile}`,
  ]);
  console.log(r.stdout.trim() || r.stderr.trim());
  process.exit(0);
} else {
  const reason = spawnError
    ? `子进程启动失败 ${spawnError}`
    : exitCode !== 0
      ? `claude 退出码 ${exitCode}（耗时 ${elapsed}s）`
      : `产物闸门未通过（exit ${gateStatus}）`;
  log(`回写看板：block ${taskId} —— ${reason}`);
  const r = hermes(["block", taskId, `${reason}。日志：${outFile}`]);
  console.log(r.stdout.trim() || r.stderr.trim());
  process.exit(1);
}
