// ==UserScript==
// @name         SCP Wiki - Show My Rating
// @namespace    https://example.com
// @version      2.0
// @description  Displays your rating of an SCP-Wiki page
// @match        https://scp-wiki.wikidot.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let myUsername = '';

    let ratingDisplay;

    /**
     * Create (once) or update the display in in the first page-rate widget
     */
    function updateDisplay(message) {
        if (!ratingDisplay) {
            ratingDisplay = document.createElement('span');
            ratingDisplay.id = 'my-user-rating-display';
            ratingDisplay.style.marginRight = '5px';
            ratingDisplay.style.borderRadius = '5px';
            ratingDisplay.classList.add('rate-points');
        }
        ratingDisplay.textContent = message;

        const rateWidget = document.querySelector('.page-rate-widget-box');
        if (rateWidget) {
            if (!rateWidget.contains(ratingDisplay)) {
                rateWidget.insertBefore(ratingDisplay, rateWidget.firstChild);
            }
        } else {
            console.log('[SCP Auto-Check My Rating] .page-rate-widget-box not found. Cannot place rating display');
        }
    }

    // Start after window load
    window.addEventListener('load', function() {
        console.log('[SCP Auto-Check My Rating] Page loaded.');

        // Attempt to detect the user's login name from <span class="printuser">...
        const userSpan = document.querySelector('span.printuser');
        if (!userSpan) {
            // User is not logged in
            console.log('[SCP Auto-Check My Rating] User not logged in (no .printuser found).');
            updateDisplay('You are not logged in');
            return; // Stop script here
        }

        // If we find a userSpan, try to get the username from the <img alt="..."> or the span text
        const link = userSpan.querySelector('a');
        const img = link ? link.querySelector('img') : null;
        if (img && img.alt) {
            myUsername = img.alt.trim();
        }

        console.log('[SCP Auto-Check My Rating] Detected username =', myUsername);

        updateDisplay('Checking your rating...');

        fetchWhoRatedDirectly();
    });


    // Fetch "who rated" data from the server
    function fetchWhoRatedDirectly() {
		// Grab the pageId from the global WIKIREQUEST object (if it exists)
		if (!window.WIKIREQUEST || !window.WIKIREQUEST.info || !window.WIKIREQUEST.info.pageId) {
			console.log('[Direct SCP Rating Fetch] Could not find WIKIREQUEST.info.pageId. Exiting.');
			return;
		}
		const pageId = window.WIKIREQUEST.info.pageId;
		console.log('[SCP Auto-Check My Rating] pageId =', pageId);

        // retrieve the wikidot_token7 from cookies
        const wikiToken = getCookieValue('wikidot_token7');
        if (!wikiToken) {
            console.log('[SCP Auto-Check My Rating] No wikidot_token7 cookie found, cannot fetch "who rated".');
            updateDisplay('No wikidot_token7 cookie found.');
            return;
        }

        // build the POST data, including moduleName in the body
        const postData = new URLSearchParams({
            moduleName: 'pagerate/WhoRatedPageModule',
            pageId: pageId,
            wikidot_token7: wikiToken
        });

        fetch('/ajax-module-connector.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: postData.toString()
        })
        .then(response => response.json())
        .then(json => {
            if (json.status !== 'ok' || !json.body) {
                console.log('[SCP Auto-Check My Rating] Response not OK or missing body:', json);
                updateDisplay('Could not load who-rated data.');
                return;
            }

            // parse the returned HTML to find user's rating
            parseUserRatingFromHTML(json.body);
        })
        .catch(err => {
            console.error('[SCP Auto-Check My Rating] Fetch error:', err);
            updateDisplay('Error fetching who-rated data. See console.');
        });
    }

    // Parse the returned HTML snippet, look for your username, update display
    function parseUserRatingFromHTML(rawHtml) {
        // create a temporary document from the returned HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, 'text/html');

        const allUsers = doc.querySelectorAll('span.printuser.avatarhover');
        let myRating = null;

        for (const userSpan of allUsers) {
            if (userSpan.textContent.includes(myUsername)) {
                console.log('[SCP Auto-Check My Rating] Found userSpan for:', myUsername);
                const signSpan = userSpan.nextElementSibling; // may contain '+', '-'
                if (signSpan) {
                    const signText = signSpan.textContent.trim();
                    if (signText === '+') {
                        myRating = '+';
                    } else if (signText === '-') {
                        myRating = '-';
                    }
                }
                break;
            }
        }

        if (myRating === '+') {
            updateDisplay('Your rating: + ');
            console.log('[SCP Auto-Check My Rating] User rated +.');
        } else if (myRating === '-') {
            updateDisplay('Your rating: - ');
            console.log('[SCP Auto-Check My Rating] User rated -.');
        } else {
            updateDisplay('You have not rated this page');
            console.log('[SCP Auto-Check My Rating] User not found or did not rate.');
        }

    }

    // Helper: read a cookie by name
    function getCookieValue(name) {
        const matches = document.cookie.match(new RegExp(
            '(?:^|; )' + name.replace(/([.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'
        ));
        return matches ? decodeURIComponent(matches[1]) : null;
    }

})();
