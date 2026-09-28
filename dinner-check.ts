/**
 * "Should I go downstairs to eat?" asked as three atomic judgments instead of one
 * broad question, with the verdict decided in code.
 *
 * The state deliberately contains one thing: the clock. Everything else the model
 * cannot verify, so it does not get invented.
 *
 * Run:  node --env-file=.env dinner-check.ts 18 26
 */
import { score, TypeSafeClient } from '@typesafe-ai/sdk';

const [hour, minute] = process.argv.slice(2).map(Number);
const lastMealHour = Number(process.argv[4]);
// Second argument set is optional: pass the last meal time and hunger stops being a
// guess from the clock alone.
const lastMeal = Number.isFinite(lastMealHour)
	? { hours_since_last_meal: (hour - lastMealHour + 24) % 24, what_it_was: 'a normal lunch' }
	: undefined;

const now = { weekday: 'Monday', hour, minute, is_dinner_window: hour >= 17 && hour < 21 };

const client = new TypeSafeClient();

const { answers, model } = await client.systemOne({
	state: lastMeal ? { now, last_meal: lastMeal } : { now },
	questions: {
		hunger: score(
			lastMeal
				? 'How hungry is the person right now, given `now` and `last_meal`?'
				: 'How hungry is the person right now, judging only from `now`?',
			[
				'Not hungry: ate recently, or food is not on their mind yet.',
				'Moderately hungry: a meal would land well, but waiting is comfortable. This is the usual state during their normal meal window.',
				'Very hungry: an empty stomach is already distracting them from what they are doing.',
			],
		),
		next_hour_is_better: score(
			'If they keep working for the next 30 to 45 minutes before eating, how much more would they actually get finished than if they ate now?',
			[
				'Nothing meaningful: no task is at a point where that window closes anything out.',
				'Something small: they would close one bounded piece of work, and nothing depends on it.',
				'A real amount: a deadline, a person waiting, or an unbroken run they would lose.',
			],
		),
		options_basically_available: score(
			'Given only `now`, how available is a normal cooked meal right now?',
			[
				'A normal meal is hard to get: the hour is wrong for it, or leaving to eat would be a real detour.',
				'Something normal is likely available but not certain.',
				'A normal meal is plainly available at this hour, and eating it would be ordinary rather than a detour.',
			],
		),
	},
});

// Code owns the verdict. Thresholds are policy, and they are visible here.
const HUNGRY = 1.5;      // at or above: hunger alone justifies eating
const VERY_HUNGRY = 2.0;
const SAME_EITHER_WAY = 1.5; // at or below: the next hour is not materially better spent working
const PLAUSIBLE = 1.5;   // availability below this is a real obstacle, not a preference

const hunger = answers.hunger.score;
const better = answers.next_hour_is_better.score;
const available = answers.options_basically_available.score;

let verdict: string;
let reason: string;

if (hunger >= VERY_HUNGRY) {
	verdict = 'Go eat now.';
	reason = `hunger ${hunger.toFixed(2)} is past the "very hungry" line (${VERY_HUNGRY}); being this hungry degrades the work anyway.`;
} else if (better <= SAME_EITHER_WAY && hunger >= HUNGRY) {
	verdict = 'Go eat now.';
	reason = `the next 45 minutes would not finish anything that matters (${better.toFixed(2)}), so waiting has no payoff.`;
} else if (available < PLAUSIBLE) {
	verdict = 'Run the errand first, then eat.';
	reason = `a normal meal is not plainly available right now (${available.toFixed(2)}); settle the practical problem before hunger peaks.`;
} else {
	verdict = 'Eat now, and take the normal break.';
	reason = `hunger ${hunger.toFixed(2)} is a normal meal-window state and nothing is lost by stepping away.`;
}

const lines = [
	`${now.weekday} ${String(now.hour).padStart(2, '0')}:${String(now.minute).padStart(2, '0')}  (dinner window: ${now.is_dinner_window})   model ${model}`,
	'',
	`hunger                ${hunger.toFixed(2)}   (confidence ${answers.hunger.confidence.toFixed(2)})`,
	`next_hour_is_better   ${better.toFixed(2)}   (confidence ${answers.next_hour_is_better.confidence.toFixed(2)})`,
	`meal_available        ${available.toFixed(2)}   (confidence ${answers.options_basically_available.confidence.toFixed(2)})`,
	'',
	`  p(hunger)           ${JSON.stringify(answers.hunger.probabilities)}`,
	`  p(next_hour)        ${JSON.stringify(answers.next_hour_is_better.probabilities)}`,
	`  p(available)        ${JSON.stringify(answers.options_basically_available.probabilities)}`,
	'',
	verdict,
	`  ${reason}`,
];
console.log(lines.join('\n'));
