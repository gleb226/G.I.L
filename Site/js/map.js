const initMapPage = () => {
    const mapLang = window.getCurrentLang();
    const map = window.createLeafletMap("map", [48.61939, 22.28306], 13);
    const apartmentMarkerIcon = window.createApartmentMarkerIcon();

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
        const marker = L.marker([representative.lat, representative.lng], {
            icon: apartmentMarkerIcon
        }).addTo(map);

        if (group.length === 1) {
            marker.bindPopup(window.buildApartmentMapPopup(representative, mapLang));
        } else {
            const popupContent = buildMultiApartmentPopup(group, mapLang);
            marker.bindPopup(popupContent, { maxWidth: 320 });
        }
    });
};

const buildMultiApartmentPopup = (apartments, lang) => {
    const items = apartments.map((ap) => {
        const title = window.getApartmentTitle(ap, lang);
        const price = window.formatPrice(ap.price || 0, lang);
        const imgSrc = window.getAssetUrl(ap.img);
        const detailsUrl = window.getApartmentUrl(ap.id || ap._id, lang);
        return `
            <a href="${detailsUrl}" class="map-multi-item">
                <img src="${imgSrc}" alt="${title}" class="map-multi-img" />
                <div class="map-multi-info">
                    <span class="map-multi-title">${title}</span>
                    <span class="map-multi-price">${price}</span>
                </div>
            </a>
        `;
    }).join("");

    return `<div class="map-multi-popup">${items}</div>`;
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
