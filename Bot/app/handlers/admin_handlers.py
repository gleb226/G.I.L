from aiogram import Router, F, Bot
from aiogram.types import Message, CallbackQuery, FSInputFile
from aiogram.fsm.context import FSMContext
from aiogram.filters import StateFilter, Command
from app.databases.mongodb import (
    get_user, get_apartments, add_apartment, delete_apartment, get_apartment, 
    get_booking, update_booking_status, get_active_bookings, 
    update_user_pref, update_apartment, upsert_user, db, remove_staff, search_user,
    get_apartment_bookings
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
from app.common.token import BOSS_IDS
import re, random, os, uuid, io
from PIL import Image
from app.common.texts import get_text, get_all_translations
from app.utils.translator import translate_text

router = Router()

BTNS_ADMIN_ALL = get_all_translations('btn_active_bookings') + get_all_translations('btn_objects') + get_all_translations('btn_team') + get_all_translations('btn_back_main')
BTNS_USER_ALL = get_all_translations('btn_booking') + get_all_translations('btn_apartments') + get_all_translations('btn_profile') + get_all_translations('btn_contacts') + get_all_translations('btn_admin')
ALL_MENU_BTNS = list(set(BTNS_ADMIN_ALL + BTNS_USER_ALL))

FIELD_LABELS = {
    "uk": {
        "title": "назви",
        "description": "опису",
        "price": "ціни",
        "photo": "фото",
        "rooms": "кількості кімнат",
        "beds": "кількості спальних місць",
        "guests": "кількості гостей",
        "address": "адреси",
        "area": "площі",
        "features": "зручностей",
    },
    "en": {
        "title": "title",
        "description": "description",
        "price": "price",
        "photo": "photo",
        "rooms": "rooms",
        "beds": "beds",
        "guests": "guests",
        "address": "address",
        "area": "area",
        "features": "amenities",
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

async def resolve_coords(address):
    match = re.search(r'([-+]?\d*\.\d+|\d+),\s*([-+]?\d*\.\d+|\d+)', address)
    if match: return float(match.group(1)), float(match.group(2))
    return 48.621 + random.uniform(-0.01, 0.01), 22.288 + random.uniform(-0.01, 0.01)

async def show_ap_card(event, ap_id, lang, role):
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
    if ap.get('img'):
        img_src = ap['img']
        if img_src.startswith("images/"):
            lp = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "Site", img_src))
            if os.path.exists(lp): img_src = FSInputFile(lp)
        try:
            await msg.answer_photo(img_src, caption=txt, reply_markup=kb, parse_mode="HTML")
            if isinstance(event, CallbackQuery): await event.message.delete()
        except: await msg.answer(txt, reply_markup=kb, parse_mode="HTML")
    else: await msg.answer(txt, reply_markup=kb, parse_mode="HTML")

@router.message(F.text.in_(get_all_translations('btn_back_main')), StateFilter("*"))
async def admin_back_main_h(message: Message, state: FSMContext):
    from app.handlers.user_handlers import start_cmd
    await state.clear()
    await start_cmd(message, state)

@router.message(F.text.in_(get_all_translations('btn_admin')), StateFilter("*"))
async def admin_h(message: Message, state: FSMContext):
    u = await get_user(message.from_user.id)
    if u and u.get('role') in ['admin', 'boss']:
        await state.clear()
        await message.answer(get_text('msg_admin_panel', u['language']), reply_markup=admin_panel_kb(u['role'], u['language']))

@router.message(F.text.in_(get_all_translations('btn_active_bookings')), StateFilter("*"))
async def active_bookings_h(message: Message, state: FSMContext):
    u = await get_user(message.from_user.id)
    if not u or u.get('role') not in ['admin', 'boss']: return
    await state.clear()
    bs = await get_active_bookings()
    if not bs: return await message.answer(get_text('msg_list_empty', u['language']))
    for b in bs:
        ap = await get_apartment(b['ap_id'])
        ap_name = ap['title'].get(u['language'], ap['title'].get('uk', 'Ap')) if ap else "Unknown"
        txt = (f"📑 <b>Бронювання {b['_id']}</b>\n🏢 {ap_name}\n🗓 {b['start_date']} — {b['end_date']}\n💰 Всього: {b['total_price']} грн\n💳 Оплачено: {b.get('paid_prepayment',0) + b.get('paid_remaining',0)} грн\n👤 Гість: {b.get('phone', '-')}")
        await message.answer(txt, reply_markup=booking_action_inline_kb(str(b['_id']), u['language'], b['status']), parse_mode="HTML")

@router.message(F.text.in_(get_all_translations('btn_objects')), StateFilter("*"))
async def admin_aps(message: Message, state: FSMContext):
    u = await get_user(message.from_user.id)
    if u and u.get('role') in ['admin', 'boss']:
        await state.clear()
        aps = await get_apartments()
        await message.answer("🏢 Objects:", reply_markup=apartment_mgmt_inline_kb(aps, u['language']), parse_mode="HTML")

@router.message(F.text.in_(get_all_translations('btn_team')), StateFilter("*"))
async def team_mgmt_h(message: Message, state: FSMContext):
    u = await get_user(message.from_user.id)
    if not u or u.get('role') != 'boss': return
    await state.clear()
    await message.answer(get_text('btn_team', u['language']), reply_markup=staff_mgmt_inline_kb(u['language']))

@router.callback_query(F.data.startswith("m:"), StateFilter("*"))
async def manage_ap_h(callback: CallbackQuery, state: FSMContext):
    u = await get_user(callback.from_user.id)
    if not u or u.get('role') not in ['admin', 'boss']: return await callback.answer("🔒")
    await show_ap_card(callback, callback.data[2:], u['language'], u['role'])
    await callback.answer()

@router.callback_query(F.data == "adm_back", StateFilter("*"))
async def admin_back_h(callback: CallbackQuery, state: FSMContext):
    await admin_aps(callback.message, state)
    await callback.message.delete()
    await callback.answer()

@router.callback_query(F.data == "add_ap", StateFilter("*"))
async def add_ap_start(callback: CallbackQuery, state: FSMContext):
    await callback.message.answer("Назва (UA):")
    await state.set_state(AdminStates.adding_apartment_name)
    await callback.answer()

@router.message(AdminStates.adding_apartment_name)
async def add_ap_name_ua(message: Message, state: FSMContext, bot: Bot):
    from app.handlers.user_handlers import menu_redirect
    if message.text in ALL_MENU_BTNS: return await menu_redirect(message, state, bot)
    ua_title = message.text
    en_title = await translate_text(ua_title)
    await state.update_data(title_uk=ua_title, title_en=en_title)
    await message.answer(f"Переклад назви:\n<code>{en_title}</code>\n\nВсе ок чи змінити?", reply_markup=translation_confirm_kb(), parse_mode="HTML")
    await state.set_state(AdminStates.confirming_name_translation)

@router.callback_query(AdminStates.confirming_name_translation, F.data == "tr_ok")
async def name_tr_ok(callback: CallbackQuery, state: FSMContext):
    await callback.message.answer("Опис (UA):")
    await state.set_state(AdminStates.adding_apartment_desc)
    await callback.answer()

@router.callback_query(AdminStates.confirming_name_translation, F.data == "tr_edit")
async def name_tr_edit(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    await callback.message.answer(f"Введіть назву англійською (поточна: <code>{data['title_en']}</code>):", parse_mode="HTML")
    await state.set_state(AdminStates.confirming_name_translation)
    await callback.answer()

@router.message(AdminStates.confirming_name_translation)
async def name_tr_manual(message: Message, state: FSMContext):
    from app.handlers.user_handlers import menu_redirect
    if message.text in ALL_MENU_BTNS: return await menu_redirect(message, state, bot)
    await state.update_data(title_en=message.text)
    await message.answer("Опис (UA):")
    await state.set_state(AdminStates.adding_apartment_desc)

@router.message(AdminStates.adding_apartment_desc)
async def add_ap_desc_ua(message: Message, state: FSMContext):
    from app.handlers.user_handlers import menu_redirect
    if message.text in ALL_MENU_BTNS: return await menu_redirect(message, state, bot)
    ua_desc = message.text
    en_desc = await translate_text(ua_desc)
    await state.update_data(desc_uk=ua_desc, desc_en=en_desc)
    await message.answer(f"Переклад опису:\n<code>{en_desc}</code>\n\nВсе ок чи змінити?", reply_markup=translation_confirm_kb(), parse_mode="HTML")
    await state.set_state(AdminStates.confirming_desc_translation)

@router.callback_query(AdminStates.confirming_desc_translation, F.data == "tr_ok")
async def desc_tr_ok(callback: CallbackQuery, state: FSMContext):
    await callback.message.answer("Кількість кімнат:")
    await state.set_state(AdminStates.adding_apartment_rooms)
    await callback.answer()

@router.callback_query(AdminStates.confirming_desc_translation, F.data == "tr_edit")
async def desc_tr_edit(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    await callback.message.answer(f"Введіть опис англійською (поточна: <code>{data['desc_en']}</code>):", parse_mode="HTML")
    await state.set_state(AdminStates.confirming_desc_translation)
    await callback.answer()

@router.message(AdminStates.confirming_desc_translation)
async def desc_tr_manual(message: Message, state: FSMContext):
    from app.handlers.user_handlers import menu_redirect
    if message.text in ALL_MENU_BTNS: return await menu_redirect(message, state, bot)
    await state.update_data(desc_en=message.text)
    await message.answer("Кількість кімнат:")
    await state.set_state(AdminStates.adding_apartment_rooms)

@router.message(AdminStates.adding_apartment_rooms)
async def add_ap_r(message: Message, state: FSMContext):
    from app.handlers.user_handlers import menu_redirect
    if message.text in ALL_MENU_BTNS: return await menu_redirect(message, state, bot)
    if not message.text.isdigit(): return await message.answer("Введіть число:")
    await state.update_data(rooms=int(message.text))
    await message.answer("Кількість спальних місць:")
    await state.set_state(AdminStates.adding_apartment_beds)

@router.message(AdminStates.adding_apartment_beds)
async def add_ap_b(message: Message, state: FSMContext):
    from app.handlers.user_handlers import menu_redirect
    if message.text in ALL_MENU_BTNS: return await menu_redirect(message, state, bot)
    if not message.text.isdigit(): return await message.answer("Введіть число:")
    await state.update_data(beds=int(message.text))
    await message.answer("Макс. гостей:")
    await state.set_state(AdminStates.adding_apartment_guests)

@router.message(AdminStates.adding_apartment_guests)
async def add_ap_g(message: Message, state: FSMContext):
    from app.handlers.user_handlers import menu_redirect
    if message.text in ALL_MENU_BTNS: return await menu_redirect(message, state, bot)
    if not message.text.isdigit(): return await message.answer("Введіть число:")
    await state.update_data(guests=int(message.text))
    await state.update_data(area="Не вказано")
    await message.answer("Адреса (вул. ...):")
    await state.set_state(AdminStates.adding_apartment_address)

@router.message(AdminStates.adding_apartment_area)
async def add_ap_a(message: Message, state: FSMContext):
    from app.handlers.user_handlers import menu_redirect
    if message.text in ALL_MENU_BTNS: return await menu_redirect(message, state, bot)
    await state.update_data(area=message.text)
    await message.answer("Адреса (вул. ...):")
    await state.set_state(AdminStates.adding_apartment_address)

@router.message(AdminStates.adding_apartment_address)
async def add_ap_ad(message: Message, state: FSMContext):
    from app.handlers.user_handlers import menu_redirect
    if message.text in ALL_MENU_BTNS: return await menu_redirect(message, state, bot)
    lat, lng = await resolve_coords(message.text)
    await state.update_data(address=message.text, lat=lat, lng=lng)
    await message.answer("Ціна (грн):")
    await state.set_state(AdminStates.adding_apartment_price)

@router.message(AdminStates.adding_apartment_price)
async def add_ap_p(message: Message, state: FSMContext):
    from app.handlers.user_handlers import menu_redirect
    if message.text in ALL_MENU_BTNS: return await menu_redirect(message, state, bot)
    if not message.text.isdigit(): return await message.answer("Введіть число:")
    await state.update_data(price=int(message.text))
    await message.answer("Завантажте фото:")
    await state.set_state(AdminStates.adding_apartment_photo)

@router.message(AdminStates.adding_apartment_photo, F.photo | F.text)
async def add_ap_ph(message: Message, state: FSMContext, bot: Bot):
    from app.handlers.user_handlers import menu_redirect
    if message.text in ALL_MENU_BTNS: return await menu_redirect(message, state, bot)
    data = await state.get_data()
    gallery = data.get('gallery', [])
    u = await get_user(message.from_user.id)
    
    if message.photo:
        photo = message.photo[-1]
        fi = await bot.get_file(photo.file_id)
        fc = io.BytesIO()
        await bot.download_file(fi.file_path, fc)
        fc.seek(0)
        try:
            img = Image.open(fc)
            fname = f"{uuid.uuid4()}.webp"
            ud = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "Site", "images", "uploads"))
            if not os.path.exists(ud): os.makedirs(ud, exist_ok=True)
            sp = os.path.join(ud, fname)
            img.save(sp, "WEBP", quality=80)
            db_p = f"images/uploads/{fname}"
            gallery.append(db_p)
            await state.update_data(gallery=gallery, is_local=True)
        except Exception as e: return await message.answer(f"❌ Помилка: {e}")
    elif message.text:
        links = [l.strip() for l in message.text.split('\n') if l.strip()]
        gallery.extend(links)
        await state.update_data(gallery=gallery, is_local=False)
    
    await message.answer(f"📸 Додано фото: {len(gallery)}. Надішліть ще або натисніть 'Готово'.", reply_markup=photo_done_kb(u['language']))

@router.callback_query(AdminStates.adding_apartment_photo, F.data == "ph_done")
async def add_ap_ph_done(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    gallery = data.get('gallery', [])
    if not gallery: return await callback.answer("❌ Додайте хоча б одне фото", show_alert=True)
    u = await get_user(callback.from_user.id)
    await callback.message.answer("Зручності:", reply_markup=features_selection_kb([], u['language']))
    await state.set_state(AdminStates.adding_apartment_features)
    await callback.answer()

@router.callback_query(AdminStates.adding_apartment_features, F.data.startswith("fsel_"))
async def add_ap_f_toggle(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    sel = data.get('features', [])
    u = await get_user(callback.from_user.id)
    if callback.data == "fsel_done":
        is_l, gallery = data.get('is_local'), data['gallery']
        img_src = gallery[0]
        if is_l:
            lp = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "Site", img_src))
            if os.path.exists(lp): img_src = FSInputFile(lp)
        try: await callback.message.answer_photo(img_src, caption=f"🏢 {data['title_uk']}\n💰 {data['price']} грн\n\nПідтвердити?", reply_markup=confirm_ap_add_kb(u['language']))
        except: await callback.message.answer(f"🏢 {data['title_uk']}\n💰 {data['price']} грн\n\nПідтвердити?", reply_markup=confirm_ap_add_kb(u['language']))
        await callback.message.delete()
    else:
        feat = callback.data[5:]
        if feat in sel: sel.remove(feat)
        else: sel.append(feat)
        await state.update_data(features=sel)
        await callback.message.edit_reply_markup(reply_markup=features_selection_kb(sel, u['language']))
    await callback.answer()

@router.callback_query(F.data.startswith("ed_"), StateFilter("*"))
async def edit_ap_start(callback: CallbackQuery, state: FSMContext):
    aid = callback.data[3:]
    u = await get_user(callback.from_user.id)
    await callback.message.edit_reply_markup(reply_markup=apartment_edit_fields_kb(aid, u['language']))
    await callback.answer()

@router.callback_query(F.data.startswith("ef_"), StateFilter("*"))
async def edit_ap_field_h(callback: CallbackQuery, state: FSMContext):
    parts = callback.data.split("_")
    aid, field = parts[1], parts[2]
    u = await get_user(callback.from_user.id)
    await state.update_data(edit_ap_id=aid, edit_field=field)
    if field == "features":
        ap = await get_apartment(aid)
        await callback.message.answer("Оберіть зручності:", reply_markup=features_selection_kb(ap.get('features', []), u['language']))
        await state.set_state(AdminStates.editing_apartment_field)
    elif field == "photo":
        await state.update_data(edit_gallery=[])
        await callback.message.answer("Завантажте нові фото (одне або декілька) або надішліть посилання:", reply_markup=photo_done_kb(u['language']))
        await state.set_state(AdminStates.editing_apartment_field)
    else:
        field_label = FIELD_LABELS.get(u['language'], FIELD_LABELS['uk']).get(field, field)
        await callback.message.answer(
            f"Введіть нове значення для {field_label}:"
            if u['language'] == 'uk' else
            f"Enter new value for {field_label}:"
        )
        await state.set_state(AdminStates.editing_apartment_field)
    await callback.answer()

@router.message(AdminStates.editing_apartment_field, F.photo | F.text)
async def edit_ap_field_in(message: Message, state: FSMContext, bot: Bot):
    from app.handlers.user_handlers import menu_redirect
    if message.text in ALL_MENU_BTNS: return await menu_redirect(message, state, bot)
    data = await state.get_data()
    aid, field = data['edit_ap_id'], data['edit_field']
    
    if field == "photo":
        gallery = data.get('edit_gallery', [])
        if message.photo:
            photo = message.photo[-1]
            fi = await bot.get_file(photo.file_id)
            fc = io.BytesIO()
            await bot.download_file(fi.file_path, fc)
            fc.seek(0)
            try:
                img = Image.open(fc)
                fname = f"{uuid.uuid4()}.webp"
                ud = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "Site", "images", "uploads"))
                if not os.path.exists(ud): os.makedirs(ud, exist_ok=True)
                sp = os.path.join(ud, fname)
                img.save(sp, "WEBP", quality=80)
                db_p = f"images/uploads/{fname}"
                gallery.append(db_p)
                await state.update_data(edit_gallery=gallery)
                u = await get_user(message.from_user.id)
                return await message.answer(f"📸 Додано фото: {len(gallery)}. Надішліть ще або натисніть 'Готово'.", reply_markup=photo_done_kb(u['language']))
            except Exception as e: return await message.answer(f"❌ Помилка: {e}")
        elif message.text:
            links = [l.strip() for l in message.text.split('\n') if l.strip()]
            gallery.extend(links)
            await state.update_data(edit_gallery=gallery)
            u = await get_user(message.from_user.id)
            return await message.answer(f"📸 Додано фото: {len(gallery)}. Надішліть ще або натисніть 'Готово'.", reply_markup=photo_done_kb(u['language']))
    
    val = message.text
    if field in ['price', 'rooms', 'beds', 'guests']: 
        if not val.isdigit(): return await message.answer("Введіть число:")
        val = int(val)
    elif field == "area":
        numeric = "".join(ch for ch in val if ch.isdigit())
        if numeric:
            val = f"{numeric} м²"
    elif field == "title" or field == "description":
        val = {"uk": val, "en": await translate_text(val)}
    
    await update_apartment(aid, {field: val})
    await message.answer("✅ Оновлено")
    await state.clear()
    u = await get_user(message.from_user.id)
    await show_ap_card(message, aid, u['language'], u['role'])

@router.callback_query(AdminStates.editing_apartment_field, F.data == "ph_done")
async def edit_ap_ph_done(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    aid = data['edit_ap_id']
    gallery = data.get('edit_gallery', [])
    if not gallery: return await callback.answer("❌ Додайте хоча б одне фото", show_alert=True)
    
    await update_apartment(aid, {"img": gallery[0], "gallery": gallery})
    await callback.message.answer("✅ Фото оновлено")
    await state.clear()
    u = await get_user(callback.from_user.id)
    await show_ap_card(callback, aid, u['language'], u['role'])
    await callback.answer()

@router.callback_query(AdminStates.editing_apartment_field, F.data.startswith("fsel_"))
async def edit_ap_f_toggle(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    aid = data['edit_ap_id']
    u = await get_user(callback.from_user.id)
    if callback.data == "fsel_done":
        await state.clear()
        await callback.message.delete()
        await show_ap_card(callback, aid, u['language'], u['role'])
    else:
        feat = callback.data[5:]
        ap = await get_apartment(aid)
        sel = ap.get('features', [])
        if feat in sel: sel.remove(feat)
        else: sel.append(feat)
        await update_apartment(aid, {"features": sel})
        await callback.message.edit_reply_markup(reply_markup=features_selection_kb(sel, u['language']))
    await callback.answer()

@router.callback_query(F.data.startswith("ab_"), StateFilter("*"))
async def object_bookings_h(callback: CallbackQuery):
    aid = callback.data[3:]
    u = await get_user(callback.from_user.id)
    bs = await get_apartment_bookings(aid)
    if not bs: return await callback.answer(get_text('msg_list_empty', u['language']), show_alert=True)
    txt = "🗓 <b>Бронювання об'єкта:</b>\n\n"
    for b in bs:
        txt += f"• {b['start_date']} - {b['end_date']} | {b['status']}\n"
    await callback.message.answer(txt, parse_mode="HTML")
    await callback.answer()

@router.callback_query(F.data.startswith("pg:"), StateFilter("*"))
async def pagination_h(callback: CallbackQuery):
    parts = callback.data.split(":")
    ptype, page = parts[1], int(parts[2])
    u = await get_user(callback.from_user.id)
    if ptype == "adm":
        aps = await get_apartments()
        await callback.message.edit_reply_markup(reply_markup=apartment_mgmt_inline_kb(aps, u['language'], page))
    elif ptype == "book":
        aps = await get_apartments(only_available=True)
        await callback.message.edit_reply_markup(reply_markup=apartments_inline_kb(aps, True, u['language'], page))
    elif ptype == "list":
        aps = await get_apartments(only_available=True)
        await callback.message.edit_reply_markup(reply_markup=apartments_inline_kb(aps, False, u['language'], page))
    await callback.answer()

@router.callback_query(F.data == "cf_ad", StateFilter("*"))
async def add_ap_fsh(callback: CallbackQuery, state: FSMContext):
    d = await state.get_data()
    if not d.get('title_uk'): return await callback.answer("❌ Error")
    gallery = d.get('gallery', [])
    img = gallery[0] if gallery else ""
    ap = {"title": {"uk": d['title_uk'], "en": d['title_en']}, "description": {"uk": d['desc_uk'], "en": d['desc_en']}, "rooms": d['rooms'], "beds": d['beds'], "guests": d['guests'], "area": d['area'], "address": d['address'], "lat": d['lat'], "lng": d['lng'], "price": d['price'], "img": img, "gallery": gallery, "features": d.get('features', []), "is_available": True}
    await add_apartment(ap)
    await callback.message.answer("✅ Додано")
    await state.clear()
    await admin_aps(callback.message, state)
    await callback.answer()

@router.callback_query(F.data.startswith("tg_"), StateFilter("*"))
async def toggle_ap_h(callback: CallbackQuery):
    aid = callback.data[3:]
    ap = await get_apartment(aid)
    if not ap: return
    nv = not ap.get('is_available', True)
    await update_apartment(aid, {"is_available": nv})
    u = await get_user(callback.from_user.id)
    await show_ap_card(callback, aid, u['language'], u['role'])
    await callback.answer("✅" if nv else "❌")

async def resend_active_bookings(callback: CallbackQuery):
    u = await get_user(callback.from_user.id)
    if not u or u.get('role') not in ['admin', 'boss']:
        return
    bs = await get_active_bookings()
    if not bs:
        await callback.message.answer(get_text('msg_list_empty', u['language']))
        return
    for b in bs:
        ap = await get_apartment(b['ap_id'])
        ap_name = ap['title'].get(u['language'], ap['title'].get('uk', 'Ap')) if ap else "Unknown"
        txt = (f"??????? ??????????\n??'???: {ap_name}\n????: {b['start_date']} - {b['end_date']}\n????: {b['total_price']} ???\n????????: {b.get('paid_prepayment',0) + b.get('paid_remaining',0)} ???\n?????: {b.get('phone', '-')}") if u['language'] == "uk" else (f"Active booking\nObject: {ap_name}\nDates: {b['start_date']} - {b['end_date']}\nTotal: {b['total_price']} UAH\nPaid: {b.get('paid_prepayment',0) + b.get('paid_remaining',0)} UAH\nGuest: {b.get('phone', '-')}")
        await callback.message.answer(txt, reply_markup=booking_action_inline_kb(str(b['_id']), u['language'], b['status']))

@router.callback_query(F.data.startswith("dl_"), StateFilter("*"))
async def delete_ap_h(callback: CallbackQuery, state: FSMContext):
    await delete_apartment(callback.data[3:])
    try: await callback.message.delete()
    except: pass
    await callback.message.answer("Object deleted" if (await get_user(callback.from_user.id)).get("language", "uk") != "uk" else "OBJECT DELETED")
    await admin_aps(callback.message, state)
    await callback.answer("🗑 Видалено")

@router.callback_query(F.data.startswith("ok_"))
async def approve_booking_h(callback: CallbackQuery):
    await update_booking_status(callback.data[3:], "confirmed")
    try: await callback.message.delete()
    except: pass
    await callback.message.answer("BOOKING CONFIRMED" if (await get_user(callback.from_user.id)).get("language", "uk") == "uk" else "Booking confirmed")
    await resend_active_bookings(callback)
    await callback.answer("✅ Підтверджено")

@router.callback_query(F.data.startswith("rj_"))
async def reject_booking_h(callback: CallbackQuery, bot: Bot):
    booking_id = callback.data[3:]
    booking = await get_booking(booking_id)
    await update_booking_status(booking_id, "rejected")
    if booking:
        refund_amount = int(booking.get("paid_prepayment", 0) + booking.get("paid_remaining", 0))
        user = await get_user(booking.get("user_id"))
        if user:
            lang = user.get("language", "uk")
            text = (
                "❌ Ваше бронювання відхилено.\n"
                f"{'Кошти до повернення: ' + str(refund_amount) + ' грн.\n' if refund_amount else ''}"
                "Повернення опрацьовується адміністратором."
                if lang == "uk" else
                "❌ Your booking was rejected.\n"
                f"{'Amount to refund: ' + str(refund_amount) + ' UAH.\n' if refund_amount else ''}"
                "The refund is being processed by the administrator."
            )
            try:
                await bot.send_message(user["user_id"], text)
            except Exception:
                pass
    try: await callback.message.delete()
    except: pass
    await callback.message.answer("BOOKING REJECTED" if (await get_user(callback.from_user.id)).get("language", "uk") == "uk" else "Booking rejected")
    await resend_active_bookings(callback)
    await callback.answer("❌ Відхилено")

@router.callback_query(F.data.startswith("ms_"), StateFilter("*"))
async def chat_h(callback: CallbackQuery, state: FSMContext):
    data = callback.data.split("_")
    uid = int(data[2]) if data[1] == "u" else (await get_booking(data[1]))['user_id']
    await state.update_data(chat_target_user_id=uid)
    await state.set_state(AdminStates.replying_to_user)
    u = await get_user(callback.from_user.id)
    await callback.message.answer(get_text('msg_enter_reply', u['language']))
    await callback.answer()

@router.message(AdminStates.replying_to_user)
async def reply_h(message: Message, state: FSMContext, bot: Bot):
    from app.handlers.user_handlers import menu_redirect
    if message.text in ALL_MENU_BTNS: return await menu_redirect(message, state, bot)
    d = await state.get_data()
    tid = d.get('chat_target_user_id')
    u = await get_user(message.from_user.id)
    try:
        await bot.send_message(tid, f"💬 Відповідь від адміністратора:\n\n{message.text}", reply_markup=user_reply_inline_kb(u['language']))
        await message.answer("✅ Надіслано")
    except: await message.answer("❌ Помилка")
    await state.clear()

@router.callback_query(F.data == "v_st")
async def view_staff_h(callback: CallbackQuery):
    u = await get_user(callback.from_user.id)
    staff = await db.users.find({"role": {"$in": ["admin", "boss"]}}).to_list(None)
    if not staff:
        await callback.message.answer(get_text('msg_list_empty', u['language']))
        return await callback.answer()
    await callback.message.edit_text(get_text('btn_staff_list', u['language']), reply_markup=staff_delete_inline_kb(staff, u['language']))

@router.callback_query(F.data == "a_st")
async def add_staff_start(callback: CallbackQuery, state: FSMContext):
    await callback.message.answer("Введіть Telegram ID, @username або номер телефону (+380...) співробітника:")
    await state.set_state(AdminStates.searching_user)
    await callback.answer()

@router.message(AdminStates.searching_user)
async def add_staff_search(message: Message, state: FSMContext):
    from app.handlers.user_handlers import menu_redirect
    if message.text in ALL_MENU_BTNS: return await menu_redirect(message, state, bot)
    u = await search_user(message.text)
    if not u: return await message.answer("❌ Користувача не знайдено. Він має натиснути /start у боті.")
    await state.update_data(st_id=u['user_id'], st_old_name=u.get('name', u.get('username', 'N/A')))
    await message.answer(f"Знайдено: {u.get('name')} (@{u.get('username')})\nВведіть відображуване ім'я для команди:")
    await state.set_state(AdminStates.adding_staff_name)

@router.message(AdminStates.adding_staff_name)
async def add_staff_name(message: Message, state: FSMContext):
    from app.handlers.user_handlers import menu_redirect
    if message.text in ALL_MENU_BTNS: return await menu_redirect(message, state, bot)
    await state.update_data(st_name=message.text)
    await message.answer("Введіть роль: admin або boss")
    await state.set_state(AdminStates.adding_staff_role)

@router.message(AdminStates.adding_staff_role)
async def add_staff_role(message: Message, state: FSMContext, bot: Bot):
    from app.handlers.user_handlers import menu_redirect
    if message.text in ALL_MENU_BTNS: return await menu_redirect(message, state, bot)
    role = (message.text or "").strip().lower()
    if role not in {"admin", "boss"}:
        return await message.answer("Доступні ролі тільки: admin або boss")
    await state.update_data(st_role=role)
    d = await state.get_data()
    await message.answer(f"Додати {d['st_name']} з роллю {d['st_role']}?\nID: {d['st_id']}", reply_markup=translation_confirm_kb())
    await state.set_state(AdminStates.confirming_staff)

@router.callback_query(AdminStates.confirming_staff, F.data == "tr_ok")
async def add_staff_final(callback: CallbackQuery, state: FSMContext):
    d = await state.get_data()
    role = "boss" if int(d['st_id']) in BOSS_IDS else d['st_role']
    await db.users.update_one({"user_id": d['st_id']}, {"$set": {"role": role, "name": d['st_name']}}, upsert=True)
    await callback.message.answer("✅ Додано до команди")
    await state.clear()
    await team_mgmt_h(callback.message, state)

@router.callback_query(F.data.startswith("rm_"))
async def rm_staff_h(callback: CallbackQuery, state: FSMContext):
    target_user_id = int(callback.data[3:])
    if target_user_id == callback.from_user.id:
        await callback.answer("You cannot remove yourself", show_alert=True)
        return
    if target_user_id in BOSS_IDS:
        await callback.answer("This boss cannot be removed", show_alert=True)
        return
    await remove_staff(target_user_id)
    await callback.answer("🗑 Видалено")
    await view_staff_h(callback)

@router.callback_query(F.data == "b_st")
async def back_staff_h(callback: CallbackQuery, state: FSMContext):
    await team_mgmt_h(callback.message, state)
    await callback.message.delete()
