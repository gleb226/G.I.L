const initBookingPage = () => {
    const apartmentId = new URLSearchParams(window.location.search).get("id");
    const pageLang = window.getCurrentLang();
    const apartment = window.getApartmentById ? window.getApartmentById(apartmentId) : null;
    
    if (!apartment) {
        document.getElementById("apartmentTitleDisplay").textContent = window.t("pages.booking.selectApartment", { lng: pageLang });
        document.getElementById("bookingForm").style.opacity = "0.5";
        document.getElementById("bookingForm").style.pointerEvents = "none";
        return;
    }

    const apartmentTitle = window.getApartmentTitle ? window.getApartmentTitle(apartment, pageLang) : "Apartment";
    document.getElementById("apartmentTitleDisplay").textContent = apartmentTitle;

    const availabilityCalendarRoot = document.getElementById("apartmentAvailabilityCalendar");
    const selectedDatesDisplay = document.getElementById("selectedDatesDisplay");
    let currentSelection = { checkIn: null, checkOut: null };

    if (availabilityCalendarRoot && typeof window.createAvailabilityCalendar === "function") {
        const bookingRanges = apartment.isBooked && apartment.checkInDate && apartment.checkOutDate
            ? [{ start: apartment.checkInDate, end: apartment.checkOutDate }]
            : [];

        window.createAvailabilityCalendar(availabilityCalendarRoot, {
            lang: pageLang,
            allowSelection: true,
            bookedRanges: bookingRanges,
            onSelectionChange: (state) => {
                currentSelection = state;
                if (state.checkIn && state.checkOut) {
                    selectedDatesDisplay.textContent = `${state.checkIn} - ${state.checkOut} (${state.nights} ${window.t("calendar.nights", { count: state.nights, lng: pageLang })})`;
                } else if (state.checkIn) {
                    selectedDatesDisplay.textContent = `${state.checkIn} - ...`;
                } else {
                    selectedDatesDisplay.textContent = "-";
                }
            }
        });
    }

    const bookingForm = document.getElementById("bookingForm");
    const formMessage = document.getElementById("formMessage");
    const submitBtn = document.getElementById("submitBtn");

    bookingForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        if (!currentSelection.checkIn || !currentSelection.checkOut) {
            formMessage.textContent = window.t("calendar.checkOutPending", { lng: pageLang });
            formMessage.className = "form_message error";
            return;
        }

        const formData = new FormData(bookingForm);
        const bookingData = {
            ap_id: apartmentId,
            start_date: formatDateToBot(currentSelection.checkIn),
            end_date: formatDateToBot(currentSelection.checkOut),
            name: formData.get("name"),
            phone: formData.get("phone"),
            wishes: formData.get("wishes"),
            lang: pageLang
        };

        submitBtn.disabled = true;
        formMessage.textContent = window.t("pages.booking.formSuccess", { lng: pageLang });
        formMessage.className = "form_message success";

        try {
            const response = await fetch("/api/book", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bookingData)
            });

            const result = await response.json();

            if (response.ok) {
                const liqpayForm = document.getElementById("liqpayForm");
                liqpayForm.querySelector('input[name="data"]').value = result.liqpay_data;
                liqpayForm.querySelector('input[name="signature"]').value = result.liqpay_signature;
                liqpayForm.submit();
            } else {
                throw new Error(result.error || "Unknown error");
            }
        } catch (error) {
            console.error("Booking error:", error);
            formMessage.textContent = window.t("pages.booking.formError", { lng: pageLang });
            formMessage.className = "form_message error";
            submitBtn.disabled = false;
        }
    });
};

const formatDateToBot = (isoDate) => {
    if (!isoDate) return "";
    const [y, m, d] = isoDate.split("-");
    return `${d}.${m}.${y}`;
};

Promise.all([
    Promise.resolve(window.i18nReady).catch(() => undefined),
    Promise.resolve(window.apartmentsReady).catch(() => undefined)
]).then(() => {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initBookingPage, { once: true });
    } else {
        initBookingPage();
    }
});
