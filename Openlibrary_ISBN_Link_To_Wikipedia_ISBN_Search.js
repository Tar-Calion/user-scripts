// ==UserScript==
// @name         OpenLibrary ISBN -> Wikipedia BookSources
// @namespace    vm-openlibrary-isbn
// @version      1.0
// @description  Link ISBNs on OpenLibrary to Wikipedia BookSources
// @match        https://openlibrary.org/books/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Find all text nodes containing ISBNs
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT
    );

    // ISBN-10 or ISBN-13
    const isbnRegex = /\b(?:97[89][-\s]?)?\d[-\s]?\d{2,5}[-\s]?\d{2,7}[-\s]?\d{1,7}[-\s]?[\dX]\b/g;

    const textNodes = [];

    while (walker.nextNode()) {
        const node = walker.currentNode;

        // Ignore script/style
        if (
            node.parentElement &&
            !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.parentElement.tagName)
        ) {
            if (isbnRegex.test(node.nodeValue)) {
                textNodes.push(node);
            }
        }
    }

    for (const node of textNodes) {
        const frag = document.createDocumentFragment();

        let lastIndex = 0;
        const text = node.nodeValue;

        text.replace(isbnRegex, (match, offset) => {
            // Text before ISBN
            frag.appendChild(
                document.createTextNode(text.slice(lastIndex, offset))
            );

            // Normalize ISBN for URL
            const cleanISBN = match.replace(/[-\s]/g, '');

            const link = document.createElement('a');
            link.href =
                'https://en.wikipedia.org/wiki/Special:BookSources?isbn=' +
                cleanISBN;

            link.textContent = match;
            link.target = '_blank';
            link.style.margin = '0 2px';

            frag.appendChild(link);

            lastIndex = offset + match.length;
        });

        // Remaining text
        frag.appendChild(
            document.createTextNode(text.slice(lastIndex))
        );

        node.parentNode.replaceChild(frag, node);
    }
})();