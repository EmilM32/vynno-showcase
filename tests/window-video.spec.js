import { test, expect } from '@playwright/test';

test('window frame lays out a video', async ({ page }) => {
	await page.goto('/tests/fixtures/window-video.html');
	const frame = page.locator('.window');
	const video = frame.locator('video');
	const bar = frame.locator('.window-bar');
	await expect(bar).toBeVisible();
	await expect(video).toBeVisible();
	const frameBox = await frame.boundingBox();
	const videoBox = await video.boundingBox();
	expect(frameBox.width).toBeGreaterThan(280);
	expect(videoBox.width).toBeGreaterThan(280);
	expect(Math.abs(videoBox.width - frameBox.width)).toBeLessThan(2);
	expect(videoBox.y).toBeGreaterThanOrEqual(frameBox.y + 20);
	const slot = page.locator('[data-slot="hero-media"]');
	await expect(slot).toBeVisible();
});
