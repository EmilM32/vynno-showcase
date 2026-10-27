import { test, expect } from '@playwright/test';

const pages = ['/', '/architecture/', '/lab/'];

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

test('landing length, fold, type scale, and CTA', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.goto('/');
	const tall = await page.evaluate(() => document.documentElement.scrollHeight);
	expect(tall).toBeLessThanOrEqual(4500);

	const fold = await page.evaluate(() => {
		const vh = window.innerHeight;
		const visible = (sel) => {
			const el = document.querySelector(sel);
			const r = el.getBoundingClientRect();
			return r.top < vh && r.bottom > 0;
		};
		const win = document.querySelector('.hero-media .window').getBoundingClientRect();
		const shown = Math.min(win.bottom, vh) - Math.max(win.top, 0);
		return {
			h1: visible('#hero-title'),
			lead: visible('.hero-copy .lead'),
			cta: visible('.hero-actions .btn-primary'),
			windowShown: shown,
		};
	});
	expect(fold.h1).toBeTruthy();
	expect(fold.lead).toBeTruthy();
	expect(fold.cta).toBeTruthy();
	expect(fold.windowShown).toBeGreaterThanOrEqual(200);

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

test('mobile fold keeps chips intact and the page short', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
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
});

test('no horizontal scroll from 320px and touch targets', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 700 });
	await page.goto('/');
	const metrics = await page.evaluate(() => ({
		scrollWidth: document.documentElement.scrollWidth,
		clientWidth: document.documentElement.clientWidth,
		productHidden: getComputedStyle(document.querySelector('.nav-product')).display === 'none',
		headerNowrap: getComputedStyle(document.querySelector('.site-nav')).flexWrap === 'nowrap',
		icon: document.querySelector('.icon-btn').getBoundingClientRect(),
	}));
	expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
	expect(metrics.productHidden).toBeTruthy();
	expect(metrics.headerNowrap).toBeTruthy();
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

test('live color is only the local-status dot on the landing page', async ({ page }) => {
	await page.goto('/');
	const users = await page.evaluate(() => {
		const hits = [];
		for (const el of document.querySelectorAll('body *')) {
			const style = getComputedStyle(el);
			const blob = `${style.color} ${style.backgroundColor} ${style.borderColor} ${style.boxShadow}`;
			if (blob.includes('77, 224, 130') || blob.includes('77,224,130')) hits.push(el.className || el.tagName);
		}
		return hits;
	});
	expect(users).toEqual(['live-dot']);
});

test('skip link is first and focus is visible', async ({ page }) => {
	await page.goto('/');
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
		'/diagrams/runtime.html',
		'/diagrams/start-session.html',
		'/diagrams/session-lifecycle.html',
		'/diagrams/write-first.html',
		'/diagrams/insights-data.html',
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
