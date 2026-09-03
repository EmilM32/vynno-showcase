(() => {
	const clock = document.getElementById('elapsed');
	const railChip = document.querySelector('.rail-chip .mono');
	if (!clock) return;

	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (reduced) return;

	const [h, m, s] = clock.textContent.split(':').map((n) => Number.parseInt(n, 10));
	let seconds = h * 3600 + m * 60 + s;

	const pad = (n) => String(n).padStart(2, '0');
	const render = () => {
		const hh = pad(Math.floor(seconds / 3600));
		const mm = pad(Math.floor((seconds % 3600) / 60));
		const ss = pad(seconds % 60);
		const label = `${hh}:${mm}:${ss}`;
		clock.textContent = label;
		if (railChip) railChip.textContent = label;
	};

	window.setInterval(() => {
		seconds += 1;
		render();
	}, 1000);
})();
