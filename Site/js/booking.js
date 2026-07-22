window.openBookingModal = (apartmentId) => {
    const pageLang = window.getCurrentLang();
    const apartment = window.getApartmentById ? window.getApartmentById(apartmentId) : null;
    
    if (!apartment) return;

    let modalContainer = document.getElementById('checkout-modal-container');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'checkout-modal-container';
        document.body.appendChild(modalContainer);
    }

    const apartmentTitle = window.getApartmentTitle ? window.getApartmentTitle(apartment, pageLang) : "Apartment";

    modalContainer.innerHTML = `
        <div class="booking-modal-overlay" id="bookingModalOverlay"></div>
        <div class="booking-modal-content" id="bookingModalContent">
            <button class="booking-modal-close" id="bookingModalClose">&times;</button>
            <h2 class="booking-modal-title">${window.t("pages.booking.heading", { lng: pageLang }) || "Бронювання"}</h2>
            <p class="booking-modal-subtitle">${apartmentTitle}</p>
            
            <div class="booking-modal-layout">
                <div class="booking-modal-left">
                    <form id="modalBookingForm" class="booking_form">
                        <div class="form_group">
                            <label for="modalGuestName">${window.t("pages.booking.formName", { lng: pageLang }) || "Повне ім'я"}</label>
                            <input type="text" id="modalGuestName" name="name" required placeholder="Іван Іванов">
                        </div>
                        <div class="form_group">
                            <label for="modalGuestPhone">${window.t("pages.booking.formPhone", { lng: pageLang }) || "Номер телефону"}</label>
                            <input type="tel" id="modalGuestPhone" name="phone" required placeholder="+380991234567">
                        </div>
                        <div class="form_group">
                            <label for="modalGuestWishes">${window.t("pages.booking.formWishes", { lng: pageLang }) || "Особливі побажання"}</label>
                            <textarea id="modalGuestWishes" name="wishes" rows="2"></textarea>
                        </div>
                        
                        <div class="booking_summary_box">
                            <p><strong>${window.t("pages.booking.formDates", { lng: pageLang }) || "Обрані дати:"}</strong> <span id="modalSelectedDatesDisplay">-</span></p>
                            <p class="prepayment_note">${window.t("pages.booking.prepaymentNotice", { lng: pageLang }) || "Для підтвердження бронювання необхідно сплатити передплату 50% через LiqPay."}</p>
                        </div>

                        <div id="modalFormMessage" class="form_message"></div>

                        <button type="submit" class="booking_submit_btn" id="modalSubmitBtn">
                            <span>${window.t("pages.booking.formSubmit", { lng: pageLang }) || "Забронювати та сплатити"}</span>
                        </button>
                    </form>
                    
                    <form id="modalLiqpayForm" method="POST" action="https://www.liqpay.ua/api/3/checkout" accept-charset="utf-8" style="display:none;">
                        <input type="hidden" name="data" value="" />
                        <input type="hidden" name="signature" value="" />
                    </form>
                </div>
                <div class="booking-modal-right">
                    <div id="modalAvailabilityCalendar"></div>
                </div>
            </div>
        </div>
    `;

    document.body.classList.add('modal-open');

    const closeModal = () => {
        document.body.classList.remove('modal-open');
        modalContainer.innerHTML = '';
    };

    document.getElementById('bookingModalClose').addEventListener('click', closeModal);
    document.getElementById('bookingModalOverlay').addEventListener('click', closeModal);

    const calendarRoot = document.getElementById('modalAvailabilityCalendar');
    const selectedDatesDisplay = document.getElementById('modalSelectedDatesDisplay');
    let currentSelection = { checkIn: null, checkOut: null };

    if (calendarRoot && typeof window.createAvailabilityCalendar === "function") {
        const bookingRanges = apartment.isBooked && apartment.checkInDate && apartment.checkOutDate
            ? [{ start: apartment.checkInDate, end: apartment.checkOutDate }]
            : [];

        window.createAvailabilityCalendar(calendarRoot, {
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

    const bookingForm = document.getElementById('modalBookingForm');
    const formMessage = document.getElementById('modalFormMessage');
    const submitBtn = document.getElementById('modalSubmitBtn');

    bookingForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        if (!currentSelection.checkIn || !currentSelection.checkOut) {
            formMessage.textContent = window.t("calendar.checkOutPending", { lng: pageLang }) || "Оберіть дати заїзду та виїзду";
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
        formMessage.textContent = window.t("pages.booking.formSuccess", { lng: pageLang }) || "Завантаження...";
        formMessage.className = "form_message success";

        try {
            const response = await fetch("/api/book", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bookingData)
            });

            const result = await response.json();

            if (response.ok) {
                const liqpayForm = document.getElementById("modalLiqpayForm");
                liqpayForm.querySelector('input[name="data"]').value = result.liqpay_data;
                liqpayForm.querySelector('input[name="signature"]').value = result.liqpay_signature;
                liqpayForm.submit();
            } else {
                throw new Error(result.error || "Unknown error");
            }
        } catch (error) {
            console.error("Booking error:", error);
            formMessage.textContent = window.t("pages.booking.formError", { lng: pageLang }) || "Помилка бронювання";
            formMessage.className = "form_message error";
            submitBtn.disabled = false;
        }
    });

    function formatDateToBot(isoDate) {
        if (!isoDate) return "";
        const [y, m, d] = isoDate.split("-");
        return `${d}.${m}.${y}`;
    }
};
