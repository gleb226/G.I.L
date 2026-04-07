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
            guests: "{{count}} guests",
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
                openTelegram: "Open in Telegram"
            }
        },
        nav: {
            main: "Main",
            map: "Map",
            booking: "Booking",
            contacts: "Contacts",
            apartment: "Apartment",
            profile: "Profile"
        },
        features: {
            tv: "TV",
            fridge: "Refrigerator",
            microwave: "Microwave",
            hot_water: "Hot water",
            air_conditioner: "Air conditioner",
            near_supermarket: "Nearby supermarket",
            good_transport: "Good transport links",
            smart_tv: "Smart TV",
            balcony: "Balcony",
            hob: "Cooktop",
            internet: "Internet",
            cable_tv: "Cable TV",
            secure_parking: "Guarded parking",
            coded_entry: "Code-entry building",
            washing_machine: "Washing machine",
            satellite_tv: "Satellite TV",
            t2_tv: "T2 television"
        },
        pages: {
            main: {
                title: "G.I.L Apartments | Daily Apartments in Uzhhorod",
                filterBarAria: "Filter",
                filterToggle: "Filter",
                filterPanelAria: "Filter panel",
                roomsLabel: "Rooms",
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
                featuredApartmentAlt: "Featured apartment"
            },
            apartment: {
                title: "G.I.L Apartments | Apartment Details",
                detailTitle: "{{title}} | G.I.L Apartments",
                previewAlt: "Apartment preview",
                imageAlt: "Apartment photo",
                fallbackTitle: "Apartment not found",
                fallbackDescription: "The provided id is missing from the apartments data.",
                amenities: "Amenities",
                description: "Description",
                location: "Location",
                loading: "Apartment information is loading."
            },
            booking: {
                title: "G.I.L Apartments | Booking in Telegram",
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
                title: "G.I.L Apartments | Contacts",
                heading: "Contacts",
                lead: "Send us a message below or use the direct contact details.",
                phone: "Phone",
                email: "Email",
                location: "Location",
                locationValue: "Uzhhorod, Zakarpattia region",
                writeUs: "Write to us",
                placeholderName: "Name",
                placeholderEmail: "Email",
                placeholderMessage: "Your message",
                messageReady: "Your message is ready to be sent."
            },
            map: {
                title: "G.I.L Apartments | Apartment Map",
                heading: "Apartment Map",
                lead: "Choose an apartment directly on the map and open its details page."
            },
            profile: {
                title: "G.I.L Apartments | Profile",
                heading: "Profile",
                lead: "Save your contact details, site language, and preferred currency for browsing apartments.",
                cardTitle: "Guest profile",
                nameLabel: "Name",
                phoneLabel: "Phone",
                languageLabel: "Language",
                currencyLabel: "Currency",
                ratesTitle: "PrivatBank exchange rates",
                ratesLoading: "Loading current rates...",
                ratesError: "Failed to load PrivatBank rates right now.",
                save: "Save profile",
                saved: "Profile saved.",
                placeholders: {
                    name: "Your name",
                    phone: "+380..."
                }
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
            pricePerDay: "{{price}} ₴ / день",
            guests: "{{count}} гості",
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
                openTelegram: "Перейти в Telegram"
            }
        },
        nav: {
            main: "Головна",
            map: "Мапа",
            booking: "Бронювання",
            contacts: "Контакти",
            apartment: "Квартира",
            profile: "Профіль"
        },
        profile: {
            title: "Профіль користувача",
            userName: "Ваше ім'я",
            userPhone: "Номер телефону",
            language: "Мова сайту",
            currency: "Бажана валюта",
            save: "Зберегти зміни",
            saved: "Налаштування збережено!",
            privatRates: "Курси ПриватБанку",
            loading: "Завантаження курсів...",
            backToHome: "На головну"
        },
        features: {
            tv: "телевізор",
            fridge: "холодильник",
            microwave: "мікрохвильова піч",
            hot_water: "гаряча вода",
            air_conditioner: "кондиціонер",
            near_supermarket: "поряд супермаркет",
            good_transport: "гарне транспортне сполучення",
            smart_tv: "Smart TV",
            balcony: "балкон",
            hob: "варильна поверхня",
            internet: "Інтернет",
            cable_tv: "кабельне телебачення",
            secure_parking: "парковка, що охороняється",
            coded_entry: "під'їзд на коді",
            washing_machine: "пральна машина",
            satellite_tv: "супутникове телебачення",
            t2_tv: "телебачення T2"
        },
        pages: {
            main: {
                title: "G.I.L Apartments | Подобова оренда квартир в Ужгороді",
                filterBarAria: "Фільтр",
                filterToggle: "Фільтр",
                filterPanelAria: "Панель фільтра",
                roomsLabel: "Кількість кімнат",
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
                title: "G.I.L Apartments | Деталі апартамента",
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
                title: "G.I.L Apartments | Бронювання в Telegram",
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
                title: "G.I.L",
                heading: "Контакти",
                lead: "Напишіть нам у формі нижче або скористайтеся прямими контактами.",
                phone: "Телефон",
                email: "Email",
                location: "Адреса",
                locationValue: "Ужгород, Закарпатська область",
                writeUs: "Написати нам",
                placeholderName: "Ім’я",
                placeholderEmail: "Email",
                placeholderMessage: "Ваше повідомлення",
                messageReady: "Повідомлення готове до відправлення."
            },
            map: {
                title: "G.I.L",
                heading: "Мапа квартир",
                lead: "Оберіть квартиру прямо на мапі та відкрийте її сторінку з деталями."
            }
        }
    }
};

const I18N_RESOURCES = Object.fromEntries(
    Object.entries(TRANSLATIONS).map(([language, translation]) => [
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
    TRANSLATIONS,
    translatePage,
    t
});
