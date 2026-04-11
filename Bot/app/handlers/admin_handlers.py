from aiogram import Router, F, Bot
from aiogram.exceptions import TelegramBadRequest
from aiogram.types import Message, CallbackQuery, FSInputFile
from aiogram.fsm.context import FSMContext
from aiogram.filters import StateFilter, Command
from app.databases.mongodb import (
    get_user, get_apartments, add_apartment, delete_apartment, get_apartment, 
    get_booking, update_booking_status, get_active_bookings, 
    update_user_pref, update_apartment, upsert_user, db, remove_staff, search_user,
    get_apartment_bookings, log_error, add_log
)
from app.keyboards.user_keyboards import user_reply_inline_kb, main_menu_kb, apartments_inline_kb
from app.keyboards.admin_keyboards import (
    admin_panel_kb, apartment_mgmt_inline_kb, apartment_item_mgmt_kb, 
    staff_mgmt_inline_kb, booking_action_inline_kb, staff_delete_inline_kb, 
    admin_reply_inline_kb, confirm_ap_add_kb, translation_confirm_kb,
    features_selection_kb, apartment_edit_fields_kb, photo_done_kb
)
from app.utils.states import AdminStates
from app.utils.currency import get_usd_rate, format_price
from app.common.token import BOSS_IDS, GOOGLE_MAPS_API_KEY
import re, random, os, uuid, io, html, asyncio
import googlemaps
from aiohttp import ClientSession
from urllib.parse import urlparse, parse_qs, unquote
from PIL import Image
from app.common.texts import get_text, get_all_translations
from app.utils.translator import translate_text

router = Router()

# Custom filter for admin/boss only to prevent collision with user handlers
async def is_admin_filter(event: Message | CallbackQuery) -> bool:
    u = await get_user(event.from_user.id)
    return u and u.get('role') in ['admin', 'boss']

# Helper to safely clear state and show error
async def handle_error(event: Message | CallbackQuery, state: FSMContext, e: Exception, action: str):
    await log_error(f"Admin error in {action}: {e}", str(event.from_user.id))
    msg = f"❌ Виникла помилка: {e}\nСпробуйте ще раз або зверніться до розробника."
    if isinstance(event, Message):
        await event.answer(msg)
    else:
        try:
            await event.message.answer(msg)
        except:
            pass
        await event.answer()
    await state.clear()

FIELD_LABELS = {
    "uk": {
        "title": "назви", "description": "опису", "price": "ціни", "photo": "фото",
        "rooms": "кількості кімнат", "beds": "кількості спальних місць",
        "guests": "кількості гостей", "address": "адреси", "area": "площі",
        "features": "зручностей",
    },
    "en": {
        "title": "title", "description": "description", "price": "price", "photo": "photo",
        "rooms": "rooms", "beds": "beds", "guests": "guests", "address": "address",
        "area": "area", "features": "amenities",
    },
}

def format_area_value(area, lang="uk"):
    value = str(area or "").strip()
    if not value or value in {"-", "None", "null"}:
        return "Не вказано" if lang == "uk" else "Not specified"
    lower = value.lower()
    if "м²" in lower or "m²" in lower or "sqm" in lower or "sq.m" in lower:
        return value
    if value.isdigit():
        return f"{value} м²" if lang == "uk" else f"{value} m²"
    return value

def build_guest_summary(guest: dict | None, phone: str | None, lang: str) -> str:
    guest_name = html.escape((guest or {}).get("name") or ("Гість" if lang == "uk" else "Guest"))
    guest_username = ((guest or {}).get("username") or "").strip().replace("@", "")
    guest_phone = html.escape(phone or (guest or {}).get("phone") or "-")
    username_line = f"\nUsername: @{html.escape(guest_username)}" if guest_username else ""
    if lang == "uk":
        return f"Гість: {guest_name}{username_line}\nТелефон: {guest_phone}"
    return f"Guest: {guest_name}{username_line}\nPhone: {guest_phone}"

async def build_booking_summary_text(booking: dict, lang: str) -> str:
    apartment = await get_apartment(booking["ap_id"])
    guest = await get_user(booking.get("user_id"))
    apartment_name = apartment["title"].get(lang, apartment["title"].get("uk", "Ap")) if apartment else "Unknown"
    paid_amount = booking.get("paid_prepayment", 0) + booking.get("paid_remaining", 0)
    guest_summary = build_guest_summary(guest, booking.get("phone"), lang)
    if lang == "uk":
        return (f"Бронювання\nОб'єкт: {apartment_name}\nДати: {booking['start_date']} — {booking['end_date']}\nВсього: {booking['total_price']} грн\nОплачено: {paid_amount} грн\n{guest_summary}")
    return (f"Booking\nObject: {apartment_name}\nDates: {booking['start_date']} ? {booking['end_date']}\nTotal: {booking['total_price']} UAH\nPaid: {paid_amount} UAH\n{guest_summary}")

async def resolve_coords(address):
    value = (address or "").strip()
    match = re.search(r'([-+]?\d*\.\d+|\d+),\s*([-+]?\d*\.\d+|\d+)', value)
    if match: return float(match.group(1)), float(match.group(2))
    parsed = urlparse(value)
    if parsed.scheme and parsed.netloc:
        decoded_value = unquote(value)
        match = re.search(r'@([-+]?\d*\.\d+|\d+),([-+]?\d*\.\d+|\d+)', decoded_value)
        if match: return float(match.group(1)), float(match.group(2))
        query = parse_qs(parsed.query)
        for key in ("q", "query", "destination"):
            qv = query.get(key, [None])[0]
            if not qv: continue
            match = re.search(r'([-+]?\d*\.\d+|\d+)\s*,\s*([-+]?\d*\.\d+|\d+)', unquote(qv))
            if match: return float(match.group(1)), float(match.group(2))
        if "maps.app.goo.gl" in parsed.netloc or "goo.gl" in parsed.netloc:
            try:
                async with ClientSession() as session:
                    async with session.get(value, allow_redirects=True, timeout=10) as resp: final_url = str(resp.url)
                decoded_final_url = unquote(final_url)
                match = re.search(r'@([-+]?\d*\.\d+|\d+),([-+]?\d*\.\d+|\d+)', decoded_final_url)
                if match: return float(match.group(1)), float(match.group(2))
            except: pass
    if GOOGLE_MAPS_API_KEY:
        try:
            loop = asyncio.get_event_loop()
            client = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)
            result = await loop.run_in_executor(None, lambda: client.geocode(value, region="ua", language="uk"))
            if result:
                loc = result[0].get("geometry", {}).get("location", {})
                if loc.get("lat") and loc.get("lng"): return float(loc["lat"]), float(loc["lng"])
        except: pass
    return None, None

async def show_ap_card(event, ap_id, lang, role):
    try:
        ap = await get_apartment(ap_id)
        if not ap: return
        rate, price_val = await get_usd_rate(), int(ap.get('price', 0))
        pr = format_price(price_val, rate, "uah")
        title = ap.get('title', {}).get(lang, ap.get('title', {}).get('uk', 'Ap'))
        desc = ap.get('description', {}).get(lang, ap.get('description', {}).get('uk', '-'))
        area = format_area_value(ap.get('area'), lang)
        txt = (f"🏢 <b>{title}</b>\n\n📝 {desc}\n\n👥 {ap.get('guests', '-')} | 🚪 {ap.get('rooms', '-')} | 🛏 {ap.get('beds', '-')} | 📐 {area}\n💰 {pr}")
        kb = apartment_item_mgmt_kb(str(ap.get('_id', ap_id)), ap.get('is_available', True), lang, role)
        msg = event.message if isinstance(event, CallbackQuery) else event
        img = resolve_apartment_image_admin(ap)
        if img:
            try:
                await msg.answer_photo(img, caption=txt, reply_markup=kb, parse_mode="HTML")
                if isinstance(event, CallbackQuery):
                    try: await event.message.delete()
                    except: pass
                return
            except: pass
        await msg.answer(txt, reply_markup=kb, parse_mode="HTML")
    except Exception as e: await log_error(f"Error in show_ap_card: {e}", str(event.from_user.id))

def resolve_apartment_image_admin(ap):
    img = ap.get('img') or (ap.get('gallery') or [None])[0]
    if not img: return None
    if isinstance(img, str) and not img.startswith(("http://", "https://")):
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "Site"))
        lp = os.path.join(base_dir, img if img.startswith("images/") else f"images/{img}")
        if os.path.exists(lp): return FSInputFile(lp)
        if len(img) < 20: return None
    return img

# HANDLERS - CORE ADMIN

@router.message(Command("admin"), is_admin_filter)
@router.message(F.text.in_(get_all_translations('btn_admin')), is_admin_filter)
async def admin_h(event: Message | CallbackQuery, state: FSMContext):
    try:
        await state.clear()
        user_id = event.from_user.id
        u = await get_user(user_id)
        if not u: return
        msg_obj = event if isinstance(event, Message) else event.message
        await msg_obj.answer(get_text('msg_admin_panel', u['language']), reply_markup=admin_panel_kb(u['role'], u['language']))
    except Exception as e: await handle_error(event, state, e, "admin_h")

@router.message(F.text.in_(get_all_translations('btn_active_bookings')), is_admin_filter)
async def active_bookings_h(event: Message | CallbackQuery, state: FSMContext):
    try:
        await state.clear()
        user_id = event.from_user.id
        u = await get_user(user_id)
        if not u: return
        bs = await get_active_bookings()
        msg_obj = event if isinstance(event, Message) else event.message
        if not bs: return await msg_obj.answer(get_text('msg_list_empty', u['language']))
        for b in bs:
            txt = await build_booking_summary_text(b, u['language'])
            await msg_obj.answer(txt, reply_markup=booking_action_inline_kb(b, u['language']))
    except Exception as e: await handle_error(event, state, e, "active_bookings_h")

@router.message(F.text.in_(get_all_translations('btn_objects')), is_admin_filter)
async def admin_aps(event: Message | CallbackQuery, state: FSMContext):
    try:
        await state.clear()
        user_id = event.from_user.id
        u = await get_user(user_id)
        if not u: return
        aps = await get_apartments()
        msg_obj = event if isinstance(event, Message) else event.message
        await msg_obj.answer("🏢 Об'єкти:", reply_markup=apartment_mgmt_inline_kb(aps, u['language']), parse_mode="HTML")
    except Exception as e: await handle_error(event, state, e, "admin_aps")

@router.message(F.text.in_(get_all_translations('btn_team')), is_admin_filter)
async def team_mgmt_h(event: Message | CallbackQuery, state: FSMContext):
    try:
        user_id = event.from_user.id
        u = await get_user(user_id)
        if not u or u.get('role') != 'boss': return
        await state.clear()
        msg_obj = event if isinstance(event, Message) else event.message
        await msg_obj.answer(get_text('btn_team', u['language']), reply_markup=staff_mgmt_inline_kb(u['language']))
    except Exception as e: await handle_error(event, state, e, "team_mgmt_h")

# HANDLERS - ADD APARTMENT FLOW

@router.callback_query(F.data == "add_ap", is_admin_filter)
async def add_ap_start(callback: CallbackQuery, state: FSMContext):
    try:
        await state.clear()
        await callback.message.answer("🏢 Додавання нового об'єкта.\n\nВведіть назву (українською):")
        await state.set_state(AdminStates.adding_apartment_name)
        await callback.answer()
    except Exception as e: await handle_error(callback, state, e, "add_ap_start")

@router.message(AdminStates.adding_apartment_name, is_admin_filter)
async def add_ap_name_ua(message: Message, state: FSMContext):
    try:
        ua_title = message.text.strip()
        en_title = await translate_text(ua_title)
        await state.update_data(title_uk=ua_title, title_en=en_title)
        hint = "\n⚠️ <i>(Автопереклад не вдався)</i>" if en_title == ua_title else ""
        await message.answer(f"Переклад назви:\n<code>{en_title}</code>{hint}\n\nВсе ок чи змінити?", reply_markup=translation_confirm_kb(), parse_mode="HTML")
        await state.set_state(AdminStates.confirming_name_translation)
    except Exception as e: await handle_error(message, state, e, "add_ap_name_ua")

@router.callback_query(StateFilter(AdminStates.confirming_name_translation), F.data == "tr_ok", is_admin_filter)
async def name_tr_ok(callback: CallbackQuery, state: FSMContext):
    await callback.message.answer("Введіть опис (українською):")
    await state.set_state(AdminStates.adding_apartment_desc)
    await callback.answer()

@router.callback_query(StateFilter(AdminStates.confirming_name_translation), F.data == "tr_edit", is_admin_filter)
async def name_tr_edit(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    await callback.message.answer(f"Введіть назву англійською (поточна: <code>{data.get('title_en','')}</code>):", parse_mode="HTML")
    await callback.answer()

@router.message(AdminStates.confirming_name_translation, is_admin_filter)
async def name_tr_manual(message: Message, state: FSMContext):
    await state.update_data(title_en=message.text.strip())
    await message.answer("Введіть опис (українською):")
    await state.set_state(AdminStates.adding_apartment_desc)

@router.message(AdminStates.adding_apartment_desc, is_admin_filter)
async def add_ap_desc_ua(message: Message, state: FSMContext):
    try:
        ua_desc = message.text.strip()
        en_desc = await translate_text(ua_desc)
        await state.update_data(desc_uk=ua_desc, desc_en=en_desc)
        hint = "\n⚠️ <i>(Автопереклад не вдався)</i>" if en_desc == ua_desc else ""
        await message.answer(f"Переклад опису:\n<code>{en_desc}</code>{hint}\n\nВсе ок чи змінити?", reply_markup=translation_confirm_kb(), parse_mode="HTML")
        await state.set_state(AdminStates.confirming_desc_translation)
    except Exception as e: await handle_error(message, state, e, "add_ap_desc_ua")

@router.callback_query(StateFilter(AdminStates.confirming_desc_translation), F.data == "tr_ok", is_admin_filter)
async def desc_tr_ok(callback: CallbackQuery, state: FSMContext):
    await callback.message.answer("Кількість кімнат (число):")
    await state.set_state(AdminStates.adding_apartment_rooms)
    try: await callback.message.delete()
    except: pass
    await callback.answer()

@router.callback_query(StateFilter(AdminStates.confirming_desc_translation), F.data == "tr_edit", is_admin_filter)
async def desc_tr_edit(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    await callback.message.answer(f"Введіть опис англійською (поточна: <code>{data.get('desc_en','')}</code>):", parse_mode="HTML")
    await callback.answer()

@router.message(AdminStates.confirming_desc_translation, is_admin_filter)
async def desc_tr_manual(message: Message, state: FSMContext):
    await state.update_data(desc_en=message.text.strip())
    await message.answer("Кількість кімнат (число):")
    await state.set_state(AdminStates.adding_apartment_rooms)

@router.message(AdminStates.adding_apartment_rooms, is_admin_filter)
async def add_ap_r(message: Message, state: FSMContext):
    if not message.text.isdigit(): return await message.answer("Будь ласка, введіть число:")
    await state.update_data(rooms=int(message.text))
    await message.answer("Кількість спальних місць (число):")
    await state.set_state(AdminStates.adding_apartment_beds)

@router.message(AdminStates.adding_apartment_beds, is_admin_filter)
async def add_ap_b(message: Message, state: FSMContext):
    if not message.text.isdigit(): return await message.answer("Будь ласка, введіть число:")
    await state.update_data(beds=int(message.text))
    await message.answer("Максимальна кількість гостей (число):")
    await state.set_state(AdminStates.adding_apartment_guests)

@router.message(AdminStates.adding_apartment_guests, is_admin_filter)
async def add_ap_g(message: Message, state: FSMContext):
    if not message.text.isdigit(): return await message.answer("Будь ласка, введіть число:")
    await state.update_data(guests=int(message.text))
    await message.answer("Введіть площу (м²) або '-' якщо невідомо:")
    await state.set_state(AdminStates.adding_apartment_area)

@router.message(AdminStates.adding_apartment_area, is_admin_filter)
async def add_ap_a(message: Message, state: FSMContext):
    await state.update_data(area=format_area_value(message.text))
    await message.answer("Введіть адресу або Google Maps посилання:")
    await state.set_state(AdminStates.adding_apartment_address)

@router.message(AdminStates.adding_apartment_address, is_admin_filter)
async def add_ap_ad(message: Message, state: FSMContext):
    try:
        lat, lng = await resolve_coords(message.text)
        if lat is None or lng is None:
            return await message.answer("❌ Координати не визначено. Надішліть посилання з Google Maps або координати (н-р: 48.6, 22.2):")
        route_url = message.text.strip() if urlparse(message.text.strip()).scheme else None
        await state.update_data(address=message.text.strip(), lat=lat, lng=lng, route_url=route_url)
        await message.answer("Ціна за добу (грн, тільки число):")
        await state.set_state(AdminStates.adding_apartment_price)
    except Exception as e: await handle_error(message, state, e, "add_ap_ad")

@router.message(AdminStates.adding_apartment_price, is_admin_filter)
async def add_ap_p(message: Message, state: FSMContext):
    if not message.text.isdigit(): return await message.answer("Введіть число (грн):")
    await state.update_data(price=int(message.text))
    await message.answer("Надішліть головне фото (або посилання на нього):")
    await state.set_state(AdminStates.adding_apartment_photo)

@router.message(AdminStates.adding_apartment_photo, is_admin_filter)
async def add_ap_ph(message: Message, state: FSMContext, bot: Bot):
    try:
        data = await state.get_data(); gallery = data.get('gallery', [])
        if message.photo:
            photo = message.photo[-1]
            fi = await bot.get_file(photo.file_id)
            fc = io.BytesIO(); await bot.download_file(fi.file_path, fc); fc.seek(0)
            img = Image.open(fc); fname = f"{uuid.uuid4()}.webp"
            ud = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "Site", "images", "uploads"))
            os.makedirs(ud, exist_ok=True)
            img.save(os.path.join(ud, fname), "WEBP", quality=80)
            gallery.append(f"images/uploads/{fname}")
            await state.update_data(gallery=gallery, is_local=True)
        elif message.text and message.text.startswith("http"):
            gallery.append(message.text.strip())
            await state.update_data(gallery=gallery, is_local=False)
        else: return await message.answer("Надішліть фото або посилання (http...):")
        u = await get_user(message.from_user.id)
        await message.answer(f"📸 Фото додано ({len(gallery)}). Надішліть ще або натисніть 'Готово'.", reply_markup=photo_done_kb(u['language']))
    except Exception as e: await handle_error(message, state, e, "add_ap_ph")

@router.callback_query(F.data == "ph_done", StateFilter(AdminStates.adding_apartment_photo), is_admin_filter)
async def ph_done_h(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    if not data.get('gallery'): return await callback.answer("❌ Додайте хоча б одне фото", show_alert=True)
    u = await get_user(callback.from_user.id)
    await callback.message.answer("Оберіть зручності:", reply_markup=features_selection_kb([], u['language']))
    await state.set_state(AdminStates.adding_apartment_features)
    await callback.answer()

@router.callback_query(AdminStates.adding_apartment_features, F.data.startswith("fsel_"), is_admin_filter)
async def add_ap_f_toggle(callback: CallbackQuery, state: FSMContext):
    try:
        data = await state.get_data(); sel = data.get('features', []); u = await get_user(callback.from_user.id)
        if callback.data == "fsel_done":
            await callback.message.answer(f"🏢 {data['title_uk']}\n💰 {data['price']} грн\n\nЗберегти об'єкт?", reply_markup=confirm_ap_add_kb(u['language']))
            try: await callback.message.delete()
            except: pass
        else:
            feat = callback.data[5:]
            if feat in sel: sel.remove(feat)
            else: sel.append(feat)
            await state.update_data(features=sel)
            await callback.message.edit_reply_markup(reply_markup=features_selection_kb(sel, u['language']))
        await callback.answer()
    except Exception as e: await handle_error(callback, state, e, "add_ap_f_toggle")

@router.callback_query(F.data == "cf_ad", StateFilter(AdminStates.adding_apartment_features), is_admin_filter)
async def add_ap_final_save(callback: CallbackQuery, state: FSMContext):
    try:
        d = await state.get_data(); gallery = d.get('gallery', [])
        ap = {
            "title": {"uk": d['title_uk'], "en": d['title_en']}, "description": {"uk": d['desc_uk'], "en": d['desc_en']},
            "rooms": d['rooms'], "beds": d['beds'], "guests": d['guests'], "area": d['area'], "address": d['address'],
            "lat": d['lat'], "lng": d['lng'], "route_url": d.get('route_url'), "price": d['price'],
            "img": gallery[0] if gallery else "", "gallery": gallery, "features": d.get('features', []), "is_available": True
        }
        await add_apartment(ap)
        await callback.message.answer("✅ Об'єкт успішно додано!")
        await state.clear(); await admin_aps(callback.message, state)
        await callback.answer()
        try: await callback.message.delete()
        except: pass
    except Exception as e: await handle_error(callback, state, e, "add_ap_final_save")

# REST OF HANDLERS (MANAGEMENT, EDITING, STAFF)

@router.callback_query(F.data.startswith("m:"), is_admin_filter)
async def manage_ap_h(callback: CallbackQuery, state: FSMContext):
    u = await get_user(callback.from_user.id)
    await show_ap_card(callback, callback.data[2:], u['language'], u['role'])
    await callback.answer()

@router.callback_query(F.data == "adm_back", is_admin_filter)
async def admin_back_h(callback: CallbackQuery, state: FSMContext):
    await admin_aps(callback.message, state)
    try: await callback.message.delete()
    except: pass
    await callback.answer()

@router.callback_query(F.data.startswith("ed_"), is_admin_filter)
async def edit_ap_start(callback: CallbackQuery, state: FSMContext):
    u = await get_user(callback.from_user.id)
    await callback.message.edit_reply_markup(reply_markup=apartment_edit_fields_kb(callback.data[3:], u['language']))
    await callback.answer()

@router.callback_query(F.data.startswith("ef_"), is_admin_filter)
async def edit_ap_field_h(callback: CallbackQuery, state: FSMContext):
    try:
        parts = callback.data.split("_"); aid, field = parts[1], parts[2]; u = await get_user(callback.from_user.id)
        await state.update_data(edit_ap_id=aid, edit_field=field)
        if field == "features":
            ap = await get_apartment(aid); await callback.message.answer("Оберіть зручності:", reply_markup=features_selection_kb(ap.get('features', []), u['language']))
        elif field == "photo":
            await state.update_data(edit_gallery=[]); await callback.message.answer("Завантажте нові фото:", reply_markup=photo_done_kb(u['language']))
        else:
            label = FIELD_LABELS.get(u['language'], FIELD_LABELS['uk']).get(field, field)
            await callback.message.answer(f"Введіть нове значення для {label}:")
        await state.set_state(AdminStates.editing_apartment_field)
        await callback.answer()
    except Exception as e: await handle_error(callback, state, e, "edit_ap_field_h")

@router.message(AdminStates.editing_apartment_field, is_admin_filter)
async def edit_ap_field_in(message: Message, state: FSMContext, bot: Bot):
    try:
        data = await state.get_data(); aid, field = data['edit_ap_id'], data['edit_field']; u = await get_user(message.from_user.id)
        if field == "photo":
            gallery = data.get('edit_gallery', [])
            if message.photo:
                photo = message.photo[-1]; fi = await bot.get_file(photo.file_id)
                fc = io.BytesIO(); await bot.download_file(fi.file_path, fc); fc.seek(0)
                img = Image.open(fc); fname = f"{uuid.uuid4()}.webp"
                ud = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "Site", "images", "uploads"))
                os.makedirs(ud, exist_ok=True); img.save(os.path.join(ud, fname), "WEBP", quality=80)
                gallery.append(f"images/uploads/{fname}"); await state.update_data(edit_gallery=gallery)
                return await message.answer(f"📸 Фото додано ({len(gallery)}).", reply_markup=photo_done_kb(u['language']))
            elif message.text and message.text.startswith("http"):
                gallery.append(message.text.strip()); await state.update_data(edit_gallery=gallery)
                return await message.answer(f"📸 Фото додано ({len(gallery)}).", reply_markup=photo_done_kb(u['language']))
        val = message.text
        if field in ['price', 'rooms', 'beds', 'guests']:
            if not val.isdigit(): return await message.answer("Введіть число:")
            val = int(val)
        elif field == "area": val = format_area_value(val)
        elif field in ["title", "description"]: val = {"uk": val, "en": await translate_text(val)}
        await update_apartment(aid, {field: val}); await message.answer("✅ Оновлено"); await state.clear()
        await show_ap_card(message, aid, u['language'], u['role'])
    except Exception as e: await handle_error(message, state, e, "edit_ap_field_in")

@router.callback_query(AdminStates.editing_apartment_field, F.data == "ph_done", is_admin_filter)
async def edit_ap_ph_done(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data(); gallery = data.get('edit_gallery', [])
    if not gallery: return await callback.answer("❌ Додайте фото", show_alert=True)
    await update_apartment(data['edit_ap_id'], {"img": gallery[0], "gallery": gallery})
    await callback.message.answer("✅ Фото оновлено"); await state.clear()
    u = await get_user(callback.from_user.id); await show_ap_card(callback, data['edit_ap_id'], u['language'], u['role']); await callback.answer()

@router.callback_query(AdminStates.editing_apartment_field, F.data.startswith("fsel_"), is_admin_filter)
async def edit_ap_f_toggle(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data(); aid = data['edit_ap_id']; u = await get_user(callback.from_user.id)
    if callback.data == "fsel_done": await state.clear(); await show_ap_card(callback, aid, u['language'], u['role'])
    else:
        feat = callback.data[5:]; ap = await get_apartment(aid); sel = ap.get('features', [])
        if feat in sel: sel.remove(feat)
        else: sel.append(feat)
        await update_apartment(aid, {"features": sel}); await callback.message.edit_reply_markup(reply_markup=features_selection_kb(sel, u['language']))
    await callback.answer()

@router.callback_query(F.data.startswith("pg:adm:"), is_admin_filter)
async def pagination_h(callback: CallbackQuery, state: FSMContext):
    try:
        parts = callback.data.split(":")
        page = int(parts[2])
        u = await get_user(callback.from_user.id)
        aps = await get_apartments()
        await callback.message.edit_reply_markup(reply_markup=apartment_mgmt_inline_kb(aps, u['language'], page))
        await callback.answer()
    except Exception as e: await handle_error(callback, state, e, "pagination_h")

@router.callback_query(F.data.startswith("tg_"), is_admin_filter)
async def toggle_ap_h(callback: CallbackQuery):
    aid = callback.data[3:]; ap = await get_apartment(aid)
    if not ap: return
    nv = not ap.get('is_available', True); await update_apartment(aid, {"is_available": nv})
    u = await get_user(callback.from_user.id); await show_ap_card(callback, aid, u['language'], u['role']); await callback.answer("✅" if nv else "❌")

@router.callback_query(F.data.startswith("dl_"), is_admin_filter)
async def delete_ap_h(callback: CallbackQuery, state: FSMContext):
    await delete_apartment(callback.data[3:]); await callback.message.answer("🗑 Об'єкт видалено"); await admin_aps(callback.message, state); await callback.answer()
    try: await callback.message.delete()
    except: pass

@router.callback_query(F.data.startswith("ok_"), is_admin_filter)
async def approve_booking_h(callback: CallbackQuery):
    await update_booking_status(callback.data[3:], "confirmed"); await callback.message.answer("✅ Бронювання підтверджено"); await callback.answer()

@router.callback_query(F.data.startswith("rj_"), is_admin_filter)
async def reject_booking_h(callback: CallbackQuery, bot: Bot):
    await update_booking_status(callback.data[3:], "rejected"); await callback.message.answer("❌ Бронювання відхилено"); await callback.answer()

@router.callback_query(F.data.startswith("ms_"), is_admin_filter)
async def chat_h(callback: CallbackQuery, state: FSMContext):
    data = callback.data.split("_")
    uid = int(data[2]) if data[1] == "u" else (await get_booking(data[1]))['user_id']
    await state.update_data(chat_target_user_id=uid); await state.set_state(AdminStates.replying_to_user)
    u = await get_user(callback.from_user.id); await callback.message.answer(get_text('msg_enter_reply', u['language'])); await callback.answer()

@router.message(AdminStates.replying_to_user, is_admin_filter)
async def reply_h(message: Message, state: FSMContext, bot: Bot):
    try:
        d = await state.get_data(); tid = d.get('chat_target_user_id')
        if not tid: return await message.answer("Recipient not found"); u = await get_user(message.from_user.id)
        target_user = await get_user(tid); t_lang = target_user.get("language", "uk") if target_user else "uk"
        admin_name = html.escape(u.get("name") or message.from_user.full_name or "Operator")
        txt = (f"<b>Відповідь від оператора</b>\n\n<b>{admin_name}</b>\n\n{html.escape(message.text)}" if t_lang == "uk" else f"<b>Reply from operator</b>\n\n<b>{admin_name}</b>\n\n{html.escape(message.text)}")
        await bot.send_message(tid, txt, parse_mode="HTML", reply_markup=user_reply_inline_kb(t_lang)); await message.answer("✅ Надіслано"); await state.clear()
    except Exception as e: await handle_error(message, state, e, "reply_h")

@router.callback_query(F.data == "v_st", is_admin_filter)
async def view_staff_h(callback: CallbackQuery):
    u = await get_user(callback.from_user.id); staff = await db.users.find({"role": {"$in": ["admin", "boss"]}}).to_list(None)
    await callback.message.edit_text(get_text('btn_staff_list', u['language']), reply_markup=staff_delete_inline_kb(staff, u['language']))

@router.callback_query(F.data == "a_st", is_admin_filter)
async def add_staff_start(callback: CallbackQuery, state: FSMContext):
    await callback.message.answer("Введіть Telegram ID, @username або номер телефону співробітника:"); await state.set_state(AdminStates.searching_user); await callback.answer()

@router.message(AdminStates.searching_user, is_admin_filter)
async def add_staff_search(message: Message, state: FSMContext):
    u = await search_user(message.text)
    if not u: return await message.answer("❌ Користувача не знайдено.")
    await state.update_data(st_id=u['user_id'], st_old_name=u.get('name', 'N/A')); await message.answer(f"Знайдено: {u.get('name')} (@{u.get('username')})\nВведіть ім'я для команди:"); await state.set_state(AdminStates.adding_staff_name)

@router.message(AdminStates.adding_staff_name, is_admin_filter)
async def add_staff_name(message: Message, state: FSMContext):
    await state.update_data(st_name=message.text); await message.answer("Введіть роль: admin або boss"); await state.set_state(AdminStates.adding_staff_role)

@router.message(AdminStates.adding_staff_role, is_admin_filter)
async def add_staff_role(message: Message, state: FSMContext):
    role = (message.text or "").strip().lower()
    if role not in {"admin", "boss"}: return await message.answer("Тільки admin або boss")
    await state.update_data(st_role=role); d = await state.get_data(); await message.answer(f"Додати {d['st_name']} ({d['st_role']})?", reply_markup=translation_confirm_kb()); await state.set_state(AdminStates.confirming_staff)

@router.callback_query(AdminStates.confirming_staff, F.data == "tr_ok", is_admin_filter)
async def add_staff_final(callback: CallbackQuery, state: FSMContext):
    d = await state.get_data(); await db.users.update_one({"user_id": d['st_id']}, {"$set": {"role": d['st_role'], "name": d['st_name']}}, upsert=True)
    await callback.message.answer("✅ Додано"); await state.clear(); await team_mgmt_h(callback.message, state)

@router.callback_query(F.data.startswith("rm_"), is_admin_filter)
async def rm_staff_h(callback: CallbackQuery):
    tid = int(callback.data[3:])
    if tid == callback.from_user.id or tid in BOSS_IDS: return await callback.answer("🔒", show_alert=True)
    await remove_staff(tid); await callback.answer("🗑 Видалено"); await view_staff_h(callback)

@router.callback_query(F.data == "b_st", is_admin_filter)
async def back_staff_h(callback: CallbackQuery, state: FSMContext):
    await team_mgmt_h(callback.message, state)
    try: await callback.message.delete()
    except: pass
