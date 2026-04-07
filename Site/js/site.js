const SITE_ROOT = (function() {
    const scriptSrc = document.currentScript ? document.currentScript.src : "";
    if (scriptSrc.includes("/js/")) {
        return scriptSrc.substring(0, scriptSrc.lastIndexOf("/js/") + 1);
    }
    return new URL("../", window.location.href).href;
})();

const buildUrl = (relativePath) => {
    try {
        return new URL(relativePath, SITE_ROOT).href;
    } catch (e) {
        return relativePath;
    }
};


const SITE_CONFIG = {
    uk: {
        paths: {
            main: "html/main.html",
            map: "html/map.html",
            booking: "html/booking.html",
            contacts: "html/contacts.html",
            apartment: "html/appartments.html"
        }
    },
    en: {
        paths: {
            main: "html/main.html",
            map: "html/map.html",
            booking: "html/booking.html",
            contacts: "html/contacts.html",
            apartment: "html/appartments.html"
        }
    }
};

const getCurrentLang = () => {
    const language = window.i18next?.resolvedLanguage || window.i18next?.language || document.documentElement.lang || "en";
    return language.startsWith("uk") ? "uk" : "en";
};

const getAssetUrl = (relativePath) => buildUrl(relativePath);
const getPageUrl = (relativePath) => buildUrl(relativePath);
const getPageUrlWithCurrentParams = (relativePath, allowedParams = []) => {
    const url = new URL(getPageUrl(relativePath));
    const currentParams = new URLSearchParams(window.location.search);

    allowedParams.forEach((param) => {
        const value = currentParams.get(param);
        if (value) {
            url.searchParams.set(param, value);
        }
    });

    return url.href;
};

const getApartmentTitle = (apartment, lang = getCurrentLang()) => {
    if (!apartment || !apartment.title) return "";
    if (typeof apartment.title === 'string') return apartment.title;
    return apartment.title[lang] || apartment.title.uk || apartment.title.en || "";
};

const getApartmentDescription = (apartment, lang = getCurrentLang()) => {
    if (!apartment || !apartment.description) return "";
    if (typeof apartment.description === 'string') return apartment.description;
    return apartment.description[lang] || apartment.description.uk || apartment.description.en || "";
};
const getApartmentArea = (apartment, lang = getCurrentLang()) => apartment.area?.[lang] || apartment.area?.uk || apartment.areaEn || apartment.area || window.t("common.notSpecified", { lng: lang });
const getApartmentUrl = (id, lang = getCurrentLang()) => `${getPageUrl(SITE_CONFIG[lang].paths.apartment)}?id=${id}`;

const translateKey = (key, options = {}) => {
    if (typeof window.t === "function") {
        return window.t(key, options);
    }

    return key;
};

const formatPrice = (price, lang = getCurrentLang()) => translateKey("common.pricePerDay", { lng: lang, price });
const formatGuests = (guests, lang = getCurrentLang()) => translateKey("common.guests", { lng: lang, count: guests });
const formatRooms = (rooms, lang = getCurrentLang()) => translateKey("common.rooms", { lng: lang, count: rooms });
const formatBeds = (beds, lang = getCurrentLang()) => translateKey("common.beds", { lng: lang, count: beds });

const APARTMENT_FEATURE_DEFINITIONS = [
    { key: "tv" },
    { key: "fridge" },
    { key: "microwave" },
    { key: "hot_water" },
    { key: "air_conditioner" },
    { key: "near_supermarket" },
    { key: "good_transport" },
    { key: "smart_tv" },
    { key: "balcony" },
    { key: "hob" },
    { key: "internet" },
    { key: "cable_tv" },
    { key: "secure_parking" },
    { key: "coded_entry" },
    { key: "washing_machine" },
    { key: "satellite_tv" },
    { key: "t2_tv" }
];

const getFeatureLabel = (featureKey, lang = getCurrentLang()) => translateKey(`features.${featureKey}`, { lng: lang, defaultValue: featureKey });

const getApartmentFeatures = (apartment) => {
    const featureKeys = Array.isArray(apartment?.features) ? apartment.features : [];
    const order = APARTMENT_FEATURE_DEFINITIONS.map((feature) => feature.key);

    return featureKeys
        .filter((featureKey, index) => featureKeys.indexOf(featureKey) === index)
        .sort((left, right) => order.indexOf(left) - order.indexOf(right));
};

const buildHeaderMarkup = (page) => {
    const lang = getCurrentLang();
    const preservedParams = [];
    if (page === "apartment" || page === "booking") {
        preservedParams.push("id");
    }
    preservedParams.push("user_id");

    const items = ["main", "map", "booking", "contacts"].map((key) => {
        const className = key === page ? "navigation_current" : "navigation";
        const href = key === page ? "#" : getPageUrl(SITE_CONFIG[lang].paths[key]);

        return `
            <div class="${className}">
                <a href="${href}" data-i18n="nav.${key}"></a>
            </div>
        `;
    }).join("");

    return `
        <header class="header">
            <a href="${getPageUrl(SITE_CONFIG[lang].paths.main)}" class="logo_link" data-i18n="[aria-label]common.siteName">
                <img src="${getAssetUrl("images/logo.png")}" alt="${translateKey("common.siteName", { lng: lang })}" id="logo">
            </a>
            <div class="header_nav">${items}</div>
            <div class="lang_switch" data-i18n="[aria-label]common.languageSwitch">
                <img src="${getAssetUrl("images/lang.png")}" alt="${translateKey("common.languageSwitch", { lng: lang })}" id="lang">
                <div class="languages">
                    <a href="${getPageUrlWithCurrentParams(SITE_CONFIG.en.paths[page] || SITE_CONFIG.en.paths.main, preservedParams)}" class="lang_btn ${lang === "en" ? "current_lang" : ""}" data-lang-choice="en" data-i18n="common.languageOption.en">EN</a>
                    <a href="${getPageUrlWithCurrentParams(SITE_CONFIG.uk.paths[page] || SITE_CONFIG.uk.paths.main, preservedParams)}" class="lang_btn ${lang === "uk" ? "current_lang" : ""}" data-lang-choice="uk" data-i18n="common.languageOption.uk">UA</a>
                </div>
            </div>
        </header>
    `;
};

const mountSiteHeader = () => {
    const headerRoot = document.querySelector("[data-site-header]");
    if (!headerRoot) {
        return;
    }

    const page = document.body.dataset.page || "main";
    headerRoot.innerHTML = buildHeaderMarkup(page);
    window.translatePage?.(headerRoot);

    headerRoot.querySelectorAll("[data-lang-choice]").forEach((link) => {
        link.addEventListener("click", () => {
            window.localStorage.setItem("siteLanguage", link.dataset.langChoice);
        });
    });
};

const normalizeDocumentTitle = (title) => {
    const brand = "G.I.L Apartments";
    const value = (title || "").trim().replace(/\bG\.I\.L\b/g, brand);

    if (!value) {
        return `${brand} | Daily Apartments in Uzhhorod`;
    }

    if (value === brand) {
        return `${brand} | Daily Apartments in Uzhhorod`;
    }

    if (value.startsWith(`${brand} | `)) {
        return value;
    }

    if (value.endsWith(`| ${brand}`)) {
        const pageTitle = value.slice(0, value.length - (`| ${brand}`).length).trim();
        return pageTitle ? `${brand} | ${pageTitle}` : `${brand} | Daily Apartments in Uzhhorod`;
    }

    return `${brand} | ${value}`;
};

const updateDocumentTitle = (key, options = {}) => {
    document.title = normalizeDocumentTitle(translateKey(key, options));
};

const createLeafletMap = (elementId, center, zoom = 16) => {
    if (typeof L === "undefined") {
        return null;
    }

    const map = L.map(elementId).setView(center, zoom);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 20
    }).addTo(map);

    return map;
};

const createApartmentMarkerIcon = () => {
    if (typeof L === "undefined") {
        return null;
    }

    return L.divIcon({
        className: "apartment-marker",
        html: "<span>&#127970;</span>",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -14]
    });
};

const buildApartmentMapPopup = (apartment, lang = getCurrentLang(), options = {}) => {
    const {
        includeDetails = true,
        imageSrc = getAssetUrl(apartment.img),
        title = getApartmentTitle(apartment, lang)
    } = options;
    const routeText = translateKey("common.actions.route", {
        lng: lang,
        defaultValue: lang === "uk" ? "Побудувати маршрут" : "Build route"
    });
    const detailsText = translateKey("common.actions.details", { lng: lang });
    const routeUrl = apartment.route_url || `https://www.google.com/maps/dir/?api=1&destination=${apartment.lat},${apartment.lng}`;
    const detailsMarkup = includeDetails
        ? `<a href="${getApartmentUrl(apartment.id || apartment._id, lang)}" class="popup-btn">${detailsText}</a>`
        : "";

    return `
        <div class="popup">
            <img src="${imageSrc}" width="200" alt="${title}">
            <h3>${title}</h3>
            <p>${formatPrice(apartment.price || 0, lang)}</p>
            ${detailsMarkup}
            <a href="${routeUrl}" class="popup-btn" target="_blank" rel="noopener noreferrer">${routeText}</a>
        </div>
    `;
};

const buildTelegramBotUrls = (botUsername, startPayload = "") => {
    const normalizedUsername = String(botUsername || "").replace(/^@+/, "");
    const payload = String(startPayload || "").trim();
    const encodedPayload = payload ? encodeURIComponent(payload) : "";

    return {
        appUrl: payload
            ? `tg://resolve?domain=${normalizedUsername}&start=${encodedPayload}`
            : `tg://resolve?domain=${normalizedUsername}`,
        webUrl: payload
            ? `https://t.me/${normalizedUsername}?start=${encodedPayload}`
            : `https://t.me/${normalizedUsername}`
    };
};

const attachTelegramOpenBehavior = (element, botUsername, startPayload = "") => {
    if (!element) {
        return;
    }

    const { appUrl, webUrl } = buildTelegramBotUrls(botUsername, startPayload);
    element.href = webUrl;
    element.rel = "noopener noreferrer";

    element.addEventListener("click", (event) => {
        event.preventDefault();

        let fallbackUsed = false;
        const fallbackTimer = window.setTimeout(() => {
            if (!document.hidden && !fallbackUsed) {
                fallbackUsed = true;
                window.location.href = webUrl;
            }
        }, 1200);

        const clearFallback = () => {
            window.clearTimeout(fallbackTimer);
            document.removeEventListener("visibilitychange", clearFallback);
            window.removeEventListener("pagehide", clearFallback);
            window.removeEventListener("blur", clearFallback);
        };

        document.addEventListener("visibilitychange", clearFallback, { once: true });
        window.addEventListener("pagehide", clearFallback, { once: true });
        window.addEventListener("blur", clearFallback, { once: true });

        window.location.href = appUrl;
    });
};

window.i18nReady
    .then(() => {
        mountSiteHeader();
        const pageTitleKey = document.body?.dataset.titleKey;
        if (pageTitleKey) {
            updateDocumentTitle(pageTitleKey);
        }
        window.translatePage?.(document.body);
    })
    .catch(() => {
        mountSiteHeader();
    });

Object.assign(window, {
    SITE_ROOT,
    SITE_CONFIG,
    getCurrentLang,
    getAssetUrl,
    getPageUrl,
    getPageUrlWithCurrentParams,
    getApartmentTitle,
    getApartmentDescription,
    getApartmentArea,
    getApartmentUrl,
    formatPrice,
    formatGuests,
    formatRooms,
    formatBeds,
    APARTMENT_FEATURE_DEFINITIONS,
    getFeatureLabel,
    getApartmentFeatures,
    buildHeaderMarkup,
    mountSiteHeader,
    updateDocumentTitle,
    createLeafletMap,
    createApartmentMarkerIcon,
    buildApartmentMapPopup,
    buildTelegramBotUrls,
    attachTelegramOpenBehavior
});
