const initContactsPage = () => {
    const botLink = document.getElementById("contactsBotLink");
    const locationNode = document.querySelector('.info_item p[data-i18n="pages.contacts.locationValue"]');
    const aboutUsLink = document.querySelector('a[href="AboutUs.html"].contacts_link_button');

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

    // Phone Popup Logic
    const phoneTrigger = document.getElementById("phoneTrigger");
    const phonePopup = document.getElementById("phonePopup");
    const phonePopupClose = document.getElementById("phonePopupClose");
    const phoneList = document.getElementById("phoneList");

    if (phoneTrigger && phonePopup && phoneList) {
        const copy = window.getStaticCopy?.();
        const phones = Array.isArray(copy?.footer?.phoneValue) ? copy.footer.phoneValue : [];

        if (phones.length > 0) {
            phoneList.innerHTML = phones.map(phone => `
                <a href="tel:${phone.replace(/\D/g, '')}" class="phone_list_item">
                    <i class="fas fa-phone-alt"></i>
                    <span>${phone}</span>
                </a>
            `).join('');
        }

        const openPopup = () => {
            phonePopup.classList.add("is-visible");
            document.body.style.overflow = "hidden";
        };

        const closePopup = () => {
            phonePopup.classList.remove("is-visible");
            document.body.style.overflow = "";
        };

        phoneTrigger.addEventListener("click", openPopup);
        phonePopupClose?.addEventListener("click", closePopup);

        phonePopup.addEventListener("click", (e) => {
            if (e.target === phonePopup) closePopup();
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") closePopup();
        });
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
