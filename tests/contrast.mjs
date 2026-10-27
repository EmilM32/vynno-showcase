function lin(channel) {
	const c = channel / 255;
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function lum(hex) {
	const n = Number.parseInt(hex.slice(1), 16);
	return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

function contrast(a, b) {
	const left = lum(a);
	const right = lum(b);
	const [hi, lo] = left > right ? [left, right] : [right, left];
	return (hi + 0.05) / (lo + 0.05);
}

const backgrounds = {
	'--bg': '#0b1326',
	'--surface': '#171f33',
	'--surface-low': '#131b2e',
	'--surface-high': '#222a3d',
	'--primary (button fill)': '#8ed5ff',
};

const foregrounds = {
	'--text': '#dae2fd',
	'--muted': '#bdc8d1',
	'--primary': '#8ed5ff',
	'--on-primary': '#00354a',
	'--live': '#4de082',
};

const used = new Set([
	'--text|--bg',
	'--text|--surface',
	'--text|--surface-low',
	'--text|--surface-high',
	'--muted|--bg',
	'--muted|--surface',
	'--muted|--surface-low',
	'--muted|--surface-high',
	'--primary|--bg',
	'--primary|--surface',
	'--primary|--surface-low',
	'--primary|--surface-high',
	'--on-primary|--primary (button fill)',
]);

for (const [name, fg] of Object.entries(foregrounds)) {
	for (const [bgName, bg] of Object.entries(backgrounds)) {
		const ratio = contrast(fg, bg);
		const key = `${name}|${bgName}`;
		const mark = used.has(key) ? 'used' : 'unused pair';
		const pass = ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA large only' : 'fail';
		console.log(`${ratio.toFixed(2).padStart(6)}  ${pass.padEnd(14)}  ${mark.padEnd(12)}  ${name} on ${bgName}`);
	}
}
