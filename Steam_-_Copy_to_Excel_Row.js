// ==UserScript==
// @name         Steam - Copy to Excel Row
// @namespace    https://store.steampowered.com
// @version      1.1
// @description  Adds a button on Steam game pages to copy game info as a tab-separated row for Excel (Titel, Genre, Entwickler, Konten, Erwerbsdatum, Quelle, Preis)
// @match        https://store.steampowered.com/app/*
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

    function extractData() {
        const title = document.getElementById('appHubAppName')?.textContent?.trim() ?? '';

        // First genre listed under #genresAndManufacturer
        const genreSpan = document.querySelector('#genresAndManufacturer span[data-panel]');
        const genre = genreSpan?.querySelector('a')?.textContent?.trim() ?? '';

        // Developer from the sidebar details block
        const developer = document.getElementById('developers_list')?.querySelector('a')?.textContent?.trim() ?? '';

        return { title, genre, developer };
    }

    function copyToClipboard(text, spanEl) {
        const restore = () => { spanEl.textContent = '📋 Excel'; };

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
                console.error('[Steam Excel] Clipboard copy failed:', err);
                spanEl.textContent = '❌ Failed';
                setTimeout(restore, 2000);
            }
            document.body.removeChild(ta);
        });
    }

    function createButton() {
        if (document.getElementById('steam_excel_copy_btn')) return;

        // Wrap in same container style as #shareBtn so it fits in the flex row
        const wrapper = document.createElement('div');
        wrapper.style.flexGrow = '0';

        const btn = document.createElement('a');
        btn.id = 'steam_excel_copy_btn';
        btn.href = 'javascript:void(0)';
        btn.className = 'btnv6_blue_hoverfade btn_medium';

        const span = document.createElement('span');
        span.textContent = '📋 Excel';
        btn.appendChild(span);
        wrapper.appendChild(btn);

        btn.addEventListener('click', () => {
            const { title, genre, developer } = extractData();
            const row = [title, genre, developer, 'Steam', getToday(), 'Steam Giveaway', '0'].join('\t');
            console.log('[Steam Excel] Row:', row);
            copyToClipboard(row, span);
        });

        // Insert after the "Link teilen" / share button (#shareBtn)
        const shareBtn = document.getElementById('shareBtn');
        if (shareBtn) {
            shareBtn.insertAdjacentElement('afterend', wrapper);
        } else {
            // Fallback: fixed position if share button not found
            wrapper.style.cssText = 'position:fixed;top:12px;right:12px;z-index:9999;';
            document.body.appendChild(wrapper);
        }
    }

    window.addEventListener('load', createButton);
})();
