import { createSessionClock, formatClock, formatShort, spoken } from './clock.js';
import { createWeek, placeBar, CHART } from './week.js';
import { shownToday, todayGoal } from './week-data.js';

const KEY = 'vynno:sessions';
const NARROW = '(max-width: 640px)';
const APOSTROPHE = '\u2019';

const pad = (n) => String(n).padStart(2, '0');

const formatStarted = (date) =>
	`${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;

const formatHm = (mins) => `${pad(Math.floor(mins / 60))}h ${pad(mins % 60)}m`;

const esc = (value) =>
	String(value).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);

function loadSessions() {
	try {
		const raw = JSON.parse(sessionStorage.getItem(KEY) || '[]');
		if (!Array.isArray(raw)) return [];
		return raw.slice(-5).flatMap((item) => {
			const startedAt = new Date(item.startedAt);
			const ms = Number(item.ms);
			if (Number.isNaN(startedAt.getTime()) || !(ms >= 1000)) return [];
			return [{ startedAt, ms }];
		});
	} catch {
		return [];
	}
}

function saveSessions(list) {
	try {
		sessionStorage.setItem(
			KEY,
			JSON.stringify(list.map((item) => ({ startedAt: item.startedAt.toISOString(), ms: item.ms }))),
		);
	} catch {
		/* private mode */
	}
}

const boot = () => {
	const layer = document.querySelector('.live-layer');
	const digits = document.querySelector('[data-hit=clock]');
	const statusText = document.querySelector('.clock-status-text');
	const startedEl = document.querySelector('.clock-started time');
	const button = document.querySelector('.clock-stop');
	const buttonLabel = document.querySelector('.clock-stop-label');
	const caption = document.querySelector('.hero-caption');
	const announce = document.getElementById('session-status');
	const svg = document.querySelector('.window-week svg');
	const weekFigure = document.querySelector('.window-week');
	const sumEl = document.querySelector('.today-sum');
	const metaEl = document.querySelector('.today-meta');
	const fillEl = document.querySelector('.today-fill');
	const segment = document.querySelector('.today-segment');
	const footLine = document.getElementById('foot-line');
	const footNote = document.querySelector('.foot-note');
	if (!layer || !digits || !button) return;

	const originalTitle = document.title;
	const wallNow = () => new Date();
	const narrow = () => matchMedia(NARROW).matches;
	const sessions = loadSessions();
	const week = createWeek({ wallNow, sessions });
	let booted = false;
	let hour = wallNow().getHours();
	let loggedMs = 0;

	const say = (text) => {
		announce.textContent = text;
	};

	const paintButton = (running) => {
		buttonLabel.textContent = running ? 'Stop' : 'Start';
		button.setAttribute('aria-label', running ? 'Stop this session' : 'Start a new session');
	};

	const paintCaption = (state, ms) => {
		if (state !== 'stopped' || ms < 1000) {
			caption.textContent = 'This clock started when you opened the page.';
			return;
		}
		const where = narrow()
			? `It${APOSTROPHE}s in today${APOSTROPHE}s total.`
			: `It${APOSTROPHE}s in the week now.`;
		caption.textContent = `You spent ${formatShort(ms)} here. ${where}`;
	};

	const paintToday = () => {
		const added = sessions.reduce((sum, item) => sum + Math.round(item.ms / 60000), 0);
		const total = shownToday + added;
		const pct = Math.round((total / todayGoal) * 100);
		sumEl.textContent = formatHm(total);
		metaEl.textContent = `${pct}% \u00b7 08h 00m`;
		fillEl.style.width = `${Math.min(100, Math.max(0, pct))}%`;
		const showSegment = clock.state === 'stopped' && sessions.length > 0;
		segment.hidden = !showSegment;
		if (showSegment) segment.style.left = `max(0px, calc(${Math.min(100, pct)}% - 6px))`;
	};

	const paintFoot = () => {
		const ms = clock.elapsedMs();
		if (ms < 10000) return;
		footLine.textContent = `You spent ${formatShort(ms)} here. Vynno would have logged it.`;
		footNote.hidden = false;
	};

	const renderWeek = () => {
		const axis = week.axis();
		const rows = week.rows();
		svg.dataset.axisStart = String(axis.start);
		svg.dataset.axisEnd = String(axis.end);
		svg.dataset.chartX = String(CHART.x);
		svg.dataset.chartW = String(CHART.w);
		const latest = sessions.at(-1);
		const yours = latest ? ` Your session: ${formatShort(latest.ms)}.` : '';
		const title = `Insights: three days and today, sessions placed on the clock.${yours}`;
		const parts = [`<title id="week-title">${esc(title)}</title>`];
		rows.forEach((row, index) => {
			const y = 6 + index * 22;
			parts.push(`<text x="4" y="${y + 11}">${esc(row.label)}</text>`);
			parts.push(`<g data-row="${row.today ? 'today' : 'day'}">`);
			for (const bar of row.bars) {
				const geom = placeBar(bar, axis);
				if (!geom) continue;
				const extra = bar.visitor ? ` data-session="${bar.latest ? 'latest' : 'earlier'}"` : ` fill="${bar.color}"`;
				parts.push(
					`<rect x="${geom.x.toFixed(2)}" y="${y}" width="${geom.w.toFixed(2)}" height="14" rx="2"${extra}></rect>`,
				);
			}
			parts.push('</g>');
		});
		for (let minute = Math.ceil(axis.start / 60) * 60; minute <= axis.end && minute < 1440; minute += 60) {
			const x = CHART.x + ((minute - axis.start) / (axis.end - axis.start)) * CHART.w;
			const label = `${pad(minute / 60)}:00`;
			parts.push(`<text class="week-axis" x="${x.toFixed(1)}" y="112" text-anchor="middle">${label}</text>`);
		}
		svg.innerHTML = parts.join('');
		for (const node of svg.querySelectorAll('.week-axis')) {
			const box = node.getBBox();
			if (box.x < 1) {
				node.setAttribute('text-anchor', 'start');
				node.setAttribute('x', '2');
			} else if (box.x + box.width > CHART.width - 1) {
				node.setAttribute('text-anchor', 'end');
				node.setAttribute('x', String(CHART.width - 2));
			}
			const fitted = node.getBBox();
			if (fitted.y + fitted.height > CHART.height - 1) {
				const y = Number(node.getAttribute('y')) - (fitted.y + fitted.height - (CHART.height - 1));
				node.setAttribute('y', y.toFixed(1));
			}
		}
		weekFigure.dataset.live = 'true';
		svg.hidden = false;
	};

	const show = (state) => {
		layer.hidden = false;
		layer.dataset.state = state;
	};

	const onTick = (ms) => {
		digits.textContent = formatClock(ms);
		document.title = document.hidden ? originalTitle : `\u25b6 ${formatClock(ms)} \u00b7 Vynno`;
		const nextHour = wallNow().getHours();
		if (nextHour !== hour) {
			hour = nextHour;
			renderWeek();
		}
	};

	const onStart = ({ startedAt }) => {
		show('running');
		paintButton(true);
		statusText.textContent = 'ACTIVE \u00b7 Project: Identity';
		startedEl.textContent = formatStarted(startedAt);
		startedEl.setAttribute('datetime', startedAt.toISOString());
		paintCaption('running', 0);
		paintToday();
		if (!booted) {
			booted = true;
			return;
		}
		say('New session started.');
		renderWeek();
	};

	const onStop = ({ ms, session }) => {
		show('stopped');
		paintButton(false);
		statusText.textContent = `STOPPED \u00b7 ${formatShort(ms)} logged`;
		document.title = originalTitle;
		loggedMs = ms;
		paintCaption(session ? 'stopped' : 'short', ms);
		if (session) {
			saveSessions(sessions);
			document.dispatchEvent(new CustomEvent('vynno:session', { detail: session }));
			say(`Session stopped at ${spoken(ms)}. Added to this week.`);
			renderWeek();
		} else {
			say('Too short to log.');
		}
		paintToday();
		paintFoot();
	};

	const clock = createSessionClock({ wallNow, sessions, onTick, onStop, onStart });

	button.addEventListener('click', () => {
		if (clock.state === 'running') clock.stop();
		else clock.start();
	});

	matchMedia(NARROW).addEventListener('change', () => {
		if (clock.state === 'stopped') paintCaption(loggedMs >= 1000 ? 'stopped' : 'short', loggedMs);
	});

	const foot = document.querySelector('.foot');
	if (foot && 'IntersectionObserver' in window) {
		new IntersectionObserver((entries) => {
			if (entries.some((entry) => entry.isIntersecting)) paintFoot();
		}).observe(foot);
	}

	if (new URLSearchParams(location.search).get('fixture') === 'capture-values') {
		show('running');
		digits.textContent = '00:40:45';
		statusText.textContent = 'ACTIVE \u00b7 Project: Identity';
		startedEl.textContent = '05.10.2026, 15:50';
		paintButton(true);
		sumEl.textContent = '03h 44m';
		metaEl.textContent = '47% \u00b7 08h 00m';
		fillEl.style.width = '47%';
		renderWeek();
		caption.textContent = 'This clock started when you opened the page.';
		return;
	}

	renderWeek();
	clock.start();
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
