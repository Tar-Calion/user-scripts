// ==UserScript==
// @name         Joyn.de - Mediatheken Link Fix 1.1
// @namespace    https://example.com
// @version      1.1
// @description  Replace Joyn Mediatheken links with collection URLs or add #alles anchor.
// @match        https://www.joyn.de/mediatheken*
// @match        https://joyn.de/mediatheken*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const LINK_MAPPINGS = {
        '/mediatheken/sat1': 'https://www.joyn.de/collection/alles-von-sat.1?id=976975%3A3790ddef147824b00c4d162b1921d175',
        '/mediatheken/prosieben': 'https://www.joyn.de/collection/alles-von-prosieben?id=976976%3Aa0152b86ec7d07f4057689c522b45ac5',
        '/mediatheken/kabel-eins': 'https://www.joyn.de/collection/alles-von-kabel-eins?id=976609%3Ab2be3a74f0cc1edb6d9a4509f0808781',
        '/mediatheken/sixx': 'https://www.joyn.de/collection/alles-von-sixx?id=960511%3A8dcf2ada87fc14d1a57bd7f7983d210e',
        '/mediatheken/sat1-gold': 'https://www.joyn.de/collection/alles-von-sat.1-gold?id=946773%3Ad34c2da4a68d2076588dc78b22414d37',
        '/mediatheken/prosieben-maxx': 'https://www.joyn.de/collection/alles-von-prosieben-maxx?id=946696%3A760d9f081d8e9e872e5ab9051b9f2b1b',
        '/mediatheken/kabel-eins-doku': 'https://www.joyn.de/collection/alles-von-kabel-eins-doku?id=944507%3Af134730948761944680d33cf85afd0f7'
    };

    function extractPathFromHref(href) {
        if (!href) return '';
        try {
            const url = new URL(href, window.location.origin);
            return url.pathname;
        } catch {
            return '';
        }
    }

    function rewriteAnchors(root) {
        if (!root || !root.querySelectorAll) return;
        const anchors = root.querySelectorAll('a[href*="/mediatheken/"], a[href*="/channels/"]');
        for (const anchor of anchors) {
            const href = anchor.getAttribute('href') || '';
            if (!href.includes('/mediatheken/') && !href.includes('/channels/')) continue;

            const pathname = extractPathFromHref(href);
            if (!pathname) continue;

            // Check if there's a specific mapping for this path
            const mappedUrl = LINK_MAPPINGS[pathname];
            if (mappedUrl) {
                if (anchor.href !== mappedUrl) {
                    anchor.href = mappedUrl;
                }
            } else if (pathname.startsWith('/mediatheken/') || pathname.startsWith('/channels/')) {
                // For all other /mediatheken/* and /channels/* links, add #alles if not already present
                if (!href.includes('#alles') && !anchor.hash) {
                    anchor.href = href + '#alles';
                }
            }
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
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
