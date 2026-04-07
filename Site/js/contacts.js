const initContactsPage = () => {
    const contactForm = document.getElementById("contactForm");
    const contactStatus = document.getElementById("contactStatus");
    const contactLang = window.getCurrentLang();

    if (contactForm && contactStatus) {
        contactForm.addEventListener("submit", (event) => {
            event.preventDefault();
            contactStatus.textContent = window.t("pages.contacts.messageReady", { lng: contactLang });
            contactForm.reset();
        });
    }
};

Promise.resolve(window.i18nReady).catch(() => undefined).then(() => {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initContactsPage, { once: true });
    } else {
        initContactsPage();
    }
});