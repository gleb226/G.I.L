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

    const getOperator = (phone) => {
        const p = String(phone || "");
        if (p.includes("(050)") || p.includes("(095)") || p.includes("(099)") || p.includes("(066)")) return "Vodafone";
        if (p.includes("(067)") || p.includes("(096)") || p.includes("(097)") || p.includes("(098)") || p.includes("(068)")) return "Kyivstar";
        if (p.includes("(063)") || p.includes("(093)") || p.includes("(073)")) return "Lifecell";
        return "";
    };

    if (phoneTrigger && phonePopup && phoneList) {
        const populatePhones = () => {
            const copy = typeof window.getStaticCopy === "function" ? window.getStaticCopy() : null;
            const phones = Array.isArray(copy?.footer?.phoneValue) ? copy.footer.phoneValue : [];

            if (phones.length > 0) {
                phoneList.innerHTML = phones.map(phone => {
                    const operator = getOperator(phone);
                    return `
                        <a href="tel:${phone.replace(/\D/g, '')}" class="phone_list_item">
                            <div class="phone_item_info">
                                <i class="fas fa-phone-alt"></i>
                                <span>${phone}</span>
                            </div>
                            ${operator ? `<span class="operator_badge">${operator}</span>` : ''}
                        </a>
                    `;
                }).join('');
                return true;
            }
            return false;
        };

        const openPopup = () => {
            const hasPhones = populatePhones();
            if (!hasPhones) {
                // Fallback to manual list if getStaticCopy failed
                const fallbackPhones = [
                    "+38 (050) 941-61-95",
                    "+38 (097) 903-62-25",
                    "+38 (093) 170-41-79",
                    "+38 (099) 499-33-99",
                    "+38 (068) 499-33-99"
                ];
                phoneList.innerHTML = fallbackPhones.map(phone => {
                    const operator = getOperator(phone);
                    return `
                        <a href="tel:${phone.replace(/\D/g, '')}" class="phone_list_item">
                            <div class="phone_item_info">
                                <i class="fas fa-phone-alt"></i>
                                <span>${phone}</span>
                            </div>
                            ${operator ? `<span class="operator_badge">${operator}</span>` : ''}
                        </a>
                    `;
                }).join('');
            }
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
