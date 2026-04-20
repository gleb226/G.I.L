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

        const apartmentTitle = window.getApartmentTitle(apartment, pageLang) || "Apartment";
        const apartmentDescription = window.getApartmentDescription(apartment, pageLang) || "-";
        const gallery = apartment.gallery?.length ? apartment.gallery : [apartment.img];
        const mainImageSrc = window.getAssetUrl(gallery[0]);
        const galleryViewer = createGalleryViewer(gallery, apartmentTitle, image);

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
            image.addEventListener("click", () => galleryViewer.open(0));
        }

        const thumbsContainer = document.querySelector(".thumbs");
        if (thumbsContainer) {
            thumbsContainer.innerHTML = "";
            const visibleGallery = gallery.length > 4 ? gallery.slice(0, 3) : gallery;

            visibleGallery.forEach((galleryImage, index) => {
                const img = document.createElement("img");
                const src = window.getAssetUrl(galleryImage);
                img.src = src;
                img.alt = apartmentTitle;
                img.className = "thumb_image";
                img.loading = "lazy";
                img.addEventListener("click", () => {
                    if (image) {
                        image.src = src;
                    }
                    galleryViewer.open(index);
                });
                thumbsContainer.appendChild(img);
            });

            if (gallery.length > 4) {
                const moreButton = document.createElement("button");
                moreButton.type = "button";
                moreButton.className = "thumb_more";
                moreButton.textContent = `+${gallery.length - 3}`;
                moreButton.addEventListener("click", () => galleryViewer.open(3));
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

        return;
    }

    const title = document.getElementById("title");
    const description = document.getElementById("description");

    if (title) {
        title.textContent = window.t("pages.apartment.fallbackTitle", { lng: pageLang });
    }

    if (description) {
        description.textContent = window.t("pages.apartment.fallbackDescription", { lng: pageLang });
    }
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
