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
    const availabilityCalendarRoot = document.getElementById("mainAvailabilityCalendar");
    const heroSection = document.querySelector(".hero_flat");
    const heroFlatLink = document.getElementById("heroFlatLink");
    const heroImageCurrent = document.getElementById("heroFlatImageCurrent");
    const heroImageStage = document.querySelector(".hero_image_stage");
    const heroPriceTag = document.getElementById("heroPriceTag");
    const heroAddressTag = document.getElementById("heroAddressTag");
    const featureFilters = document.getElementById("featureFilters");
    const roomsSelect = document.getElementById("rooms");
    const priceRangeRoot = filterForm ? filterForm.querySelector(".filter_range") : null;
    const lang = window.getCurrentLang ? window.getCurrentLang() : "en";
    const dateUtils = window.AvailabilityCalendarUtils || null;
    const urlParams = new URLSearchParams(window.location.search);
    const initialAvailabilityRange = dateUtils?.normalizeRange(
        urlParams.get("check_in"),
        urlParams.get("check_out")
    ) || {
        checkIn: null,
        checkOut: null
    };
    const selectedFeatureAliases = new Set();
    const apartmentPrices = apartmentsData
        .map((apartment) => Number(apartment.price))
        .filter((price) => Number.isFinite(price) && price > 0);
    const priceStep = 100;
    const priceMinGap = 100;
    const priceMinLimit = apartmentPrices.length > 0 ? Math.floor(Math.min(...apartmentPrices) / priceStep) * priceStep : 0;
    const priceMaxLimit = apartmentPrices.length > 0 ? Math.ceil(Math.max(...apartmentPrices) / priceStep) * priceStep : priceStep;
    const featureUrlAliasByKey = {
        microwave: "microwave",
        air_conditioner: "ac",
        near_supermarket: "store",
        smart_tv: "smart-tv",
        balcony: "balcony",
        gas_hob: "gas",
        electro_hob: "electric",
        parking: "parking",
        intercom: "intercom",
        washing_machine: "washer",
        refrigerator: "ref",
        hot_water: "hot-water",
        internet: "ethernet",
        wifi: "wifi",
        coded_entry: "coded-entry",
        fridge: "ref",
        good_transport: "transport",
        satellite_tv: "satellite-tv",
        tv: "tv",
        cable_tv: "cable-tv",
        t2_tv: "t2-tv",
        secure_parking: "secure-parking",
        hob: "hob"
    };
    const getFeatureUrlAlias = (featureKey) =>
        featureUrlAliasByKey[featureKey] || String(featureKey || "").trim().toLowerCase();
    const orderedFeatureAliases = Array.from(new Set(
        featureDefinitions.map((feature) => getFeatureUrlAlias(feature.key))
    ));
    const validFeatureAliases = new Set(orderedFeatureAliases);
    let effectivePriceMinGap = priceMinGap;
    let priceFromInput = null;
    let priceToInput = null;
    let priceFromRange = null;
    let priceToRange = null;
    let priceSlider = null;
    let priceTrackLayer = null;
    let priceRangeTrack = null;
    let availabilityCalendar = null;
    let selectedStay = {
        checkIn: initialAvailabilityRange.checkIn,
        checkOut: initialAvailabilityRange.checkOut,
        isComplete: !!initialAvailabilityRange.checkIn && !!initialAvailabilityRange.checkOut,
        nights: initialAvailabilityRange.checkIn && initialAvailabilityRange.checkOut && dateUtils
            ? dateUtils.diffInDays(initialAvailabilityRange.checkIn, initialAvailabilityRange.checkOut)
            : 0
    };
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
    const hasSelectedDates = () => !!selectedStay.checkIn || !!selectedStay.checkOut;
    const hasCompleteSelectedDates = () => !!selectedStay.checkIn && !!selectedStay.checkOut;

    const buildApartmentDetailUrl = (apartmentId) => {
        const url = new URL(window.getApartmentUrl(apartmentId, lang));

        if (selectedStay.checkIn) {
            url.searchParams.set("check_in", selectedStay.checkIn);
        }

        if (selectedStay.checkOut) {
            url.searchParams.set("check_out", selectedStay.checkOut);
        }

        return url.href;
    };

    const isApartmentBookedForSelectedDates = (apartment) => {
        if (!hasCompleteSelectedDates() || !dateUtils || !apartment?.isBooked) {
            return false;
        }

        return dateUtils.doRangesOverlap(
            selectedStay.checkIn,
            selectedStay.checkOut,
            apartment.checkInDate,
            apartment.checkOutDate
        );
    };

    const clampPrice = (value, fallback) => {
        if (value === "" || value === null || value === undefined) {
            return fallback;
        }

        const numericValue = Number(value);

        if (!Number.isFinite(numericValue)) {
            return fallback;
        }

        return Math.min(priceMaxLimit, Math.max(priceMinLimit, Math.round(numericValue / priceStep) * priceStep));
    };

    const lengthToPixels = (value, contextElement = document.documentElement) => {
        if (typeof value !== "string") {
            return Number(value) || 0;
        }

        const trimmedValue = value.trim();

        if (!trimmedValue) {
            return 0;
        }

        if (trimmedValue.endsWith("rem")) {
            return parseFloat(trimmedValue) * parseFloat(window.getComputedStyle(document.documentElement).fontSize || "16");
        }

        if (trimmedValue.endsWith("em")) {
            return parseFloat(trimmedValue) * parseFloat(window.getComputedStyle(contextElement).fontSize || "16");
        }

        return parseFloat(trimmedValue) || 0;
    };

    const updateEffectivePriceMinGap = () => {
        if (!priceSlider || !priceTrackLayer) {
            effectivePriceMinGap = priceMinGap;
            return effectivePriceMinGap;
        }

        const sliderStyles = window.getComputedStyle(priceSlider);
        const thumbSize = lengthToPixels(sliderStyles.getPropertyValue("--price-thumb-size"), priceSlider);
        const trackWidth = priceTrackLayer.getBoundingClientRect().width;
        const total = Math.max(priceMaxLimit - priceMinLimit, priceStep);

        if (thumbSize <= 0 || trackWidth <= 0 || total <= 0) {
            effectivePriceMinGap = priceMinGap;
            return effectivePriceMinGap;
        }

        const thumbCollisionSize = thumbSize * 1.4;
        const visualGap = Math.ceil(((thumbCollisionSize / trackWidth) * total) / priceStep) * priceStep;
        effectivePriceMinGap = Math.max(priceMinGap, visualGap);

        return effectivePriceMinGap;
    };

    const normalizePriceValues = ({
        rawFrom = priceFromInput?.value,
        rawTo = priceToInput?.value,
        activeHandle = ""
    } = {}) => {
        const minGap = updateEffectivePriceMinGap();
        let fromValue = clampPrice(rawFrom, priceMinLimit);
        let toValue = clampPrice(rawTo, priceMaxLimit);

        fromValue = Math.min(Math.max(fromValue, priceMinLimit), priceMaxLimit - minGap);
        toValue = Math.min(Math.max(toValue, priceMinLimit + minGap), priceMaxLimit);

        if (fromValue + minGap > toValue) {
            if (activeHandle === "to") {
                toValue = Math.min(priceMaxLimit, fromValue + minGap);
            } else {
                fromValue = Math.max(priceMinLimit, toValue - minGap);
            }
        }

        if (toValue > priceMaxLimit) {
            toValue = priceMaxLimit;
            fromValue = Math.min(fromValue, toValue - minGap);
        }

        if (fromValue < priceMinLimit) {
            fromValue = priceMinLimit;
            toValue = Math.max(toValue, fromValue + minGap);
        }

        if (fromValue + minGap > toValue) {
            toValue = Math.min(priceMaxLimit, Math.max(toValue, fromValue + minGap));
            fromValue = Math.max(priceMinLimit, Math.min(fromValue, toValue - minGap));
        }

        return {
            from: fromValue,
            to: toValue
        };
    };
    const updatePriceTrack = (from, to) => {
        if (!priceRangeTrack) {
            return;
        }

        const total = Math.max(priceMaxLimit - priceMinLimit, priceStep);
        const fromPercent = ((from - priceMinLimit) / total) * 100;
        const toPercent = ((to - priceMinLimit) / total) * 100;

        priceRangeTrack.style.left = `${fromPercent}%`;
        priceRangeTrack.style.width = `${Math.max(toPercent - fromPercent, 0)}%`;
    };

    const getHandleFromPointer = (clientX) => {
        if (!priceTrackLayer || !priceFromRange || !priceToRange) {
            return "";
        }

        const trackRect = priceTrackLayer.getBoundingClientRect();
        const trackWidth = trackRect.width;
        const total = Math.max(priceMaxLimit - priceMinLimit, priceStep);

        if (trackWidth <= 0 || total <= 0) {
            return "";
        }

        const fromValue = Number(priceFromRange.value);
        const toValue = Number(priceToRange.value);
        const fromX = trackRect.left + ((fromValue - priceMinLimit) / total) * trackWidth;
        const toX = trackRect.left + ((toValue - priceMinLimit) / total) * trackWidth;
        const fromDistance = Math.abs(clientX - fromX);
        const toDistance = Math.abs(clientX - toX);

        if (fromDistance === toDistance) {
            return clientX <= (fromX + toX) / 2 ? "from" : "to";
        }

        return fromDistance < toDistance ? "from" : "to";
    };

    const updateActiveHandleFromPointer = (event) => {
        const handle = getHandleFromPointer(event.clientX);

        if (handle) {
            updatePriceRangeOrder(handle);
        }
    };

    const handlePriceSliderResize = () => {
        if (!priceFromInput || !priceToInput) {
            return;
        }

        updateEffectivePriceMinGap();
        syncPriceControls({
            apply: false,
            rawFrom: priceFromInput.value,
            rawTo: priceToInput.value
        });
    };

    const updatePriceRangeOrder = (activeHandle = "") => {
        if (!priceFromRange || !priceToRange) {
            return;
        }

        const fromValue = Number(priceFromRange.value);
        const toValue = Number(priceToRange.value);
        const handlesOverlap = fromValue >= toValue;

        priceFromRange.classList.remove("is-active");
        priceToRange.classList.remove("is-active");

        if (activeHandle === "from") {
            priceFromRange.classList.add("is-active");
            return;
        }

        if (activeHandle === "to") {
            priceToRange.classList.add("is-active");
            return;
        }

        if (handlesOverlap) {
            priceToRange.classList.add("is-active");
            return;
        }

        priceFromRange.classList.add("is-active");
    };

    const syncPriceControls = ({
        activeHandle = "",
        apply = true,
        rawFrom = priceFromInput?.value,
        rawTo = priceToInput?.value
    } = {}) => {
        if (!priceFromInput || !priceToInput || !priceFromRange || !priceToRange) {
            return;
        }

        const values = normalizePriceValues({ rawFrom, rawTo, activeHandle });

        priceFromInput.value = String(values.from);
        priceToInput.value = String(values.to);
        priceFromRange.value = String(values.from);
        priceToRange.value = String(values.to);
        updatePriceTrack(values.from, values.to);
        updatePriceRangeOrder(activeHandle);

        if (apply) {
            applyFilters();
        }

        return values;
    };

    const syncFromNumberInput = () => {
        syncPriceControls({
            activeHandle: "from",
            rawFrom: priceFromInput?.value,
            rawTo: priceToInput?.value
        });
    };

    const syncToNumberInput = () => {
        syncPriceControls({
            activeHandle: "to",
            rawFrom: priceFromInput?.value,
            rawTo: priceToInput?.value
        });
    };

    const initPriceRange = () => {
        if (!priceRangeRoot) {
            return;
        }

        priceRangeRoot.innerHTML = `
            <div class="filter_price_section" data-price-ui-version="20260516-9">
                <div class="filter_price_slider_group">
                    <div class="filter_price_slider_shell">
                        <div class="filter_price_slider" aria-hidden="true">
                            <div class="filter_price_track_layer">
                                <div class="filter_price_track"></div>
                                <div class="filter_price_range" id="priceRangeTrack"></div>
                            </div>
                            <input type="range" id="priceFromRange" min="${priceMinLimit}" max="${priceMaxLimit - priceMinGap}" step="${priceStep}" value="${priceMinLimit}">
                            <input type="range" id="priceToRange" min="${priceMinLimit + priceMinGap}" max="${priceMaxLimit}" step="${priceStep}" value="${priceMaxLimit}">
                        </div>
                    </div>
                </div>
                <div class="filter_price_inputs">
                    <label class="filter_price_field" for="priceFromInput">
                        <span class="filter_price_label">${getText("pages.main.from")}</span>
                        <input type="number" id="priceFromInput" name="price_from" min="${priceMinLimit}" max="${priceMaxLimit - priceMinGap}" step="${priceStep}" inputmode="numeric" placeholder="${getText("pages.main.from")}" aria-label="${getText("pages.main.from")}">
                    </label>
                    <label class="filter_price_field" for="priceToInput">
                        <span class="filter_price_label">${getText("pages.main.to")}</span>
                        <input type="number" id="priceToInput" name="price_to" min="${priceMinLimit + priceMinGap}" max="${priceMaxLimit}" step="${priceStep}" inputmode="numeric" placeholder="${getText("pages.main.to")}" aria-label="${getText("pages.main.to")}">
                    </label>
                </div>
            </div>
        `;

        priceFromInput = document.getElementById("priceFromInput");
        priceToInput = document.getElementById("priceToInput");
        priceFromRange = document.getElementById("priceFromRange");
        priceToRange = document.getElementById("priceToRange");
        priceSlider = priceRangeRoot.querySelector(".filter_price_slider");
        priceTrackLayer = priceRangeRoot.querySelector(".filter_price_track_layer");
        priceRangeTrack = document.getElementById("priceRangeTrack");

        updateEffectivePriceMinGap();
        syncPriceControls({ apply: false });

        if (priceSlider) {
            priceSlider.addEventListener("pointermove", updateActiveHandleFromPointer);
        }

        window.addEventListener("resize", handlePriceSliderResize);

        priceFromRange.addEventListener("pointerdown", () => {
            updatePriceRangeOrder("from");
        });

        priceToRange.addEventListener("pointerdown", () => {
            updatePriceRangeOrder("to");
        });

        priceFromRange.addEventListener("input", () => {
            syncPriceControls({
                activeHandle: "from",
                rawFrom: priceFromRange.value,
                rawTo: priceToRange.value
            });
        });

        priceToRange.addEventListener("input", () => {
            syncPriceControls({
                activeHandle: "to",
                rawFrom: priceFromRange.value,
                rawTo: priceToRange.value
            });
        });

        priceFromInput.addEventListener("input", syncFromNumberInput);
        priceFromInput.addEventListener("blur", syncFromNumberInput);
        priceToInput.addEventListener("input", syncToNumberInput);
        priceToInput.addEventListener("blur", syncToNumberInput);
    };

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

    const createApartmentCard = (apartment, options = {}) => {
        const article = document.createElement("article");
        article.className = `flat_card flat_card_linked${options.isBooked ? " flat_card--booked" : ""}`;

        const apartmentTitle = window.getApartmentTitle(apartment, lang);
        const apartmentUrl = buildApartmentDetailUrl(apartment.id);
        const apartmentDetails = window
            .getApartmentFeatures(apartment)
            .slice(0, 5)
            .map((featureKey) => window.buildFeatureMarkup(featureKey, lang, {
                iconClassName: "flat_detail_icon",
                labelClassName: "flat_detail_label"
            }));
        const visibleDetails = apartmentDetails;
        const bookingBadge = options.isBooked
            ? `<span class="flat_state_badge">${getText("pages.main.bookedBadge")}</span>`
            : "";

        article.innerHTML = `
            <a href="${apartmentUrl}" class="flat_card_link" aria-label="${getText("common.actions.open")} ${apartmentTitle}">
                <div class="flat_card_media">
                    <img src="${window.getAssetUrl(apartment.img)}" alt="${apartmentTitle}" class="flat_card_image" loading="lazy" decoding="async">
                    ${bookingBadge}
                </div>
                <div class="flat_card_body">
                    <p class="flat_location">${apartmentTitle}</p>
                    <div class="flat_card_details">
                        ${visibleDetails.map((detail) => `<span class="flat_detail">${detail}</span>`).join("")}
                    </div>
                    <div class="flat_meta">
                        <span class="flat_price">${window.formatPrice(apartment.price, lang)}</span>
                        <span class="flat_button">${getText("common.actions.rent")}</span>
                    </div>
                </div>
            </a>
        `;

        return article;
    };

    const renderCatalogGroup = ({
        title = "",
        description = "",
        apartments = [],
        isBookedGroup = false
    }) => {
        const group = document.createElement("section");
        group.className = `catalog_group${isBookedGroup ? " catalog_group--booked" : ""}`;

        if (title || description) {
            const heading = document.createElement("div");
            heading.className = "catalog_group_heading";
            heading.innerHTML = `
                <h3>${title}</h3>
            `;
            group.appendChild(heading);
        }

        const grid = document.createElement("div");
        grid.className = "catalog_group_grid";
        apartments.forEach((apartment) => {
            grid.appendChild(createApartmentCard(apartment, { isBooked: isBookedGroup }));
        });
        group.appendChild(grid);

        return group;
    };

    const renderCatalog = (catalogApartments, filters) => {
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

        if (!hasCompleteSelectedDates()) {
            flatsCatalog.appendChild(renderCatalogGroup({
                apartments: catalogApartments
            }));
            return;
        }

        const availableApartments = [];
        const bookedApartments = [];

        catalogApartments.forEach((apartment) => {
            if (isApartmentBookedForSelectedDates(apartment)) {
                bookedApartments.push(apartment);
            } else {
                availableApartments.push(apartment);
            }
        });

        if (availableApartments.length > 0) {
            flatsCatalog.appendChild(renderCatalogGroup({
                title: getText("pages.main.availableHeading"),
                description: bookedApartments.length > 0
                    ? getText("pages.main.availableLead")
                    : getText("pages.main.availableOnlyLead"),
                apartments: availableApartments
            }));
        }

        if (bookedApartments.length > 0) {
            flatsCatalog.appendChild(renderCatalogGroup({
                title: getText("pages.main.bookedHeading"),
                description: getText("pages.main.bookedLead"),
                apartments: bookedApartments,
                isBookedGroup: true
            }));
        }
    };

    const updateHero = (apartment) => {
        if (!apartment || !heroImageCurrent || !heroFlatLink) {
            return;
        }

        const heroTitle = window.getApartmentTitle(apartment, lang);

        heroFlatLink.href = buildApartmentDetailUrl(apartment.id);
        heroImageCurrent.src = window.getAssetUrl(apartment.img);
        heroImageCurrent.alt = heroTitle;

        if (heroPriceTag) {
            heroPriceTag.textContent = window.formatPrice(apartment.price, lang);
        }

        if (heroAddressTag) {
            heroAddressTag.textContent = window.getApartmentAddress
                ? window.getApartmentAddress(apartment, lang)
                : heroTitle;
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
        heroFlatLink.href = buildApartmentDetailUrl(apartment.id);

        if (heroPriceTag) {
            heroPriceTag.textContent = window.formatPrice(apartment.price, lang);
        }

        if (heroAddressTag) {
            heroAddressTag.textContent = window.getApartmentAddress
                ? window.getApartmentAddress(apartment, lang)
                : heroTitle;
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

    const normalizeFeatureUrlAlias = (value) =>
        String(value || "").trim().toLowerCase();

    const parseFeatureAliases = (rawValues) => {
        const values = Array.isArray(rawValues) ? rawValues : [rawValues];

        return values
            .flatMap((value) => String(value || "").split(/[;,|]/))
            .map((value) => normalizeFeatureUrlAlias(value))
            .filter((value, index, collection) =>
                value && collection.indexOf(value) === index && validFeatureAliases.has(value)
            );
    };

    const getOrderedSelectedFeatureAliases = () =>
        orderedFeatureAliases.filter((alias) => selectedFeatureAliases.has(alias));

    const getNormalizedFilterPrices = () => {
        if (!priceFromInput || !priceToInput) {
            return {
                priceFrom: null,
                priceTo: null
            };
        }

        const values = syncPriceControls({
            apply: false,
            rawFrom: priceFromInput.value,
            rawTo: priceToInput.value
        });

        return {
            priceFrom: values?.from ?? null,
            priceTo: values?.to ?? null
        };
    };

    const renderFeatureFilters = () => {
        if (!featureFilters) {
            return;
        }

        featureFilters.innerHTML = "";

        featureDefinitions.forEach((feature) => {
            const featureAlias = getFeatureUrlAlias(feature.key);
            const isSelected = selectedFeatureAliases.has(featureAlias);
            const button = document.createElement("button");

            button.type = "button";
            button.className = `filter_feature_tag${isSelected ? " is-selected" : ""}`;
            button.dataset.feature = featureAlias;
            button.setAttribute("aria-pressed", String(isSelected));
            button.innerHTML = `
                <span class="filter_feature_check">&#10003;</span>
                <span class="filter_feature_content">
                    ${window.buildFeatureMarkup(feature.key, lang, {
                        iconClassName: "filter_feature_icon",
                        labelClassName: "filter_feature_label"
                    })}
                </span>
                <span class="filter_feature_remove" aria-hidden="true">${isSelected ? "&times;" : ""}</span>
            `;

            button.addEventListener("click", () => {
                if (selectedFeatureAliases.has(featureAlias)) {
                    selectedFeatureAliases.delete(featureAlias);
                } else {
                    selectedFeatureAliases.add(featureAlias);
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
                checkIn: selectedStay.checkIn,
                checkOut: selectedStay.checkOut,
                monthFrom: null,
                monthTo: null,
                bedsFrom: null,
                bedsTo: null,
                features: []
            };
        }

        const formData = new FormData(filterForm);
        const normalizedPrices = getNormalizedFilterPrices();

        return {
            rooms: getNumericValue(formData, "rooms"),
            priceFrom: normalizedPrices.priceFrom,
            priceTo: normalizedPrices.priceTo,
            checkIn: selectedStay.checkIn,
            checkOut: selectedStay.checkOut,
            monthFrom: getNumericValue(formData, "month_from"),
            monthTo: getNumericValue(formData, "month_to"),
            bedsFrom: getNumericValue(formData, "beds_from"),
            bedsTo: getNumericValue(formData, "beds_to"),
            features: getOrderedSelectedFeatureAliases()
        };
    };

    const isPriceFromActive = (priceFrom) =>
        Number.isFinite(priceFrom) && priceFrom > priceMinLimit;

    const isPriceToActive = (priceTo) =>
        Number.isFinite(priceTo) && priceTo < priceMaxLimit;

    const hasActiveFilters = (filters) => {
        if (!filters) {
            return false;
        }

        const hasPriceFilter = isPriceFromActive(filters.priceFrom)
            || isPriceToActive(filters.priceTo);

        return filters.rooms !== null
            || hasPriceFilter
            || !!filters.checkIn
            || !!filters.checkOut
            || filters.monthFrom !== null
            || filters.monthTo !== null
            || filters.bedsFrom !== null
            || filters.bedsTo !== null
            || filters.features.length > 0;
    };

    const syncFiltersToUrl = (filters) => {
        const url = new URL(window.location.href);
        const featureAliases = Array.isArray(filters?.features) ? filters.features : [];

        if (filters?.rooms !== null) {
            url.searchParams.set("rooms", String(filters.rooms));
        } else {
            url.searchParams.delete("rooms");
        }

        if (isPriceFromActive(filters?.priceFrom)) {
            url.searchParams.set("price_from", String(filters.priceFrom));
        } else {
            url.searchParams.delete("price_from");
        }

        if (isPriceToActive(filters?.priceTo)) {
            url.searchParams.set("price_to", String(filters.priceTo));
        } else {
            url.searchParams.delete("price_to");
        }

        if (filters?.checkIn) {
            url.searchParams.set("check_in", String(filters.checkIn));
        } else {
            url.searchParams.delete("check_in");
        }

        if (filters?.checkOut) {
            url.searchParams.set("check_out", String(filters.checkOut));
        } else {
            url.searchParams.delete("check_out");
        }

        url.searchParams.delete("features");

        featureAliases.forEach((featureAlias) => {
            url.searchParams.append("features", featureAlias);
        });

        window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    };

    const applyFiltersFromUrl = () => {
        const params = new URLSearchParams(window.location.search);
        const urlFeatureAliases = parseFeatureAliases(params.getAll("features"));
        const roomsValue = params.get("rooms") || "";
        const dateRange = dateUtils?.normalizeRange(
            params.get("check_in"),
            params.get("check_out")
        ) || {
            checkIn: null,
            checkOut: null
        };

        selectedFeatureAliases.clear();
        urlFeatureAliases.forEach((featureAlias) => selectedFeatureAliases.add(featureAlias));
        selectedStay = {
            checkIn: dateRange.checkIn,
            checkOut: dateRange.checkOut,
            isComplete: !!dateRange.checkIn && !!dateRange.checkOut,
            nights: dateRange.checkIn && dateRange.checkOut && dateUtils
                ? dateUtils.diffInDays(dateRange.checkIn, dateRange.checkOut)
                : 0
        };

        if (roomsSelect) {
            const hasMatchingOption = Array.from(roomsSelect.options).some((option) => option.value === roomsValue);
            roomsSelect.value = hasMatchingOption ? roomsValue : "";
        }

        if (priceFromInput && priceToInput) {
            syncPriceControls({
                apply: false,
                rawFrom: params.get("price_from") ?? priceMinLimit,
                rawTo: params.get("price_to") ?? priceMaxLimit
            });
        }
    };

    const setHeroVisibility = (isVisible) => {
        if (!heroSection) {
            return;
        }

        heroSection.classList.toggle("is-hidden", !isVisible);
        heroSection.hidden = !isVisible;

        if (!isVisible) {
            stopHeroCarousel();
        }
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
            const apartmentFeatures = new Set(window.getApartmentFeatures(apartment).map((featureKey) => getFeatureUrlAlias(featureKey)));
            const hasAllSelectedFeatures = filters.features.every((featureAlias) => apartmentFeatures.has(featureAlias));

            if (!hasAllSelectedFeatures) {
                return false;
            }
        }

        return true;
    };

    const applyFilters = () => {
        const filters = getFilters();
        const filteredApartments = apartmentsData.filter((apartment) => apartmentMatchesFilters(apartment, filters));
        const shouldShowHero = !hasActiveFilters(filters);

        syncFiltersToUrl(filters);
        renderCatalog(filteredApartments, filters);
        setHeroVisibility(shouldShowHero);

        if (shouldShowHero) {
            startHeroCarousel(filteredApartments);
        }
    };

    initPriceRange();
    applyFiltersFromUrl();
    if (availabilityCalendarRoot && typeof window.createAvailabilityCalendar === "function") {
        availabilityCalendar = window.createAvailabilityCalendar(availabilityCalendarRoot, {
            lang,
            initialCheckIn: selectedStay.checkIn,
            initialCheckOut: selectedStay.checkOut,
            onSelectionChange: (rangeState) => {
                selectedStay = rangeState;
                applyFilters();
            }
        });
    }
    renderFeatureFilters();
    applyFilters();

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
            if (priceFromInput && priceToInput) {
                priceFromInput.value = String(priceMinLimit);
                priceToInput.value = String(priceMaxLimit);
                syncPriceControls({ apply: false });
            }
            selectedFeatureAliases.clear();
            renderFeatureFilters();
            if (availabilityCalendar) {
                availabilityCalendar.setSelection(null, null);
            } else {
                selectedStay = {
                    checkIn: null,
                    checkOut: null,
                    isComplete: false,
                    nights: 0
                };
                applyFilters();
            }
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
