// ==UserScript==
// @name         Steam - Copy to Excel Row
// @namespace    https://store.steampowered.com
// @version      1.0
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

    function copyToClipboard(text, btn) {
        const restore = () => {
            btn.textContent = '📋 Copy to Excel';
            btn.style.background = '#4c6b22';
        };

        const onSuccess = () => {
            btn.textContent = '✅ Copied!';
            btn.style.background = '#2a6b3a';
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
                btn.textContent = '❌ Failed';
                setTimeout(restore, 2000);
            }
            document.body.removeChild(ta);
        });
    }

    function createButton() {
        if (document.getElementById('steam_excel_copy_btn')) return;

        const btn = document.createElement('button');
        btn.id = 'steam_excel_copy_btn';
        btn.textContent = '📋 Copy to Excel';
        btn.style.cssText = `
            position: fixed;
            top: 12px;
            right: 12px;
            z-index: 9999;
            background: #4c6b22;
            color: #c6d4df;
            border: 1px solid #8f98a0;
            padding: 8px 14px;
            font-size: 13px;
            font-family: Arial, sans-serif;
            cursor: pointer;
            border-radius: 3px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.5);
        `;

        btn.addEventListener('mouseenter', () => { btn.style.background = '#5c7a28'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = '#4c6b22'; });

        btn.addEventListener('click', () => {
            const { title, genre, developer } = extractData();
            const row = [title, genre, developer, 'Steam', getToday(), 'Steam Giveaway', '0'].join('\t');
            console.log('[Steam Excel] Row:', row);
            copyToClipboard(row, btn);
        });

        document.body.appendChild(btn);
    }

    window.addEventListener('load', createButton);
})();
