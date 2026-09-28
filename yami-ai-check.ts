/**
 * Is the AI assistant in yami-tools well built?
 *
 * Replaces one broad question ("好不好") with independent judgments over an evidence
 * pack, so the rubric is explicit and the deficits are named separately from the
 * strengths. Run the two tiers, then the verdict, and print the distributions.
 *
 * Run:  node --env-file=.env yami-ai-check.ts
 */
import { choice, noul, score, TypeSafeClient } from '@typesafe-ai/sdk';

const client = new TypeSafeClient();

const evidence = {
	what_it_is: {
		product: 'An in-editor AI assistant for the Yami RPG Editor, shipping as a Chrome-extension-style plugin.',
		split: 'ai-agent.js (3144 lines, panel UI + agent loop), ai-host.js (2795 lines, local Node service), ai-render-core.js (306 lines, pure streaming/scroll state machine). No package.json; files are hand-managed.',
		backend: 'Local HTTP service on 127.0.0.1:5968 (port auto-increments when taken) proxying to a configurable OpenAI-compatible chat/completions endpoint, DeepSeek by default. Streaming SSE with thinking mode, tool calls, and cost display.',
	},
	deliberate_design: [
		'Tool results are truncated with the overflow spilled to disk: `result.__clip = { originalChars, spillPath }`, and the UI surfaces a "打开落盘目录" action.',
		'Concurrency is driven by the MCP registry readOnlyHint, with an explicit fallback allowlist and a stated rule that unknown tools are treated as exclusive: "未列出的工具按独占处理（将来新增写工具不会被误并发）".',
		'A pending-edit guard refuses to run when the editor has an unfocused input: "检测到编辑器中有未失焦的输入正在进行，为防修改被冲掉".',
		'Cost accounting refuses to display a total unless every call was accounted for: `formatTurnUsage` requires `complete === true && calls > 0 && total > 0`, otherwise the row is omitted rather than guessed.',
		'An approval gate runs a dry-run preview before asking, and the approval card computes `added`/`removed` line counts.',
		'Local API key is stored with Windows DPAPI and shown back only as the last four characters.',
		'Self-update writes every file via `.tmp` then atomic rename, backs up the old tree, filters `../` path traversal entries, and rolls back to zero changes on failure.',
		'The project documents its own past defect: ui_steps used to be absent from every approval set, so confirm mode could drive the editor without asking; the fix moves it into the approval set and the comment records the reasoning.',
	],
	risks_present: [
		'Read path accepts the shared secret from the URL: `req.headers["x-yami-agent-token"] || requestUrl.searchParams.get("token")`, justified in a comment as convenience for debugging SSE in a browser.',
		'The local server sends `Access-Control-Allow-Origin: *` and answers preflight with 204.',
		'`DEFAULT_MAX_STEPS = Number(process.env.YAMI_AI_MAX_STEPS || 0)` with the comment "默认 0：无限制，仅防死循环打转", and the loop maps 0 to `Infinity`.',
		'Error text is interpolated into `innerHTML` unescaped in panel templates, e.g. `"读取历史失败：" + String(e.message || e)`, while other paths use an `escapeHtml` helper or `textContent`.',
		'Single shared secret, generated once and persisted to `agent-token`, used by every client with no session or origin binding.',
	],
	verification: {
		suite: '39 test files under tests/, run by `node tests/run-all.cjs`. On 2026-09-21 the full run reported `汇总: 36/36 套通过`, including a genuine networked install (42 files / 2107 KB) and a 59-assertion updater suite.',
		notable_assertions: [
			'"失败即零改动 (宁可原地不动, 也不落一个跑不起来的插件)"',
			'rollback after a simulated disk-write failure leaves no partial files',
			'a corrupted package is rejected and every affected file is named',
			'path-traversal entries are ignored without failing the whole install',
		],
		docs: 'audit/REPORT.md, audit/PANEL-INVENTORY.md, HANDOFF.md and docs/施工单+验收报告 exist and quote line numbers for their claims.',
	},
};

// Tier 1: judgments about the design, all over the same evidence, evaluated in parallel.
const design = await client.systemOne({
	state: evidence,
	questions: {
		deliberate_vs_accumulated: noul(
			'Does `evidence` show a system that was reasoned about as a whole, rather than a pile of fixes that each made sense only locally? Judge the design intent you can actually see in `evidence.deliberate_design` and `evidence.risks_present`.',
			{
				true: { what: 'Invariants are stated and defended, and separate parts follow the same policy' },
				false: { what: 'The parts contradict each other, or the stated intent is not what the code does' },
			},
		),
		safety_boundary_coherent: score(
			'How well does the safety boundary in `evidence.risks_present` match the trust model this product claims, where the local service exists to serve its own editor plugin?',
			[
				'Incoherent: a hole the design itself would call a defect. The stated intent and the actual exposure disagree.',
				'Loosely matched: defensible as a local developer tool, with at least one gap a careful reviewer would want closed before wide distribution.',
				'Coherent: the exposure is deliberate and proportionate to a single-machine, single-user tool, and the reasoning is recorded.',
			],
		),
	},
});

// Tier 2: the two questions a reviewer actually has to answer, asked together.
const verdict = await client.systemOne({
	state: evidence,
	questions: {
		blocks_wider_use: noul(
			'Is there anything in `evidence.risks_present` that should block shipping this to users who are not the author, until it is fixed?',
		),
		quality: score(
			'Overall, how well built is this AI assistant, weighing what `evidence.deliberate_design` and `evidence.verification` demonstrate against what `evidence.risks_present` leaves open?',
			[
				'Weak: it mostly works by luck, and the failure modes are unhandled.',
				'Serviceable: it works for its author, but it has unhandled failure modes and little verification.',
				'Well built: deliberate design, verified behavior, and a stated safety posture, with specific gaps that are named and bounded.',
				'Excellent: nothing material to fix in the design or the safety posture.',
			],
		),
		best_next_investment: choice(
			'Given `evidence`, which single change would most improve this assistant?',
			{
				harden_local_api: {
					what: 'Close the local-service exposure: header-only credentials, restrict origins, bind the secret more tightly',
					not_for: 'Output quality; this changes what the service accepts, not what the model says',
				},
				bound_the_agent: {
					what: 'Replace the default-unlimited step budget with a calibrated stop condition and finer approval granularity',
					not_for: 'The local-service surface',
				},
				model_decomposition: {
					what: 'Improve the judgments the model is asked to make, applying System One decomposition where a single broad prompt is doing several jobs',
					not_for: 'The harness around the model',
				},
				leave_it: {
					what: 'Nothing here justifies further work; the gaps are an accepted cost of a single-user local tool',
					not_for: 'A reviewer who would call any of the above a real defect',
				},
			},
		),
	},
});

const pct = (p: Record<string, number>) =>
	Object.entries(p).map(([k, v]) => `${k}:${(v * 100).toFixed(0)}%`).join(' ');

console.log([
	`model ${design.model}`,
	'',
	`deliberate_vs_accumulated   ${design.answers.deliberate_vs_accumulated.noul.toFixed(3)}`,
	`safety_boundary_coherent    ${design.answers.safety_boundary_coherent.score.toFixed(2)}   (conf ${design.answers.safety_boundary_coherent.confidence.toFixed(2)})  ${pct(design.answers.safety_boundary_coherent.probabilities)}`,
	'',
	`blocks_wider_use            ${verdict.answers.blocks_wider_use.noul.toFixed(3)}`,
	`overall_quality             ${verdict.answers.quality.score.toFixed(2)} / 3   (conf ${verdict.answers.quality.confidence.toFixed(2)})  ${pct(verdict.answers.quality.probabilities)}`,
	`best_next_investment        ${verdict.answers.best_next_investment.choice}   (conf ${verdict.answers.best_next_investment.confidence.toFixed(2)})  ${pct(verdict.answers.best_next_investment.probabilities)}`,
	'',
	`tokens: ${design.usage.input_tokens + verdict.usage.input_tokens} in / ${design.usage.output_tokens + verdict.usage.output_tokens} out`,
].join('\n'));
