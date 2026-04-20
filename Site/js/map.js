const initMapPage = () => {
    const mapLang = window.getCurrentLang();
    const map = window.createLeafletMap("map", [48.61939, 22.28306], 13);
    const apartmentMarkerIcon = window.createApartmentMarkerIcon();

    if (!map) {
        return;
    }

    window.apartments.forEach((apartment) => {
        const marker = L.marker([apartment.lat, apartment.lng], {
            icon: apartmentMarkerIcon
        }).addTo(map);

        marker.bindPopup(window.buildApartmentMapPopup(apartment, mapLang));
    });
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
