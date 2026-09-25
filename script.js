(() => {
	const copyFromTemplate = (template, attr, key) => {
		if (!template) return null;
		return template.content.querySelector(`[${attr}="${key}"]`);
	};

	const bindSwitcher = ({ root, buttons, attr, template, kicker, panel }) => {
		if (!root || !buttons.length || !panel || !kicker) return;

		const apply = (btn) => {
			const key = btn.getAttribute(attr);
			buttons.forEach((node) => {
				node.setAttribute('aria-pressed', node === btn ? 'true' : 'false');
			});
			const source = copyFromTemplate(template, attr, key);
			kicker.textContent = key;
			const next = source ? source.cloneNode(true) : document.createElement('p');
			if (!source) next.textContent = key;
			const old = panel.querySelector('p:not(.topo-detail-kicker)');
			if (old) old.replaceWith(next);
			else panel.append(next);
		};

		buttons.forEach((btn) => {
			btn.addEventListener('click', () => apply(btn));
		});
	};

	const runTopology = () => {
		const root = document.querySelector('.topo');
		bindSwitcher({
			root,
			buttons: [...(root ? root.querySelectorAll('.topo-node') : [])],
			attr: 'data-node',
			template: document.getElementById('topo-copy'),
			kicker: document.querySelector('#topo-detail .topo-detail-kicker'),
			panel: document.getElementById('topo-detail'),
		});
	};

	const runTools = () => {
		const root = document.getElementById('tool-card');
		bindSwitcher({
			root,
			buttons: [...(root ? root.querySelectorAll('.tool-btn') : [])],
			attr: 'data-tool',
			template: document.getElementById('tool-copy'),
			kicker: document.querySelector('#tool-detail .topo-detail-kicker'),
			panel: document.getElementById('tool-detail'),
		});
	};

	const runLifecycle = () => {
		const root = document.querySelector('.life-card');
		bindSwitcher({
			root,
			buttons: [...document.querySelectorAll('.life-state')],
			attr: 'data-state',
			template: document.getElementById('life-copy'),
			kicker: document.querySelector('#life-detail .topo-detail-kicker'),
			panel: document.getElementById('life-detail'),
		});
	};

	const runAdrFilter = () => {
		const buttons = [...document.querySelectorAll('.filter-btn')];
		const cards = [...document.querySelectorAll('.adr')];
		if (!buttons.length) return;

		const apply = (side) => {
			buttons.forEach((btn) => {
				btn.setAttribute('aria-pressed', btn.dataset.filter === side ? 'true' : 'false');
			});
			cards.forEach((card) => {
				const sides = card.dataset.side.split(/\s+/);
				card.hidden = side !== 'all' && !sides.includes(side);
			});
		};

		buttons.forEach((btn) => {
			btn.addEventListener('click', () => apply(btn.dataset.filter));
		});
	};

	const runNav = () => {
		const links = [...document.querySelectorAll('.site-nav a')];
		const header = document.querySelector('.top');
		const sections = links.map((link) => document.querySelector(link.hash)).filter(Boolean);
		if (!sections.length) return;

		const setCurrent = (id) => {
			links.forEach((link) => {
				if (link.hash === `#${id}`) link.setAttribute('aria-current', 'location');
				else link.removeAttribute('aria-current');
			});
		};

		const update = () => {
			const offset = (header ? header.getBoundingClientRect().bottom : 0) + 72;
			let current = sections[0].id;
			for (const section of sections) {
				if (section.getBoundingClientRect().top <= offset) current = section.id;
			}
			const atEnd =
				window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
			if (atEnd) current = sections.at(-1).id;
			setCurrent(current);
		};

		update();
		requestAnimationFrame(update);
		window.addEventListener('scroll', update, { passive: true });
		window.addEventListener('hashchange', update);
	};

	runTopology();
	runTools();
	runLifecycle();
	runAdrFilter();
	runNav();
})();
