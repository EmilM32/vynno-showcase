import { test, expect } from '@playwright/test';

const arch = /\/architecture\/?$/;
const lab = /\/lab\/?$/;

/** index.html#hash → path pattern, and an element that should be in view. */
const cases = [
	['#architecture', arch, '#arch-title'],
	['#arch-title', arch, '#arch-title'],
	['#topo-title', /\/architecture\/?#topo-title$/, '#topo-title'],
	['#topo-caption', /\/architecture\/?#topo-caption$/, '#topo-caption'],
	['#agent', /\/architecture\/?#agent$/, '#agent'],
	['#agent-title', /\/architecture\/?#agent-title$/, '#agent-title'],
	['#layers-title', /\/architecture\/?#layers-title$/, '#layers-title'],
	['#domain-title', /\/architecture\/?#domain-title$/, '#domain-title'],
	['#seam-title', /\/architecture\/?#seam-title$/, '#seam-title'],
	['#diagrams', /\/architecture\/?#diagrams$/, '#diagrams'],
	['#diagrams-title', /\/architecture\/?#diagrams-title$/, '#diagrams-title'],
	['#tool-caption', /\/architecture\/?#tool-caption$/, '#tool-caption'],
	['#tool-card', /\/architecture\/?#tool-card$/, '#tool-card'],
	['#tool-detail', /\/architecture\/?#tool-detail$/, '#tool-detail'],
	['#life-caption', /\/architecture\/?#life-caption$/, '#life-caption'],
	['#life-detail', /\/architecture\/?#life-detail$/, '#life-detail'],
	['#process', /\/lab\/?#process$/, '#process'],
	['#process-title', /\/lab\/?#process-title$/, '#process-title'],
	['#write-title', /\/lab\/?#write-title$/, '#write-title'],
	['#own-title', /\/lab\/?#own-title$/, '#own-title'],
	['#road-title', /\/lab\/?#road-title$/, '#road-title'],
	['#adr-title', /\/lab\/?#adr-title$/, '#adr-title'],
	['#pipe-caption', /\/lab\/?#pipe-caption$/, '#pipe-caption'],
	['#main', /\/(?:index\.html)?#main$/, '#main'],
	['#hero-title', /\/(?:index\.html)?#hero-title$/, '#hero-title'],
	['#method-title', /\/(?:index\.html)?#method-title$/, '#method-title'],
	['#tour', /\/(?:index\.html)?#tour$/, '#tour'],
	['#timeline', /\/(?:index\.html)?#timeline$/, '#timeline'],
	['#timeline-title', /\/(?:index\.html)?#timeline-title$/, '#timeline-title'],
	['#tour-title', /\/(?:index\.html)?#tour-title$/, '#tour-title'],
	['#not-a-real-anchor', /\/(?:index\.html)?#not-a-real-anchor$/, null],
];

async function visibleInViewport(page, selector) {
	const box = await page.locator(selector).boundingBox();
	const viewport = page.viewportSize();
	expect(box, selector).not.toBeNull();
	expect(box.y, selector).toBeLessThan(viewport.height);
	expect(box.y + box.height, selector).toBeGreaterThan(0);
}

test.describe('old anchor redirects', () => {
	for (const [hash, path, selector] of cases) {
		test(`index.html${hash}`, async ({ page }) => {
			await page.goto(`index.html${hash}`, { waitUntil: 'load' });
			await expect(page).toHaveURL(path);
			if (!selector) {
				await expect(page.locator('#arch-title, #process-title')).toHaveCount(0);
				return;
			}
			await page.locator(selector).waitFor({ state: 'attached' });
			await page.waitForFunction(
				(sel) => {
					const el = document.querySelector(sel);
					if (!el) return false;
					const rect = el.getBoundingClientRect();
					return rect.bottom > 0 && rect.top < window.innerHeight;
				},
				selector,
			);
			await visibleInViewport(page, selector);
		});
	}
});
