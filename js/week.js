import { projects, seed } from './week-data.js';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const CHART = { x: 56, w: 208, width: 268, height: 122 };

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

function pour(hours, start, dur) {
	let left = dur;
	let cursor = start;
	while (left > 1e-8 && cursor < 1440) {
		const hour = Math.floor(cursor / 60);
		const room = (hour + 1) * 60 - cursor;
		const take = Math.min(room, left);
		hours[hour] += take;
		cursor += take;
		left -= take;
	}
}

export function createWeek({ wallNow = () => new Date(), sessions = [] } = {}) {
	const itemsOn = (offset) => {
		const day = startOfDay(wallNow());
		day.setDate(day.getDate() + offset);
		const next = new Date(day);
		next.setDate(day.getDate() + 1);
		const items = [];
		for (const [off, start, dur, project] of seed) {
			if (off === offset) items.push({ start, dur, color: projects[project] });
		}
		sessions.forEach((session, index) => {
			const end = session.startedAt.getTime() + session.ms;
			const a = Math.max(session.startedAt.getTime(), day.getTime());
			const b = Math.min(end, next.getTime());
			if (b <= a) return;
			items.push({
				start: (a - day.getTime()) / 60000,
				dur: (b - a) / 60000,
				visitor: true,
				latest: index === sessions.length - 1,
			});
		});
		return items;
	};

	return {
		/** Minutes today, split into hours the way the heatmap will read them. */
		todayMinutes() {
			const hours = Array(24).fill(0);
			for (const item of itemsOn(0)) pour(hours, item.start, item.dur);
			return hours.reduce((sum, n) => sum + n, 0);
		},
		/** Same day, summed from the sessions Insights draws. */
		insightsTodayMinutes() {
			return itemsOn(0).reduce((sum, item) => sum + item.dur, 0);
		},
		axis() {
			const hour = wallNow().getHours();
			let start = (hour - 2) * 60;
			let end = (hour + 1) * 60;
			if (start < 0) {
				start = 0;
				end = 180;
			}
			if (end > 1440) {
				end = 1440;
				start = 1440 - 180;
			}
			return { start, end };
		},
		rows() {
			const today = startOfDay(wallNow());
			return [-3, -2, -1, 0].map((offset) => {
				const date = new Date(today);
				date.setDate(today.getDate() + offset);
				return {
					label: offset === 0 ? 'Today' : `${DAY[date.getDay()]} ${date.getDate()}`,
					today: offset === 0,
					bars: itemsOn(offset),
				};
			});
		},
	};
}

/** Place a bar in the 3-hour chart. Visitor bars are at least 4 viewBox units wide. */
export function placeBar(bar, axis) {
	const span = axis.end - axis.start;
	const end = bar.start + bar.dur;
	if (end <= axis.start || bar.start >= axis.end) return null;
	const a = Math.max(bar.start, axis.start);
	const b = Math.min(end, axis.end);
	let x = CHART.x + ((a - axis.start) / span) * CHART.w;
	let w = ((b - a) / span) * CHART.w;
	if (bar.visitor) w = Math.max(w, 4);
	if (x + w > CHART.x + CHART.w) x = Math.max(CHART.x, CHART.x + CHART.w - w);
	return { x, w };
}
