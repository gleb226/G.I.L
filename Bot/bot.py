import asyncio
import datetime
import logging
import os
import traceback
import json
import base64
import hashlib
from aiogram import Bot, Dispatcher, F
from aiogram.types import InlineKeyboardButton
from aiogram.utils.keyboard import InlineKeyboardBuilder
from app.common.token import BOT_TOKEN, BOSS_IDS, PORTMONE_LIMIT, LIQPAY_PUBLIC_KEY, LIQPAY_PRIVATE_KEY
from app.handlers import user_handlers, admin_handlers, error_handler
from app.databases.mongodb import upsert_user, db, cleanup_old_bookings, cleanup_logs, refresh_apartments_cache, export_site_json, add_log, log_error, get_apartments, get_apartment, is_apartment_free, create_booking, update_booking_payment, update_booking_status, get_booking
from app.keyboards.user_keyboards import ap_info_inline_kb
from app.common.texts import get_text
from app.common.middleware import LanguageMiddleware
from aiohttp import web
from app.handlers.user_handlers import notify_admins
last_reminder_date = None


class LiqPay:
    def __init__(self, public_key, private_key):
        self._public_key = public_key
        self._private_key = private_key

    def _make_signature(self, data):
        joined_hash = self._private_key + data + self._private_key
        sha1_hash = hashlib.sha1(joined_hash.encode('utf-8')).digest()
        return base64.b64encode(sha1_hash).decode('utf-8')

    def checkout_params(self, params):
        params['public_key'] = self._public_key
        if 'version' not in params:
            params['version'] = 3
        
        data = base64.b64encode(json.dumps(params).encode('utf-8')).decode('utf-8')
        signature = self._make_signature(data)
        return data, signature

    def str_to_sign(self, str_to_sign):
        sha1_hash = hashlib.sha1(str_to_sign.encode('utf-8')).digest()
        return base64.b64encode(sha1_hash).decode('utf-8')

    def decode_data(self, data):
        return json.loads(base64.b64decode(data).decode('utf-8'))


class MongoLogHandler(logging.Handler):
    def __init__(self, loop: asyncio.AbstractEventLoop):
        super().__init__()
        self.loop = loop

    def emit(self, record: logging.LogRecord):
        try:
            details = self.format(record)
            extra = {}
            if record.exc_info:
                extra["traceback"] = "".join(traceback.format_exception(*record.exc_info))
            coro = add_log(
                source=record.name,
                action=record.levelname.lower(),
                details=details,
                level=record.levelname,
                extra=extra,
            )
            self.loop.call_soon_threadsafe(asyncio.create_task, coro)
        except Exception:
            pass


def configure_logging(loop: asyncio.AbstractEventLoop):
    formatter = logging.Formatter("%(asctime)s | %(name)s | %(levelname)s | %(message)s")
    mongo_handler = MongoLogHandler(loop)
    mongo_handler.setLevel(logging.INFO)
    mongo_handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(mongo_handler)

    logging.getLogger("aiohttp.access").setLevel(logging.INFO)
    logging.getLogger("aiogram").setLevel(logging.INFO)
    return logging.getLogger("gil")

async def daily_reminder(bot: Bot):
    global last_reminder_date
    while True:
        try:
            now = datetime.datetime.now()
            today_str = now.strftime("%d.%m.%Y")
            if now.hour >= 10 and last_reminder_date != today_str:
                bookings = await db.bookings.find({"start_date": today_str, "status": {"$in": ["paid_50", "confirmed"]}}).to_list(None)
                for b in bookings:
                    try:
                        user = await db.users.find_one({"user_id": b['user_id']})
                        lang = user.get('language', 'uk') if user else 'uk'
                        rem = b['remaining'] - b.get('paid_remaining', 0)
                        if rem <= 0: continue
                        msg = get_text('msg_checkin_reminder', lang, remaining=rem)
                        ap = await db.apartments.find_one({"_id": b['ap_id']})
                        kb = ap_info_inline_kb(ap['lat'], ap['lng'], str(b['_id']), lang, amount=rem, is_final=True)
                        await bot.send_message(b['user_id'], msg, reply_markup=kb, parse_mode="HTML")
                        await add_log("scheduler", "daily_reminder_sent", f"Reminder sent for booking {b['_id']}", user_id=b["user_id"])
                    except: pass
                messages_to_delete = await cleanup_old_bookings()
                for m in messages_to_delete:
                    try:
                        await bot.delete_message(m['chat_id'], m['message_id'])
                    except: pass
                await cleanup_logs()
                await add_log("scheduler", "daily_maintenance", "Daily cleanup completed")
                last_reminder_date = today_str
            await asyncio.sleep(60) 
        except Exception as e:
            await log_error(str(e), "")
            await asyncio.sleep(60)

async def apartments_sync_loop():
    while True:
        try:
            await refresh_apartments_cache()
            await export_site_json()
            await add_log("sync", "apartments_sync", "Apartments cache and site JSON synchronized from MongoDB")
        except Exception as e:
            await log_error(f"Apartments sync failed: {e}", "")
        await asyncio.sleep(30)

async def get_apartments_api(request):
    apartments = await get_apartments()
    await add_log("api", "get_apartments", details=f"Returned {len(apartments)} apartments")
    return web.json_response(apartments, headers={"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "*"})

async def get_profile_api(request):
    user_id_raw = request.query.get("user_id", "").strip()
    if not user_id_raw.isdigit():
        await add_log("api", "get_profile_invalid_user_id", details=f"Invalid user_id: {user_id_raw}", level="WARNING")
        return web.json_response({"error": "invalid_user_id"}, status=400)

    user = await db.users.find_one({"user_id": int(user_id_raw)})
    if not user:
        await add_log("api", "get_profile_not_found", details=f"User not found: {user_id_raw}", level="WARNING")
        return web.json_response({"error": "user_not_found"}, status=404)

    await add_log("api", "get_profile", details=f"Profile returned for {user_id_raw}", user_id=int(user_id_raw))
    return web.json_response({
        "user_id": user["user_id"],
        "name": user.get("name", ""),
        "phone": user.get("phone", ""),
        "language": user.get("language", "uk"),
        "currency": user.get("currency", "")
    }, headers={"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "*"})

async def get_availability_api(request):
    ap_id = request.query.get("ap_id")
    start_date = request.query.get("start")
    end_date = request.query.get("end")
    if not ap_id or not start_date or not end_date:
        return web.json_response({"error": "missing_params"}, status=400)
    is_free, next_date = await is_apartment_free(ap_id, start_date, end_date)
    return web.json_response({"is_free": is_free, "next_date": next_date})

async def create_booking_api(request):
    try:
        data = await request.json()
        ap_id = data.get("ap_id")
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        phone = data.get("phone")
        name = data.get("name")
        wishes = data.get("wishes", "")
        lang = data.get("lang", "uk")

        if not all([ap_id, start_date, end_date, phone, name]):
            return web.json_response({"error": "missing_fields"}, status=400)

        apartment = await get_apartment(ap_id)
        if not apartment:
            return web.json_response({"error": "apartment_not_found"}, status=404)

        is_free, _ = await is_apartment_free(ap_id, start_date, end_date)
        if not is_free:
            return web.json_response({"error": "already_booked"}, status=409)

        s_dt = datetime.datetime.strptime(start_date, "%d.%m.%Y")
        e_dt = datetime.datetime.strptime(end_date, "%d.%m.%Y")
        days = (e_dt - s_dt).days
        total_price = int(apartment.get("price", 0)) * days
        prepayment = int(total_price * 0.5)

        # We don't have a real telegram user_id here, so we'll use a placeholder or 0
        # Actually, let's use 0 to indicate website booking
        booking_id = await create_booking(0, ap_id, start_date, end_date, phone, wishes, total_price, name=name)
        
        # Notify admins about NEW booking (pending payment)
        bot = request.app['bot']
        raw_title = apartment.get("title", "Apartment")
        if isinstance(raw_title, dict):
            ap_name = raw_title.get(lang, raw_title.get("uk", "Apartment"))
        else:
            ap_name = str(raw_title)
        await notify_admins(
            bot,
            (
                f"🆕 <b>Нове бронювання з сайту (очікує оплати)</b>\n\n"
                f"🏢 <b>Об'єкт:</b> {ap_name}\n"
                f"🗓 <b>Дати:</b> {start_date} - {end_date}\n"
                f"💰 <b>Сума:</b> {total_price} грн (передплата {prepayment} грн)\n"
                f"👤 <b>Гість:</b> {name}\n"
                f"📞 <b>Телефон:</b> <code>{phone}</code>\n"
                f"💬 <b>Побажання:</b> {wishes}"
            )
        )

        # Generate LiqPay params
        liqpay = LiqPay(LIQPAY_PUBLIC_KEY, LIQPAY_PRIVATE_KEY)
        lp_data, lp_signature = liqpay.checkout_params({
            "action": "pay",
            "amount": prepayment,
            "currency": "UAH",
            "description": f"Передплата 50% за {ap_name} ({start_date}-{end_date})",
            "order_id": str(booking_id),
            "version": 3,
            "result_url": f"{request.scheme}://{request.host}/html/booking_success.html",
            "server_url": f"{request.scheme}://{request.host}/api/liqpay/callback"
        })

        return web.json_response({
            "booking_id": str(booking_id),
            "liqpay_data": lp_data,
            "liqpay_signature": lp_signature
        })
    except Exception as e:
        await log_error(f"API booking error: {e}", traceback.format_exc())
        return web.json_response({"error": str(e)}, status=500)

async def liqpay_callback_api(request):
    try:
        data = await request.post()
        lp_data = data.get("data")
        lp_signature = data.get("signature")
        if not lp_data or not lp_signature:
            return web.Response(text="missing_data", status=400)

        liqpay = LiqPay(LIQPAY_PUBLIC_KEY, LIQPAY_PRIVATE_KEY)
        # Verify signature
        expected_signature = liqpay._make_signature(lp_data)
        if lp_signature != expected_signature:
            await add_log("liqpay", "callback_error", "Invalid signature", level="ERROR")
            return web.Response(text="invalid_signature", status=400)

        decoded = liqpay.decode_data(lp_data)
        booking_id = decoded.get("order_id")
        status = decoded.get("status")
        amount = float(decoded.get("amount", 0))

        booking = await get_booking(booking_id)
        if not booking:
            return web.Response(text="booking_not_found", status=404)

        await add_log("liqpay", "callback", f"Status: {status} for booking {booking_id}", extra=decoded)

        if status in ["success", "wait_accept"]:
            if booking["status"] == "pending_50":
                await update_booking_payment(booking_id, int(amount), is_f=False)
                await update_booking_status(booking_id, "paid_50")
                
                # Notify admins about PAYMENT
                bot = request.app['bot']
                apartment = await get_apartment(booking["ap_id"])
                ap_name = apartment["title"].get("uk", "Apartment") if apartment else "Apartment"
                await notify_admins(
                    bot,
                    (
                        f"💳 <b>Отримано 50% передплати (з сайту)</b>\n\n"
                        f"🏢 <b>Об'єкт:</b> {ap_name}\n"
                        f"🗓 <b>Дати:</b> {booking['start_date']} - {booking['end_date']}\n"
                        f"💰 <b>Сума:</b> {amount} грн\n"
                        f"👤 <b>Гість:</b> {booking.get('name', 'Гість')}\n"
                        f"📞 <b>Телефон:</b> <code>{booking['phone']}</code>"
                    ),
                    booking=booking
                )

        return web.Response(text="ok")
    except Exception as e:
        await log_error(f"LiqPay callback error: {e}", traceback.format_exc())
        return web.Response(text="error", status=500)

async def start_web_server(bot: Bot):
    app = web.Application()
    app['bot'] = bot
    app.router.add_get('/api/apartments', get_apartments_api)
    app.router.add_get('/api/profile', get_profile_api)
    app.router.add_get('/api/availability', get_availability_api)
    app.router.add_post('/api/book', create_booking_api)
    app.router.add_post('/api/liqpay/callback', liqpay_callback_api)
    
    from app.api.admin_api import setup_admin_routes
    setup_admin_routes(app)
    
    async def root_redirect(request):
        raise web.HTTPFound('/index.html')
    async def admin_panel_redirect(request):
        raise web.HTTPFound('/admin-panel.html')
    app.router.add_get('/', root_redirect)
    app.router.add_get('/admin-panel', admin_panel_redirect)
    site_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'Site'))
    app.router.add_static('/', path=site_path, name='site', show_index=True)
    async def cors_middleware(app, handler):
        async def middleware(request):
            if request.method == 'OPTIONS':
                return web.Response(headers={"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "*"})
            resp = await handler(request)
            resp.headers["Access-Control-Allow-Origin"] = "*"
            return resp
        return middleware
    app.middlewares.append(cors_middleware)
    runner = web.AppRunner(app)
    await runner.setup()
    port = int(os.getenv("PORT", "8000"))
    await web.TCPSite(runner, '0.0.0.0', port).start()
    await add_log("server", "web_server_started", f"Web server started on 0.0.0.0:{port}", extra={"port": port})

async def main():
    loop = asyncio.get_running_loop()
    logger = configure_logging(loop)
    bot = None
    try:
        logger.info("Application startup initiated")
        await add_log("app", "startup", "Application startup initiated")
        await add_log("database", "connect", "MongoDB client initialized", extra={"database": "gil_apartments"})
        await refresh_apartments_cache()
        await export_site_json()
        await add_log("app", "bootstrap_ready", "Apartment cache refreshed and site JSON exported")
        bot = Bot(token=BOT_TOKEN)
        dp = Dispatcher()
        dp.update.middleware(LanguageMiddleware())
        dp.include_router(error_handler.router)
        dp.include_router(admin_handlers.router)
        dp.include_router(user_handlers.router)
        for b_id in BOSS_IDS:
            await upsert_user(b_id, role="boss")
        await add_log("auth", "boss_ids_synced", details="Boss users upserted", extra={"boss_ids": BOSS_IDS})
        asyncio.create_task(daily_reminder(bot))
        asyncio.create_task(apartments_sync_loop())
        await start_web_server(bot)
        await add_log("telegram", "delete_webhook", "Deleting webhook before polling")
        await bot.delete_webhook(drop_pending_updates=True)
        await add_log("telegram", "start_polling", "Starting aiogram polling")
        await dp.start_polling(bot)
    finally:
        if bot is not None:
            try:
                await bot.session.close()
            except Exception:
                pass

if __name__ == "__main__":
    import sys
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
    except Exception as e:
        print(f"Startup error: {e}")
        sys.exit(1)
