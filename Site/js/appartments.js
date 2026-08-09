const mapApartmentsData = (data) => {
    if (!Array.isArray(data)) {
        return [];
    }

    return data
        .filter((apartment) => apartment?.is_available !== false)
        .map((apartment) => {
            const normalizedApartment = window.normalizeDataTree ? window.normalizeDataTree(apartment) : apartment;
            const roomsCount = Number(normalizedApartment.rooms) || 1;
            const extId = Number(normalizedApartment.external_id || 100);

            let areaVal = normalizedApartment.area;
            if (!areaVal || areaVal === "-") {
                if (roomsCount === 1) {
                    areaVal = `${35 + (extId % 12)} м²`;
                } else if (roomsCount === 2) {
                    areaVal = `${52 + (extId % 15)} м²`;
                } else {
                    areaVal = `${75 + (extId % 20)} м²`;
                }
            }

            const totalBeds = Number(normalizedApartment.beds) || 1;
            let doubleBeds = normalizedApartment.double_beds;
            let singleBeds = normalizedApartment.single_beds;
            if (doubleBeds === undefined || singleBeds === undefined) {
                if (totalBeds === 1) {
                    doubleBeds = 1;
                    singleBeds = 0;
                } else if (totalBeds === 2) {
                    doubleBeds = 1;
                    singleBeds = 0;
                } else if (totalBeds === 3) {
                    doubleBeds = 1;
                    singleBeds = 1;
                } else if (totalBeds >= 4) {
                    doubleBeds = 2;
                    singleBeds = 0;
                } else {
                    doubleBeds = 1;
                    singleBeds = 0;
                }
            }

            return {
                ...normalizedApartment,
                id: apartment.external_id || apartment._id,
                area: areaVal,
                double_beds: doubleBeds,
                single_beds: singleBeds,
                video: normalizedApartment.video || null,
                isBooked: normalizedApartment.isBooked ?? normalizedApartment.isbooked ?? false,
                checkInDate: normalizedApartment.checkInDate ?? null,
                checkOutDate: normalizedApartment.checkOutDate ?? null
            };
        });
};

const setApartments = (data) => {
    const mapped = mapApartmentsData(data);
    window.apartments = mapped;
    window.dispatchEvent(new CustomEvent("apartmentsLoaded"));
    return mapped;
};

const getEmbeddedApartmentsData = () =>
    Array.isArray(window.APARTMENTS_DATA) ? window.APARTMENTS_DATA : null;

const loadApartments = async () => {
    const apiUrl = window.getAssetUrl ? window.getAssetUrl("api/apartments") : "api/apartments";
    const fallbackUrl = window.getAssetUrl ? window.getAssetUrl("api/apartments.json") : "api/apartments.json";
    const embeddedData = getEmbeddedApartmentsData();
    const isFileProtocol = window.location.protocol === "file:";

    if (isFileProtocol && embeddedData) {
        return setApartments(embeddedData);
    }

    try {
        const urls = [apiUrl, fallbackUrl];

        for (const url of urls) {
            try {
                const resp = await fetch(url, { cache: "no-cache" });

                if (!resp.ok) {
                    throw new Error(`Failed to fetch apartments from ${url}`);
                }

                const data = await resp.json();

                if (url === apiUrl && (!Array.isArray(data) || data.length === 0)) {
                    throw new Error("Primary apartments API returned no apartments");
                }

                return setApartments(data);
            } catch (error) {
                console.error(`Error loading apartments from ${url}:`, error);
            }
        }
    } catch (error) {
        console.error("Error loading apartments:", error);
    }

    if (embeddedData) {
        return setApartments(embeddedData);
    }

    return setApartments([]);
};

const getApartmentById = (id) => {
    if (!window.apartments) return null;
    return window.apartments.find((ap) => String(ap.id) === String(id) || String(ap._id) === String(id));
};

window.getApartmentById = getApartmentById;
window.loadApartments = loadApartments;
window.apartmentsReady = loadApartments();
