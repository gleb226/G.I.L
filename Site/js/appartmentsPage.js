const createGalleryViewer = (gallery, apartmentTitle, imageElement) => {
    const overlay = document.createElement("div");
    overlay.className = "gallery_viewer";
    overlay.hidden = true;
    overlay.innerHTML = `
        <div class="gallery_viewer_backdrop" data-viewer-close></div>
        <div class="gallery_viewer_dialog" role="dialog" aria-modal="true" aria-label="${apartmentTitle}">
            <button type="button" class="gallery_viewer_close" aria-label="Close" data-viewer-close>&times;</button>
            <button type="button" class="gallery_viewer_nav gallery_viewer_prev" aria-label="Previous photo">&#10094;</button>
            <div class="gallery_viewer_stage">
                <img class="gallery_viewer_image" src="" alt="${apartmentTitle}">
            </div>
            <button type="button" class="gallery_viewer_nav gallery_viewer_next" aria-label="Next photo">&#10095;</button>
        </div>
    `;
    document.body.appendChild(overlay);

    const viewerImage = overlay.querySelector(".gallery_viewer_image");
    let currentIndex = 0;

    const render = () => {
        const src = window.getAssetUrl(gallery[currentIndex]);
        viewerImage.src = src;
        if (imageElement) {
            imageElement.src = src;
        }
    };

    const open = (index = 0) => {
        currentIndex = index;
        render();
        overlay.hidden = false;
        document.body.classList.add("viewer_open");
    };

    const close = () => {
        overlay.hidden = true;
        document.body.classList.remove("viewer_open");
    };

    const step = (direction) => {
        currentIndex = (currentIndex + direction + gallery.length) % gallery.length;
        render();
    };

    overlay.querySelectorAll("[data-viewer-close]").forEach((node) => {
        node.addEventListener("click", close);
    });
    overlay.querySelector(".gallery_viewer_prev").addEventListener("click", () => step(-1));
    overlay.querySelector(".gallery_viewer_next").addEventListener("click", () => step(1));

    let touchStartX = 0;
    let touchEndX = 0;

    overlay.addEventListener("touchstart", (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    overlay.addEventListener("touchend", (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchEndX - touchStartX;
        if (Math.abs(diff) > 50) {
            step(diff > 0 ? -1 : 1);
        }
    }, { passive: true });

    document.addEventListener("keydown", (event) => {
        if (overlay.hidden) {
            return;
        }
        if (event.key === "Escape") {
            close();
        } else if (event.key === "ArrowLeft") {
            step(-1);
        } else if (event.key === "ArrowRight") {
            step(1);
        }
    });

    return { open };
};

const normalizeSeoText = (value) =>
    String(value || "")
        .replace(/\s+/g, " ")
        .trim();

const truncateSeoText = (value, maxLength = 180) => {
    const normalized = normalizeSeoText(value);

    if (normalized.length <= maxLength) {
        return normalized;
    }

    const truncatedText = normalized.slice(0, Math.max(maxLength - 1, 0)).trimEnd();
    return `${truncatedText}...`;
    // Legacy fallback kept below for safe encoding migration.
    return `${normalized.slice(0, Math.max(maxLength - 1, 0)).trimEnd()}…`;
};

const buildApartmentSeoDescription = (apartment, lang = window.getCurrentLang()) => {
    const apartmentAddress = window.getApartmentAddress
        ? window.getApartmentAddress(apartment, lang)
        : (apartment?.address || "");
    const apartmentDescription = window.getApartmentDescription(apartment, lang) || "";
    const priceText = window.formatPrice(apartment?.price || 0, lang);
    const prefix = lang === "uk"
        ? `${apartmentAddress}. Подобова оренда квартири в Ужгороді від ${priceText}.`
        : `${apartmentAddress}. Daily apartment rental in Uzhhorod from ${priceText}.`;

    return truncateSeoText(`${prefix} ${apartmentDescription}`);
};

const buildApartmentStructuredData = ({
    apartment,
    lang,
    canonicalUrl,
    imageSources,
    description,
    title
}) => {
    const featureNames = window.getApartmentFeatures(apartment)
        .map((featureKey) => window.getFeatureLabel(featureKey, lang))
        .filter(Boolean);
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "Apartment",
        name: title,
        description,
        url: canonicalUrl,
        image: imageSources,
        numberOfRooms: apartment.rooms || undefined,
        address: {
            "@type": "PostalAddress",
            streetAddress: window.getApartmentAddress
                ? window.getApartmentAddress(apartment, lang)
                : (apartment.address || ""),
            addressLocality: "Uzhhorod",
            addressRegion: "Zakarpattia Oblast",
            addressCountry: "UA"
        },
        geo: apartment.lat && apartment.lng
            ? {
                "@type": "GeoCoordinates",
                latitude: apartment.lat,
                longitude: apartment.lng
            }
            : undefined,
        occupancy: apartment.guests || apartment.beds
            ? {
                "@type": "QuantitativeValue",
                maxValue: apartment.guests || apartment.beds
            }
            : undefined,
        amenityFeature: featureNames.map((name) => ({
            "@type": "LocationFeatureSpecification",
            name,
            value: true
        })),
        offers: {
            "@type": "Offer",
            price: apartment.price || 0,
            priceCurrency: "UAH",
            availability: apartment.is_available === false
                ? "https://schema.org/OutOfStock"
                : "https://schema.org/InStock",
            url: canonicalUrl
        }
    };

    if (apartment.source_url) {
        structuredData.sameAs = [apartment.source_url];
    }

    return structuredData;
};

const syncApartmentSeo = ({ apartment, title, description, imageSources, imageAlt, canonicalUrl, lang }) => {
    window.updateSeoMetadata?.({
        title,
        lang,
        description,
        canonicalUrl,
        robots: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
        ogType: "article",
        ogImage: imageSources[0],
        ogImageAlt: imageAlt,
        twitterImage: imageSources[0],
        twitterImageAlt: imageAlt
    });

    window.updateStructuredData?.("apartment", buildApartmentStructuredData({
        apartment,
        lang,
        canonicalUrl,
        imageSources,
        description,
        title
    }));
};

const syncApartmentSeoFallback = (lang = window.getCurrentLang()) => {
    const fallbackTitle = window.t("pages.apartment.fallbackTitle", { lng: lang });
    const fallbackDescription = window.t("pages.apartment.fallbackDescription", { lng: lang });
    const genericUrl = window.getPageUrl("html/appartments.html");
    const fallbackImage = window.getAssetUrl("images/logo.png");

    window.updateSeoMetadata?.({
        title: fallbackTitle,
        lang,
        description: fallbackDescription,
        canonicalUrl: genericUrl,
        robots: "noindex, follow",
        ogType: "website",
        ogImage: fallbackImage,
        ogImageAlt: "G.I.L Apartments logo",
        twitterImage: fallbackImage,
        twitterImageAlt: "G.I.L Apartments logo"
    });

    window.updateStructuredData?.("apartment", null);
};

const initApartmentPage = () => {
    const apartmentId = new URLSearchParams(window.location.search).get("id");
    const apartment = window.getApartmentById(apartmentId);
    const pageLang = window.getCurrentLang();

    if (apartment) {
        const title = document.getElementById("title");
        const price = document.getElementById("price");
        const image = document.getElementById("image");
        const address = document.getElementById("address");
        const description = document.getElementById("description");
        const rentButton = document.querySelector(".rent_btn");
        const apartmentFeatures = document.getElementById("apartmentFeatures");
        const apartmentFeaturesBox = document.getElementById("apartmentFeaturesBox");
        const bookingSummary = document.getElementById("bookingRangeSummary");
        const availabilityCalendarRoot = document.getElementById("apartmentAvailabilityCalendar");
        const availabilityPanel = document.getElementById("apartmentAvailabilityPanel");

        const apartmentTitle = window.getApartmentTitle(apartment, pageLang) || "Apartment";
        const apartmentDescription = window.getApartmentDescription(apartment, pageLang) || "-";
        const gallery = apartment.gallery?.length ? apartment.gallery : [apartment.img];
        const mainImageSrc = window.getAssetUrl(gallery[0]);
        const imageSources = gallery.map((galleryImage) => window.getAssetUrl(galleryImage));
        const canonicalUrl = window.getApartmentUrl(apartment.id || apartment._id, pageLang);
        const seoDescription = buildApartmentSeoDescription(apartment, pageLang);
        const galleryViewer = createGalleryViewer(gallery, apartmentTitle, image);
        const dateUtils = window.AvailabilityCalendarUtils || null;
        const bookingRanges = apartment.isBooked && apartment.checkInDate && apartment.checkOutDate
            ? [{
                start: apartment.checkInDate,
                end: apartment.checkOutDate
            }]
            : [];

        syncApartmentSeo({
            apartment,
            title: apartmentTitle,
            description: seoDescription,
            imageSources,
            imageAlt: apartmentTitle,
            canonicalUrl,
            lang: pageLang
        });

        if (title) {
            title.textContent = apartmentTitle;
            window.updateDocumentTitle("pages.apartment.detailTitle", { lng: pageLang, title: apartmentTitle });
        }

        if (description) {
            description.textContent = apartmentDescription;
        }

        if (price) {
            const priceValue = apartment.price || 0;
            price.textContent = window.formatPrice(priceValue, pageLang);
        }



        const roomsEl = document.getElementById("rooms");
        if (roomsEl) {
            roomsEl.innerHTML = window.buildInfoMarkup(window.formatRooms(apartment.rooms, pageLang), "fas fa-door-open", {
                iconClassName: "apartment_meta_icon",
                labelClassName: "apartment_meta_label"
            });
        }

        const bedsEl = document.getElementById("beds");
        if (bedsEl) {
            bedsEl.innerHTML = window.buildInfoMarkup(window.formatBeds(apartment.beds, pageLang), "fas fa-bed", {
                iconClassName: "apartment_meta_icon",
                labelClassName: "apartment_meta_label"
            });
        }


        if (address) {
            address.textContent = window.getApartmentAddress
                ? window.getApartmentAddress(apartment, pageLang)
                : (apartment.address || "");
        }

        if (rentButton) {
            const botUsername = "GIL_Apartments_Bot";
            window.attachTelegramOpenBehavior?.(rentButton, botUsername, `book_${apartment.id || apartment._id}`);
            rentButton.textContent = window.t("common.actions.rent", { lng: pageLang });
        }

        if (apartmentFeatures && apartmentFeaturesBox) {
            const featureKeys = window.getApartmentFeatures(apartment);

            if (featureKeys.length === 0) {
                apartmentFeaturesBox.hidden = true;
            } else {
                apartmentFeatures.innerHTML = "";
                featureKeys.forEach((featureKey) => {
                    const item = document.createElement("div");
                    item.className = "apartment_feature_item";
                    item.innerHTML = window.buildFeatureMarkup(featureKey, pageLang, {
                        iconClassName: "apartment_feature_icon",
                        labelClassName: "apartment_feature_label"
                    });
                    apartmentFeatures.appendChild(item);
                });
            }
        }

        if (image) {
            image.src = mainImageSrc;
            image.alt = apartmentTitle;
            image.onerror = () => {
                image.src = window.getAssetUrl("images/logo.png");
                image.classList.add("is-fallback");
            };
            image.addEventListener("click", () => galleryViewer.open(0));
        }

        const thumbsContainer = document.querySelector(".thumbs");
        if (thumbsContainer) {
            thumbsContainer.innerHTML = "";
            const visibleGallery = gallery.length > 5 ? gallery.slice(0, 4) : gallery;

            visibleGallery.forEach((galleryImage, index) => {
                const img = document.createElement("img");
                const src = window.getAssetUrl(galleryImage);
                img.src = src;
                img.alt = apartmentTitle;
                img.className = "thumb_image";
                img.loading = "lazy";
                img.onerror = () => {
                    img.src = window.getAssetUrl("images/logo.png");
                };
                img.addEventListener("click", () => {
                    if (image) {
                        image.src = src;
                    }
                    galleryViewer.open(index);
                });
                thumbsContainer.appendChild(img);
            });

            if (gallery.length > 5) {
                const moreButton = document.createElement("button");
                moreButton.type = "button";
                moreButton.className = "thumb_more";
                moreButton.textContent = `+${gallery.length - 4}`;
                moreButton.addEventListener("click", () => galleryViewer.open(4));
                thumbsContainer.appendChild(moreButton);
            }
        }

        const map = window.createLeafletMap("map", [apartment.lat, apartment.lng], 16);
        if (map) {
            const marker = L.marker([apartment.lat, apartment.lng], {
                icon: window.createApartmentMarkerIcon()
            }).addTo(map);

            marker.bindPopup(window.buildApartmentMapPopup(apartment, pageLang, {
                includeDetails: false,
                imageSrc: mainImageSrc,
                title: apartmentTitle
            }));
            marker.openPopup();
        }

        if (availabilityPanel && bookingSummary) {
            bookingSummary.textContent = bookingRanges.length > 0 && dateUtils
                ? window.t("pages.apartment.bookingRangeText", {
                    lng: pageLang,
                    start: dateUtils.formatDisplayDate(apartment.checkInDate, pageLang),
                    end: dateUtils.formatDisplayDate(apartment.checkOutDate, pageLang)
                })
                : window.t("pages.apartment.bookingOpen", { lng: pageLang });
        }

        if (availabilityCalendarRoot && typeof window.createAvailabilityCalendar === "function") {
            window.createAvailabilityCalendar(availabilityCalendarRoot, {
                lang: pageLang,
                allowSelection: false,
                bookedRanges: bookingRanges,
                initialFocusDate: apartment.checkInDate || undefined
            });
        }

        return;
    }

    const title = document.getElementById("title");
    const description = document.getElementById("description");
    const availabilityPanel = document.getElementById("apartmentAvailabilityPanel");

    if (title) {
        title.textContent = window.t("pages.apartment.fallbackTitle", { lng: pageLang });
    }

    if (description) {
        description.textContent = window.t("pages.apartment.fallbackDescription", { lng: pageLang });
    }

    if (availabilityPanel) {
        availabilityPanel.hidden = true;
    }

    syncApartmentSeoFallback(pageLang);
};

Promise.all([
    Promise.resolve(window.i18nReady).catch(() => undefined),
    Promise.resolve(window.apartmentsReady).catch(() => undefined)
]).then(() => {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initApartmentPage, { once: true });
    } else {
        initApartmentPage();
    }
});
