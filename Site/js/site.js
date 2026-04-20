const SITE_ROOT = (() => {
    const scriptSrc = document.currentScript ? document.currentScript.src : "";

    if (scriptSrc.includes("/js/")) {
        return scriptSrc.slice(0, scriptSrc.lastIndexOf("/js/") + 1);
    }

    return new URL("../", window.location.href).href;
})();

const buildUrl = (relativePath) => {
    try {
        return new URL(relativePath, SITE_ROOT).href;
    } catch (error) {
        return relativePath;
    }
};

const FONT_AWESOME_STYLESHEET_URL = "https://use.fontawesome.com/releases/v5.15.4/css/all.css";
const FONT_AWESOME_STYLESHEET_INTEGRITY = "sha384-DyZ88mC6Up2uqS4h/KRgHuoeGwBcD4Ng9SiP4dIRy0EXTlnuz47vAwmeGwVChigm";

const ensureFontAwesomeStylesheet = () => {
    if (!document.head) {
        return;
    }

    const existingStylesheet = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .find((link) => (link.href || "").includes("fontawesome"));

    if (existingStylesheet) {
        return;
    }

    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = FONT_AWESOME_STYLESHEET_URL;
    stylesheet.crossOrigin = "anonymous";
    stylesheet.integrity = FONT_AWESOME_STYLESHEET_INTEGRITY;
    document.head.appendChild(stylesheet);
};

ensureFontAwesomeStylesheet();

const scoreReadableText = (value) => {
    if (typeof value !== "string") {
        return 0;
    }

    const readableMatches = value.match(/[A-Za-z0-9\u0400-\u04FFіїєґІЇЄҐ]/g) || [];
    const suspiciousMatches = value.match(/[ÐÑРСЃЌ]/g) || [];

    return readableMatches.length - suspiciousMatches.length * 2;
};

const normalizeTextValue = (value) => {
    if (typeof value !== "string") {
        return value;
    }

    if (!/[ÐÑРСЃ]/.test(value)) {
        return value;
    }

    try {
        const repaired = decodeURIComponent(escape(value));
        return scoreReadableText(repaired) > scoreReadableText(value) ? repaired : value;
    } catch (error) {
        return value;
    }
};

const normalizeDataTree = (value) => {
    if (Array.isArray(value)) {
        return value.map((item) => normalizeDataTree(item));
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, nestedValue]) => [key, normalizeDataTree(nestedValue)])
        );
    }

    return normalizeTextValue(value);
};

const SITE_CONFIG = {
    uk: {
        paths: {
            main: "index.html",
            map: "html/map.html",
            booking: "html/booking.html",
            contacts: "html/contacts.html",
            apartment: "html/appartments.html"
        }
    },
    en: {
        paths: {
            main: "index.html",
            map: "html/map.html",
            booking: "html/booking.html",
            contacts: "html/contacts.html",
            apartment: "html/appartments.html"
        }
    }
};

const STATIC_COPY = {
    uk: {
        footer: {
            brandTitle: "G.I.L Apartments",
            brandLead: "Подобова оренда квартир в Ужгороді.",
            brandSublead: "Зручне житло для коротких і довших поїздок.",
            contactsTitle: "Контакти",
            phoneLabel: "Телефон",
            emailLabel: "Email",
            locationLabel: "Локація",
            locationValue: "Ужгород, Закарпатська область",
            navTitle: "Навігація",
            socialTitle: "Соцмережі",
            instagram: "Instagram",
            facebook: "Facebook",
            telegram: "Telegram",
            AboutUs: "Про нас",
            phoneValue: "+38 (050) 000 00 00",
            emailValue: "gil.apartments@example.com",
            copyright: "© 2026 G.I.L Apartments. Усі права захищено.",
            madeBy: "Сайт створено Глєбом та Кирилом - веброзробниками з Ужгорода."
        },
        routeText: "Побудувати маршрут",
        defaultTitle: "G.I.L Apartments | Подобова оренда квартир в Ужгороді",
        alt: {
            apartmentMarker: "Маркер квартири"
        }
    },
    en: {
        footer: {
            brandTitle: "G.I.L Apartments",
            brandLead: "Daily apartment rentals in Uzhhorod.",
            brandSublead: "Comfortable stays for short and longer visits.",
            contactsTitle: "Contacts",
            phoneLabel: "Phone",
            emailLabel: "Email",
            locationLabel: "Location",
            locationValue: "Uzhhorod, Zakarpattia region",
            navTitle: "Navigation",
            socialTitle: "Social",
            instagram: "Instagram",
            facebook: "Facebook",
            telegram: "Telegram",
            AboutUs: "About Us",
            phoneValue: "+38 (050) 000 00 00",
            emailValue: "gil.apartments@example.com",
            copyright: "© 2026 G.I.L Apartments. All rights reserved.",
            madeBy: "Website created by Gleb and Kirill - web developers from Uzhhorod."
        },
        routeText: "Build route",
        defaultTitle: "G.I.L Apartments | Daily apartment rentals in Uzhhorod",
        alt: {
            apartmentMarker: "Apartment marker"
        }
    }
};

const NORMALIZED_STATIC_COPY = normalizeDataTree(STATIC_COPY);

const getCurrentLang = () => {
    const language =
        window.i18next?.resolvedLanguage ||
        window.i18next?.language ||
        document.documentElement.lang ||
        "en";

    return language.startsWith("uk") ? "uk" : "en";
};

const getStaticCopy = (lang = getCurrentLang()) => NORMALIZED_STATIC_COPY[lang] || NORMALIZED_STATIC_COPY.en;

const getAssetUrl = (relativePath) => buildUrl(relativePath);
const getPageUrl = (relativePath) => buildUrl(relativePath);

const normalizeApartmentAddress = (value, lang = getCurrentLang()) => {
    if (typeof value !== "string") {
        return "";
    }

    const compact = value
        .replace(/\s+/g, " ")
        .replace(/\s*,\s*/g, " ")
        .trim();

    if (!compact) {
        return "";
    }

    if (lang !== "uk") {
        return compact;
    }

    let normalized = compact
        .replace(/\s+з\s+.+$/i, "")
        .replace(/\s*\/\s*/g, "/")
        .replace(/^(вул|ул)\.?\s*/i, "вул. ")
        .replace(/^(проспект|просп)\.?\s*/i, "Проспект ")
        .replace(/^(пл|площа)\.?\s*/i, "пл. ")
        .replace(/([А-ЯІЇЄҐA-Z])\.(?=[А-ЯІЇЄҐA-Z])/g, "$1. ")
        .replace(/\s+/g, " ")
        .trim();

    normalized = normalized.replace(/^вул\.\s*/i, "вул. ");
    normalized = normalized.replace(/^пл\.\s*/i, "пл. ");
    normalized = normalized.replace(/^Проспект\s*/i, "Проспект ");

    return normalized;
};

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
    const normalizedAddress = normalizeApartmentAddress(
        apartment?.address || apartment?.title?.uk || apartment?.title?.en || apartment?.title || "",
        lang
    );

    if (lang === "uk" && normalizedAddress) {
        return normalizedAddress;
    }

    if (!apartment?.title) {
        return normalizedAddress;
    }

    if (typeof apartment.title === "string") {
        return lang === "uk" ? normalizeApartmentAddress(apartment.title, lang) || apartment.title : apartment.title;
    }

    return apartment.title[lang] || apartment.title.uk || apartment.title.en || normalizedAddress || "";
};

const getApartmentAddress = (apartment, lang = getCurrentLang()) => {
    const source = apartment?.address || apartment?.title?.uk || apartment?.title?.en || apartment?.title || "";
    return normalizeApartmentAddress(source, lang) || source;
};

const getApartmentDescription = (apartment, lang = getCurrentLang()) => {
    if (!apartment?.description) {
        return "";
    }

    if (typeof apartment.description === "string") {
        return apartment.description;
    }

    return apartment.description[lang] || apartment.description.uk || apartment.description.en || "";
};


const getApartmentUrl = (id, lang = getCurrentLang()) =>
    `${getPageUrl(SITE_CONFIG[lang].paths.apartment)}?id=${encodeURIComponent(id)}`;

const translateKey = (key, options = {}) => {
    if (typeof window.t === "function") {
        return window.t(key, options);
    }

    return key;
};

const formatPrice = (price, lang = getCurrentLang()) =>
    translateKey("common.pricePerDay", { lng: lang, price });


const formatRooms = (rooms, lang = getCurrentLang()) =>
    translateKey("common.rooms", { lng: lang, count: rooms });

const formatBeds = (beds, lang = getCurrentLang()) =>
    translateKey("common.beds", { lng: lang, count: beds });

const APARTMENT_FEATURE_DEFINITIONS = [
    { key: "microwave", icon: "" },
    { key: "air_conditioner", iconClass: "fas fa-snowflake" },
    { key: "near_supermarket", iconClass:"fas fa-store" },
    { key: "smart_tv", iconClass: "fas fa-tv" },
    { key: "balcony", iconClass: "fas fa-door-open" },
    { key: "gas_hob", iconClass: "fas fa-fire" },
    { key: "electro_hob", iconClass: "fas fa-bolt" },
    { key: "parking", iconClass: "fas fa-parking" },
    { key: "intercom", iconClass: "fas fa-bell" }
];

const getFeatureDefinition = (featureKey) =>
    APARTMENT_FEATURE_DEFINITIONS.find((feature) => feature.key === featureKey) || null;

const getFeatureLabel = (featureKey, lang = getCurrentLang()) =>
    translateKey(`features.${featureKey}`, { lng: lang, defaultValue: featureKey });

const buildIconMarkup = (iconClass, className = "") =>
    iconClass ? `<i class="${iconClass}${className ? ` ${className}` : ""}" aria-hidden="true"></i>` : "";

const buildFeatureMarkup = (featureKey, lang = getCurrentLang(), options = {}) => {
    const featureDefinition = getFeatureDefinition(featureKey);
    const fallbackIconClass = featureKey === "microwave" ? "fas fa-utensils" : "";
    const label = getFeatureLabel(featureKey, lang);
    const labelClassName = options.labelClassName || "feature_inline_label";
    const iconClassName = options.iconClassName || "feature_inline_icon";

    return `
        ${buildIconMarkup(featureDefinition?.iconClass || fallbackIconClass, iconClassName)}
        <span class="${labelClassName}">${label}</span>
    `;
};

const buildInfoMarkup = (label, iconClass, options = {}) => {
    const labelClassName = options.labelClassName || "feature_inline_label";
    const iconClassName = options.iconClassName || "feature_inline_icon";

    return `
        ${buildIconMarkup(iconClass, iconClassName)}
        <span class="${labelClassName}">${label}</span>
    `;
};

const getApartmentFeatures = (apartment) => {
    const featureKeys = Array.isArray(apartment?.features) ? apartment.features : [];
    const order = APARTMENT_FEATURE_DEFINITIONS.map((feature) => feature.key);

    return featureKeys
        .filter((featureKey, index) => featureKeys.indexOf(featureKey) === index)
        .sort((left, right) => {
            const leftIndex = order.indexOf(left);
            const rightIndex = order.indexOf(right);

            if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right);
            if (leftIndex === -1) return 1;
            if (rightIndex === -1) return -1;

            return leftIndex - rightIndex;
        });
};

const getPreservedParamsForPage = (page) => {
    const preservedParams = ["user_id"];

    if (page === "apartment" || page === "booking") {
        preservedParams.unshift("id");
    }

    return preservedParams;
};

const buildHeaderMarkup = (page) => {
    const lang = getCurrentLang();
    const preservedParams = getPreservedParamsForPage(page);
    const currentPaths = SITE_CONFIG[lang].paths;

    const items = ["main", "map", "booking", "contacts"]
        .map((key) => {
            const className = key === page ? "navigation_current" : "navigation";
            const href =
                key === page
                    ? "#"
                    : getPageUrlWithCurrentParams(currentPaths[key], preservedParams);

            return `
                <div class="${className}">
                    <a href="${href}" data-i18n="nav.${key}"></a>
                </div>
            `;
        })
        .join("");

    return `
        <header class="header">
            <a href="${getPageUrlWithCurrentParams(currentPaths.main, preservedParams)}" class="logo_link" data-i18n="[aria-label]common.siteName">
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

const buildFooterMarkup = () => {
    const lang = getCurrentLang();
    const copy = getStaticCopy(lang).footer;
    const currentPaths = SITE_CONFIG[lang].paths;

    return `
        <footer class="footer">
            <div class="footer__content">
                <div class="footer__section">
                    <h3 class="footer__title">${copy.brandTitle}</h3>
                    <p class="footer__text">${copy.brandLead}</p>
                    <p class="footer__text">${copy.brandSublead}</p>
                </div>
                <div class="footer__section">
                    <h3 class="footer__title">${copy.contactsTitle}</h3>
                    <p class="footer__text footer__contact">
                        ${buildIconMarkup("fas fa-phone-alt", "footer__icon")}
                        <span>${copy.phoneValue}</span>
                    </p>
                    <p class="footer__text footer__contact">
                        ${buildIconMarkup("fas fa-envelope", "footer__icon")}
                        <span>${copy.emailValue}</span>
                    </p>
                    <p class="footer__text footer__contact">
                        ${buildIconMarkup("fas fa-map-marker-alt", "footer__icon")}
                        <span>${copy.locationValue}</span>
                    </p>
                </div>
                <div class="footer__section">
                    <h3 class="footer__title">${copy.navTitle}</h3>
                    <a href="${getPageUrl(currentPaths.main)}" class="footer__link" data-i18n="nav.main"></a>
                    <a href="${getPageUrl(currentPaths.map)}" class="footer__link" data-i18n="nav.map"></a>
                    <a href="${getPageUrl(currentPaths.booking)}" class="footer__link" data-i18n="nav.booking"></a>
                    <a href="${getPageUrl(currentPaths.contacts)}" class="footer__link" data-i18n="nav.contacts"></a>
                </div>
                <div class="footer__section">
                    <h3 class="footer__title">${copy.socialTitle}</h3>
                    <a href="https://www.instagram.com/kvartiry_posutochno_uzhgorod?igsh=cXA0dHdmbWFrajQ0&utm_source=qr" target="_blank" rel="noopener noreferrer" class="footer__link">${buildInfoMarkup(copy.instagram, "fab fa-instagram", { iconClassName: "footer__icon" })}</a>
                    <a href="https://www.facebook.com/GILapartments?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" class="footer__link">${buildInfoMarkup(copy.facebook, "fab fa-facebook-f", { iconClassName: "footer__icon" })}</a>
                    <a href="https://t.me/GIL_Apartments_Bot" target="_blank" rel="noopener noreferrer" class="footer__link">${buildInfoMarkup(copy.telegram, "fab fa-telegram-plane", { iconClassName: "footer__icon" })}</a>
                    <a href="#" rel="noopener noreferrer" class="footer__link">${buildInfoMarkup(copy.AboutUs, "fas fa-info-circle", { iconClassName: "footer__icon" })}</a>
                </div>
            </div>
            <div class="footer__bottom">
                <p class="footer__copyright">${copy.copyright}</p>
                <p class="footer__copyright">${copy.madeBy}</p>
            </div>
        </footer>
    `;
};

const mountSiteHeader = () => {
    const headerRoot = document.querySelector("[data-site-header]");
    if (!headerRoot) {
        return;
    }

    const page = document.body?.dataset.page || "main";
    headerRoot.innerHTML = buildHeaderMarkup(page);
    window.translatePage?.(headerRoot);

    headerRoot.querySelectorAll("[data-lang-choice]").forEach((link) => {
        link.addEventListener("click", () => {
            window.localStorage.setItem("siteLanguage", link.dataset.langChoice);
        });
    });
};

const mountSiteFooter = () => {
    const footerRoot = document.querySelector("[data-site-footer]");
    if (!footerRoot) {
        return;
    }

    footerRoot.innerHTML = buildFooterMarkup();
    window.translatePage?.(footerRoot);
};

const mountSiteGradient = () => {
    if (!document.body || document.querySelector(".gradient")) {
        return;
    }

    const gradient = document.createElement("div");
    gradient.className = "gradient";
    const headerRoot = document.querySelector("[data-site-header]");

    if (headerRoot) {
        headerRoot.insertAdjacentElement("afterend", gradient);
        return;
    }

    document.body.prepend(gradient);
};

const normalizeDocumentTitle = (title, lang = getCurrentLang()) => {
    const brand = "G.I.L Apartments";
    const fallbackTitle = getStaticCopy(lang).defaultTitle;
    const value = String(title || "").trim().replace(/\bG\.I\.L\b/g, brand);

    if (!value || value === brand) {
        return fallbackTitle;
    }

    if (value.startsWith(`${brand} | `)) {
        return value;
    }

    if (value.endsWith(`| ${brand}`)) {
        const pageTitle = value.slice(0, value.length - (`| ${brand}`).length).trim();
        return pageTitle ? `${brand} | ${pageTitle}` : fallbackTitle;
    }

    return `${brand} | ${value}`;
};

const updateDocumentTitle = (key, options = {}) => {
    const lang = options.lng || getCurrentLang();
    document.title = normalizeDocumentTitle(translateKey(key, options), lang);
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
        html: "<span aria-hidden=\"true\">&#127970;</span>",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -14]
    });
};

const buildApartmentMapPopup = (apartment, lang = getCurrentLang(), options = {}) => {
    const { includeDetails = true, imageSrc = getAssetUrl(apartment.img), title = getApartmentTitle(apartment, lang) } = options;
    const routeText =
        translateKey("common.actions.route", {
            lng: lang,
            defaultValue: getStaticCopy(lang).routeText
        }) || getStaticCopy(lang).routeText;
    const detailsText = translateKey("common.actions.details", { lng: lang });
    const routeUrl =
        apartment.route_url ||
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${apartment.lat},${apartment.lng}`)}`;
    const detailsMarkup = includeDetails
        ? `<a href="${getApartmentUrl(apartment.id || apartment._id, lang)}" class="popup-btn">${detailsText}</a>`
        : "";

    return `
        <div class="popup${includeDetails ? "" : " popup--single-action"}">
            <div class="popup__media">
                <img src="${imageSrc}" width="200" alt="${title}">
            </div>
            <div class="popup__content">
                <h3 class="popup__title">${title}</h3>
                <p class="popup__price">${formatPrice(apartment.price || 0, lang)}</p>
                <div class="popup__actions">
                    ${detailsMarkup}
                    <a href="${routeUrl}" class="popup-btn popup-btn_secondary" target="_blank" rel="noopener noreferrer">${routeText}</a>
                </div>
            </div>
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

const initSiteChrome = () => {
    mountSiteHeader();
    mountSiteGradient();
    mountSiteFooter();

    const pageTitleKey = document.body?.dataset.titleKey;
    if (pageTitleKey) {
        updateDocumentTitle(pageTitleKey);
    }

    window.translatePage?.(document.body);
};

Promise.resolve(window.i18nReady)
    .then(initSiteChrome)
    .catch(() => {
        initSiteChrome();
    });

Object.assign(window, {
    SITE_ROOT,
    SITE_CONFIG,
    getCurrentLang,
    getAssetUrl,
    getPageUrl,
    getPageUrlWithCurrentParams,
    normalizeApartmentAddress,
    getApartmentTitle,
    getApartmentAddress,
    getApartmentDescription,
    getApartmentUrl,
    formatPrice,
    formatRooms,
    formatBeds,
    APARTMENT_FEATURE_DEFINITIONS,
    getFeatureDefinition,
    getFeatureLabel,
    buildIconMarkup,
    buildFeatureMarkup,
    buildInfoMarkup,
    getApartmentFeatures,
    buildHeaderMarkup,
    mountSiteHeader,
    buildFooterMarkup,
    mountSiteFooter,
    mountSiteGradient,
    updateDocumentTitle,
    createLeafletMap,
    createApartmentMarkerIcon,
    buildApartmentMapPopup,
    buildTelegramBotUrls,
    attachTelegramOpenBehavior,
    normalizeTextValue,
    normalizeDataTree
});
