// Visible-time session clock. `now` / `wallNow` are injected so capture mode
// (later) never calls performance.now or Date.now directly.

const pad = (n) => String(n).padStart(2, '0');

export function formatClock(ms) {
	const total = Math.max(0, Math.floor(ms / 1000));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Captions: m:ss under an hour, h:mm:ss at an hour and above. */
export function formatShort(ms) {
	const total = Math.max(0, Math.floor(ms / 1000));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
	return `${m}:${pad(s)}`;
}

export function spoken(ms) {
	const total = Math.max(0, Math.floor(ms / 1000));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	const bit = (n, one, many) => `${n} ${n === 1 ? one : many}`;
	const parts = [];
	if (h) parts.push(bit(h, 'hour', 'hours'));
	parts.push(bit(m, 'minute', 'minutes'));
	parts.push(bit(s, 'second', 'seconds'));
	return parts.join(' ');
}

export function createSessionClock({
	now = () => performance.now(),
	wallNow = () => new Date(),
	onTick,
	onStop,
	onStart,
	sessions = [],
} = {}) {
	let state = 'stopped';
	let elapsed = 0;
	let mark = 0;
	let shown = true;
	let startedAt = null;
	let timer = 0;
	let listening = false;

	const read = () => (state === 'running' && shown ? elapsed + Math.max(0, now() - mark) : elapsed);

	const arm = () => {
		clearTimeout(timer);
		if (state !== 'running' || !shown) return;
		const into = read() % 1000;
		const wait = into === 0 ? 1000 : 1000 - into;
		timer = setTimeout(() => {
			if (onTick) onTick(read());
			arm();
		}, wait);
	};

	const onVis = () => {
		const hidden = document.hidden;
		if (hidden && shown && state === 'running') {
			elapsed += Math.max(0, now() - mark);
			shown = false;
			clearTimeout(timer);
		} else if (!hidden && !shown && state === 'running') {
			shown = true;
			mark = now();
			arm();
		} else {
			shown = !hidden;
		}
		if (state === 'running' && onTick) onTick(read());
	};

	return {
		get state() {
			return state;
		},
		elapsedMs: read,
		sessions,
		start() {
			if (state === 'running') return;
			state = 'running';
			elapsed = 0;
			shown = !document.hidden;
			mark = now();
			startedAt = wallNow();
			if (!listening) {
				listening = true;
				document.addEventListener('visibilitychange', onVis);
			}
			if (onStart) onStart({ startedAt });
			if (onTick) onTick(read());
			arm();
		},
		stop() {
			if (state !== 'running') return null;
			const ms = read();
			state = 'stopped';
			elapsed = ms;
			clearTimeout(timer);
			const session = ms >= 1000 ? { startedAt, ms } : null;
			if (session) {
				sessions.push(session);
				while (sessions.length > 5) sessions.shift();
			}
			if (onStop) onStop({ ms, session, startedAt });
			return session;
		},
	};
}
