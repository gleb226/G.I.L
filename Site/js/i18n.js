const TRANSLATIONS = {
    en: {
        common: {
            siteName: "G.I.L Apartments",
            languageSwitch: "Language",
            languageOption: {
                en: "EN",
                uk: "UA"
            },
            pricePerDay: "{{price}} UAH / day",
            rooms: "{{count}} rooms",
            beds: "{{count}} beds",
            notSpecified: "Not specified",
            actions: {
                open: "Open",
                rent: "Rent",
                apply: "Apply",
                reset: "Reset",
                details: "Details",
                send: "Send",
                back: "Back",
                openTelegram: "Open in Telegram"
            }
        },
        nav: {
            main: "Main",
            map: "Map",
            booking: "Booking",
            contacts: "Contacts",
            about: "About Us",
            apartment: "Apartment",
        },
        features: {
            microwave: "Microwave",
            air_conditioner: "Air conditioner",
            near_supermarket: "Nearby supermarket",
            smart_tv: "Smart TV",
            balcony: "Balcony",
            parking: "Parking",
            intercom: "Code-entry building",
            gas_hob: "Gas cooktop",
            electro_hob: "Electric cooktop",
            washing_machine: "Washing machine",
            refrigerator: "Refrigerator",
            hot_water: "Hot water",
            internet: "Internet",
            wifi: "Wi-Fi",
            coded_entry: "Coded entry building",
            fridge: "Refrigerator",
            good_transport: "Good transport access",
            satellite_tv: "Satellite TV",
            tv: "TV",
            cable_tv: "Cable TV",
            t2_tv: "T2 TV",
            secure_parking: "Secure parking",
            hob: "Gas cooktop"
        },
        calendar: {
            checkIn: "Check-in",
            checkOut: "Check-out",
            checkInPlaceholder: "Select date",
            checkOutPlaceholder: "Select date",
            clearDates: "Clear dates",
            previousMonth: "Previous month",
            nextMonth: "Next month",
            available: "Available",
            selected: "Selected stay",
            booked: "Booked",
            selectDates: "Select dates to sort apartments",
            checkOutPending: "Choose a check-out date to continue",
            selectedRange: "{{start}} - {{end}}",
            bookedRange: "Booked from {{start}} to {{end}}",
            availableNow: "This apartment is available for new dates",
            dateUnknown: "Date not set",
            nights_one: "{{count}} night",
            nights_other: "{{count}} nights"
        },
        pages: {
            main: {
                title: "Daily Apartments in Uzhhorod",
                filterBarAria: "Filter",
                filterToggle: "Filter",
                filterPanelAria: "Filter panel",
                roomsLabel: "Rooms 🚪",
                roomsAll: "All listings",
                room1: "1 room",
                room2: "2 rooms",
                room3: "3 rooms",
                priceLabel: "Price",
                monthLabel: "Month",
                bedsLabel: "Beds",
                featuresLabel: "Features",
                featuresAria: "Apartment features",
                listAria: "Apartment list",
                from: "From",
                to: "To",
                empty: "No apartments match your filter.",
                featuredApartmentAlt: "Featured apartment",
                availabilityEyebrow: "Stay dates",
                availabilityTitle: "Choose dates first and see what is free",
                availabilityLead: "Select check-in and check-out like on Booking. We keep available apartments at the top and move booked ones below in a separate row.",
                availableHeading: "Available for these dates",
                availableLead: "These apartments match your stay and stay at the top of the catalog.",
                availableOnlyLead: "All matching apartments are free for the selected stay.",
                bookedHeading: "Booked for these dates",
                bookedLead: "These options remain visible below so you can compare the whole catalog.",
                bookedBadge: "Booked"
            },
            apartment: {
                title: "Apartment Details",
                detailTitle: "{{title}} | G.I.L Apartments",
                previewAlt: "Apartment preview",
                imageAlt: "Apartment photo",
                fallbackTitle: "Apartment not found",
                fallbackDescription: "The provided id is missing from the apartments data.",
                amenities: "Amenities",
                description: "Description",
                location: "Location",
                loading: "Apartment information is loading.",
                bookingEyebrow: "Booked dates",
                bookingCalendar: "Availability calendar",
                bookingLead: "Check which dates are already occupied before you book this apartment.",
                bookingRangeText: "This apartment is booked from {{start}} to {{end}}.",
                bookingOpen: "This apartment is currently open for new dates."
            },
            booking: {
                title: "Booking",
                heading: "Booking",
                lead: "To book a stay, it is enough to open our Telegram bot. There you can quickly choose an apartment, enter your stay dates, and move to booking confirmation.",
                storyEyebrow: "Telegram booking flow",
                storyTitle: "The whole booking flow starts with one Telegram assistant",
                storyLead: "No long forms and no extra steps. The bot helps the guest begin booking in a few messages and move from apartment choice to confirmation.",
                step1Title: "Apartment choice",
                step1Text: "Inside the bot you can review available options and move straight to the apartment that fits your stay.",
                step2Title: "Stay dates",
                step2Text: "You enter check-in and check-out dates and continue directly to the next booking step.",
                step3Title: "Fast contact",
                step3Text: "The bot helps pass the core booking information quickly without using a separate form on the site.",
                step4Title: "Booking confirmation",
                step4Text: "After a few simple steps you move to booking confirmation and clearly see what comes next.",
                step5Title: "Everything in one place",
                step5Text: "Instead of switching between different chats, the booking conversation starts in one Telegram dialog.",
                step6Title: "Clear starting point",
                step6Text: "It is the fastest way to begin a booking if you already chose a place and want to move to the details right away.",
                botEyebrow: "Telegram-бронювання",
                botTitle: "Start booking in the bot",
                botText: "Tap to open <strong>@GIL_Apartments_Bot</strong> in Telegram. There you can quickly begin the booking flow, choose an apartment, and continue without filling in a website form.",
                botAria: "Open the GIL Apartments Telegram bot",
                botPortalText: "Open the chat and continue to booking",
                botPortalArrow: "Відкрити",
                statApartments: "Apartments",
                statApartmentsText: "choose the right option",
                statDates: "Dates",
                statDatesText: "start booking quickly",
                statTelegramText: "everything in one chat",
                flowApartment: "Apartment",
                flowDates: "Dates",
                flowBooking: "Booking",
                flowConfirmation: "Confirmation",
                botNote: "If Telegram is already installed on the device, the link opens the bot conversation directly.",
                info1Title: "Simple for the guest",
                info1Text: "There is no need to search for separate contacts or fill in a long form. The booking start is collected in one place.",
                info2Title: "Quick access",
                info2Text: "One click opens the Telegram bot, where the guest can immediately continue with the booking flow."
            },
            contacts: {
                title: "Contacts",
                heading: "Contacts",
                lead: "Send us a message below or use the direct contact details.",
                phone: "Phone",
                email: "Email",
                location: "Location",
                locationValue: "Uzhhorod, Zakarpattia region",
                writeUs: "Write to us",
                showPhones: "Show all numbers",
                placeholderName: "Name",
                placeholderEmail: "Email",
                placeholderMessage: "Your message",
                messageReady: "Your message is ready to be sent."
            },
            map: {
                title: "Apartment Map",
                heading: "Apartment Map",
                lead: "Choose an apartment directly on the map and open its details page."
            }
        }
    },
    uk: {
        common: {
            siteName: "G.I.L Apartments",
            languageSwitch: "Мова",
            languageOption: {
                en: "EN",
                uk: "UA"
            },
            pricePerDay: "{{price}} ₴ / добу",
            rooms: "{{count}} кімн.",
            beds: "{{count}} сп. місця",
            notSpecified: "Не вказано",
            actions: {
                open: "Відкрити",
                rent: "Орендувати",
                apply: "Застосувати",
                reset: "Скинути",
                details: "Детальніше",
                send: "Надіслати",
                back: "Назад",
                openTelegram: "Перейти в Telegram"
            }
        },
        nav: {
            main: "Головна",
            map: "Мапа",
            booking: "Бронювання",
            contacts: "Контакти",
            about: "Про нас",
            apartment: "Квартира",
        },
        features: {
            microwave: "Мікрохвильова піч",
            air_conditioner: "Кондиціонер",
            near_supermarket: "Поруч магазин",
            smart_tv: "Smart TV",
            balcony: "Балкон",
            gas_hob: "Газова плита",
            electro_hob: "Електрична плита",
            parking: "Парковка",
            intercom: "Домофон",
            washing_machine: "Пральна машина",
            refrigerator: "Холодильник",
            fridge: "Холодильник",
            hot_water: "Гаряча вода",
            internet: "Інтернет",
            wifi: "Wi-Fi",
            coded_entry: "Під'їзд на коді",
            good_transport: "Зручна розв'язка",
            satellite_tv: "Супутникове ТБ",
            tv: "Телевізор",
            cable_tv: "Кабельне ТБ",
            t2_tv: "ТБ T2",
            secure_parking: "Парковка під охороною",
            hob: "Варильна поверхня"
        },
        pages: {
            main: {
                title: "Подобова оренда квартир в Ужгороді",
                filterBarAria: "Фільтр",
                filterToggle: "Фільтр",
                filterPanelAria: "Панель фільтра",
                roomsLabel: "Кількість кімнат 🚪",
                roomsAll: "Всі оголошення",
                room1: "1 кімната",
                room2: "2 кімнати",
                room3: "3 кімнати",
                priceLabel: "Ціна",
                monthLabel: "Місяць",
                bedsLabel: "Кількість спальних місць",
                featuresLabel: "Параметри",
                featuresAria: "Параметри квартир",
                listAria: "Список квартир",
                from: "Від",
                to: "До",
                empty: "За вашим фільтром квартири не знайдені.",
                featuredApartmentAlt: "Рекомендована квартира"
            },
            apartment: {
                title: "Деталі апартамента",
                detailTitle: "{{title}} | G.I.L Apartments",
                previewAlt: "Мініатюра квартири",
                imageAlt: "Фото квартири",
                fallbackTitle: "Квартиру не знайдено",
                fallbackDescription: "Схоже, що переданий id відсутній у базі apartments.",
                amenities: "Зручності",
                description: "Опис",
                location: "Розташування",
                loading: "Інформація про квартиру завантажується."
            },
            booking: {
                title: "Бронювання в Telegram",
                heading: "Бронювання",
                lead: "Щоб забронювати житло, достатньо перейти в наш Telegram-бот. Там можна швидко обрати квартиру, вказати дати проживання та перейти до підтвердження бронювання.",
                storyEyebrow: "Telegram-бронювання",
                storyTitle: "Усе бронювання проходить через одного помічника в Telegram",
                storyLead: "Без довгих форм і зайвих кроків. Бот допомагає почати бронювання в кілька повідомлень і провести гостя від вибору квартири до підтвердження.",
                step1Title: "Вибір квартири",
                step1Text: "У боті можна переглянути доступні варіанти й одразу перейти до тієї квартири, яка підходить саме вам.",
                step2Title: "Дати проживання",
                step2Text: "Ви вказуєте дати заїзду та виїзду, а далі одразу переходите до оформлення бронювання.",
                step3Title: "Швидкий зв'язок",
                step3Text: "Бот допомагає швидко передати основну інформацію для бронювання без окремих анкет на сайті.",
                step4Title: "Підтвердження броні",
                step4Text: "Після кількох простих кроків ви переходите до підтвердження бронювання й отримуєте зрозумілий маршрут далі.",
                step5Title: "Усе в одному місці",
                step5Text: "Замість листувань у різних месенджерах уся основна комунікація про бронювання починається в одному Telegram-діалозі.",
                step6Title: "Зрозумілий старт",
                step6Text: "Це найшвидший спосіб почати бронювання, якщо ви вже обрали житло й хочете перейти до деталей без зайвого пошуку контактів.",
                botEyebrow: "Telegram booking",
                botTitle: "Почати бронювання в боті",
                botText: "Натисніть і відкрийте <strong>@GIL_Apartments_Bot</strong> у Telegram. Там можна швидко почати бронювання, вибрати квартиру та перейти до наступних кроків без заповнення форми на сайті.",
                botAria: "Відкрити Telegram-бота GIL Apartments",
                botPortalText: "Відкрити діалог і перейти до бронювання",
                botPortalArrow: "Open",
                statApartments: "Квартири",
                statApartmentsText: "вибір потрібного варіанту",
                statDates: "Дати",
                statDatesText: "швидкий старт бронювання",
                statTelegramText: "усе в одному діалозі",
                flowApartment: "Квартира",
                flowDates: "Дати",
                flowBooking: "Бронювання",
                flowConfirmation: "Підтвердження",
                botNote: "Якщо Telegram вже встановлений на пристрої, перехід одразу відкриє діалог із ботом.",
                info1Title: "Просто для гостя",
                info1Text: "Не потрібно шукати окремі контакти чи заповнювати довгу форму. Весь старт бронювання зібраний в одному місці.",
                info2Title: "Швидкий перехід",
                info2Text: "Один клік відкриває Telegram-бота, де можна одразу почати оформлення без зайвих проміжних кроків."
            },
            contacts: {
                title: "Контакти",
                heading: "Контакти",
                phone: "Телефон",
                email: "Email",
                location: "Адреса",
                locationValue: "Ужгород, Закарпатська область",
                writeUs: "Написати нам",
                showPhones: "Показати всі номери",
                placeholderName: "Ім’я",
                placeholderEmail: "Email",
                placeholderMessage: "Ваше повідомлення",
                lead: "Надішліть нам повідомлення нижче або скористайтеся прямими контактами.",
                messageReady: "Повідомлення готове до відправлення."
            },
            map: {
                title: "Мапа квартир",
                heading: "Мапа квартир",
                lead: "Оберіть квартиру прямо на мапі та відкрийте її сторінку з деталями."
            }
        }
    }
};

const scoreReadableTranslationText = (value) => {
    if (typeof value !== "string") {
        return 0;
    }

    const readableMatches = value.match(/[A-Za-z0-9\u0400-\u04FFІЇЄҐієїґ']/g) || [];
    const suspiciousMatches = value.match(/[ГђГ‘Р РЎРѓРЊ]/g) || [];

    return readableMatches.length - suspiciousMatches.length * 2;
};

const normalizeTranslationText = (value) => {
    if (typeof value !== "string") {
        return value;
    }

    if (!/[ГђГ‘Р РЎРѓ]|Р./.test(value)) {
        return value;
    }

    try {
        const repaired = decodeURIComponent(escape(value));
        return scoreReadableTranslationText(repaired) > scoreReadableTranslationText(value) ? repaired : value;
    } catch (error) {
        return value;
    }
};

const normalizeTranslationTree = (value) => {
    if (Array.isArray(value)) {
        return value.map((item) => normalizeTranslationTree(item));
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, nestedValue]) => [key, normalizeTranslationTree(nestedValue)])
        );
    }

    return normalizeTranslationText(value);
};

TRANSLATIONS.en.pages.contacts.quickLinks = "Quick links";
TRANSLATIONS.en.pages.contacts.aboutUs = "About us";
TRANSLATIONS.en.pages.about = {
    title: "About Us",
    lead: "G.I.L Apartments is a company founded by the Bryanyk family that specializes in daily apartment rentals in Uzhhorod. We help city guests quickly find comfortable accommodation with clear terms, transparent prices, and convenient booking.",
    highlightTitle: "Comfortable stays in Uzhhorod without extra hassle",
    highlightText: "Our focus is daily apartment rental in Uzhhorod for tourists, city guests, and people traveling for work. We offer current accommodation options with honest descriptions so the path from choosing an apartment to check-in stays simple.",
    storyTag: "Story",
    storyTitle: "What G.I.L Apartments does",
    storyText1: "G.I.L Apartments was founded by the Bryanyk family and has grown as a service focused on quality daily apartment rentals in Uzhhorod. We gathered accommodation options in one place for city guests, tourists, and people visiting for work.",
    storyText2: "It matters to us that a guest receives not just a list of apartments, but a clear and reliable service: from viewing photos and key details to quick contact and a smooth move toward booking.",
    approachTag: "Approach",
    approachTitle: "What matters to us",
    quote: "Good service begins with honest information, a clean space, and respect for the guest's time.",
    valuesTag: "Values",
    valuesTitle: "Three principles behind our approach",
    value1Title: "Comfort",
    value1Text: "We care that every apartment is clean, prepared for check-in, and convenient for everyday living.",
    value2Title: "Simplicity",
    value2Text: "A clear catalog, current photos, transparent prices, and quick booking access help guests avoid wasting time.",
    value3Title: "Trust",
    value3Text: "Open communication, honest apartment descriptions, and dependable service are important to us during every stay.",
    ctaTag: "Next step",
    ctaTitle: "Choose an apartment and move to booking",
    ctaText: "Browse available options, open apartment details, and contact us through a convenient channel for a fast booking process.",
    ctaPrimary: "Go to booking",
    ctaSecondary: "Contacts"
};

TRANSLATIONS.uk.pages.contacts.quickLinks = "Швидкі посилання";
TRANSLATIONS.uk.pages.contacts.aboutUs = "Про нас";

TRANSLATIONS.uk.pages.about = {
    title: "Про нас",
    lead: "G.I.L Apartments - це компанія, заснована сім'єю Бряників, яка займається подобовою орендою квартир в Ужгороді. Ми допомагаємо гостям міста швидко знайти комфортне житло з прозорими умовами, зрозумілими цінами та зручним бронюванням.",
    highlightTitle: "Комфортне житло в Ужгороді без зайвих складнощів",
    highlightText: "Наша спеціалізація - подобова оренда квартир в Ужгороді для туристів, гостей міста та людей, які приїжджають у справах. Ми пропонуємо актуальні варіанти житла з чесним описом, щоб шлях від вибору квартири до заселення був максимально простим.",
    storyTag: "Історія",
    storyTitle: "Чим займається G.I.L Apartments",
    storyText1: "G.I.L Apartments заснована сім'єю Бряників і розвивається як сервіс, орієнтований на якісну подобову оренду квартир в Ужгороді. Ми зібрали в одному місці варіанти житла для гостей міста, туристів і тих, хто приїжджає у справах.",
    storyText2: "Для нас важливо, щоб гість отримував не просто список квартир, а зрозумілий і надійний сервіс: від перегляду фотографій і параметрів до швидкого контакту та переходу до оформлення бронювання.",
    approachTag: "Підхід",
    approachTitle: "Що для нас важливо",
    quote: "Хороший сервіс починається з чесної інформації, охайного простору та поваги до часу гостя.",
    valuesTag: "Цінності",
    valuesTitle: "Три принципи, на яких будується наш підхід",
    value1Title: "Комфорт",
    value1Text: "Ми дбаємо про те, щоб квартира була охайною, підготовленою до заселення та зручною для щоденного проживання.",
    value2Title: "Простота",
    value2Text: "Зрозумілий каталог, актуальні фото, прозорі ціни та швидкий перехід до бронювання допомагають не витрачати час даремно.",
    value3Title: "Довіра",
    value3Text: "Для нас важливі відкрита комунікація, чесний опис кожної квартири та сервіс, на який можна покластися під час поїздки.",
    ctaTag: "Наступний крок",
    ctaTitle: "Оберіть квартиру та переходьте до бронювання",
    ctaText: "Перегляньте доступні варіанти, відкрийте деталі квартири та зв'яжіться з нами через зручний канал для швидкого оформлення бронювання.",
    ctaPrimary: "Перейти до бронювання",
    ctaSecondary: "Контакти"
};

TRANSLATIONS.uk.calendar = {
    checkIn: "Заїзд",
    checkOut: "Виїзд",
    checkInPlaceholder: "Оберіть дату",
    checkOutPlaceholder: "Оберіть дату",
    clearDates: "Очистити дати",
    previousMonth: "Попередній місяць",
    nextMonth: "Наступний місяць",
    available: "Вільно",
    selected: "Обране проживання",
    booked: "Заброньовано",
    selectDates: "Оберіть дати, щоб відсортувати квартири",
    checkOutPending: "Оберіть дату виїзду, щоб продовжити",
    selectedRange: "{{start}} - {{end}}",
    bookedRange: "Заброньовано з {{start}} до {{end}}",
    availableNow: "Ця квартира зараз доступна для нових дат",
    dateUnknown: "Дата не вказана",
    nights_one: "{{count}} ніч",
    nights_few: "{{count}} ночі",
    nights_many: "{{count}} ночей",
    nights_other: "{{count}} ночі"
};

Object.assign(TRANSLATIONS.uk.pages.main, {
    availabilityEyebrow: "Дати проживання",
    availabilityTitle: "Оберіть дати та одразу побачте, що вільно",
    availabilityLead: "Позначте заїзд і виїзд, а ми піднімемо доступні квартири вгору, а зайняті залишимо нижче окремим блоком.",
    availableHeading: "Вільно на ці дати",
    availableLead: "Ці квартири підходять під ваші дати та залишаються зверху каталогу.",
    availableOnlyLead: "Усі квартири за поточним фільтром вільні на обраний період.",
    bookedHeading: "Заброньовано на ці дати",
    bookedLead: "Ці варіанти ми теж показуємо нижче, щоб ви могли порівняти весь каталог.",
    bookedBadge: "Зайнято"
});

Object.assign(TRANSLATIONS.uk.pages.apartment, {
    bookingEyebrow: "Заброньовані дати",
    bookingCalendar: "Календар доступності",
    bookingLead: "Перевірте, які дати вже зайняті, перед бронюванням цієї квартири.",
    bookingRangeText: "Ця квартира заброньована з {{start}} до {{end}}.",
    bookingOpen: "Ця квартира зараз відкрита для нових дат."
});

const NORMALIZED_TRANSLATIONS = normalizeTranslationTree(TRANSLATIONS);

const I18N_RESOURCES = Object.fromEntries(
    Object.entries(NORMALIZED_TRANSLATIONS).map(([language, translation]) => [
        language,
        {
            translation
        }
    ])
);

const resolveLanguage = () => {
    const savedLanguage = window.localStorage.getItem("siteLanguage");
    if (savedLanguage === "uk" || savedLanguage === "en") {
        return savedLanguage;
    }

    return navigator.language?.startsWith("uk") ? "uk" : "en";
};

window.i18nReady = i18next
    .init({
        lng: resolveLanguage(),
        fallbackLng: "en",
        resources: I18N_RESOURCES,
        defaultNS: "translation",
        interpolation: {
            escapeValue: false
        }
    })
    .then(() => {
        jqueryI18next.init(i18next, window.jQuery, {
            tName: "t",
            i18nName: "i18n",
            handleName: "localize",
            selectorAttr: "data-i18n",
            targetAttr: "i18n-target",
            optionsAttr: "i18n-options",
            useOptionsAttr: false,
            parseDefaultValueFromContent: true
        });

        const language = i18next.resolvedLanguage || i18next.language || "en";
        document.documentElement.lang = language;
        window.localStorage.setItem("siteLanguage", language);
    });

const translatePage = (root = document) => {
    if (!window.jQuery || !window.jQuery.fn?.localize) {
        return;
    }

    window.jQuery(root).localize();
};

const t = (key, options = {}) => i18next.t(key, options);

Object.assign(window, {
    TRANSLATIONS: NORMALIZED_TRANSLATIONS,
    translatePage,
    t
});
