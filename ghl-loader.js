/**
 * CarBot System - GHL Global Loader v3 (Production Grade)
 * Implementation for Agency Settings > Company > Custom JS
 */
(function () {
    'use strict';

    const CONFIG = {
        apiBase: 'https://carbot-system.vercel.app/api/get-branding',
        brandKey: 'carbot',
        storageKey: 'ghl_branding_cache_v3',
        originalAssetsKey: 'ghl_original_assets_v3',
        cacheTTL: 1000 * 60 * 30, // 30 minutes
        pollInterval: 1200,
        selectors: {
            sidebar: '#sidebar-v2, .sidebar-v2-container, #sidebar-v3',
            header: '.hl_header, .hl_navbar, #header-v2',
            logoImgs: [
                '.hl_navbar--logo img',
                '.hl_header--logo img',
                '.sidebar-v2-container .logo img',
                '.hl_header--logo .img-container img',
                'img.logo-img',
                '#sidebar-v2 .logo img'
            ].join(', '),
            paymentsHref: '/payments',
            carbotHrefMatch: /\/carbot($|\?)/ // Exact match for custom link
        },
        assets: {
            logo: 'https://assets.cdn.filesafe.space/SW9xmSTpt2ugsHTMO8UE/media/690e260d696129f7bb260606.png',
            favicon: 'https://carbot-system.vercel.app/favicon-carbot.png'
        }
    };

    let state = {
        currentLocationId: null,
        branding: null,
        observers: [],
        isCarBot: false,
        originalAssets: null
    };

    /**
     * Recovery Logic for Original Branding
     */
    function captureOriginalAssets() {
        if (state.originalAssets) return;

        // Try to load from session storage first
        const saved = sessionStorage.getItem(CONFIG.originalAssetsKey);
        if (saved) {
            state.originalAssets = JSON.parse(saved);
            return;
        }

        // Capture from DOM
        const logoImg = document.querySelector(CONFIG.selectors.logoImgs);
        const faviconLink = document.querySelector("link[rel*='icon']");

        state.originalAssets = {
            logo: logoImg ? logoImg.src : null,
            favicon: faviconLink ? faviconLink.href : null
        };

        // Only save if we found at least something and we are NOT in CarBot context yet
        if (!state.isCarBot && (state.originalAssets.logo || state.originalAssets.favicon)) {
            sessionStorage.setItem(CONFIG.originalAssetsKey, JSON.stringify(state.originalAssets));
        }
    }

    function restoreOriginalAssets() {
        if (!state.originalAssets) return;

        // Restore Logo
        const logos = document.querySelectorAll(CONFIG.selectors.logoImgs);
        logos.forEach(img => {
            if (state.originalAssets.logo && img.src !== state.originalAssets.logo) {
                img.src = state.originalAssets.logo;
                img.style.maxHeight = '';
            }
        });

        // Restore Favicon
        const link = document.querySelector("link[rel*='icon']");
        if (link && state.originalAssets.favicon && link.href !== state.originalAssets.favicon) {
            link.href = state.originalAssets.favicon;
        }
    }

    /**
     * Robust Location ID detection
     */
    function detectLocationId() {
        if (window.locationId) return window.locationId;
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('location_id')) return urlParams.get('location_id');
        const pathMatch = window.location.pathname.match(/\/location\/([^/]+)/);
        if (pathMatch) return pathMatch[1];
        const hrefMatch = window.location.href.match(/location\/([^/?#&]+)/);
        return hrefMatch ? hrefMatch[1] : null;
    }

    /**
     * Cache Management
     */
    function getCache(locationId) {
        try {
            const cached = sessionStorage.getItem(`${CONFIG.storageKey}_${locationId}`);
            if (!cached) return null;
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp > CONFIG.cacheTTL) return null;
            return data;
        } catch (e) { return null; }
    }

    function setCache(locationId, data) {
        try {
            const cacheObj = { data, timestamp: Date.now() };
            sessionStorage.setItem(`${CONFIG.storageKey}_${locationId}`, JSON.stringify(cacheObj));
        } catch (e) { }
    }

    /**
     * API Fetching
     */
    async function fetchBranding(locationId) {
        const cached = getCache(locationId);
        if (cached !== null) return cached;
        try {
            const response = await fetch(`${CONFIG.apiBase}?locationId=${locationId}`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            setCache(locationId, data);
            return data;
        } catch (e) {
            console.error('[CarBot] Error fetching branding:', e);
            return false;
        }
    }

    /**
     * UI Actions
     */
    function updateLogos() {
        if (!state.isCarBot) return;
        const logos = document.querySelectorAll(CONFIG.selectors.logoImgs);
        logos.forEach(img => {
            if (img.src !== CONFIG.assets.logo) {
                // If this is the first time we find it, try to capture it as original before overriding
                if (!state.originalAssets) captureOriginalAssets();

                img.src = CONFIG.assets.logo;
                img.srcset = '';
                img.style.maxHeight = '40px';
                img.style.objectFit = 'contain';
            }
        });
    }

    function updateFavicon() {
        if (!state.isCarBot) return;
        let link = document.querySelector("link[rel*='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'shortcut icon';
            document.head.appendChild(link);
        }
        if (link.href !== CONFIG.assets.favicon) {
            if (!state.originalAssets) captureOriginalAssets();
            link.href = CONFIG.assets.favicon;
        }
    }

    function reorderSidebar() {
        if (!state.isCarBot) return;
        const sidebar = document.querySelector(CONFIG.selectors.sidebar);
        if (!sidebar) return;

        const allLinks = Array.from(sidebar.querySelectorAll('a[href]'));
        const paymentsLink = allLinks.find(a => a.getAttribute('href').includes(CONFIG.selectors.paymentsHref));
        const carbotLink = allLinks.find(a => CONFIG.selectors.carbotHrefMatch.test(a.getAttribute('href')));

        if (paymentsLink && carbotLink) {
            const oppWrapper = paymentsLink.closest('div[id*="sidebar-"]') || paymentsLink.parentElement;
            const carbotWrapper = carbotLink.closest('div[id*="sidebar-"]') || carbotLink.parentElement;

            if (oppWrapper && carbotWrapper && oppWrapper.parentNode === carbotWrapper.parentNode) {
                if (oppWrapper.nextSibling !== carbotWrapper) {
                    oppWrapper.parentNode.insertBefore(carbotWrapper, oppWrapper.nextSibling);
                }
            }
        }
    }

    /**
     * Observer Management
     */
    function cleanupObservers() {
        state.observers.forEach(obs => obs.disconnect());
        state.observers = [];
    }

    function setupObservers() {
        cleanupObservers();
        if (!state.isCarBot) return;

        const uiObserver = new MutationObserver(() => {
            // We still use the observer for immediate feedback
            updateLogos();
            reorderSidebar();
        });

        const sidebar = document.querySelector(CONFIG.selectors.sidebar);
        const header = document.querySelector(CONFIG.selectors.header);

        if (sidebar) uiObserver.observe(sidebar, { childList: true, subtree: true });
        if (header) uiObserver.observe(header, { childList: true, subtree: true });

        const attrObserver = new MutationObserver(() => {
            if (!document.documentElement.hasAttribute('data-brand')) {
                document.documentElement.setAttribute('data-brand', CONFIG.brandKey);
            }
        });
        attrObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-brand'] });

        state.observers.push(uiObserver, attrObserver);
    }

    /**
     * Main Logic
     */
    async function applyBranding(forceReapply = false) {
        const locationId = detectLocationId();
        if (!locationId) return;

        // If location changed, full reset and fetch
        if (locationId !== state.currentLocationId) {
            state.currentLocationId = locationId;
            const brandingData = await fetchBranding(locationId);
            state.branding = brandingData;
            state.isCarBot = brandingData && brandingData.appInstalled && brandingData.brand === CONFIG.brandKey;

            if (state.isCarBot) {
                document.documentElement.setAttribute('data-brand', CONFIG.brandKey);
                document.body.classList.add('carbot-theme');
                setupObservers();
                console.log(`[CarBot] Subaccount ${locationId} active.`);
            } else {
                // Reset to original
                document.documentElement.removeAttribute('data-brand');
                document.body.classList.remove('carbot-theme');
                cleanupObservers();
                restoreOriginalAssets();
            }
            forceReapply = true;
        }

        // If we are in CarBot context, re-apply branding elements constantly
        // This handles cases where GHL re-renders parts of the UI without changing locationId
        if (state.isCarBot || forceReapply) {
            updateLogos();
            updateFavicon();
            reorderSidebar();
        }
    }

    // Execution
    applyBranding();

    // SPA Navigation and Persistence Detection
    let lastUrl = location.href;
    setInterval(() => {
        const urlChanged = location.href !== lastUrl;
        if (urlChanged) lastUrl = location.href;

        // Always run applyBranding to catch partial re-renders even if locationId is same
        applyBranding(urlChanged);
    }, CONFIG.pollInterval);

})();
