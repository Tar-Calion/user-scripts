// ==UserScript==
// @name         Joyn.de - Mediatheken Link Fix 2.0
// @namespace    https://example.com
// @version      2.0
// @description  Replace Joyn Mediatheken links with collection URLs or add #alles anchor. Display channels with descriptions in grid layout.
// @match        https://www.joyn.de/mediatheken
// @match        https://joyn.de/mediatheken
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const adjustedLinks = [];
    let ignoredSenders = [];
    let listContainer = null;

    // localStorage key for ignored senders
    const IGNORED_SENDERS_KEY = 'joyn-ignored-senders';

    function loadIgnoredSenders() {
        try {
            const stored = localStorage.getItem(IGNORED_SENDERS_KEY);
            if (stored) {
                ignoredSenders = JSON.parse(stored);
            }
        } catch (e) {
            console.log('[Joyn Link Fix] Error loading ignored senders:', e);
        }
    }

    function saveIgnoredSenders() {
        try {
            localStorage.setItem(IGNORED_SENDERS_KEY, JSON.stringify(ignoredSenders));
        } catch (e) {
            console.log('[Joyn Link Fix] Error saving ignored senders:', e);
        }
    }

    function isIgnored(path) {
        return ignoredSenders.includes(path);
    }

    function ignoreSender(path) {
        if (!isIgnored(path)) {
            ignoredSenders.push(path);
            saveIgnoredSenders();
            updateList();
        }
    }

    function unignoreSender(path) {
        const index = ignoredSenders.indexOf(path);
        if (index > -1) {
            ignoredSenders.splice(index, 1);
            saveIgnoredSenders();
            updateList();
        }
    }

    const LINK_MAPPINGS = {
        '/mediatheken/sat1': 'https://www.joyn.de/collection/alles-von-sat.1?id=976975%3A3790ddef147824b00c4d162b1921d175',
        '/mediatheken/prosieben': 'https://www.joyn.de/collection/alles-von-prosieben?id=976976%3Aa0152b86ec7d07f4057689c522b45ac5',
        '/mediatheken/kabel-eins': 'https://www.joyn.de/collection/alles-von-kabel-eins?id=976609%3Ab2be3a74f0cc1edb6d9a4509f0808781',
        '/mediatheken/sixx': 'https://www.joyn.de/collection/alles-von-sixx?id=960511%3A8dcf2ada87fc14d1a57bd7f7983d210e',
        '/mediatheken/sat1-gold': 'https://www.joyn.de/collection/alles-von-sat.1-gold?id=946773%3Ad34c2da4a68d2076588dc78b22414d37',
        '/mediatheken/prosieben-maxx': 'https://www.joyn.de/collection/alles-von-prosieben-maxx?id=946696%3A760d9f081d8e9e872e5ab9051b9f2b1b',
        '/mediatheken/kabel-eins-doku': 'https://www.joyn.de/collection/alles-von-kabel-eins-doku?id=944507%3Af134730948761944680d33cf85afd0f7'
    };

    const CHANNEL_DESCRIPTIONS = {
        '/mediatheken/sat1': 'SAT.1: Mainstream-Vollprogramm. Bunte Mischung aus Frühstücksfernsehen, Scripted Reality, Shows und deutscher Fiction. Massentauglich, variabler Anspruch (teils seicht, teils hochwertiges Entertainment).',
        '/mediatheken/prosieben': 'ProSieben: Hollywood & Shows. Fokus auf US-Blockbuster, Sitcoms und große Show-Events (z.B. Joko & Klaas). Junges Publikum, hochwertige Produktion, "Popcorn-TV".',
        '/mediatheken/kabel-eins': 'Kabel Eins: Klassiker & Factual. Kult-Filme, Serien der 80er/90er und bodenständige Dokus (Achtung Kontrolle). Verlässliche Unterhaltung, nostalgischer Charme, solide Qualität.',
        '/mediatheken/sixx': 'sixx: Sender für Frauen ("Senderin"). US-Serien (Drama/Fantasy), Lifestyle, Backen und emotionale Reality. "Glossy" Optik, moderne Unterhaltung, mittlere Komplexität.',
        '/mediatheken/joyn': 'Joyn (Originals): Streaming-Exclusives. Eigenproduktionen von Reality (Trash bis Social Experiment) bis hin zu edgy Comedy-Serien (Jerks). Schwankend von "Guilty Pleasure" bis preisgekrönt.',
        '/mediatheken/sat1-gold': 'SAT.1 Gold: Best Ager (Frauen). Kult-Serien (Ein Engel auf Erden), Gerichtsshows und Retro-Krimis. Nostalgisch, gemütlich, anspruchslose Berieselung.',
        '/mediatheken/prosieben-maxx': 'ProSieben MAXX: Männersender. Anime, US-Sport (Football), Wrestling und Dokus über Autos/Grillen. Nischenfokus, actionreich, spezifische Fankultur.',
        '/mediatheken/kabel-eins-doku': 'Kabel Eins Doku: Reiner Doku-Kanal. Geschichte, Technik, Natur und True Crime. Informativ, visuell ansprechend, teils reißerische Aufmachung (N24-Stil).',
        '/mediatheken/ran': 'ran: Sportmarke. Live-Events (Football, Rennsport) und Sport-Dokus. Professionelle Berichterstattung, hohe Produktionsqualität, dynamisch.',
        '/mediatheken/weihnachtskino': 'Weihnachtskino: Saisonales Pop-up. Weihnachtsfilme am laufenden Band. Kitschig, emotional, "Hallmark"-Qualität (leichte Kost für Herz & Seele).',
        '/mediatheken/atv': 'ATV: Österreichisches Privatfernsehen. Reality-Soaps (Teenager werden Mütter) und lokale News. Oft sensationell, boulevardesk, hoher Unterhaltungswert durch "Trash-Faktor".',
        '/mediatheken/dmax': 'DMAX: Männersender. Abenteuer, Motoren, Schatzsucher, Survival. "Hands-on"-Mentalität, rau, factual Entertainment, einfache Erzählstruktur.',
        '/mediatheken/cbs': 'CBS: US-Network-Content. Krimi-Procedurals (NCIS, FBI) und Action-Serien. Solide amerikanische Fließband-Qualität, spannend, konventionell.',
        '/mediatheken/moviesphere': 'Moviesphere: Film-Kanal. Mix aus Hollywood-Hits (oft älter) und B-Movies. Gemischte Qualität, von Blockbuster bis "Direct-to-Video".',
        '/mediatheken/tlc': 'TLC: Real-Life-Entertainment. Skurrile Krankheiten, True Crime, Hochzeiten und paranormale Phänomene. Tabloid-Stil, voyeuristisch, emotional.',
        '/channels/planet-movies': 'Planet Movies: Spielfilm-Mix. Genre-Kino querbeet, oft abseits der großen Kinohits. Durchschnittliche Qualität, solides "Füllmaterial".',
        '/mediatheken/planet-romance': 'Planet Romance: Herz-Kino. Liebesfilme, Rosamunde-Pilcher-Stil. Vorhersehbar, kitschig, entspannend, geringer intellektueller Anspruch.',
        '/channels/nick': 'Nick: Kinderfernsehen. Cartoons (SpongeBob) und Teen-Sitcoms. Laut, schnell geschnitten, Slapstick-Humor.',
        '/mediatheken/netzkino': 'Netzkino: Kostenloses Filmangebot. Indie-Filme, B-Movies, Trash und Nischen-Kino. Wundertüte: Teils versteckte Perlen, oft Low-Budget-Qualität.',
        '/mediatheken/moviedome': 'Moviedome: Spielfilme. Fokus auf Action, Thriller und Drama. Solides Home-Entertainment, meist Zweitverwertung bekannter Titel.',
        '/mediatheken/filmrise': 'Filmrise: TV- und Film-Aggregator. True Crime (Unsolved Mysteries), Serienklassiker und Reality. Älteres Material, dokumentarisch, teils "trashig".',
        '/mediatheken/hgtv': 'HGTV: Home & Garden. Renovierung, Hauskauf, Gartenbau. Hochglanz-Produktion, repetitive Formate, extrem entspannendes "Wohlfühl-TV".',
        '/mediatheken/sport1': 'Sport1: Sport-Unterhaltung. Talkrunden (Doppelpass), Darts, Motorsport, Reality. Meinungsstark, männliche Zielgruppe, teils klamaukig.',
        '/channels/fabella': 'Fabella: Romantik & Melodram. Telenovelas und emotionale Serien. Trivialliteratur als TV, gefühlsbetont, einfache Handlungen.',
        '/mediatheken/ric': 'RiC: Kinder-TV. Klassische Zeichentrickserien ("Gute-Nacht-Geschichten"). Ruhiger als Nick, pädagogisch wertvoller, retro.',
        '/mediatheken/action-hits': 'Action Hits: Action pur. Kracher-Filme, Explosionen, Kampfkunst. Oft B-Movie-Sektor, anspruchsloses Adrenalin-Kino.',
        '/mediatheken/planet-horror': 'Planet Horror: Gruselkino. Slasher, Dämonen, Indie-Horror. Nische, oft blutig, Qualität schwankt stark zwischen Kult und Billig-Trash.',
        '/mediatheken/galileo': 'Galileo: Wissensmagazin. Erklärvideos, Lifehacks, Food-Tests. Edutainment, leicht verständlich, populärwissenschaftlich.',
        '/mediatheken/defa-tv': 'DEFA TV: DDR-Filmgeschichte. Klassiker, Märchen und sozialkritische Filme der DEFA. Historisch und kulturell wertvoll, anspruchsvoll.',
        '/mediatheken/comedy-central': 'Comedy Central: US-Comedy. Stand-up, South Park, Sitcoms. Satirisch, derb, erwachsener Humor, Kult-Potenzial.',
        '/mediatheken/crunchy-roll': 'Crunchyroll: Anime. Japanische Animationsserien und -filme. Sehr spezifische Popkultur, diverse Genres, hohe Relevanz für Fans.',
        '/mediatheken/doku': 'Doku: Allgemeinwissen. Natur, Tiere, Technik. Standard-Dokumentationen, informativ, sachlich.',
        '/mediatheken/studiocanal': 'Studiocanal: Europäisches & Internationales Kino. Arthouse bis Action-Thriller. Oft gehobene Qualität, namhafte Besetzung, filmisch anspruchsvoller.',
        '/mediatheken/utopja': 'Utopja: Sci-Fi & Mystery. Aliens, übernatürliche Phänomene. Oft ältere Serien oder B-Movies, fantasievoll aber oft Low-Budget.',
        '/channels/focustv': 'Focus TV: Reportagen. Hintergründe zu aktuellen Themen. Journalistisch, informativ, Magazin-Stil.',
        '/mediatheken/real-crime-deutschland': 'Real Crime Deutschland: Wahre Verbrechen. Polizeiarbeit, Mordfälle, Forensik. Düster, faktisch, spannend aufbereitet.',
        '/mediatheken/screamtime': 'Screamtime: Horror & Thriller. Schockmomente und Spannung. Genre-Fans, mittlere bis trashige Qualität.',
        '/channels/xl-geschichte': 'XL Geschichte: Historische Dokus. Antike bis Neuzeit, Kriege und Zivilisationen. Lehrreich, klassischer Doku-Stil, teils dramatisiert.',
        '/mediatheken/himmlisches-kino': 'Himmlisches Kino: Christliche/Werteorientierte Filme. Familiendramen, Bibel-Geschichten. Moralisch, harmlos, oft kitschig-konservativ.',
        '/channels/zombieworld': 'Zombieworld: Untote & Apokalypse. Horror-Subgenre. Von Klassikern bis zu extremem Trash, blutig, einfach gestrickt.',
        '/mediatheken/tempora-tv': 'Tempora TV: Zeitgeschichte. Fokus oft auf Kriege und 20. Jahrhundert. Archivmaterial-lastig, informativ.',
        '/mediatheken/timeline-deutschland': 'Timeline Deutschland: Chronik-Dokus. Historische Ereignisse im Zeitverlauf. Sachlich, edukativ.',
        '/mediatheken/dittsche': 'Dittsche: Kult-Comedy. Olli Dittrich improvisiert im Bademantel. Skurril, intelligent, minimalistisch, typisch deutscher Humor.',
        '/mediatheken/wildbrain': 'WildBrain: Kinderunterhaltung. Teletubbies, Caillou etc. Fokus auf Vorschulkinder, harmlos, bunt.',
        '/mediatheken/fbi-files-deutschland': 'FBI Files Deutschland: Forensik-Dokus. Echte Kriminalfälle wissenschaftlich gelöst. Nüchtern, detailreich, "Procedural"-Reality.',
        '/mediatheken/ard-plus': 'ARD Plus: Öffentlich-rechtliche Inhalte. Tatort, hochwertige TV-Filme & Dokus. Hoher Produktionsstandard, kulturell relevant, anspruchsvoll.',
        '/mediatheken/welt': 'WELT: Nachrichten & Dokus. Politik, Wirtschaft, Technik & Zeitgeschichte (N24-Erbe). Aktuell, informativ, Dokus oft technik-/militärlastig.',
        '/mediatheken/real-stories-deutschland': 'Real Stories Deutschland: Human Interest. Menschen, Schicksale, Krankheiten. Emotional, nahbar, reportageartig.',
        '/channels/bauforum24': 'Bauforum24: Spezialinteresse. Tests von schweren Baumaschinen. "Heavy Metal" für Fans, professionell, technisch, sehr nischig.',
        '/mediatheken/matthias-malmedie': 'Matthias Malmedie: Auto-Entertainment. Der "Grip"-Moderator testet schnelle Autos. PS-lastig, locker, unterhaltsam.',
        '/mediatheken/red-bull-tv': 'Red Bull TV: Action-Sport & Lifestyle. Stunts, Biken, Festivals. Hochglanz-Optik, extrem dynamisch, Marketing-getrieben, jung.',
        '/mediatheken/grjngo': 'Grjngo: Western-Filme. Italo-Western, Klassiker. Rau, nostalgisch, Nische für Genre-Liebhaber.',
        '/mediatheken/storyzoo': 'Storyzoo: Kinder-Lernprogramm. Tiere, Ausflüge, Animation. Ruhig, pädagogisch, für Kleinkinder.',
        '/mediatheken/xplore': 'Xplore: Reisemagazin. Schöne Orte, Lifestyle. Visuell ansprechend, "Fernweh-TV", leichte Kost.',
        '/mediatheken/unscripted': 'Unscripted: Reality-TV. Echte Fälle, Soaps, Alltagsprobleme. Voyeuristisch, einfach produziert.',
        '/mediatheken/just-cooking': 'Just Cooking: Kochsender. Rezepte, Food-Porn. Appetitanregend, hoher Nutzwert, entspannend.',
        '/mediatheken/just-fishing': 'Just Fishing: Angeln. Tipps, Touren, Equipment. Sehr spezielles Hobby-Thema, ruhig.',
        '/mediatheken/filmrise-kids': 'Filmrise Kids: Kinderserien. Mix aus Cartoons und Realfilm. Ältere Titel, gemischte Qualität.',
        '/mediatheken/one-terra': 'One Terra: Entdecker-Dokus. Reisen, Menschen, Abenteuer weltweit. Weltoffen, interessant, reportageartig.',
        '/mediatheken/kabel-eins-classics': 'Kabel Eins Classics: Pay-TV-Archiv. Beste Filme/Serien der letzten 40 Jahre. Kultig, nostalgisch, gut gealterte Unterhaltung.',
        '/mediatheken/sat1-emotions': 'SAT.1 emotions: Herz-Kino & Telenovela. Große Gefühle, Drama, Romantik. Zum Weinen und Träumen, soft, "Wohlfühl-TV".',
        '/mediatheken/prosieben-fun': 'ProSieben Fun: Pay-TV-Ableger. Fun-Sport, US-Comedy, Action & Late Night. Frech, jung, teils exklusive Erstausstrahlungen.'
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

    function addToList(originalHref, newHref, imgSrc, originalPath) {
        // Use original path to get description
        const description = CHANNEL_DESCRIPTIONS[originalPath] || '';
        const entry = { original: originalHref, new: newHref, imgSrc: imgSrc, description: description, path: originalPath };
        if (!adjustedLinks.some(item => item.path === originalPath)) {
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
        listContainer.style.cssText = 'position: fixed; top: 10px; left: 10px; right: 10px; max-height: 90vh; overflow-y: auto; background: rgba(30, 30, 30, 0.95); border: 1px solid #555; padding: 15px; border-radius: 5px; font-size: 12px; z-index: 99999; box-shadow: 0 2px 10px rgba(0,0,0,0.5); color: #fff;';
        listContainer.innerHTML = '<strong style="display: block; margin-bottom: 10px; color: #fff; font-size: 16px;">Angepasste Sender-Links:</strong><div id="adjusted-links-list" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 12px; margin: 0 0 20px 0; padding: 0;"></div><strong style="display: block; margin-bottom: 10px; color: #999; font-size: 14px;">Ignorierte Sender:</strong><div id="ignored-links-list" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 12px; margin: 0; padding: 0;"></div>';
        
        document.body.appendChild(listContainer);
    }

    function createCard(entry, isIgnoredSection) {
        // outer container for anchor + button
        const container = document.createElement('div');
        container.style.cssText = 'position: relative; display: block;';

        // outer anchor makes the card clickable
        const outerAnchor = document.createElement('a');
        outerAnchor.href = entry.new;
        outerAnchor.target = '_blank';
        outerAnchor.style.cssText = 'text-decoration: none; color: inherit; display: block;';

        const card = document.createElement('div');
        card.style.cssText = 'display: flex; align-items: flex-start; gap: 12px; background: rgba(50, 50, 50, 0.8); padding: 10px; border-radius: 8px; border: 1px solid #444; transition: all 0.2s;';
        card.setAttribute('role', 'link');
        card.tabIndex = 0;
        card.onmouseover = function() {
            this.style.background = 'rgba(70, 70, 70, 0.9)';
            this.style.borderColor = '#666';
        };
        card.onmouseout = function() {
            this.style.background = 'rgba(50, 50, 50, 0.8)';
            this.style.borderColor = '#444';
        };
        card.onkeydown = function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                window.open(entry.new, '_blank');
                e.preventDefault();
            }
        };

        // image
        if (entry.imgSrc) {
            const img = document.createElement('img');
            img.src = entry.imgSrc;
            img.alt = '';
            img.style.cssText = 'width: 80px; height: auto; display: block; border-radius: 4px; transition: transform 0.2s; flex-shrink: 0;';
            card.appendChild(img);
        }

        const textContainer = document.createElement('div');
        textContainer.style.cssText = 'flex: 1; min-width: 0;';

        if (entry.description) {
            const descText = document.createElement('p');
            descText.textContent = entry.description;
            descText.style.cssText = 'margin: 0; color: #ddd; font-size: 11px; line-height: 1.4; overflow-wrap: break-word;';
            textContainer.appendChild(descText);
        } else {
            const urlText = document.createElement('span');
            urlText.textContent = entry.new;
            urlText.style.cssText = 'color: #4da6ff; font-size: 11px; word-break: break-all;';
            textContainer.appendChild(urlText);
        }

        card.appendChild(textContainer);
        outerAnchor.appendChild(card);
        container.appendChild(outerAnchor);

        // Add ignore/unignore button
        const button = document.createElement('button');
        button.style.cssText = 'position: absolute; top: 8px; right: 8px; background: rgba(0, 0, 0, 0.7); border: 1px solid #666; border-radius: 4px; padding: 6px 10px; cursor: pointer; color: #fff; font-size: 16px; z-index: 10; transition: all 0.2s;';
        button.innerHTML = isIgnoredSection ? '↑' : '↓';
        button.title = isIgnoredSection ? 'Sender wieder anzeigen' : 'Sender ignorieren';
        button.onmouseover = function() {
            this.style.background = 'rgba(0, 0, 0, 0.9)';
            this.style.borderColor = '#888';
        };
        button.onmouseout = function() {
            this.style.background = 'rgba(0, 0, 0, 0.7)';
            this.style.borderColor = '#666';
        };
        button.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (isIgnoredSection) {
                unignoreSender(entry.path);
            } else {
                ignoreSender(entry.path);
            }
        };
        container.appendChild(button);

        return container;
    }

    function updateList() {
        createList();
        if (!listContainer) return;

        const list = listContainer.querySelector('#adjusted-links-list');
        const ignoredList = listContainer.querySelector('#ignored-links-list');
        if (!list || !ignoredList) return;

        list.innerHTML = '';
        ignoredList.innerHTML = '';

        // Separate entries into regular and ignored
        const regularEntries = adjustedLinks.filter(entry => !isIgnored(entry.path));
        const ignoredEntries = adjustedLinks.filter(entry => isIgnored(entry.path));

        // Render regular entries
        for (const entry of regularEntries) {
            list.appendChild(createCard(entry, false));
        }

        // Render ignored entries
        for (const entry of ignoredEntries) {
            ignoredList.appendChild(createCard(entry, true));
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

            // Find icon image in the anchor
            const img = anchor.querySelector('img');
            const imgSrc = img ? img.src : null;

            // Check if there's a specific mapping for this path
            const mappedUrl = mapPath(pathname);
            if (mappedUrl) {
                const oldHref = anchor.href;
                addToList(oldHref, mappedUrl, imgSrc, pathname);
            } else if (pathname.startsWith('/mediatheken/') || pathname.startsWith('/channels/')) {
                // For all other /mediatheken/* and /channels/* links, add #alles if not already present
                if (!href.includes('#alles') && !anchor.hash) {
                    const oldHref = anchor.href;
                    const newHref = oldHref + (oldHref.includes('?') ? '' : '') + '#alles';
        loadIgnoredSenders();
                    addToList(oldHref, newHref, imgSrc, pathname);
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
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
