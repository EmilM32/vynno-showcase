import { test, expect } from '@playwright/test';

const root = '/vynno-showcase';

test('published subpath loads without broken requests', async ({ page }) => {
	const failed = [];
	page.on('requestfailed', (request) => {
		const reason = request.failure()?.errorText || 'failed';
		if (reason.includes('ERR_ABORTED')) return;
		failed.push(`${reason} ${request.url()}`);
	});
	page.on('response', (response) => {
		if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
	});
	const errors = [];
	page.on('pageerror', (error) => errors.push(String(error)));
	page.on('console', (message) => {
		if (message.type() === 'error') errors.push(message.text());
	});
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.protocol === 'data:' || url.protocol === 'blob:') return;
		if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
			failed.push(`external ${request.url()}`);
		}
	});

	await page.clock.install({ time: new Date('2026-10-28T11:16:00') });
	const home = await page.goto(`${root}/`);
	expect(home.status()).toBeLessThan(400);
	await expect(page.locator('[data-hit=clock]')).toHaveText('00:00:00');
	await page.clock.runFor(2_000);
	await expect(page.locator('[data-hit=clock]')).toHaveText('00:00:02');
	await page.getByRole('button', { name: 'Stop this session' }).click();
	await expect(page.locator('.live-layer')).toHaveAttribute('data-state', 'stopped');
	await page.getByRole('button', { name: 'Start a new session' }).click();
	await expect(page.locator('.live-layer')).toHaveAttribute('data-state', 'running');
	await expect(page.locator('[data-hit=clock]')).toHaveText('00:00:00');

	for (const path of [`${root}/architecture/`, `${root}/lab/`]) {
		const response = await page.goto(path);
		expect(response.status(), path).toBeLessThan(400);
	}

	expect(failed).toEqual([]);
	expect(errors).toEqual([]);
});
