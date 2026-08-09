const initMapPage = () => {
    const mapLang = window.getCurrentLang();
    const map = window.createLeafletMap("map", [48.61939, 22.28306], 13);

    if (!map) {
        return;
    }

    const addressGroups = {};
    window.apartments.forEach((apartment) => {
        const addr = (apartment.address || "").trim().toLowerCase();
        if (!addressGroups[addr]) {
            addressGroups[addr] = [];
        }
        addressGroups[addr].push(apartment);
    });

    Object.values(addressGroups).forEach((group) => {
        if (group.length === 0) return;
        const representative = group[0];
        const icon = window.createApartmentMarkerIcon(group.length > 1 ? group : representative, mapLang);
        const marker = L.marker([representative.lat, representative.lng], {
            icon: icon
        }).addTo(map);

        if (group.length === 1) {
            marker.bindPopup(window.buildApartmentMapPopup(representative, mapLang));
        } else {
            const popupContent = buildMultiApartmentPopup(group, mapLang);
            marker.bindPopup(popupContent, { maxWidth: 340 });
        }
    });

    map.on("popupopen", (e) => {
        const popupEl = e.popup.getElement();
        if (!popupEl) return;

        const slider = popupEl.querySelector("[data-multi-slider]");
        if (!slider) return;

        const slides = slider.querySelectorAll(".popup_card_slide");
        const counterEl = slider.querySelector(".multi_current_idx");
        const prevBtn = slider.querySelector(".multi_prev");
        const nextBtn = slider.querySelector(".multi_next");
        let currentIdx = 0;

        const updateSlide = (idx) => {
            currentIdx = (idx + slides.length) % slides.length;
            slides.forEach((slide, i) => {
                slide.classList.toggle("is-active", i === currentIdx);
            });
            if (counterEl) counterEl.textContent = String(currentIdx + 1);
        };

        if (prevBtn) prevBtn.addEventListener("click", () => updateSlide(currentIdx - 1));
        if (nextBtn) nextBtn.addEventListener("click", () => updateSlide(currentIdx + 1));
    });
};

const buildMultiApartmentPopup = (apartments, lang) => {
    const routeText = window.translateKey
        ? window.translateKey("common.actions.route", { lng: lang, defaultValue: "Build route" })
        : "Build route";
    const detailsText = window.translateKey
        ? window.translateKey("common.actions.details", { lng: lang, defaultValue: "Детальніше" })
        : "Детальніше";

    const slidesMarkup = apartments.map((ap, index) => {
        const title = window.getApartmentTitle(ap, lang);
        const price = window.formatPrice(ap.price || 0, lang);
        const imageSrc = window.getAssetUrl(ap.img);
        const detailsUrl = window.getApartmentUrl(ap.id || ap._id, lang);
        const routeUrl = ap.route_url || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${ap.lat},${ap.lng}`)}`;

        return `
            <div class="popup_card_slide${index === 0 ? " is-active" : ""}">
                <div class="popup__media">
                    <img src="${imageSrc}" alt="${title}">
                </div>
                <div class="popup__content">
                    <h3 class="popup__title">${title}</h3>
                    <p class="popup__price">${price} / добу</p>
                    <div class="popup__actions">
                        <a href="${detailsUrl}" class="popup-btn">${detailsText}</a>
                        <a href="${routeUrl}" class="popup-btn popup-btn_secondary" target="_blank" rel="noopener noreferrer">${routeText}</a>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    return `
        <div class="map_multi_slider" data-multi-slider>
            <div class="map_multi_header">
                <span class="map_multi_counter"><span class="multi_current_idx">1</span> / ${apartments.length}</span>
                <div class="map_multi_controls">
                    <button type="button" class="multi_nav_btn multi_prev" aria-label="Попередня">&lsaquo;</button>
                    <button type="button" class="multi_nav_btn multi_next" aria-label="Наступна">&rsaquo;</button>
                </div>
            </div>
            <div class="map_multi_slides">
                ${slidesMarkup}
            </div>
        </div>
    `;
};

Promise.all([
    Promise.resolve(window.i18nReady).catch(() => undefined),
    Promise.resolve(window.apartmentsReady).catch(() => undefined)
]).then(() => {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initMapPage, { once: true });
    } else {
        initMapPage();
    }
});
