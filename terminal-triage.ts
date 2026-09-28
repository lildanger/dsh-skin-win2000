/**
 * Smallest end-to-end TypeSafe integration: one request, several atomic judgments,
 * code owning the workflow. Judgments are about a terminal command run — nothing in
 * the input is known to code in advance except the process facts it can see itself.
 *
 * Run:  node --env-file=.env terminal-triage.ts
 * Key:  TYPESAFE_API_KEY in .env (never in this file).
 */
import { choice, noul, score, TypeSafeClient } from '@typesafe-ai/sdk';

const client = new TypeSafeClient();

// Everything code already knows goes here. This record is also the sample the
// script is checked against; swap it for live values to use the same questions.
const run = {
	command: 'pnpm test',
	exit_code: 0,
	duration_ms: 41200,
	tail: [
		'> dsh-win-terminal-inspector@1.0.0 test',
		'> node --test test/inspector.test.mjs',
		'',
		'ok 1 - reports process tree for a pty session',
		'ok 2 - detects liveness after the foreground child exits',
		'# tests 2',
		'# pass 2',
		'# fail 0',
	].join('\n'),
};

// Four independent questions over one state. They run in parallel: adding questions
// costs tokens, not round trips, so speculative ones are asked up front and code
// decides which answers matter on its path.
const { answers, model, usage } = await client.systemOne({
	state: {
		run,
		policy: {
			retryable: 'A failed run may be retried in place only when the failure is transient.',
			escalate: 'Anything that looks like a crash, data loss, or an environment fault goes to a person.',
		},
	},
	questions: {
		failed: noul(
			'Does `run` show that the command failed?',
			{
				true: { what: 'A non-zero `run.exit_code`, or `run.tail` reporting a failure' },
				false: { what: 'The run completed successfully, or is still running normally' },
			},
		),
		failure_kind: choice('What kind of failure does `run` show, if any?', {
			none: 'The run shows no failure at all.',
			transient: {
				what: 'A flaky, timing, or resource-contention failure that a rerun can plausibly clear',
				not_for: 'Broken code or a broken environment',
				examples: ['a port was still bound', 'a network fetch timed out'],
			},
			code_defect: {
				what: 'The command ran correctly and its own output shows wrong behavior, including failing assertions',
				not_for: 'Infrastructure or environment faults',
				examples: ['a failing unit test', 'a type error', 'a lint violation'],
			},
			environment: {
				what: 'The toolchain, shell, or machine prevented the command from running as intended',
				not_for: 'An application defect',
				examples: ['command not found', 'no such file or directory', 'permission denied'],
			},
		}),
		transient_signal: noul(
			'Does `run.tail` describe a condition that a rerun could plausibly clear, rather than a defect in the code under test?',
			{
				true: { what: 'A flaky, timing, or resource condition that a rerun could clear' },
				false: {
					what: 'A defect, a configuration error, or nothing to go on',
					not_for: 'A run that never got far enough to fail on its own merits',
				},
			},
		),
		severity: score('How disruptive is this outcome for the person who ran it?', [
			'Cosmetic: the work still succeeded or the output is only a warning.',
			'Blocks the current step, but the cause is visible in the output.',
			'Blocks the work with no clear cause in the output, or risks lost work.',
		]),
	},
});

// Code owns the decision. Weights and thresholds are ours, not the model's.
const FAILED = 0.7;
const TRANSIENT = 0.7;
const CONFIDENT = 0.75;

let action: string;
if (answers.failed.noul < FAILED) {
	action = 'accept';
} else if (answers.transient_signal.noul >= TRANSIENT) {
	action = 'retry in place';
} else if (answers.failure_kind.confidence < CONFIDENT) {
	action = 'escalate to a person'; // uncertain label: do not act on it
} else if (answers.failure_kind.choice === 'environment') {
	action = 'fix environment, then rerun';
} else if (answers.failure_kind.choice === 'code_defect') {
	action = 'report to the coding agent';
} else {
	action = 'escalate to a person';
}

const report = [
	`command: ${run.command}  exit=${run.exit_code}`,
	`model:   ${model}  tokens in/out: ${usage.input_tokens}/${usage.output_tokens}`,
	'',
	`failed              ${answers.failed.noul.toFixed(3)}`,
	`transient_signal    ${answers.transient_signal.noul.toFixed(3)}`,
	`failure_kind        ${answers.failure_kind.choice}  (confidence ${answers.failure_kind.confidence.toFixed(3)})`,
	`  probabilities     ${JSON.stringify(answers.failure_kind.probabilities)}`,
	`severity            ${answers.severity.score.toFixed(3)}  (confidence ${answers.severity.confidence.toFixed(3)})`,
	'',
	`action:             ${action}`,
	answers.failure_kind.confidence < CONFIDENT
		? 'note:               failure_kind is below the confidence threshold, so its label was not acted on'
		: '',
].filter((line) => line !== '').join('\n');

console.log(report);
