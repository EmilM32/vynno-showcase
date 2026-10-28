import { test, expect } from '@playwright/test';

const pages = ['./', 'architecture/', 'lab/'];

async function installRequestGuard(page) {
	const external = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.protocol === 'data:' || url.protocol === 'blob:') return;
		if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
			external.push(request.url());
		}
	});
	return external;
}

test('landing length, fold, type scale, and CTA', async ({ page, browser }) => {
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.goto('./');
	const tall = await page.evaluate(() => document.documentElement.scrollHeight);
	expect(tall).toBeLessThanOrEqual(4500);

	const fold = await page.evaluate(() => {
		const vh = window.innerHeight;
		const visible = (sel) => {
			const el = document.querySelector(sel);
			const r = el.getBoundingClientRect();
			return r.top < vh && r.bottom > 0;
		};
		const win = document.querySelector('.window-timer').getBoundingClientRect();
		const shown = Math.min(win.bottom, vh) - Math.max(win.top, 0);
		const caption = document.querySelector('.hero-caption').getBoundingClientRect();
		return {
			h1: visible('#hero-title'),
			lead: visible('.hero-copy .lead'),
			cta: visible('.hero-actions .btn-primary'),
			windowShown: shown,
			windowBottom: win.bottom,
			vh,
			captionShown: caption.top < vh && caption.bottom > 0 && caption.height > 0,
			h1Size: parseFloat(getComputedStyle(document.querySelector('#hero-title')).fontSize),
		};
	});
	expect(fold.h1).toBeTruthy();
	expect(fold.lead).toBeTruthy();
	expect(fold.cta).toBeTruthy();
	expect(fold.windowShown).toBeGreaterThanOrEqual(340);
	expect(fold.windowBottom).toBeLessThanOrEqual(fold.vh + 1);
	expect(fold.h1Size).toBeLessThanOrEqual(73);
	expect(fold.h1Size).toBeGreaterThanOrEqual(68);
	await expect(page.locator('.hero-caption')).toHaveText(
		'This clock started when you opened the page.',
	);
	await expect(page.locator('.window-timer .window-title')).toHaveText('vynno.localhost');
	await expect(page.locator('.hero-copy .label')).toHaveText(/Focus timer · v1\.3\.0/i);
	await expect(page.locator('.hero-copy .label')).not.toHaveText(/local-first/i);
	await expect(page.locator('.hero-copy .lead')).toHaveText(
		'A local-first focus timer. The one below started when you did.',
	);
	await expect(page.locator('.hero-byline')).toHaveText(
		'Side project by Emil Majer · SvelteKit + Go · built with AI agents',
	);
	await expect(page.locator('.status-sep')).toHaveText('·');
	await expect(page.locator('.status-chip .live-dot')).toHaveCount(0);
	await expect(page.locator('.status-chip .status-icon')).toHaveCount(2);

	const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 720 } });
	const nojs = await context.newPage();
	await nojs.goto(new URL('/vynno-showcase/', page.url()).href);
	await expect(nojs.locator('.hero-caption')).toHaveText('Live capture of the daily driver');
	await expect(nojs.locator('.live-layer')).toBeHidden();
	await context.close();
	await expect(page.locator('.window-week')).toBeVisible();
	const desktopSrc = await page.locator('.window-timer img').evaluate((img) => img.currentSrc);
	expect(desktopSrc).toContain('hero-timer-desktop.webp');

	const scale = await page.evaluate(() => {
		const px = (sel) => parseFloat(getComputedStyle(document.querySelector(sel)).fontSize);
		return { h2: px('h2'), h3: px('h3'), body: px('.feature-copy p:not(.label)') };
	});
	expect(scale.h2 / scale.h3).toBeGreaterThanOrEqual(1.25);
	expect(scale.h3 / scale.body).toBeGreaterThanOrEqual(1.25);

	const ctas = await page.locator('a.btn, button.btn').allTextContents();
	expect(ctas.map((t) => t.trim())).toEqual(['View on GitHub', 'View on GitHub']);
	await expect(page.locator('.hero-actions .btn')).toHaveCount(1);
	await expect(page.locator('.hero-actions .text-link')).toHaveCount(1);
	await expect(page.locator('.top .btn')).toHaveCount(0);
});

function boxesOverlap(a, b) {
	return a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;
}

test('insights stays off the clock and Stop at desktop sizes', async ({ page }) => {
	for (const size of [
		{ width: 1280, height: 720 },
		{ width: 1440, height: 900 },
	]) {
		await page.setViewportSize(size);
		await page.goto('./');
		const boxes = await page.evaluate(() => {
			const rect = (sel) => {
				const r = document.querySelector(sel).getBoundingClientRect();
				return {
					left: r.left,
					top: r.top,
					right: r.right,
					bottom: r.bottom,
					width: r.width,
					height: r.height,
				};
			};
			const svg = document.querySelector('.window-week svg');
			const shown = svg.getBoundingClientRect();
			const vb = svg.viewBox.baseVal;
			return {
				week: rect('.window-week'),
				clock: rect('[data-hit=clock]'),
				stop: rect('[data-hit=stop]'),
				image: { width: shown.width, height: shown.height, nw: vb.width, nh: vb.height },
				vw: window.innerWidth,
				vh: window.innerHeight,
			};
		});
		expect(boxes.week.width, `${size.width} insights width`).toBeGreaterThan(160);
		expect(boxes.clock.width, `${size.width} clock hit`).toBeGreaterThan(40);
		expect(boxes.stop.height, `${size.width} stop hit`).toBeGreaterThan(20);
		expect(boxesOverlap(boxes.week, boxes.clock), `${size.width} clock overlap`).toBe(false);
		expect(boxesOverlap(boxes.week, boxes.stop), `${size.width} stop overlap`).toBe(false);
		expect(boxes.week.left).toBeGreaterThanOrEqual(0);
		expect(boxes.week.top).toBeGreaterThanOrEqual(0);
		expect(boxes.week.right).toBeLessThanOrEqual(boxes.vw + 0.5);
		expect(boxes.week.bottom).toBeLessThanOrEqual(boxes.vh + 0.5);
		expect(Math.abs(boxes.image.width / boxes.image.height - boxes.image.nw / boxes.image.nh)).toBeLessThan(0.03);
		if (size.width === 1280) {
			expect(boxes.week.width).toBeCloseTo(272, 0);
			expect(boxes.week.height).toBeCloseTo(160, 0);
		}
	}
});

test('mobile fold keeps chips intact and the page short', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('./');
	const height = await page.evaluate(() => document.documentElement.scrollHeight);
	expect(height).toBeLessThanOrEqual(7000);
	const fold = await page.evaluate(() => {
		const vh = window.innerHeight;
		const visible = (sel) => {
			const r = document.querySelector(sel).getBoundingClientRect();
			return r.top < vh && r.bottom > 0 && r.left >= -1 && r.right <= window.innerWidth + 1;
		};
		const chips = [...document.querySelectorAll('.status-chip')].map((el) => {
			const style = getComputedStyle(el);
			return {
				nowrap: style.whiteSpace === 'nowrap',
				oneLine: el.getBoundingClientRect().height < 32,
			};
		});
		return {
			h1: visible('#hero-title'),
			lead: visible('.hero-copy .lead'),
			cta: visible('.hero-actions .btn'),
			meta: visible('.status-line'),
			chips,
			scrollWidth: document.documentElement.scrollWidth,
			clientWidth: document.documentElement.clientWidth,
		};
	});
	expect(fold.h1 && fold.lead && fold.cta && fold.meta).toBeTruthy();
	expect(fold.chips.length).toBe(2);
	for (const chip of fold.chips) {
		expect(chip.nowrap).toBeTruthy();
		expect(chip.oneLine).toBeTruthy();
	}
	expect(fold.scrollWidth).toBeLessThanOrEqual(fold.clientWidth + 1);
	const mobileSrc = await page.locator('.window-timer img').evaluate((img) => img.currentSrc);
	expect(mobileSrc).toContain('hero-timer-mobile.webp');
	await expect(page.locator('.hero-caption')).toBeVisible();
	await expect(page.locator('.nav-menu')).toBeVisible();
	await expect(page.locator('.nav-links')).toBeHidden();
	await expect(page.locator('.window-timer .window-title')).toHaveText('vynno.localhost');
	const bylineLines = await page.locator('.hero-byline > span').evaluateAll((els) =>
		els
			.filter((el) => getComputedStyle(el).display !== 'none')
			.map((el) => Math.round(el.getBoundingClientRect().top)),
	);
	expect(new Set(bylineLines).size).toBe(2);
	await expect(page.locator('.window-week')).toBeHidden();
});

test('no horizontal scroll from 320px and touch targets', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 700 });
	await page.goto('./');
	const metrics = await page.evaluate(() => ({
		scrollWidth: document.documentElement.scrollWidth,
		clientWidth: document.documentElement.clientWidth,
		productHidden: getComputedStyle(document.querySelector('.nav-links')).display === 'none',
		headerNowrap: getComputedStyle(document.querySelector('.site-nav')).flexWrap === 'nowrap',
		icon: document.querySelector('.icon-btn').getBoundingClientRect(),
	}));
	expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
	expect(metrics.productHidden).toBeTruthy();
	expect(metrics.headerNowrap).toBeTruthy();
	const menu = page.locator('.nav-menu');
	await expect(menu).toBeVisible();
	await menu.locator('summary').click();
	await expect(menu.locator('a', { hasText: 'Product' })).toBeVisible();
	await expect(menu.locator('a', { hasText: 'Architecture' })).toBeVisible();
	await expect(menu.locator('a', { hasText: 'Lab' })).toBeVisible();
	expect(metrics.icon.width).toBeGreaterThanOrEqual(44);
	expect(metrics.icon.height).toBeGreaterThanOrEqual(44);
});

test('content text stays at least 13px', async ({ page }) => {
	for (const path of pages) {
		await page.goto(path);
		const small = await page.evaluate(() => {
			const bad = [];
			for (const el of document.querySelectorAll('body *')) {
				if (el.closest('svg') || el.closest('template')) continue;
				const direct = [...el.childNodes].some(
					(node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim(),
				);
				if (!direct) continue;
				const size = parseFloat(getComputedStyle(el).fontSize);
				if (size < 12.9) {
					bad.push(`${el.tagName}.${el.className} ${size}px “${el.textContent.trim().slice(0, 48)}”`);
				}
			}
			return bad;
		});
		expect(small, path).toEqual([]);
	}
});

test('no external requests on the three pages', async ({ page }) => {
	const external = await installRequestGuard(page);
	for (const path of pages) {
		await page.goto(path, { waitUntil: 'networkidle' });
	}
	expect(external).toEqual([]);
});

async function liveColorUsers(page) {
	return page.evaluate(() => {
		const allowed = (el) =>
			el.classList?.contains('clock-dot') ||
			el.classList?.contains('today-segment') ||
			el.getAttribute?.('data-session') === 'latest';
		const hits = [];
		for (const el of document.querySelectorAll('body *')) {
			const style = getComputedStyle(el);
			const blob = `${style.color} ${style.backgroundColor} ${style.borderColor} ${style.boxShadow} ${style.fill} ${style.stroke}`;
			if (!blob.includes('77, 224, 130') && !blob.includes('77,224,130')) continue;
			const box = el.getBoundingClientRect();
			if (box.width < 0.5 || box.height < 0.5) continue;
			hits.push(allowed(el) ? 'ok' : el.className || el.tagName);
		}
		return hits;
	});
}

test('live color is only the visitor’s latest session', async ({ page }) => {
	await page.clock.install({ time: new Date('2026-10-28T11:16:00') });
	await page.goto('./');
	const running = await liveColorUsers(page);
	expect(running.length).toBeGreaterThan(0);
	expect(running.length).toBeLessThanOrEqual(2);
	expect(running.every((hit) => hit === 'ok')).toBeTruthy();

	await page.clock.runFor(42_000);
	await page.getByRole('button', { name: 'Stop this session' }).click();
	await page.locator('[data-session="latest"]').evaluate(async (el) => {
		await Promise.all((el.getAnimations?.() || []).map((animation) => animation.finished));
	});
	const stopped = await liveColorUsers(page);
	expect(stopped.length).toBeGreaterThan(0);
	expect(stopped.length).toBeLessThanOrEqual(2);
	expect(stopped.every((hit) => hit === 'ok')).toBeTruthy();

	await page.setViewportSize({ width: 390, height: 844 });
	const mobile = await liveColorUsers(page);
	expect(mobile.length).toBeGreaterThan(0);
	expect(mobile.length).toBeLessThanOrEqual(2);
	expect(mobile.every((hit) => hit === 'ok')).toBeTruthy();
});

test('skip link is first and focus is visible', async ({ page }) => {
	await page.goto('./');
	await page.keyboard.press('Tab');
	const skip = page.locator('.skip');
	await expect(skip).toBeFocused();
	const box = await skip.boundingBox();
	expect(box.y).toBeGreaterThanOrEqual(0);
	expect(box.height).toBeGreaterThan(0);
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/#main$/);
	const outline = await page.locator('.hero-actions .btn').evaluate((el) => {
		el.focus();
		return getComputedStyle(el).outlineStyle;
	});
	expect(outline).not.toBe('none');
});

test('internal links resolve', async ({ page, request }) => {
	const seen = new Set();
	const broken = [];
	const diagramPages = [
		'diagrams/runtime.html',
		'diagrams/start-session.html',
		'diagrams/session-lifecycle.html',
		'diagrams/write-first.html',
		'diagrams/insights-data.html',
	];
	for (const path of [...pages, ...diagramPages]) {
		await page.goto(path);
		const hrefs = await page.locator('a[href]').evaluateAll((els) => els.map((a) => a.getAttribute('href')));
		for (const href of hrefs) {
			if (!href || href.startsWith('http') || href.startsWith('mailto:')) continue;
			const url = new URL(href, page.url());
			url.hash = '';
			const target = url.pathname + url.search;
			if (seen.has(target)) continue;
			seen.add(target);
			const response = await request.get(target);
			if (!response.ok()) broken.push(`${target} ${response.status()}`);
		}
	}
	expect(broken).toEqual([]);
});
