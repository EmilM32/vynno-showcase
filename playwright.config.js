import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests',
	timeout: 30000,
	expect: { timeout: 8000 },
	fullyParallel: false,
	workers: 1,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: 'http://127.0.0.1:4173',
		viewport: { width: 1280, height: 720 },
	},
	projects: [
		{ name: 'chromium', use: { browserName: 'chromium' } },
		{ name: 'webkit', use: { browserName: 'webkit' } },
	],
	webServer: {
		command: 'npx --yes serve . -p 4173 --no-clipboard',
		url: 'http://127.0.0.1:4173',
		reuseExistingServer: true,
		timeout: 60000,
	},
});
