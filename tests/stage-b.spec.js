import { test, expect } from '@playwright/test';

const WHEN = new Date('2026-10-28T11:16:00');
const WEEK = 'You spent 0:42 here. It’s in the week now.';
const TODAY = 'You spent 0:42 here. It’s in today’s total.';

async function setHidden(page, hidden) {
	await page.evaluate((value) => {
		const proto = Document.prototype;
		const desc = Object.getOwnPropertyDescriptor(proto, 'hidden');
		const apply = (target) => {
			Object.defineProperty(target, 'hidden', { configurable: true, get: () => value });
		};
		if (desc && desc.configurable) apply(proto);
		else apply(document);
		document.dispatchEvent(new Event('visibilitychange'));
	}, hidden);
}

async function waitForBars(page) {
	const bar = page.locator('.window-week [data-session="latest"]');
	await expect(bar).toHaveCount(1);
	await bar.evaluate(async (el) => {
		const animations = el.getAnimations?.() || [];
		await Promise.all(animations.map((animation) => animation.finished));
	});
	return bar;
}

test('clock counts visible time on this page', async ({ page }) => {
	await page.clock.install({ time: WHEN });
	await page.goto('/');
	await expect(page.locator('[data-hit=clock]')).toHaveText('00:00:00');
	await page.clock.runFor(42_000);
	await expect(page.locator('[data-hit=clock]')).toHaveText('00:00:42');
	await expect(page).toHaveTitle(/^\u25b6 00:00:42/);
	const live = await page.locator('[data-hit=clock]').getAttribute('aria-live');
	expect(live === null || live === 'off').toBeTruthy();
});

test('clock pauses while the tab is hidden', async ({ page }) => {
	await page.clock.install({ time: WHEN });
	await page.goto('/');
	await page.clock.runFor(42_000);
	await expect(page.locator('[data-hit=clock]')).toHaveText('00:00:42');
	await setHidden(page, true);
	await expect(page).toHaveTitle('Vynno — Where the hours went.');
	await page.clock.runFor(10_000);
	await expect(page.locator('[data-hit=clock]')).toHaveText('00:00:42');
	await expect(page).toHaveTitle('Vynno — Where the hours went.');
	await setHidden(page, false);
	await page.clock.runFor(5_000);
	await expect(page.locator('[data-hit=clock]')).toHaveText('00:00:47');
	await expect(page).toHaveTitle(/^\u25b6 00:00:47/);
});

test('stop lands the session in the week (desktop)', async ({ page }) => {
	await page.clock.install({ time: WHEN });
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.goto('/');
	await page.clock.runFor(42_000);
	await page.getByRole('button', { name: 'Stop this session' }).click();
	await expect(page.locator('.live-layer')).toHaveAttribute('data-state', 'stopped');
	await expect(page.locator('.clock-status-text')).toHaveText('STOPPED · 0:42 logged');
	await expect(page.locator('.hero-caption')).toHaveText(WEEK);
	await expect(page.locator('#foot-line')).toHaveText('You spent 0:42 here. Vynno would have logged it.');
	await expect(page.locator('.foot-note')).toHaveText('The source is public.');
	const bar = await waitForBars(page);
	await expect(bar.locator('xpath=ancestor::*[@data-row="today"]')).toHaveCount(1);
	const delta = await page.locator('.window-week svg').evaluate((svg) => {
		const box = svg.getBoundingClientRect();
		const barBox = svg.querySelector('[data-session="latest"]').getBoundingClientRect();
		const start = 11 * 60 + 16;
		const axisStart = Number(svg.dataset.axisStart);
		const axisEnd = Number(svg.dataset.axisEnd);
		const chartX = Number(svg.dataset.chartX);
		const chartW = Number(svg.dataset.chartW);
		const expected = box.left + ((chartX + ((start - axisStart) / (axisEnd - axisStart)) * chartW) / 268) * box.width;
		return { dx: barBox.left - expected, axisStart, axisEnd };
	});
	expect(delta.axisStart).toBe(9 * 60);
	expect(delta.axisEnd).toBe(12 * 60);
	expect(Math.abs(delta.dx)).toBeLessThanOrEqual(2);
	const storage = await page.evaluate(() => ({
		local: localStorage.length,
		session: JSON.parse(sessionStorage.getItem('vynno:sessions') || '[]').length,
	}));
	expect(storage.local).toBe(0);
	expect(storage.session).toBe(1);
});

test('stop lands the session in today (mobile)', async ({ page }) => {
	await page.clock.install({ time: WHEN });
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await expect(page.locator('.window-week')).toBeHidden();
	await expect(page.locator('.today-sum')).toHaveText('03h 44m');
	await page.clock.runFor(42_000);
	await page.getByRole('button', { name: 'Stop this session' }).click();
	await expect(page.locator('[data-hit=today]')).toContainText('03h 45m');
	await expect(page.locator('.hero-caption')).toHaveText(TODAY);
	const segment = await page.locator('.today-segment').boundingBox();
	expect(segment.width).toBeGreaterThanOrEqual(6);
	expect(segment.height).toBeGreaterThanOrEqual(3);
});

test('start again keeps earlier sessions', async ({ page }) => {
	await page.clock.install({ time: WHEN });
	await page.goto('/');
	await page.clock.runFor(42_000);
	await page.getByRole('button', { name: 'Stop this session' }).click();
	await page.getByRole('button', { name: 'Start a new session' }).click();
	await page.clock.runFor(5_000);
	await page.getByRole('button', { name: 'Stop this session' }).click();
	await expect(page.locator('.window-week [data-session="latest"]')).toHaveCount(1);
	await expect(page.locator('.window-week [data-session="earlier"]')).toHaveCount(1);
	const colors = await page.evaluate(() => {
		const rgb = (sel) => getComputedStyle(document.querySelector(sel)).fill;
		return { latest: rgb('[data-session="latest"]'), earlier: rgb('[data-session="earlier"]') };
	});
	expect(colors.latest).toContain('77, 224, 130');
	expect(colors.earlier).toContain('142, 213, 255');
	await page.reload();
	await expect(page.locator('.window-week [data-session="latest"]')).toHaveCount(1);
	await expect(page.locator('.window-week [data-session="earlier"]')).toHaveCount(1);
	const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem('vynno:sessions')).length);
	expect(stored).toBe(2);
	expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

test('keyboard and screen reader', async ({ page }) => {
	await page.goto('/');
	await page.evaluate(() => {
		const node = document.getElementById('session-status');
		window.__statusChanges = 0;
		new MutationObserver(() => {
			window.__statusChanges += 1;
		}).observe(node, { childList: true, characterData: true, subtree: true });
	});
	const button = page.locator('[data-hit=stop]');
	for (let i = 0; i < 20; i += 1) {
		if (await button.evaluate((el) => el === document.activeElement)) break;
		await page.keyboard.press('Tab');
	}
	await expect(button).toBeFocused();
	await expect(button).toHaveAttribute('aria-label', 'Stop this session');
	await page.keyboard.press('Enter');
	await expect(page.locator('.live-layer')).toHaveAttribute('data-state', 'stopped');
	await expect(button).toBeFocused();
	await page.keyboard.press('Space');
	await expect(page.locator('.live-layer')).toHaveAttribute('data-state', 'running');
	await expect(button).toBeFocused();
	await expect(page.locator('#session-status')).toHaveText('New session started.');
	expect(await page.evaluate(() => window.__statusChanges)).toBe(2);
	expect(await page.locator('[data-hit=clock]').getAttribute('aria-live')).toBeNull();
});

test('a session under a second does not land', async ({ page }) => {
	await page.clock.install({ time: WHEN });
	await page.goto('/');
	await page.getByRole('button', { name: 'Stop this session' }).click();
	await expect(page.locator('#session-status')).toHaveText('Too short to log.');
	await expect(page.locator('.window-week [data-session="latest"]')).toHaveCount(0);
	await expect(page.locator('#foot-line')).toHaveText('The source is public.');
	expect(await page.evaluate(() => sessionStorage.getItem('vynno:sessions'))).toBeNull();
	expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

test('touch targets in the hero', async ({ page }) => {
	for (const width of [390, 320]) {
		await page.setViewportSize({ width, height: 800 });
		await page.goto('/');
		const button = page.locator('[data-hit=stop]');
		await button.scrollIntoViewIfNeeded();
		const hit = await button.evaluate((el) => {
			const before = getComputedStyle(el, '::before');
			const box = el.getBoundingClientRect();
			const widthPx = Math.max(parseFloat(before.width), 44);
			const heightPx = Math.max(parseFloat(before.height), 44);
			const cx = box.left + box.width / 2;
			const cy = box.top + box.height / 2;
			const left = cx - 22;
			const top = cy - 22;
			const corners = [
				[left + 1, top + 1],
				[left + 43, top + 1],
				[left + 1, top + 43],
				[left + 43, top + 43],
			].map(([x, y]) => {
				const node = document.elementFromPoint(x, y);
				return node === el || el.contains(node);
			});
			return {
				widthPx,
				heightPx,
				corners,
				scroll: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
			};
		});
		expect(hit.widthPx, `${width} hit width`).toBeGreaterThanOrEqual(44);
		expect(hit.heightPx, `${width} hit height`).toBeGreaterThanOrEqual(44);
		expect(hit.corners, `${width} corners`).toEqual([true, true, true, true]);
		expect(hit.scroll, `${width} scroll`).toBeTruthy();
	}
});

test.describe('no-js hero is the stage A capture', () => {
	test.use({ javaScriptEnabled: false });

	test('layer stays hidden and the window matches the capture', async ({ page }) => {
		await page.goto('/');
		const layer = page.locator('.live-layer');
		await expect(layer).toBeHidden();
		expect(await layer.getAttribute('data-state')).toBeNull();
		await expect(page.locator('.hero-caption')).toHaveText('Live capture of the daily driver');
		await expect(page.locator('.week-fallback')).toBeVisible();
		test.skip(!process.env.PW_DOCKER, 'pixel snapshots are compared only in the Playwright image');
		await expect(page.locator('.window-timer')).toHaveScreenshot('timer-window.png', {
			maxDiffPixels: 0,
			animations: 'disabled',
		});
	});
});

const FIELDS = {
	desktop: {
		clock: { x: 462, y: 127, w: 252, h: 45 },
		status: { x: 476, y: 192, w: 218, h: 15 },
		started: { x: 458, y: 221, w: 258, h: 32 },
		stop: { x: 447, y: 277, w: 280, h: 42 },
	},
	mobile: {
		clock: { x: 190, y: 84, w: 419, h: 72 },
		status: { x: 218, y: 192, w: 359, h: 24 },
		started: { x: 185, y: 239, w: 428, h: 53 },
		stop: { x: 167, y: 332, w: 463, h: 69 },
	},
};

test('overlay aligns with the capture', async ({ page }) => {
	for (const viewport of [
		{ width: 390, height: 844 },
		{ width: 768, height: 1024 },
		{ width: 1280, height: 720 },
		{ width: 1920, height: 1080 },
	]) {
		await page.setViewportSize(viewport);
		await page.goto('/?fixture=capture-values');
		await page.evaluate(() => document.fonts.ready);
		const report = await page.evaluate((fields) => {
			const view = document.querySelector('.window-timer .window-view').getBoundingClientRect();
			const mobile = window.innerWidth <= 640;
			const image = mobile ? { w: 840, h: 649 } : { w: 1166, h: 432 };
			const ink = mobile ? fields.mobile : fields.desktop;
			const pad = mobile ? 4 : 2;
			const out = {};
			for (const [name, box] of Object.entries(ink)) {
				const el = document.querySelector(
					name === 'clock'
						? '[data-hit=clock]'
						: name === 'status'
							? '.clock-status'
							: name === 'started'
								? '.clock-started'
								: '[data-hit=stop]',
				);
				const got = el.getBoundingClientRect();
				const scaleX = view.width / image.w;
				const scaleY = view.height / image.h;
				const expectLeft = view.left + ((box.x - pad) / image.w) * view.width;
				const expectTop = view.top + ((box.y - pad) / image.h) * view.height;
				const expectWidth = ((box.w + pad * 2) / image.w) * view.width;
				const expectHeight = ((box.h + pad * 2) / image.h) * view.height;
				out[name] = {
					dx: got.left - expectLeft,
					dy: got.top - expectTop,
					dw: got.width - expectWidth,
					dh: got.height - expectHeight,
					coverL: box.x * scaleX - (got.left - view.left),
					coverT: box.y * scaleY - (got.top - view.top),
					coverR: got.right - view.left - (box.x + box.w) * scaleX,
					coverB: got.bottom - view.top - (box.y + box.h) * scaleY,
				};
			}
			return out;
		}, FIELDS);
		for (const [name, edge] of Object.entries(report)) {
			const where = `${viewport.width} ${name}`;
			expect(Math.abs(edge.dx), where).toBeLessThanOrEqual(1.25);
			expect(Math.abs(edge.dy), where).toBeLessThanOrEqual(1.25);
			expect(Math.abs(edge.dw), where).toBeLessThanOrEqual(1.25);
			expect(Math.abs(edge.dh), where).toBeLessThanOrEqual(1.25);
			expect(edge.coverL, `${where} left`).toBeGreaterThanOrEqual(0.75);
			expect(edge.coverT, `${where} top`).toBeGreaterThanOrEqual(0.75);
			expect(edge.coverR, `${where} right`).toBeGreaterThanOrEqual(0.75);
			expect(edge.coverB, `${where} bottom`).toBeGreaterThanOrEqual(0.75);
			expect(edge.coverL, `${where} left drift`).toBeLessThanOrEqual(2.25);
			expect(edge.coverT, `${where} top drift`).toBeLessThanOrEqual(2.25);
			expect(edge.coverR, `${where} right drift`).toBeLessThanOrEqual(2.25);
			expect(edge.coverB, `${where} bottom drift`).toBeLessThanOrEqual(2.25);
		}
	}
});

test('week model agrees on today minutes', async ({ page }) => {
	await page.goto('/');
	const result = await page.evaluate(async () => {
		const { createWeek } = await import(new URL('./js/week.js', location.href).href);
		const wall = new Date('2026-10-28T11:16:00');
		const sessions = [{ startedAt: wall, ms: 42_000 }];
		const week = createWeek({ wallNow: () => wall, sessions });
		const bare = createWeek({ wallNow: () => wall, sessions: [] });
		return {
			hours: week.todayMinutes(),
			insights: week.insightsTodayMinutes(),
			added: week.todayMinutes() - bare.todayMinutes(),
		};
	});
	expect(result.hours).toBeCloseTo(result.insights, 5);
	expect(result.added).toBeCloseTo(0.7, 5);
	expect(result.hours).toBeGreaterThan(200);
});

test('clock ticks with reduced motion', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.clock.install({ time: WHEN });
	await page.goto('/');
	await page.clock.runFor(42_000);
	await expect(page.locator('[data-hit=clock]')).toHaveText('00:00:42');
	await page.getByRole('button', { name: 'Stop this session' }).click();
	await expect(page.locator('.hero-caption')).toHaveText(WEEK);
});

test('insights axis labels stay inside the panel', async ({ page }) => {
	await page.clock.install({ time: WHEN });
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.goto('/');
	const boxes = await page.locator('.window-week svg').evaluate((svg) =>
		[...svg.querySelectorAll('.week-axis')].map((node) => {
			const box = node.getBBox();
			return {
				text: node.textContent,
				x: box.x,
				y: box.y,
				right: box.x + box.width,
				bottom: box.y + box.height,
			};
		}),
	);
	expect(boxes.length).toBeGreaterThanOrEqual(3);
	for (const box of boxes) {
		expect(box.text, box.text).toMatch(/^\d{2}:00$/);
		expect(box.x, box.text).toBeGreaterThanOrEqual(0);
		expect(box.y, box.text).toBeGreaterThanOrEqual(0);
		expect(box.right, box.text).toBeLessThanOrEqual(268);
		expect(box.bottom, box.text).toBeLessThanOrEqual(122);
	}
});

test('insights leaves the timer today row visible', async ({ page }) => {
	for (const width of [768, 1280, 1440, 1920]) {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/');
		const gap = await page.evaluate(() => {
			const view = document.querySelector('.window-timer .window-view').getBoundingClientRect();
			const week = document.querySelector('.window-week').getBoundingClientRect();
			const todayTop = view.top + view.height * (350 / 432);
			return todayTop - week.bottom;
		});
		expect(gap, `${width}`).toBeGreaterThanOrEqual(2);
	}
});

test('stop uses a square and start uses a play icon', async ({ page }) => {
	await page.goto('/');
	const mark = page.locator('.clock-mark');
	const running = await mark.evaluate((el) => {
		const style = getComputedStyle(el);
		return { width: parseFloat(style.width), background: style.backgroundColor, border: parseFloat(style.borderLeftWidth) };
	});
	expect(running.width).toBeGreaterThan(0);
	expect(running.border).toBe(0);
	expect(running.background).not.toBe('rgba(0, 0, 0, 0)');
	await page.getByRole('button', { name: 'Stop this session' }).click();
	const stopped = await mark.evaluate((el) => {
		const style = getComputedStyle(el);
		return {
			background: style.backgroundColor,
			border: parseFloat(style.borderLeftWidth),
			color: style.borderLeftColor,
		};
	});
	expect(stopped.background).toBe('rgba(0, 0, 0, 0)');
	expect(stopped.border).toBeGreaterThan(3);
	expect(stopped.color).toContain('218, 226, 253');
});

test('today overlay covers the screenshot divider', async ({ page }) => {
	for (const width of [320, 390, 640]) {
		await page.setViewportSize({ width, height: 844 });
		await page.goto('/');
		const cover = await page.evaluate(() => {
			const view = document.querySelector('.window-timer .window-view').getBoundingClientRect();
			const today = document.querySelector('.clock-today').getBoundingClientRect();
			return {
				left: today.left - view.left,
				right: view.right - today.right,
				top: (today.top - view.top) / view.height,
				bottom: (view.bottom - today.bottom) / view.height,
			};
		});
		expect(cover.left, `${width} left`).toBeLessThanOrEqual(12);
		expect(cover.right, `${width} right`).toBeLessThanOrEqual(12);
		expect(cover.top, `${width} top`).toBeLessThanOrEqual(0.78);
		expect(cover.bottom, `${width} bottom`).toBeLessThanOrEqual(0.05);
	}
});

test('stage B copy', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('#tour .section-lede')).toHaveText(
		'Keyboard-first. One session at a time. Built to answer one question: where did the hours go?',
	);
	const timer = page.locator('.feature').filter({ hasText: '/timer' });
	await expect(timer.locator('h3')).toHaveText('One clock at a time');
	await expect(timer.locator('.feature-copy > p:not(.label)')).toHaveText(
		'Start, stop, tag the project. A second start is refused until you stop the first.',
	);
	const dashboard = page.locator('.feature').filter({ hasText: '/dashboard' });
	await expect(dashboard.locator('.feature-copy > p:not(.label)')).toHaveText(
		'Today\u2019s total, current focus, and seven days of hours. The number you guessed, corrected.',
	);
	const balance = await page.locator('.hero-copy .lead').evaluate((el) => getComputedStyle(el).textWrap);
	expect(balance).toBe('balance');
});

test('page length and layout shift stay in budget', async ({ page }) => {
	await page.addInitScript(() => {
		window.__cls = 0;
		new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				if (!entry.hadRecentInput) window.__cls += entry.value;
			}
		}).observe({ type: 'layout-shift', buffered: true });
	});
	await page.clock.install({ time: WHEN });
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.goto('/');
	expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(4500);
	await page.clock.runFor(42_000);
	await page.getByRole('button', { name: 'Stop this session' }).click();
	await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
	await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
	expect(await page.evaluate(() => window.__cls)).toBeLessThan(0.05);
	await page.setViewportSize({ width: 390, height: 844 });
	expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(7000);
});

test('no console errors across states', async ({ page }) => {
	const errors = [];
	page.on('pageerror', (error) => errors.push(String(error)));
	page.on('console', (msg) => {
		if (msg.type() === 'error') errors.push(msg.text());
	});
	await page.clock.install({ time: WHEN });
	await page.goto('/');
	await page.clock.runFor(2_000);
	await page.getByRole('button', { name: 'Stop this session' }).click();
	await page.getByRole('button', { name: 'Start a new session' }).click();
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.setViewportSize({ width: 390, height: 844 });
	await page.reload();
	expect(errors).toEqual([]);
});
