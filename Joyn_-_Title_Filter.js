// ==UserScript==
// @name         Joyn.de - Title Filter 1.0
// @namespace    https://example.com
// @version      1.0
// @description  Hide selected titles on Joyn mediathek lists with quick add buttons.
// @match        https://www.joyn.de/*
// @match        https://joyn.de/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEYS = {
        titles: 'joyn_filter_titles',
        panelOpen: 'joyn_filter_panel_open'
    };

    const SELECTORS = {
        item: 'li.Grid_GridItem__dE_ip',
        card: 'a[data-testid^="LL--"]'
    };

    const CLASSNAMES = {
        hidden: 'joyn-filter-hidden',
        root: 'joyn-filter-root'
    };

    function normalize(value) {
        return (value ?? '').toString().trim().toLowerCase();
    }

    function parseList(multilineText) {
        const raw = (multilineText ?? '').toString();
        const lines = raw
            .split(/\r?\n/g)
            .flatMap(line => line.split(','))
            .map(item => item.trim())
            .filter(Boolean);

        const unique = new Set();
        for (const item of lines) {
            unique.add(item);
        }
        return Array.from(unique);
    }

    function loadSettings() {
        return {
            titlesText: localStorage.getItem(STORAGE_KEYS.titles) ?? '',
            panelOpen: (localStorage.getItem(STORAGE_KEYS.panelOpen) ?? 'true') === 'true'
        };
    }

    function saveSettings(titlesText, panelOpen) {
        localStorage.setItem(STORAGE_KEYS.titles, titlesText ?? '');
        localStorage.setItem(STORAGE_KEYS.panelOpen, panelOpen ? 'true' : 'false');
    }

    function ensureStyles() {
        if (document.getElementById('joyn-filter-style')) return;

        const style = document.createElement('style');
        style.id = 'joyn-filter-style';
        style.textContent = `
.${CLASSNAMES.hidden} { display: none !important; }
.${CLASSNAMES.root} {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 2147483647;
  width: 320px;
  max-width: calc(100vw - 24px);
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  color: #111;
}
.${CLASSNAMES.root} details {
  background: rgba(255,255,255,0.96);
  border: 1px solid rgba(0,0,0,0.15);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.18);
  overflow: hidden;
}
.${CLASSNAMES.root} summary {
  list-style: none;
  cursor: pointer;
  padding: 10px 12px;
  font-weight: 650;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.${CLASSNAMES.root} summary::-webkit-details-marker { display: none; }
.${CLASSNAMES.root} .joyn-filter-body {
  padding: 10px 12px 12px 12px;
  border-top: 1px solid rgba(0,0,0,0.10);
}
.${CLASSNAMES.root} label {
  display: block;
  font-size: 12px;
  font-weight: 650;
  margin: 10px 0 6px 0;
}
.${CLASSNAMES.root} textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 90px;
  resize: vertical;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,0.25);
  font-size: 12px;
}
.${CLASSNAMES.root} .joyn-filter-row {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.${CLASSNAMES.root} button {
  flex: 1;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,0.22);
  background: #f7f7f7;
  cursor: pointer;
  font-weight: 600;
}
.${CLASSNAMES.root} button:hover { background: #efefef; }
.${CLASSNAMES.root} .joyn-filter-status {
  font-size: 12px;
  opacity: 0.85;
  margin-top: 10px;
  line-height: 1.35;
}
.${CLASSNAMES.root} .joyn-filter-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(0,0,0,0.08);
  font-size: 12px;
  margin-left: 8px;
  font-weight: 600;
}
.joyn-filter-quick {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  background: rgba(255,255,255,0.95);
  border: 1px solid rgba(0,0,0,0.2);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  transition: all 0.15s;
  max-width: calc(100% - 16px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.joyn-filter-quick:hover {
  background: rgba(255,255,255,1);
  border-color: rgba(0,0,0,0.35);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0,0,0,0.2);
}
`;
        document.head.appendChild(style);
    }

    function debounce(fn, waitMs) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), waitMs);
        };
    }

    function extractTitleFromAria(aria) {
        if (!aria) return '';
        const firstDot = aria.indexOf('.');
        if (firstDot === -1) return aria.trim();
        return aria.substring(0, firstDot).trim();
    }

    function getTitleFromCard(card) {
        const aria = card.getAttribute('aria-label');
        return extractTitleFromAria(aria);
    }

    function filterResults(filters) {
        const items = Array.from(document.querySelectorAll(SELECTORS.item));
        let filtered = 0;

        for (const item of items) {
            const card = item.querySelector(SELECTORS.card);
            if (!card) continue;

            const title = getTitleFromCard(card);
            const shouldHide = title && filters.titles.length > 0 && filters.titles.some(t => normalize(t) === normalize(title));

            if (shouldHide) {
                if (!item.classList.contains(CLASSNAMES.hidden)) {
                    item.classList.add(CLASSNAMES.hidden);
                }
                filtered++;
                const existingBtn = card.querySelector('.joyn-filter-quick');
                if (existingBtn) existingBtn.remove();
            } else {
                item.classList.remove(CLASSNAMES.hidden);
            }
        }

        return { filtered, total: items.length };
    }

    function addQuickAddButtons(onAddTitle, currentTitles) {
        const existingButtons = document.querySelectorAll('.joyn-filter-quick');
        existingButtons.forEach(btn => btn.remove());

        const items = Array.from(document.querySelectorAll(SELECTORS.item));
        for (const item of items) {
            if (item.classList.contains(CLASSNAMES.hidden)) continue;

            const card = item.querySelector(SELECTORS.card);
            if (!card) continue;

            const title = getTitleFromCard(card);
            if (!title) continue;

            const alreadyBlocked = currentTitles.some(t => normalize(t) === normalize(title));
            if (alreadyBlocked) continue;

            const positionTarget = card.closest('[class*="CardStandard_StandardCardWrapper"]') || card;
            if (positionTarget && !positionTarget.style.position) {
                positionTarget.style.position = 'relative';
            }

            const btn = document.createElement('button');
            btn.className = 'joyn-filter-quick';
            btn.textContent = `Ausblenden: ${title}`;
            btn.title = `Titel "${title}" zur Filterliste hinzufügen`;
            btn.type = 'button';

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddTitle(title);
            });

            (positionTarget || card).appendChild(btn);
        }
    }

    function buildPanel() {
        if (document.getElementById('joyn-filter-panel')) return null;

        ensureStyles();

        const settings = loadSettings();

        const root = document.createElement('div');
        root.id = 'joyn-filter-panel';
        root.className = CLASSNAMES.root;

        const details = document.createElement('details');
        details.open = !!settings.panelOpen;

        const summary = document.createElement('summary');
        summary.textContent = 'Joyn Filter';

        const pill = document.createElement('span');
        pill.className = 'joyn-filter-pill';
        pill.textContent = '0/0';
        summary.appendChild(pill);

        const body = document.createElement('div');
        body.className = 'joyn-filter-body';

        const titlesLabel = document.createElement('label');
        titlesLabel.textContent = 'Titel ausblenden (eine pro Zeile, optional Komma)';

        const titlesTextarea = document.createElement('textarea');
        titlesTextarea.placeholder = 'Beispiel:\nBaywatch - Die Rettungsschwimmer von Malibu';
        titlesTextarea.value = settings.titlesText;

        const buttonRow = document.createElement('div');
        buttonRow.className = 'joyn-filter-row';

        const applyButton = document.createElement('button');
        applyButton.type = 'button';
        applyButton.textContent = 'Anwenden';

        const resetButton = document.createElement('button');
        resetButton.type = 'button';
        resetButton.textContent = 'Zurücksetzen';

        buttonRow.appendChild(applyButton);
        buttonRow.appendChild(resetButton);

        const status = document.createElement('div');
        status.className = 'joyn-filter-status';
        status.textContent = 'Bereit.';

        body.appendChild(titlesLabel);
        body.appendChild(titlesTextarea);
        body.appendChild(buttonRow);
        body.appendChild(status);

        details.appendChild(summary);
        details.appendChild(body);
        root.appendChild(details);
        document.body.appendChild(root);

        const getCurrentFilters = () => ({
            titles: parseList(titlesTextarea.value)
        });

        const updateStatus = (filteredCount, totalCount) => {
            pill.textContent = `${filteredCount}/${totalCount}`;
            const tCount = parseList(titlesTextarea.value).length;
            status.textContent = `Ausgeblendet: ${filteredCount} von ${totalCount} (Titel: ${tCount})`;
        };

        const applyFilters = () => {
            const filters = getCurrentFilters();
            saveSettings(titlesTextarea.value, details.open);
            const counts = filterResults(filters);
            updateStatus(counts.filtered, counts.total);
            addQuickAddButtons((title) => {
                const currentList = parseList(titlesTextarea.value);
                if (!currentList.some(t => normalize(t) === normalize(title))) {
                    const newText = titlesTextarea.value.trim()
                        ? `${titlesTextarea.value.trim()}\n${title}`
                        : title;
                    titlesTextarea.value = newText;
                    applyFilters();
                }
            }, filters.titles);
        };

        const applyFiltersDebounced = debounce(applyFilters, 200);

        applyButton.addEventListener('click', applyFilters);
        resetButton.addEventListener('click', () => {
            titlesTextarea.value = '';
            applyFilters();
        });

        titlesTextarea.addEventListener('input', applyFiltersDebounced);

        details.addEventListener('toggle', () => {
            saveSettings(titlesTextarea.value, details.open);
        });

        setTimeout(applyFilters, 0);

        return { applyFilters };
    }

    function installAutoReapply(panelApi) {
        let scheduled = false;
        let isApplying = false;

        const schedule = () => {
            if (scheduled || isApplying) return;
            scheduled = true;
            setTimeout(reapply, 150);
        };

        const reapply = () => {
            scheduled = false;
            if (isApplying) return;
            isApplying = true;

            let panel = document.getElementById('joyn-filter-panel');
            if (!panel) {
                const newPanelApi = buildPanel();
                if (newPanelApi) {
                    panelApi = newPanelApi;
                }
                panel = document.getElementById('joyn-filter-panel');
            }

            if (panel && panelApi && panelApi.applyFilters) {
                panel.style.display = '';
                panelApi.applyFilters();
            }

            setTimeout(() => { isApplying = false; }, 300);
        };

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) {
                        if (node.matches && node.matches(SELECTORS.item)) { schedule(); return; }
                        if (node.querySelector && node.querySelector(SELECTORS.item)) { schedule(); return; }
                    }
                }
                for (const node of mutation.removedNodes) {
                    if (node.nodeType === 1 && node.matches && node.matches(SELECTORS.item)) {
                        schedule();
                        return;
                    }
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        window.addEventListener('popstate', schedule);

        const patchHistory = (method) => {
            const original = history[method];
            history[method] = function (...args) {
                const result = original.apply(this, args);
                schedule();
                return result;
            };
        };
        patchHistory('pushState');
        patchHistory('replaceState');

        schedule();
    }

    function init() {
        const panelApi = buildPanel();
        installAutoReapply(panelApi);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
