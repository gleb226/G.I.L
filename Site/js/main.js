const initMainPage = () => {
    const apartmentsData = Array.isArray(window.apartments) ? window.apartments : [];
    const featureDefinitions = Array.isArray(window.APARTMENT_FEATURE_DEFINITIONS) ? window.APARTMENT_FEATURE_DEFINITIONS : [];
    const filterToggle = document.getElementById("filterToggle");
    const filterPanel = document.getElementById("filterPanel");
    const filterOverlay = document.getElementById("filterOverlay");
    const filterForm = document.getElementById("filterForm");
    const filterReset = document.getElementById("filterReset");
    const flatsCatalog = document.getElementById("flatsCatalog");
    const catalogEmpty = document.getElementById("catalogEmpty");
    const heroFlatLink = document.getElementById("heroFlatLink");
    const heroImageCurrent = document.getElementById("heroFlatImageCurrent");
    const heroImageStage = document.querySelector(".hero_image_stage");
    const heroPriceTag = document.getElementById("heroPriceTag");
    const featureFilters = document.getElementById("featureFilters");
    const lang = window.getCurrentLang ? window.getCurrentLang() : "en";
    const selectedFeatureKeys = new Set();
    let heroCarouselApartments = apartmentsData.slice();
    let heroCarouselIndex = 0;
    let heroCarouselTimer = null;
    let heroIsAnimating = false;

    let heroImageNext = document.getElementById("heroFlatImageNext");
    if (!heroImageNext && heroImageStage) {
        heroImageNext = document.createElement("img");
        heroImageNext.id = "heroFlatImageNext";
        heroImageNext.className = "hero_flat_image hero_flat_image_next";
        heroImageNext.alt = "";
        heroImageStage.appendChild(heroImageNext);
    }

    const getText = (key, options = {}) => window.t(key, { lng: lang, ...options });

    const setFilterState = (isOpen) => {
        if (!filterPanel || !filterOverlay || !filterToggle) {
            return;
        }

        filterPanel.classList.toggle("is-open", isOpen);
        filterOverlay.classList.toggle("is-open", isOpen);
        filterToggle.setAttribute("aria-expanded", String(isOpen));
    };

    if (filterToggle && filterPanel && filterOverlay) {
        filterToggle.addEventListener("click", () => {
            const isOpen = filterToggle.getAttribute("aria-expanded") === "true";
            setFilterState(!isOpen);
        });

        filterOverlay.addEventListener("click", () => setFilterState(false));

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                setFilterState(false);
            }
        });
    }

    const createApartmentCard = (apartment) => {
        const article = document.createElement("article");
        article.className = "flat_card flat_card_linked";

        const apartmentTitle = window.getApartmentTitle(apartment, lang);
        const apartmentUrl = window.getApartmentUrl(apartment.id, lang);

        article.innerHTML = `
            <a href="${apartmentUrl}" class="flat_card_anchor" aria-label="${getText("common.actions.open")} ${apartmentTitle}"></a>
            <img src="${window.getAssetUrl(apartment.img)}" alt="${apartmentTitle}" class="flat_card_image" loading="lazy" decoding="async">
            <div class="flat_card_body">
                <p class="flat_location">${apartmentTitle}</p>
                <div class="flat_card_details">
                    <span class="flat_detail">${window.formatGuests(apartment.guests, lang)}</span>
                    <span class="flat_detail">${window.formatRooms(apartment.rooms, lang)}</span>
                    <span class="flat_detail">${window.formatBeds(apartment.beds, lang)}</span>
                </div>
                <div class="flat_meta">
                    <span class="flat_price">${window.formatPrice(apartment.price, lang)}</span>
                    <a href="${apartmentUrl}" class="flat_button">${getText("common.actions.rent")}</a>
                </div>
            </div>
        `;

        return article;
    };

    const renderCatalog = (catalogApartments) => {
        if (!flatsCatalog || !catalogEmpty) {
            return;
        }

        flatsCatalog.innerHTML = "";
        catalogEmpty.textContent = getText("pages.main.empty");

        if (catalogApartments.length === 0) {
            catalogEmpty.hidden = false;
            return;
        }

        catalogEmpty.hidden = true;
        catalogApartments.forEach((apartment) => {
            flatsCatalog.appendChild(createApartmentCard(apartment));
        });
    };

    const updateHero = (apartment) => {
        if (!apartment || !heroImageCurrent || !heroFlatLink) {
            return;
        }

        const heroTitle = window.getApartmentTitle(apartment, lang);

        heroFlatLink.href = window.getApartmentUrl(apartment.id, lang);
        heroImageCurrent.src = window.getAssetUrl(apartment.img);
        heroImageCurrent.alt = heroTitle;

        if (heroPriceTag) {
            heroPriceTag.textContent = window.formatPrice(apartment.price, lang);
        }
    };

    const animateHeroToApartment = (apartment) => {
        if (!apartment || !heroImageCurrent || !heroImageNext || !heroImageStage || heroIsAnimating) {
            return;
        }

        heroIsAnimating = true;
        const heroTitle = window.getApartmentTitle(apartment, lang);

        heroImageNext.src = window.getAssetUrl(apartment.img);
        heroImageNext.alt = heroTitle;
        heroFlatLink.href = window.getApartmentUrl(apartment.id, lang);

        if (heroPriceTag) {
            heroPriceTag.textContent = window.formatPrice(apartment.price, lang);
        }

        heroImageStage.classList.remove("is-sliding");
        void heroImageStage.offsetWidth;
        heroImageStage.classList.add("is-sliding");

        window.setTimeout(() => {
            heroImageCurrent.src = heroImageNext.src;
            heroImageCurrent.alt = heroTitle;
            heroImageNext.alt = "";
            heroImageStage.classList.remove("is-sliding");
            heroIsAnimating = false;
        }, 650);
    };

    const stopHeroCarousel = () => {
        if (heroCarouselTimer) {
            window.clearInterval(heroCarouselTimer);
            heroCarouselTimer = null;
        }
    };

    const startHeroCarousel = (carouselApartments) => {
        stopHeroCarousel();

        heroCarouselApartments = carouselApartments.length > 0 ? carouselApartments : apartmentsData;
        heroCarouselIndex = 0;
        updateHero(heroCarouselApartments[0]);

        if (heroCarouselApartments.length < 2) {
            return;
        }

        heroCarouselTimer = window.setInterval(() => {
            heroCarouselIndex = (heroCarouselIndex + 1) % heroCarouselApartments.length;
            animateHeroToApartment(heroCarouselApartments[heroCarouselIndex]);
        }, 3200);
    };

    const getNumericValue = (formData, key) => {
        const value = Number(formData.get(key));
        return Number.isFinite(value) && value > 0 ? value : null;
    };

    const renderFeatureFilters = () => {
        if (!featureFilters) {
            return;
        }

        featureFilters.innerHTML = "";

        featureDefinitions.forEach((feature) => {
            const isSelected = selectedFeatureKeys.has(feature.key);
            const button = document.createElement("button");

            button.type = "button";
            button.className = `filter_feature_tag${isSelected ? " is-selected" : ""}`;
            button.dataset.feature = feature.key;
            button.setAttribute("aria-pressed", String(isSelected));
            button.innerHTML = `
                <span class="filter_feature_check">&#10003;</span>
                <span class="filter_feature_label">${window.getFeatureLabel(feature.key, lang)}</span>
                <span class="filter_feature_remove" aria-hidden="true">${isSelected ? "&times;" : ""}</span>
            `;

            button.addEventListener("click", () => {
                if (selectedFeatureKeys.has(feature.key)) {
                    selectedFeatureKeys.delete(feature.key);
                } else {
                    selectedFeatureKeys.add(feature.key);
                }

                renderFeatureFilters();
                applyFilters();
            });

            featureFilters.appendChild(button);
        });
    };

    const getFilters = () => {
        if (!filterForm) {
            return {
                rooms: null,
                priceFrom: null,
                priceTo: null,
                monthFrom: null,
                monthTo: null,
                bedsFrom: null,
                bedsTo: null,
                features: []
            };
        }

        const formData = new FormData(filterForm);

        return {
            rooms: getNumericValue(formData, "rooms"),
            priceFrom: getNumericValue(formData, "price_from"),
            priceTo: getNumericValue(formData, "price_to"),
            monthFrom: getNumericValue(formData, "month_from"),
            monthTo: getNumericValue(formData, "month_to"),
            bedsFrom: getNumericValue(formData, "beds_from"),
            bedsTo: getNumericValue(formData, "beds_to"),
            features: Array.from(selectedFeatureKeys)
        };
    };

    const apartmentMatchesFilters = (apartment, filters) => {
        if (filters.rooms !== null && apartment.rooms !== filters.rooms) return false;
        if (filters.priceFrom !== null && apartment.price < filters.priceFrom) return false;
        if (filters.priceTo !== null && apartment.price > filters.priceTo) return false;
        if (filters.monthFrom !== null && apartment.availableFromMonth > filters.monthFrom) return false;
        if (filters.monthTo !== null && apartment.availableToMonth < filters.monthTo) return false;
        if (filters.bedsFrom !== null && apartment.beds < filters.bedsFrom) return false;
        if (filters.bedsTo !== null && apartment.beds > filters.bedsTo) return false;

        if (filters.features.length > 0) {
            const apartmentFeatures = window.getApartmentFeatures(apartment);
            const hasAllSelectedFeatures = filters.features.every((featureKey) => apartmentFeatures.includes(featureKey));

            if (!hasAllSelectedFeatures) {
                return false;
            }
        }

        return true;
    };

    const applyFilters = () => {
        const filters = getFilters();
        const filteredApartments = apartmentsData.filter((apartment) => apartmentMatchesFilters(apartment, filters));

        renderCatalog(filteredApartments);
        startHeroCarousel(filteredApartments);
    };

    renderFeatureFilters();
    renderCatalog(apartmentsData);
    startHeroCarousel(apartmentsData);

    if (filterForm) {
        filterForm.addEventListener("submit", (event) => {
            event.preventDefault();
            applyFilters();
            setFilterState(false);
        });

        filterForm.addEventListener("change", () => {
            applyFilters();
        });

        filterForm.querySelectorAll("select").forEach((select) => {
            select.addEventListener("input", () => {
                applyFilters();
            });
        });
    }

    if (filterReset && filterForm) {
        filterReset.addEventListener("click", () => {
            filterForm.reset();
            selectedFeatureKeys.clear();
            renderFeatureFilters();
            applyFilters();
        });
    }
};

Promise.all([
    Promise.resolve(window.i18nReady).catch(() => undefined),
    Promise.resolve(window.apartmentsReady).catch(() => undefined)
]).then(() => {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initMainPage, { once: true });
    } else {
        initMainPage();
    }
});
