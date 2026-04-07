const initBookingPage = () => {
    const apartmentId = new URLSearchParams(window.location.search).get("id");
    const botPortal = document.getElementById("bookingBotPortal");
    const botButton = document.getElementById("bookingBotButton");
    const botUsername = "GIL_Apartments_Bot";

    if (!botPortal && !botButton) {
        return;
    }

    const startPayload = apartmentId ? `book_${apartmentId}` : "";

    [botPortal, botButton].forEach((element) => {
        if (!element) {
            return;
        }
        window.attachTelegramOpenBehavior?.(element, botUsername, startPayload);
    });
};

Promise.resolve(window.i18nReady)
    .catch(() => undefined)
    .then(() => {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", initBookingPage, { once: true });
        } else {
            initBookingPage();
        }
    });
