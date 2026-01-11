// ==UserScript==
// @name         Joyn.de - Mediatheken Link Fix 1.2
// @namespace    https://example.com
// @version      1.2
// @description  Replace Joyn Mediatheken links with collection URLs or add #alles anchor.
// @match        https://www.joyn.de/mediatheken
// @match        https://joyn.de/mediatheken
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const adjustedLinks = [];
    let listContainer = null;

    const LINK_MAPPINGS = {
        '/mediatheken/sat1': 'https://www.joyn.de/collection/alles-von-sat.1?id=976975%3A3790ddef147824b00c4d162b1921d175',
        '/mediatheken/prosieben': 'https://www.joyn.de/collection/alles-von-prosieben?id=976976%3Aa0152b86ec7d07f4057689c522b45ac5',
        '/mediatheken/kabel-eins': 'https://www.joyn.de/collection/alles-von-kabel-eins?id=976609%3Ab2be3a74f0cc1edb6d9a4509f0808781',
        '/mediatheken/sixx': 'https://www.joyn.de/collection/alles-von-sixx?id=960511%3A8dcf2ada87fc14d1a57bd7f7983d210e',
        '/mediatheken/sat1-gold': 'https://www.joyn.de/collection/alles-von-sat.1-gold?id=946773%3Ad34c2da4a68d2076588dc78b22414d37',
        '/mediatheken/prosieben-maxx': 'https://www.joyn.de/collection/alles-von-prosieben-maxx?id=946696%3A760d9f081d8e9e872e5ab9051b9f2b1b',
        '/mediatheken/kabel-eins-doku': 'https://www.joyn.de/collection/alles-von-kabel-eins-doku?id=944507%3Af134730948761944680d33cf85afd0f7'
    };

    function normalizePath(pathname) {
        if (!pathname) return '';
        return pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
    }

    function extractPathFromHref(href) {
        if (!href) return '';
        try {
            const url = new URL(href, window.location.origin);
            return normalizePath(url.pathname);
        } catch {
            return '';
        }
    }

    function mapPath(pathname) {
        const normalized = normalizePath(pathname);
        return LINK_MAPPINGS[normalized] || null;
    }

    function addToList(originalHref, newHref, imgSrc) {
        const entry = { original: originalHref, new: newHref, imgSrc: imgSrc };
        if (!adjustedLinks.some(item => item.original === originalHref && item.new === newHref)) {
            adjustedLinks.push(entry);
            updateList();
        }
    }

    function createList() {
        // Prüfe ob Liste bereits existiert
        let existing = document.getElementById('adjusted-links-container');
        if (existing) {
            listContainer = existing;
            return;
        }

        listContainer = document.createElement('div');
        listContainer.id = 'adjusted-links-container';
        listContainer.style.cssText = 'position: fixed; top: 10px; left: 10px; width: 1600px; max-height: 100vh; overflow-y: auto; background: rgba(30, 30, 30, 0.95); border: 1px solid #555; padding: 15px; border-radius: 5px; font-size: 12px; z-index: 99999; box-shadow: 0 2px 10px rgba(0,0,0,0.5); color: #fff;';
        listContainer.innerHTML = '<strong style="display: block; margin-bottom: 10px; color: #fff;">Angepasste Links:</strong><ul id="adjusted-links-list" style="margin: 0; padding: 0; list-style-type: none; display: flex; flex-wrap: wrap; gap: 5px;"></ul>';
        
        document.body.appendChild(listContainer);
    }

    function updateList() {
        createList();
        if (!listContainer) return;

        const list = listContainer.querySelector('#adjusted-links-list');
        if (!list) return;

        list.innerHTML = '';
        for (const entry of adjustedLinks) {
            const li = document.createElement('li');
            li.style.marginBottom = '5px';
            li.style.wordBreak = 'break-all';
            li.style.color = '#fff';
            li.style.display = 'inline-block';
            li.style.marginRight = '5px';
            
            const link = document.createElement('a');
            link.href = entry.new;
            link.target = '_blank';
            link.style.cssText = 'display: inline-block;';
            link.title = entry.new;
            
            if (entry.imgSrc) {
                const img = document.createElement('img');
                img.src = entry.imgSrc;
                img.style.cssText = 'width: 80px; height: auto; display: block; border-radius: 4px; transition: transform 0.2s;';
                img.onmouseover = function() { this.style.transform = 'scale(1.1)'; };
                img.onmouseout = function() { this.style.transform = 'scale(1)'; };
                link.appendChild(img);
            } else {
                link.style.cssText += 'color: #4da6ff; text-decoration: none;';
                link.textContent = entry.new;
                link.onmouseover = function() { this.style.textDecoration = 'underline'; };
                link.onmouseout = function() { this.style.textDecoration = 'none'; };
            }
            
            li.appendChild(link);
            list.appendChild(li);
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function rewriteAnchors(root) {
        if (!root || !root.querySelectorAll) return;
        const anchors = root.querySelectorAll('a[href*="/mediatheken/"], a[href*="/channels/"]');
        for (const anchor of anchors) {
            const href = anchor.getAttribute('href') || '';
            if (!href.includes('/mediatheken/') && !href.includes('/channels/')) continue;

            const pathname = extractPathFromHref(href);
            if (!pathname) continue;

            // Find icon image in the anchor
            const img = anchor.querySelector('img');
            const imgSrc = img ? img.src : null;

            // Check if there's a specific mapping for this path
            const mappedUrl = mapPath(pathname);
            if (mappedUrl) {
                if (anchor.href !== mappedUrl) {
                    const oldHref = anchor.href;
                    anchor.href = mappedUrl;
                    addToList(oldHref, mappedUrl, imgSrc);
                }
            } else if (pathname.startsWith('/mediatheken/') || pathname.startsWith('/channels/')) {
                // For all other /mediatheken/* and /channels/* links, add #alles if not already present
                if (!href.includes('#alles') && !anchor.hash) {
                    const oldHref = anchor.href;
                    anchor.href = href + '#alles';
                    addToList(oldHref, anchor.href, imgSrc);
                }
            }
        }
    }

    function handleClickNavigation(event) {
        const target = event.target;
        if (!target || !target.closest) return;

        const anchor = target.closest('a[href]');
        if (!anchor) return;

        const href = anchor.getAttribute('href') || '';
        if (!href.includes('/mediatheken/') && !href.includes('/channels/')) return;

        const pathname = extractPathFromHref(href);
        const mappedUrl = mapPath(pathname);
        if (!mappedUrl) return;

        // Override Joyn's client-side routing that still uses the original path
        event.preventDefault();
        event.stopImmediatePropagation();
        window.location.href = mappedUrl;
    }

    function enforceMapping() {
        const mapped = mapPath(window.location.pathname);
        if (mapped && window.location.href !== mapped) {
            window.location.replace(mapped);
        }
    }

    function handleMutations(mutations) {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== 1) continue;
                if (node.matches && node.matches('a')) {
                    rewriteAnchors(node);
                } else if (node.querySelector) {
                    rewriteAnchors(node);
                }
            }
        }
    }

    function init() {
        rewriteAnchors(document);

        const observer = new MutationObserver(handleMutations);
        observer.observe(document.body, { childList: true, subtree: true });

        window.addEventListener('pageshow', () => rewriteAnchors(document));
        document.addEventListener('click', handleClickNavigation, true);
        window.addEventListener('popstate', enforceMapping);

        const { pushState, replaceState } = window.history;
        window.history.pushState = function (...args) {
            const ret = pushState.apply(this, args);
            enforceMapping();
            return ret;
        };
        window.history.replaceState = function (...args) {
            const ret = replaceState.apply(this, args);
            enforceMapping();
            return ret;
        };

        enforceMapping();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
