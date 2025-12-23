// ==UserScript==
// @name         Sendungverpasst.de - Search Links
// @namespace    https://example.com
// @version      1.0
// @description  Adds search engine links (Google, IMDB, Wikipedia) next to content titles
// @match        https://www.sendungverpasst.de/content/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const SELECTORS = {
        titleElement: '[data-test="full-title"]',
        titleContainer: '.MuiGrid-root.MuiGrid-item.MuiGrid-grid-xs-12'
    };

    function ensureStyles() {
        if (document.getElementById('sv-search-links-style')) return;

        const style = document.createElement('style');
        style.id = 'sv-search-links-style';
        style.textContent = `
.sv-search-links-container {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    flex-wrap: wrap;
}
.sv-search-link {
    display: inline-flex;
    align-items: center;
    padding: 6px 12px;
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    text-decoration: none;
    color: #111;
    font-size: 13px;
    font-weight: 600;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    transition: all 0.15s;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.sv-search-link:hover {
    background: rgba(255, 255, 255, 1);
    border-color: rgba(0, 0, 0, 0.35);
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
    color: #111;
}
.sv-search-link::before {
    content: '🔍';
    margin-right: 6px;
    font-size: 14px;
}
`;
        document.head.appendChild(style);
    }

    function encodeSearchQuery(text) {
        return encodeURIComponent(text);
    }

    function extractYearFromMeta() {
        const metaDescription = document.querySelector('meta[name="description"]');
        if (!metaDescription) return null;

        const content = metaDescription.getAttribute('content');
        if (!content) return null;

        // Split by double line break to get first line
        const firstLine = content.split(/\n\r\n\r/)[0];
        if (!firstLine) return null;

        // Extract 4-digit year from first line
        const yearMatch = firstLine.match(/\b(19\d{2}|20\d{2})\b/);
        return yearMatch ? yearMatch[1] : null;
    }

    function createSearchLinks(title, year) {
        const container = document.createElement('div');
        container.className = 'sv-search-links-container';

        const titleWithYear = year ? `${title} ${year}` : title;
        const searchTerm = year ? `${title} film ${year}` : `${title} film`;

        const searchEngines = [
            {
                name: 'Google',
                url: `https://www.google.com/search?q=${encodeSearchQuery(searchTerm)}`
            },
            {
                name: 'IMDB',
                url: `https://www.imdb.com/find/?q=${encodeSearchQuery(titleWithYear)}`
            },
            {
                name: 'Wikipedia DE',
                url: `https://de.wikipedia.org/w/index.php?search=${encodeSearchQuery(searchTerm)}`
            }
        ];

        for (const engine of searchEngines) {
            const link = document.createElement('a');
            link.className = 'sv-search-link';
            link.href = engine.url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = engine.name;
            link.title = `Suche "${title}" auf ${engine.name}`;
            container.appendChild(link);
        }

        return container;
    }

    function addSearchLinks() {
        // Check if already added
        if (document.querySelector('.sv-search-links-container')) {
            return;
        }

        const titleElement = document.querySelector(SELECTORS.titleElement);
        if (!titleElement) {
            console.log('[Sendungverpasst Search Links] Title element not found');
            return;
        }

        const title = titleElement.textContent.trim();
        if (!title) {
            console.log('[Sendungverpasst Search Links] Empty title');
            return;
        }

        // Find the parent container to append links to
        const container = titleElement.closest(SELECTORS.titleContainer);
        if (!container) {
            console.log('[Sendungverpasst Search Links] Container not found');
            return;
        }

        ensureStyles();
        const year = extractYearFromMeta();
        const searchLinksContainer = createSearchLinks(title, year);
        container.appendChild(searchLinksContainer);

        const logMessage = year 
            ? `[Sendungverpasst Search Links] Added search links for: ${title} (${year})`
            : `[Sendungverpasst Search Links] Added search links for: ${title}`;
        console.log(logMessage);
    }

    function init() {
        // Wait for page load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(addSearchLinks, 500);
            });
        } else {
            setTimeout(addSearchLinks, 500);
        }

        // Watch for dynamic content changes (React SPA)
        const observer = new MutationObserver(() => {
            const titleElement = document.querySelector(SELECTORS.titleElement);
            const existingLinks = document.querySelector('.sv-search-links-container');
            
            if (titleElement && !existingLinks) {
                addSearchLinks();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    init();
})();
