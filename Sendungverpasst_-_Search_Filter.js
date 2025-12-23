// ==UserScript==
// @name         Sendungverpasst.de - Search Filter 1.1
// @namespace    https://example.com
// @version      1.1
// @description  Adds a collapsible UI to filter search results by title prefixes and channels.
// @match        https://www.sendungverpasst.de/search*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEYS = {
        prefixes: 'sv_filter_prefixes',
        channels: 'sv_filter_channels',
        panelOpen: 'sv_filter_panel_open'
    };

    const SELECTORS = {
        resultCard: '[data-test="search-result"]',
        title: 'h3',
        meta: 'p'
    };

    const CLASSNAMES = {
        hidden: 'sv-filter-hidden',
        root: 'sv-filter-root'
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

    function getTitleFromCard(card) {
        const titleEl = card.querySelector(SELECTORS.title);
        return titleEl ? titleEl.textContent.trim() : '';
    }

    function getChannelFromCard(card) {
        // Example meta: "18.12.2025 | ZDF". We take the last pipe part.
        const metaEls = Array.from(card.querySelectorAll(SELECTORS.meta));
        for (const metaEl of metaEls) {
            const text = metaEl.textContent.replace(/\s+/g, ' ').trim();
            if (!text.includes('|')) continue;
            const parts = text.split('|').map(p => p.trim()).filter(Boolean);
            if (parts.length >= 2) {
                return parts[parts.length - 1];
            }
        }
        return '';
    }

    function loadSettings() {
        return {
            prefixesText: localStorage.getItem(STORAGE_KEYS.prefixes) ?? '',
            channelsText: localStorage.getItem(STORAGE_KEYS.channels) ?? '',
            panelOpen: (localStorage.getItem(STORAGE_KEYS.panelOpen) ?? 'true') === 'true'
        };
    }

    function saveSettings(prefixesText, channelsText, panelOpen) {
        localStorage.setItem(STORAGE_KEYS.prefixes, prefixesText ?? '');
        localStorage.setItem(STORAGE_KEYS.channels, channelsText ?? '');
        localStorage.setItem(STORAGE_KEYS.panelOpen, panelOpen ? 'true' : 'false');
    }

    function ensureStyles() {
        if (document.getElementById('sv-filter-style')) return;

        const style = document.createElement('style');
        style.id = 'sv-filter-style';
        style.textContent = `
.${CLASSNAMES.hidden} { display: none !important; }
.${CLASSNAMES.root} {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 2147483647;
  width: 340px;
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
.${CLASSNAMES.root} .sv-filter-body {
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
  min-height: 74px;
  resize: vertical;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,0.25);
  font-size: 12px;
}
.${CLASSNAMES.root} .sv-filter-row {
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
.${CLASSNAMES.root} .sv-filter-status {
  font-size: 12px;
  opacity: 0.85;
  margin-top: 10px;
  line-height: 1.35;
}
.${CLASSNAMES.root} .sv-filter-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(0,0,0,0.08);
  font-size: 12px;
  margin-left: 8px;
  font-weight: 600;
}
.${CLASSNAMES.root} .sv-filter-tooltip {
  position: fixed;
    max-height: 280px;
    overflow: auto;
    background: white;
    border: 1px solid rgba(0,0,0,0.12);
    box-shadow: 0 6px 20px rgba(0,0,0,0.16);
    padding: 8px;
    border-radius: 8px;
    font-size: 12px;
    z-index: 2147483648;
    min-width: 200px;
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

    function buildPanel() {
        if (document.getElementById('sv-filter-panel')) return null;

        ensureStyles();

        const settings = loadSettings();

        const root = document.createElement('div');
        root.id = 'sv-filter-panel';
        root.className = CLASSNAMES.root;

        const details = document.createElement('details');
        details.open = !!settings.panelOpen;

        const summary = document.createElement('summary');
        summary.textContent = 'Filter';

        const pill = document.createElement('span');
        pill.className = 'sv-filter-pill';
        pill.textContent = '0/0';
        pill.title = '';
        summary.appendChild(pill);

        const body = document.createElement('div');
        body.className = 'sv-filter-body';

        const prefixesLabel = document.createElement('label');
        prefixesLabel.textContent = '1) Titel-Präfixe ausblenden (eine pro Zeile, optional Komma)';

        const prefixesTextarea = document.createElement('textarea');
        prefixesTextarea.placeholder = 'Beispiel:\nDer junge Inspektor Morse:';
        prefixesTextarea.value = settings.prefixesText;

        const channelsLabel = document.createElement('label');
        channelsLabel.textContent = '2) Sender ausblenden (eine pro Zeile, optional Komma)';

        const channelsTextarea = document.createElement('textarea');
        channelsTextarea.placeholder = 'Beispiel:\nZDF\nARD';
        channelsTextarea.value = settings.channelsText;

        const buttonRow = document.createElement('div');
        buttonRow.className = 'sv-filter-row';

        const applyButton = document.createElement('button');
        applyButton.type = 'button';
        applyButton.textContent = 'Anwenden';

        const resetButton = document.createElement('button');
        resetButton.type = 'button';
        resetButton.textContent = 'Zurücksetzen';

        buttonRow.appendChild(applyButton);
        buttonRow.appendChild(resetButton);

        const status = document.createElement('div');
        status.className = 'sv-filter-status';
        status.textContent = 'Bereit.';

        // tooltip element for listing hidden items
        const tooltip = document.createElement('div');
        tooltip.className = 'sv-filter-tooltip';
        tooltip.style.display = 'none';
        tooltip.setAttribute('aria-hidden', 'true');
        document.body.appendChild(tooltip);

        body.appendChild(prefixesLabel);
        body.appendChild(prefixesTextarea);
        body.appendChild(channelsLabel);
        body.appendChild(channelsTextarea);
        body.appendChild(buttonRow);
        body.appendChild(status);

        details.appendChild(summary);
        details.appendChild(body);
        root.appendChild(details);
        document.body.appendChild(root);

        const getCurrentFilters = () => ({
            prefixes: parseList(prefixesTextarea.value),
            channels: parseList(channelsTextarea.value)
        });

        const updateStatus = (filteredCount, totalCount, hiddenList) => {
            pill.textContent = `${filteredCount}/${totalCount}`;
            const pCount = parseList(prefixesTextarea.value).length;
            const cCount = parseList(channelsTextarea.value).length;
            status.textContent = `Ausgeblendet: ${filteredCount} von ${totalCount} (Präfixe: ${pCount}, Sender: ${cCount})`;

            // update tooltip content (join with line breaks)
            if (hiddenList && hiddenList.length > 0) {
                pill.title = hiddenList.map(item => `${item.reason} ${item.title}`).join('\n');
                tooltip.textContent = '';
                for (const item of hiddenList) {
                    const div = document.createElement('div');
                    div.textContent = `${item.reason} ${item.title}`;
                    tooltip.appendChild(div);
                }
            } else {
                pill.title = '';
                tooltip.textContent = '';
                tooltip.style.display = 'none';
            }
        };

        const applyFilters = () => {
            const filters = getCurrentFilters();
            saveSettings(prefixesTextarea.value, channelsTextarea.value, details.open);
            const counts = filterResults(filters);
            updateStatus(counts.filtered, counts.total, counts.hiddenTitles);
        };

        const applyFiltersDebounced = debounce(applyFilters, 200);

        applyButton.addEventListener('click', applyFilters);
        resetButton.addEventListener('click', () => {
            prefixesTextarea.value = '';
            channelsTextarea.value = '';
            applyFilters();
        });

        prefixesTextarea.addEventListener('input', applyFiltersDebounced);
        channelsTextarea.addEventListener('input', applyFiltersDebounced);

        details.addEventListener('toggle', () => {
            saveSettings(prefixesTextarea.value, channelsTextarea.value, details.open);
        });

        // Initial apply
        setTimeout(applyFilters, 0);

        // show tooltip on hover over pill
        let tooltipTimeout;
        pill.addEventListener('mouseenter', (e) => {
            clearTimeout(tooltipTimeout);
            if (!tooltip.children.length) return;
            tooltip.style.display = 'block';
            tooltip.setAttribute('aria-hidden', 'false');
            // position tooltip under pill (fixed positioning)
            const rect = pill.getBoundingClientRect();
            tooltip.style.left = `${rect.left}px`;
            tooltip.style.top = `${rect.bottom + 6}px`;
        });
        pill.addEventListener('mouseleave', () => {
            tooltipTimeout = setTimeout(() => {
                tooltip.style.display = 'none';
                tooltip.setAttribute('aria-hidden', 'true');
            }, 180);
        });

        return { applyFilters, updateStatus };
    }

    function matchesAnyPrefix(title, prefixes) {
        const t = normalize(title);
        for (const prefix of prefixes) {
            const p = normalize(prefix);
            if (!p) continue;
            if (t.startsWith(p)) return true;
        }
        return false;
    }

    function matchesAnyChannel(channel, channels) {
        const c = normalize(channel);
        for (const blocked of channels) {
            const b = normalize(blocked);
            if (!b) continue;
            if (c === b) return true;
        }
        return false;
    }

    function filterResults(filters) {
        const cards = Array.from(document.querySelectorAll(SELECTORS.resultCard));
        let filtered = 0;
        const hiddenTitles = [];

        for (const card of cards) {
            const title = getTitleFromCard(card);
            const channel = getChannelFromCard(card);

            const matchesPrefix = filters.prefixes.length > 0 && matchesAnyPrefix(title, filters.prefixes);
            const matchesChannel = filters.channels.length > 0 && matchesAnyChannel(channel, filters.channels);
            const shouldHide = matchesPrefix || matchesChannel;

            if (shouldHide) {
                if (!card.classList.contains(CLASSNAMES.hidden)) {
                    card.classList.add(CLASSNAMES.hidden);
                }
                filtered++;
                const reason = matchesPrefix ? '(Präfix)' : '(Sender)';
                hiddenTitles.push({ title: title || '(kein Titel)', reason });
            } else {
                card.classList.remove(CLASSNAMES.hidden);
            }
        }

        return { filtered, total: cards.length, hiddenTitles };
    }

    function installAutoReapply(panelApi) {
        let scheduled = false;

        const reapply = () => {
            scheduled = false;
            const settings = loadSettings();
            const filters = {
                prefixes: parseList(settings.prefixesText),
                channels: parseList(settings.channelsText)
            };
            const counts = filterResults(filters);
            if (panelApi && panelApi.updateStatus) {
                panelApi.updateStatus(counts.filtered, counts.total, counts.hiddenTitles);
            }
        };

        const schedule = () => {
            if (scheduled) return;
            scheduled = true;
            setTimeout(reapply, 150);
        };

        // React SPA / pagination / lazy-load changes
        const observer = new MutationObserver(() => schedule());
        observer.observe(document.body, { childList: true, subtree: true });

        // Back/forward navigation
        window.addEventListener('popstate', schedule);

        // Some SPAs use pushState/replaceState without popstate
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

        // Initial
        schedule();
    }

    function init() {
        const panelApi = buildPanel();
        installAutoReapply(panelApi);
    }

    // Wait until DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
