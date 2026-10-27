/* Old showcase anchors. Runs in <head> before paint. Unknown hashes do nothing.
   #pipe-caption lives in Write first, which moves to /lab/ with the process section.
   #life-* and #tool-* live in the architecture section and stay with it. */
(function () {
	var raw = location.hash.slice(1);
	if (!raw) return;
	var id = raw;
	try {
		id = decodeURIComponent(raw);
	} catch (err) {
		id = raw;
	}

	var stay =
		id === 'main' ||
		id === 'hero-title' ||
		id === 'method' ||
		id === 'method-title' ||
		id === 'tour' ||
		id.indexOf('timeline') === 0;
	if (stay) return;

	var toArch = function (keep) {
		location.replace('./architecture/' + (keep ? '#' + id : ''));
	};
	var toLab = function () {
		location.replace('./lab/#' + id);
	};

	if (id === 'architecture' || id === 'arch-title') {
		toArch(false);
		return;
	}

	if (
		id.indexOf('topo-') === 0 ||
		id.indexOf('agent') === 0 ||
		id === 'layers-title' ||
		id === 'domain-title' ||
		id === 'seam-title' ||
		id.indexOf('diagrams') === 0 ||
		id.indexOf('tool-') === 0 ||
		id.indexOf('life-') === 0
	) {
		toArch(true);
		return;
	}

	if (
		id === 'process' ||
		id === 'process-title' ||
		id === 'write-title' ||
		id === 'own-title' ||
		id === 'road-title' ||
		id === 'adr-title' ||
		id === 'pipe-caption' ||
		id.indexOf('pipe-') === 0
	) {
		toLab();
	}
})();
