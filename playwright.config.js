import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests',
	timeout: 30000,
	expect: { timeout: 8000 },
	fullyParallel: false,
	workers: 1,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
	use: {
		// GitHub Pages publishes this repo at /vynno-showcase/. The trailing
		// slash matters: a leading "/" in goto() is still origin-absolute.
		baseURL: 'http://127.0.0.1:4173/vynno-showcase/',
		viewport: { width: 1280, height: 720 },
	},
	projects: [
		{ name: 'chromium', use: { browserName: 'chromium' } },
		{ name: 'webkit', use: { browserName: 'webkit' } },
	],
	webServer: {
		command: 'bash scripts/serve-test.sh',
		url: 'http://127.0.0.1:4173/vynno-showcase/',
		reuseExistingServer: false,
		timeout: 60000,
	},
});
