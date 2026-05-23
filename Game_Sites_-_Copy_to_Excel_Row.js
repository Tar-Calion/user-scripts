// ==UserScript==
// @name         Steam + IndieGala - Copy to Excel Row
// @namespace    https://github.com/Tar-Calion/user-scripts
// @version      1.2
// @description  Adds a button on Steam and IndieGala giveaway pages to copy game info as a tab-separated row for Excel (Titel, Genre, Entwickler, Konten, Erwerbsdatum, Quelle, Preis)
// @match        https://store.steampowered.com/app/*
// @match        https://freebies.indiegala.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function getToday() {
        const d = new Date();
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}.${month}.${year}`;
    }

    function normalizeWhitespace(value) {
        return value.replace(/\s+/g, ' ').trim();
    }

    function extractSteamData() {
        const title = document.getElementById('appHubAppName')?.textContent?.trim() ?? '';

        // First genre listed under #genresAndManufacturer
        const genreSpan = document.querySelector('#genresAndManufacturer span[data-panel]');
        const genre = genreSpan?.querySelector('a')?.textContent?.trim() ?? '';

        // Developer from the sidebar details block
        const developer = document.getElementById('developers_list')?.querySelector('a')?.textContent?.trim() ?? '';

        return {
            title,
            genre,
            developer,
            account: 'Steam',
            date: getToday(),
            source: 'Steam Giveaway',
            price: '0',
            logPrefix: 'Steam Excel'
        };
    }

    function getIndieGalaAsideBlock(label) {
        const blocks = document.querySelectorAll('.developer-product-contents-aside-block');

        for (const block of blocks) {
            const title = normalizeWhitespace(block.querySelector('.developer-product-contents-aside-title')?.textContent ?? '');
            if (title.startsWith(label)) {
                return block;
            }
        }

        return null;
    }

    function getIndieGalaAsideList(label) {
        const block = getIndieGalaAsideBlock(label);
        if (!block) return [];

        return Array.from(block.querySelectorAll('.developer-product-contents-aside-text li, .developer-product-contents-aside-text-tags span'))
            .map((item) => normalizeWhitespace(item.textContent.replace(/^#/, '')))
            .filter(Boolean);
    }

    function extractIndieGalaData() {
        const title = normalizeWhitespace(document.querySelector('.developer-product-title')?.textContent ?? '');
        const categories = getIndieGalaAsideList('Categories');

        return {
            title,
            genre: categories[0] ?? '',
            developer: '',
            account: 'Indie Gala DL',
            date: getToday(),
            source: 'Indie Gala Giveaway',
            price: '0',
            logPrefix: 'IndieGala Excel'
        };
    }

    function extractData() {
        if (location.hostname === 'store.steampowered.com') {
            return extractSteamData();
        }

        if (location.hostname === 'freebies.indiegala.com') {
            return extractIndieGalaData();
        }

        return null;
    }

    function copyToClipboard(text, spanEl, logPrefix) {
        const originalLabel = spanEl.textContent;
        const restore = () => { spanEl.textContent = originalLabel; };

        const onSuccess = () => {
            spanEl.textContent = '✅ Copied!';
            setTimeout(restore, 2000);
        };

        navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
            // Fallback for browsers that block clipboard API
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            try {
                document.execCommand('copy');
                onSuccess();
            } catch (err) {
                console.error(`[${logPrefix}] Clipboard copy failed:`, err);
                spanEl.textContent = '❌ Failed';
                setTimeout(restore, 2000);
            }
            document.body.removeChild(ta);
        });
    }

    function buildSteamButton(wrapper, btn, span) {
        wrapper.style.flexGrow = '0';
        btn.className = 'btnv6_blue_hoverfade btn_medium';
        span.textContent = '📋 Excel';

        const shareBtn = document.getElementById('shareBtn');
        if (shareBtn) {
            shareBtn.insertAdjacentElement('afterend', wrapper);
        } else {
            wrapper.style.cssText = 'position:fixed;top:12px;right:12px;z-index:9999;';
            document.body.appendChild(wrapper);
        }
    }

    function buildIndieGalaButton(wrapper, btn, span) {
        wrapper.style.display = 'inline-block';
        wrapper.style.marginLeft = '10px';

        btn.className = 'developer-product-download-button-login tcf-general-rc tcf-secondary-buttons-fc tcf-secondary-buttons-b tcf-secondary-buttons-ft';
        btn.style.display = 'block';
        btn.style.textAlign = 'center';
        span.textContent = 'Copy Excel row';

        const voteLinks = Array.from(document.querySelectorAll('.developer-product-rating-vote'));
        const voteLink = voteLinks.find((link) => {
            const style = window.getComputedStyle(link);
            return style.display !== 'none' && style.visibility !== 'hidden' && link.offsetParent !== null;
        }) ?? voteLinks[0];

        if (voteLink) {
            voteLink.insertAdjacentElement('afterend', wrapper);
        } else {
            wrapper.style.cssText = 'position:fixed;top:12px;right:12px;z-index:9999;';
            document.body.appendChild(wrapper);
        }
    }

    function createButton() {
        if (document.getElementById('copy_excel_row_btn')) return;

        const data = extractData();
        if (!data || !data.title) return;

        const wrapper = document.createElement('div');

        const btn = document.createElement('a');
        btn.id = 'copy_excel_row_btn';
        btn.href = 'javascript:void(0)';

        const span = document.createElement('span');
        btn.appendChild(span);
        wrapper.appendChild(btn);

        btn.addEventListener('click', () => {
            const latestData = extractData();
            if (!latestData) return;

            const row = [
                latestData.title,
                latestData.genre,
                latestData.developer,
                latestData.account,
                latestData.date,
                latestData.source,
                latestData.price
            ].join('\t');

            console.log(`[${latestData.logPrefix}] Row:`, row);
            copyToClipboard(row, span, latestData.logPrefix);
        });

        if (location.hostname === 'store.steampowered.com') {
            buildSteamButton(wrapper, btn, span);
        } else if (location.hostname === 'freebies.indiegala.com') {
            buildIndieGalaButton(wrapper, btn, span);
        } else {
            wrapper.style.cssText = 'position:fixed;top:12px;right:12px;z-index:9999;';
            document.body.appendChild(wrapper);
        }
    }

    if (document.readyState === 'complete') {
        createButton();
    } else {
        window.addEventListener('load', createButton);
    }
})();
