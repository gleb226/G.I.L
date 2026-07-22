import uuid
from aiohttp import web
from app.databases.mongodb import (
    search_user, get_user, admin_sessions, get_active_bookings, get_booking, update_booking_status,
    get_apartments, add_apartment, update_apartment, delete_apartment, db
)
from app.common.token import ADMIN_PASSWORD
from app.handlers.user_handlers import notify_admins
from aiogram import Bot
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

def get_admin_user(request: web.Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1]
    for sess in admin_sessions.values():
        if sess.get("token") == token and sess.get("is_verified"):
            return sess.get("user_id")
    return None

async def login_api(request: web.Request):
    data = await request.json()
    identifier = data.get("identifier")
    password = data.get("password")
    
    if password != ADMIN_PASSWORD:
        return web.json_response({"detail": "Невірний пароль"}, status=401)
        
    user = await search_user(identifier)
    if not user or user.get("role") not in ["admin", "boss"]:
        return web.json_response({"detail": "Користувач не знайдений або немає прав адміністратора"}, status=403)
        
    session_id = str(uuid.uuid4())
    admin_sessions[session_id] = {
        "user_id": user["user_id"],
        "is_verified": False,
        "token": str(uuid.uuid4())
    }
    
    bot: Bot = request.app['bot']
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="✅ Підтвердити", callback_data=f"auth_approve_{session_id}"),
            InlineKeyboardButton(text="❌ Відхилити", callback_data=f"auth_reject_{session_id}")
        ]
    ])
    try:
        await bot.send_message(
            user["user_id"], 
            "🔐 <b>Запит на вхід в Адмін-Панель G.I.L</b>\n\nПідтвердіть або відхиліть спробу входу.",
            reply_markup=kb,
            parse_mode="HTML"
        )
    except Exception as e:
        return web.json_response({"detail": f"Помилка відправки в Telegram: {e}"}, status=500)
        
    return web.json_response({"user_id": user["user_id"], "session_id": session_id})

async def verify_api(request: web.Request):
    user_id = int(request.query.get("user_id", 0))
    for sess_id, sess in list(admin_sessions.items()):
        if sess["user_id"] == user_id:
            if sess["is_verified"]:
                user = await get_user(user_id)
                admin_data = {
                    "id": user["user_id"],
                    "name": user.get("name", "Admin"),
                    "role": user.get("role")
                }
                return web.json_response({"status": "ok", "token": sess["token"], "admin": admin_data})
            return web.json_response({"status": "pending"})
    
    return web.json_response({"status": "rejected", "message": "Відхилено або сесія застаріла"})

async def me_api(request: web.Request):
    user_id = get_admin_user(request)
    if not user_id: return web.json_response({"detail": "Unauthorized"}, status=401)
    user = await get_user(user_id)
    if not user: return web.json_response({"detail": "User not found"}, status=404)
    return web.json_response({
        "id": user["user_id"],
        "name": user.get("name", "Admin"),
        "role": user.get("role")
    })

async def active_bookings_api(request: web.Request):
    user_id = get_admin_user(request)
    if not user_id: return web.json_response({"detail": "Unauthorized"}, status=401)
    
    bookings = await get_active_bookings()
    aps = await get_apartments()
    
    result = []
    for b in bookings:
        ap = next((a for a in aps if str(a.get("_id", "")) == str(b.get("ap_id"))), None)
        ap_name = ap["title"].get("uk", "Апартаменти") if ap else "Невідомо"
        guest = await get_user(b.get("user_id"))
        guest_name = guest.get("name", "Гість") if guest else b.get("name", "Гість")
        guest_phone = b.get("phone", guest.get("phone", "-") if guest else "-")
        
        result.append({
            "order_id": str(b["_id"]),
            "order_number": b.get("booking_number", str(b["_id"])[-6:]),
            "status": b["status"],
            "fullname": guest_name,
            "phone": guest_phone,
            "order_type": "in_house", 
            "location_name": ap_name,
            "delivery_info": f"{b['start_date']} - {b['end_date']}",
            "total_amount": b["total_price"],
            "is_paid": (b.get("paid_prepayment", 0) + b.get("paid_remaining", 0)) > 0,
            "cart": [{"name": f"Бронювання: {ap_name}", "price": b["total_price"], "quantity": 1}],
            "wishes": b.get("wishes", ""),
            "created_at": b.get("created_at")
        })
    return web.json_response(result)

async def confirm_booking_api(request: web.Request):
    user_id = get_admin_user(request)
    if not user_id: return web.json_response({"detail": "Unauthorized"}, status=401)
    booking_id = request.match_info["id"]
    await update_booking_status(booking_id, "confirmed")
    return web.json_response({"status": "ok"})

async def reject_booking_api(request: web.Request):
    user_id = get_admin_user(request)
    if not user_id: return web.json_response({"detail": "Unauthorized"}, status=401)
    booking_id = request.match_info["id"]
    await update_booking_status(booking_id, "rejected")
    return web.json_response({"status": "ok"})

async def admin_apartments_api(request: web.Request):
    user_id = get_admin_user(request)
    if not user_id: return web.json_response({"detail": "Unauthorized"}, status=401)
    aps = await get_apartments()
    result = []
    for ap in aps:
        ap_id = str(ap["_id"])
        result.append({
            "id": ap_id,
            "name": ap.get("title", {}).get("uk", ""),
            "price": ap.get("price", 0),
            "image_url": ap.get("img", ""),
            "address": ap.get("address", ""),
            "is_available": ap.get("is_available", True),
            "rooms": ap.get("rooms"),
            "beds": ap.get("beds"),
            "guests": ap.get("guests"),
            "amenities": ap.get("features", []),
            "description": ap.get("description", {}).get("uk", "")
        })
    return web.json_response(result)

async def delete_apartment_api(request: web.Request):
    user_id = get_admin_user(request)
    if not user_id: return web.json_response({"detail": "Unauthorized"}, status=401)
    ap_id = request.match_info["id"]
    await delete_apartment(ap_id)
    return web.json_response({"status": "ok"})

def setup_admin_routes(app: web.Application):
    app.router.add_post('/api/admin/login', login_api)
    app.router.add_get('/api/admin/verify', verify_api)
    app.router.add_get('/api/admin/me', me_api)
    app.router.add_get('/api/admin/active-orders', active_bookings_api)
    app.router.add_get('/api/admin/new-orders', active_bookings_api)
    app.router.add_post('/api/admin/orders/{id}/confirm', confirm_booking_api)
    app.router.add_post('/api/admin/orders/{id}/reject', reject_booking_api)
    app.router.add_post('/api/admin/orders/{id}/complete', confirm_booking_api)
    app.router.add_get('/api/admin/locations', admin_apartments_api)
    app.router.add_delete('/api/admin/locations/{id}', delete_apartment_api)
