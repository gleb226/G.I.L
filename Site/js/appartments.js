const loadApartments = async () => {
    const apiUrl = window.getAssetUrl ? window.getAssetUrl('api/apartments') : 'api/apartments';
    const fallbackUrl = window.getAssetUrl ? window.getAssetUrl('api/apartments.json') : 'api/apartments.json';

    try {
        const urls = [apiUrl, fallbackUrl];
        for (const url of urls) {
            try {
                const resp = await fetch(url, { cache: 'no-cache' });
                if (!resp.ok) {
                    throw new Error(`Failed to fetch apartments from ${url}`);
                }

                const data = await resp.json();
                if (url === apiUrl && (!Array.isArray(data) || data.length === 0)) {
                    throw new Error("Primary apartments API returned no apartments");
                }
                const mapped = data
                    .filter((ap) => ap?.is_available !== false)
                    .map(ap => ({
                        ...(window.normalizeDataTree ? window.normalizeDataTree(ap) : ap),
                        id: ap.external_id || ap._id
                    }));

                window.apartments = mapped;
                window.dispatchEvent(new CustomEvent('apartmentsLoaded'));
                return mapped;
            } catch (error) {
                console.error(`Error loading apartments from ${url}:`, error);
            }
        }
    } catch (e) {
        console.error("Error loading apartments:", e);
    }

    window.apartments = [];
    window.dispatchEvent(new CustomEvent('apartmentsLoaded'));
    return window.apartments;
};

const getApartmentById = (id) => {
    if (!window.apartments) return null;
    return window.apartments.find((ap) => String(ap.id) === String(id) || String(ap._id) === String(id));
};

window.getApartmentById = getApartmentById;
window.loadApartments = loadApartments;
window.apartmentsReady = loadApartments();
