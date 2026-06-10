(function () {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const LOCALE_BY_LANG = {
        uk: "uk-UA",
        en: "en-US"
    };

    const getCurrentLang = () => (window.getCurrentLang ? window.getCurrentLang() : "en");

    const getLocale = (lang = getCurrentLang()) => LOCALE_BY_LANG[lang] || LOCALE_BY_LANG.en;

    const getText = (key, fallback, options = {}) =>
        typeof window.t === "function"
            ? window.t(key, { defaultValue: fallback, ...options })
            : fallback;

    const toNoon = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);

    const parseIsoDate = (value) => {
        if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return null;
        }

        const [year, month, day] = value.split("-").map((part) => Number(part));
        const date = new Date(year, month - 1, day, 12, 0, 0, 0);

        if (
            date.getFullYear() !== year
            || date.getMonth() !== month - 1
            || date.getDate() !== day
        ) {
            return null;
        }

        return date;
    };

    const formatIsoDate = (date) => {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return null;
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    };

    const addDays = (date, days) => toNoon(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12));

    const addMonths = (date, months) => toNoon(new Date(date.getFullYear(), date.getMonth() + months, 1, 12));

    const startOfMonth = (date) => toNoon(new Date(date.getFullYear(), date.getMonth(), 1, 12));

    const startOfWeekMonday = (date) => {
        const weekday = date.getDay();
        const shift = (weekday + 6) % 7;
        return addDays(date, -shift);
    };

    const isSameDay = (left, right) =>
        !!left
        && !!right
        && left.getFullYear() === right.getFullYear()
        && left.getMonth() === right.getMonth()
        && left.getDate() === right.getDate();

    const compareIsoDates = (left, right) => {
        if (left === right) {
            return 0;
        }

        return String(left || "").localeCompare(String(right || ""));
    };

    const diffInDays = (startIso, endIso) => {
        const start = parseIsoDate(startIso);
        const end = parseIsoDate(endIso);

        if (!start || !end) {
            return 0;
        }

        return Math.round((toNoon(end).getTime() - toNoon(start).getTime()) / DAY_MS);
    };

    const normalizeRange = (checkIn, checkOut) => {
        const normalizedCheckIn = formatIsoDate(parseIsoDate(checkIn));
        const normalizedCheckOut = formatIsoDate(parseIsoDate(checkOut));

        if (!normalizedCheckIn) {
            return {
                checkIn: null,
                checkOut: null
            };
        }

        if (!normalizedCheckOut || compareIsoDates(normalizedCheckIn, normalizedCheckOut) >= 0) {
            return {
                checkIn: normalizedCheckIn,
                checkOut: null
            };
        }

        return {
            checkIn: normalizedCheckIn,
            checkOut: normalizedCheckOut
        };
    };

    const normalizeBookedRanges = (ranges) =>
        (Array.isArray(ranges) ? ranges : [])
            .map((range) => normalizeRange(range?.start, range?.end))
            .filter((range) => range.checkIn && range.checkOut);

    const isIsoInExclusiveRange = (dateIso, startIso, endIso) =>
        !!dateIso
        && !!startIso
        && !!endIso
        && compareIsoDates(dateIso, startIso) >= 0
        && compareIsoDates(dateIso, endIso) < 0;

    const doRangesOverlap = (startA, endA, startB, endB) =>
        !!startA
        && !!endA
        && !!startB
        && !!endB
        && compareIsoDates(startA, endB) < 0
        && compareIsoDates(endA, startB) > 0;

    const formatDisplayDate = (isoDate, lang = getCurrentLang(), options = { day: "numeric", month: "short" }) => {
        const date = parseIsoDate(isoDate);

        if (!date) {
            return getText("calendar.dateUnknown", "Date not set", { lng: lang });
        }

        return new Intl.DateTimeFormat(getLocale(lang), options).format(date);
    };

    const formatMonthLabel = (date, lang = getCurrentLang()) =>
        new Intl.DateTimeFormat(getLocale(lang), {
            month: "long",
            year: "numeric"
        }).format(date);

    const formatFullDateLabel = (isoDate, lang = getCurrentLang()) =>
        formatDisplayDate(isoDate, lang, {
            weekday: "long",
            day: "numeric",
            month: "long"
        });

    const formatNightCount = (count, lang = getCurrentLang()) =>
        getText("calendar.nights", `${count} nights`, { lng: lang, count });

    const getWeekdayLabels = (lang = getCurrentLang()) => {
        const locale = getLocale(lang);
        const monday = new Date(2024, 0, 1, 12, 0, 0, 0);

        return Array.from({ length: 7 }, (_, index) =>
            new Intl.DateTimeFormat(locale, { weekday: "short" }).format(addDays(monday, index))
        );
    };

    const createRangeState = (state) => ({
        checkIn: state.checkIn,
        checkOut: state.checkOut,
        isComplete: !!state.checkIn && !!state.checkOut,
        nights: state.checkIn && state.checkOut ? diffInDays(state.checkIn, state.checkOut) : 0
    });

    const createAvailabilityCalendar = (root, options = {}) => {
        if (!root) {
            return null;
        }

        const lang = options.lang || getCurrentLang();
        const allowSelection = options.allowSelection !== false;
        const bookedRanges = normalizeBookedRanges(options.bookedRanges);
        const initialRange = normalizeRange(options.initialCheckIn, options.initialCheckOut);
        const today = toNoon(new Date());
        const initialFocusDate = parseIsoDate(
            options.initialFocusDate
            || initialRange.checkIn
            || bookedRanges[0]?.checkIn
        ) || today;
        const state = {
            checkIn: initialRange.checkIn,
            checkOut: initialRange.checkOut,
            baseMonth: startOfMonth(initialFocusDate)
        };

        root.innerHTML = `
            <div class="availability_calendar${allowSelection ? "" : " availability_calendar--view"}">
                <div class="availability_toolbar">
                    <button type="button" class="availability_nav" data-calendar-nav="prev" aria-label="${getText("calendar.previousMonth", "Previous month", { lng: lang })}">
                        <span aria-hidden="true">&#10094;</span>
                    </button>
                    <div class="availability_summary">
                        <div class="availability_summary_card">
                            <span class="availability_summary_label">${getText("calendar.checkIn", "Check-in", { lng: lang })}</span>
                            <strong class="availability_summary_value" data-calendar-checkin></strong>
                        </div>
                        <div class="availability_summary_card">
                            <span class="availability_summary_label">${getText("calendar.checkOut", "Check-out", { lng: lang })}</span>
                            <strong class="availability_summary_value" data-calendar-checkout></strong>
                        </div>
                    </div>
                    <button type="button" class="availability_nav" data-calendar-nav="next" aria-label="${getText("calendar.nextMonth", "Next month", { lng: lang })}">
                        <span aria-hidden="true">&#10095;</span>
                    </button>
                </div>
                <div class="availability_status_row">
                    <p class="availability_status" data-calendar-status></p>
                    ${allowSelection ? `<button type="button" class="availability_clear" data-calendar-clear>${getText("calendar.clearDates", "Clear dates", { lng: lang })}</button>` : ""}
                </div>
                <div class="availability_months" data-calendar-months></div>
                <div class="availability_legend">
                    <span class="availability_legend_item">
                        <span class="availability_legend_dot"></span>
                        <span>${getText("calendar.available", "Available", { lng: lang })}</span>
                    </span>
                    <span class="availability_legend_item">
                        <span class="availability_legend_dot is-selected"></span>
                        <span>${getText("calendar.selected", "Selected stay", { lng: lang })}</span>
                    </span>
                    <span class="availability_legend_item">
                        <span class="availability_legend_dot is-booked"></span>
                        <span>${getText("calendar.booked", "Booked", { lng: lang })}</span>
                    </span>
                </div>
            </div>
        `;

        const monthsRoot = root.querySelector("[data-calendar-months]");
        const checkInValue = root.querySelector("[data-calendar-checkin]");
        const checkOutValue = root.querySelector("[data-calendar-checkout]");
        const statusNode = root.querySelector("[data-calendar-status]");
        const clearButton = root.querySelector("[data-calendar-clear]");

        const emitSelection = () => {
            options.onSelectionChange?.(createRangeState(state));
        };

        const setSelection = (checkIn, checkOut) => {
            const nextRange = normalizeRange(checkIn, checkOut);
            state.checkIn = nextRange.checkIn;
            state.checkOut = nextRange.checkOut;
            render();
            emitSelection();
        };

        const handleDayClick = (isoDate) => {
            if (!allowSelection) {
                return;
            }

            if (!state.checkIn || (state.checkIn && state.checkOut)) {
                setSelection(isoDate, null);
                return;
            }

            if (compareIsoDates(isoDate, state.checkIn) <= 0) {
                setSelection(isoDate, null);
                return;
            }

            setSelection(state.checkIn, isoDate);
        };

        const renderStatusText = () => {
            if (state.checkIn && state.checkOut) {
                const summary = getText("calendar.selectedRange", "{{start}} - {{end}}", {
                    lng: lang,
                    start: formatDisplayDate(state.checkIn, lang),
                    end: formatDisplayDate(state.checkOut, lang)
                });
                const nightsSummary = formatNightCount(diffInDays(state.checkIn, state.checkOut), lang);
                return `${summary} - ${nightsSummary}`;
                // Legacy fallback kept below for safe encoding migration.
                return `${summary} · ${formatNightCount(diffInDays(state.checkIn, state.checkOut), lang)}`;
            }

            if (state.checkIn) {
                return getText("calendar.checkOutPending", "Choose a check-out date to continue", { lng: lang });
            }

            if (!allowSelection && bookedRanges[0]) {
                return getText("calendar.bookedRange", "Booked from {{start}} to {{end}}", {
                    lng: lang,
                    start: formatDisplayDate(bookedRanges[0].checkIn, lang),
                    end: formatDisplayDate(bookedRanges[0].checkOut, lang)
                });
            }

            if (!allowSelection) {
                return getText("calendar.availableNow", "This apartment is available for new dates", { lng: lang });
            }

            return getText("calendar.selectDates", "Select dates to sort apartments", { lng: lang });
        };

        const renderDay = (monthDate, dayDate) => {
            const isoDate = formatIsoDate(dayDate);
            const isCurrentMonth = monthDate.getMonth() === dayDate.getMonth();
            const isToday = isSameDay(dayDate, today);
            const isSelectedStart = state.checkIn === isoDate;
            const isSelectedEnd = state.checkOut === isoDate;
            const isSelectedRange = isIsoInExclusiveRange(isoDate, state.checkIn, state.checkOut);
            const isBooked = bookedRanges.some((range) => isIsoInExclusiveRange(isoDate, range.checkIn, range.checkOut));
            const isOutsideSelectionSurface = !allowSelection && !isBooked && !isCurrentMonth;
            const classNames = [
                "availability_day",
                isCurrentMonth ? "" : "is-muted",
                isToday ? "is-today" : "",
                isSelectedRange ? "is-selected-range" : "",
                isSelectedStart ? "is-selected-start" : "",
                isSelectedEnd ? "is-selected-end" : "",
                isBooked ? "is-booked" : "",
                isOutsideSelectionSurface ? "is-empty" : ""
            ].filter(Boolean).join(" ");

            return `
                <button
                    type="button"
                    class="${classNames}"
                    data-calendar-day="${isoDate}"
                    aria-label="${formatFullDateLabel(isoDate, lang)}"
                    ${!allowSelection && !isBooked ? "disabled" : ""}
                >
                    <span>${dayDate.getDate()}</span>
                </button>
            `;
        };

        const renderMonth = (monthOffset) => {
            const monthDate = addMonths(state.baseMonth, monthOffset);
            const monthStart = startOfMonth(monthDate);
            const gridStart = startOfWeekMonday(monthStart);
            const weekdayLabels = getWeekdayLabels(lang);
            const dayButtons = Array.from({ length: 42 }, (_, index) =>
                renderDay(monthDate, addDays(gridStart, index))
            ).join("");

            return `
                <section class="availability_month">
                    <header class="availability_month_header">
                        <h3>${formatMonthLabel(monthDate, lang)}</h3>
                    </header>
                    <div class="availability_weekdays">
                        ${weekdayLabels.map((label) => `<span>${label}</span>`).join("")}
                    </div>
                    <div class="availability_days">
                        ${dayButtons}
                    </div>
                </section>
            `;
        };

        const render = () => {
            checkInValue.textContent = state.checkIn
                ? formatDisplayDate(state.checkIn, lang)
                : getText("calendar.checkInPlaceholder", "Select date", { lng: lang });
            checkOutValue.textContent = state.checkOut
                ? formatDisplayDate(state.checkOut, lang)
                : getText("calendar.checkOutPlaceholder", "Select date", { lng: lang });
            statusNode.textContent = renderStatusText();
            monthsRoot.innerHTML = `${renderMonth(0)}${renderMonth(1)}`;

            monthsRoot.querySelectorAll("[data-calendar-day]").forEach((button) => {
                button.addEventListener("click", () => {
                    handleDayClick(button.dataset.calendarDay);
                });
            });
        };

        root.querySelectorAll("[data-calendar-nav]").forEach((button) => {
            button.addEventListener("click", () => {
                const direction = button.dataset.calendarNav === "next" ? 1 : -1;
                state.baseMonth = addMonths(state.baseMonth, direction);
                render();
            });
        });

        clearButton?.addEventListener("click", () => {
            setSelection(null, null);
        });

        render();

        return {
            getState: () => createRangeState(state),
            setSelection,
            setBaseMonth(isoDate) {
                const parsed = parseIsoDate(isoDate);

                if (parsed) {
                    state.baseMonth = startOfMonth(parsed);
                    render();
                }
            }
        };
    };

    Object.assign(window, {
        AvailabilityCalendarUtils: {
            parseIsoDate,
            formatIsoDate,
            formatDisplayDate,
            diffInDays,
            doRangesOverlap,
            normalizeRange
        },
        createAvailabilityCalendar
    });
})();
