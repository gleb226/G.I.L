const initContactsPage = () => {
    const botLink = document.getElementById("contactsBotLink");
    const locationNode = document.querySelector('.info_item p[data-i18n="pages.contacts.locationValue"]');
    const aboutUsLink = document.querySelector('a[href="https://www.facebook.com/GILapartments?mibextid=wwXIfr"].contacts_link_button');

    if (botLink) {
        window.attachTelegramOpenBehavior?.(botLink, "GIL_Apartments_Bot");
    }

    if (locationNode && !locationNode.classList.contains("contact_inline")) {
        const text = locationNode.textContent;
        locationNode.className = "contact_inline";
        locationNode.innerHTML = `${window.buildIconMarkup("fas fa-map-marker-alt")}<span>${text}</span>`;
    }

    if (aboutUsLink && !aboutUsLink.querySelector("i")) {
        const text = aboutUsLink.textContent;
        aboutUsLink.innerHTML = `${window.buildIconMarkup("fas fa-circle-info")}<span>${text}</span>`;
    }
};

Promise.resolve(window.i18nReady)
    .catch(() => undefined)
    .then(() => {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", initContactsPage, { once: true });
        } else {
            initContactsPage();
        }
    });
