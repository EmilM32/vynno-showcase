// First-party JS budget for CI (stage B, A5 / B-10).
// Sum of gzip -9 (zlib level 9) over js/**/*.js, excluding js/vendor/**.
// Limit: 9 KB (9216 bytes). Prints a per-file table and exits 1 when over.
//
// Other deterministic CI gates:
// - zero external requests: already "no external requests on the three pages"
// - ≤2 live WebGL contexts: skipped until PR2 (no WebGL on the page yet)
// - ascii-fx not loaded before `load`, and never in the lite tier: skipped until PR2 vendors ascii-fx

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const LIMIT = 9216;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsRoot = path.join(root, 'js');

async function collect(dir) {
	const files = [];
	let entries;
	try {
		entries = await readdir(dir, { withFileTypes: true });
	} catch (err) {
		if (err.code === 'ENOENT') return files;
		throw err;
	}
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (dir === jsRoot && entry.name === 'vendor') continue;
			files.push(...(await collect(full)));
		} else if (entry.isFile() && entry.name.endsWith('.js')) {
			files.push(full);
		}
	}
	return files;
}

const files = (await collect(jsRoot)).sort();
const rows = [];
let total = 0;
for (const file of files) {
	const bytes = gzipSync(await readFile(file), { level: 9 }).length;
	total += bytes;
	rows.push({ file: path.relative(root, file), bytes });
}

const nameWidth = Math.max('file'.length, ...rows.map((row) => row.file.length));
const byteWidth = Math.max('gzip-9'.length, String(LIMIT).length, ...rows.map((row) => String(row.bytes).length));
const line = (name, bytes) => `${name.padEnd(nameWidth)}  ${String(bytes).padStart(byteWidth)}`;

console.log(line('file', 'gzip-9'));
for (const row of rows) console.log(line(row.file, row.bytes));
console.log(line('total', total));
console.log(`budget ${LIMIT} bytes`);

if (total > LIMIT) {
	console.error(`own JS gzip -9 is ${total} bytes, over the ${LIMIT} byte budget`);
	process.exit(1);
}
