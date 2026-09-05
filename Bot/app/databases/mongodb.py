import json
import os
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from app.common.token import MONGODB_URI, BOSS_IDS
from bson import ObjectId
import datetime

client = AsyncIOMotorClient(
    MONGODB_URI,
    serverSelectionTimeoutMS=5000,
    tlsCAFile=certifi.where(),
)
db = client.get_database("gil_apartments")
users_col = db.users
apartments_col = db.apartments
bookings_col = db.bookings
errors_col = db.errors
logs_col = db.logs

_apartments_cache = []
admin_sessions = {}


def _resolve_local_apartment_images(apartment: dict | None):
    if not apartment:
        return []
    candidates = []
    img = apartment.get("img")
    if isinstance(img, str):
        candidates.append(img)
    gallery = apartment.get("gallery") or []
    candidates.extend(item for item in gallery if isinstance(item, str))

    result = []
    seen = set()
    uploads_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'Site'))
    for rel_path in candidates:
        normalized = rel_path.replace("/", os.sep)
        if not normalized.startswith(f"images{os.sep}uploads{os.sep}"):
            continue
        abs_path = os.path.abspath(os.path.join(uploads_root, normalized))
        if abs_path.startswith(uploads_root) and abs_path not in seen:
            seen.add(abs_path)
            result.append(abs_path)
    return result

def _delete_local_apartment_images(paths: list[str]):
    for path in paths:
        try:
            if os.path.exists(path):
                os.remove(path)
        except Exception:
            pass

async def add_log(source, action, details=None, level="INFO", user_id=None, extra=None):
    payload = {
        "source": source,
        "action": action,
        "details": details,
        "level": level,
        "user_id": user_id,
        "extra": extra or {},
        "timestamp": datetime.datetime.utcnow(),
    }
    await logs_col.insert_one(payload)

async def export_site_json():
    try:
        aps = await apartments_col.find({}).to_list(None)
        for ap in aps: ap["_id"] = str(ap["_id"])
        site_api_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'Site', 'api'))
        if not os.path.exists(site_api_dir): os.makedirs(site_api_dir, exist_ok=True)
        
        # Export as JSON
        json_path = os.path.join(site_api_dir, 'apartments.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(aps, f, ensure_ascii=False, indent=2)
            
        # Export as JS data (for the site)
        js_path = os.path.join(site_api_dir, 'apartments-data.js')
        with open(js_path, 'w', encoding='utf-8') as f:
            f.write("window.APARTMENTS_DATA = ")
            json.dump(aps, f, ensure_ascii=False, indent=2)
            f.write(";")
            
        await add_log("database", "export_site_json", f"Exported {len(aps)} apartments to {json_path} and {js_path}")
    except Exception as e:
        await log_error(f"Error exporting site data: {e}", "")

async def refresh_apartments_cache():
    global _apartments_cache
    _apartments_cache = await apartments_col.find({}).to_list(None)
    for ap in _apartments_cache: ap["_id"] = str(ap["_id"])
    await add_log("database", "refresh_apartments_cache", f"Loaded {len(_apartments_cache)} apartments")

async def get_user(user_id):
    return await users_col.find_one({"user_id": user_id})

async def get_user_by_query(query):
    return await users_col.find_one(query)

async def search_user(query_str):
    q = query_str.strip()
    if q.isdigit(): return await users_col.find_one({"user_id": int(q)})
    if q.startswith("@"): return await users_col.find_one({"username": q[1:]})
    if q.startswith("+"): 
        p = "".join(filter(str.isdigit, q))
        return await users_col.find_one({"phone": "+" + p})
    return await users_col.find_one({"username": q})

async def upsert_user(user_id, username=None, phone=None, role="user", name=None, language=None, currency=None):
    from app.common.token import MANAGER_IDS, DEV_IDS
    update_data = {"user_id": user_id}
    if username: update_data["username"] = username.replace("@", "")
    if phone: 
        p = "".join(filter(str.isdigit, phone))
        update_data["phone"] = "+" + p
    if name: update_data["name"] = name
    if language: update_data["language"] = language
    if currency: update_data["currency"] = currency
    
    if user_id in BOSS_IDS:
        update_data["role"] = "boss"
    elif user_id in DEV_IDS:
        update_data["role"] = "developer"
    elif user_id in MANAGER_IDS:
        update_data["role"] = "manager"
    elif role != "user":
        update_data["role"] = role
        
    u = await get_user(user_id)
    if not u:
        if "role" not in update_data: update_data["role"] = role
        await users_col.insert_one(update_data)
    else: 
        await users_col.update_one({"user_id": user_id}, {"$set": update_data})

async def update_user_pref(user_id, **kwargs):
    await users_col.update_one({"user_id": user_id}, {"$set": kwargs})

async def get_admins():
    return await users_col.find({"role": {"$in": ["admin", "boss", "manager", "developer"]}}).to_list(None)

async def get_all_admins_and_bosses():
    return await users_col.find({"role": {"$in": ["admin", "boss", "manager", "developer"]}}).to_list(None)

async def get_apartments(only_available=False):
    if not _apartments_cache: await refresh_apartments_cache()
    if only_available: return [ap for ap in _apartments_cache if ap.get("is_available") is not False]
    return _apartments_cache

async def get_apartment(ap_id):
    if not _apartments_cache: await refresh_apartments_cache()
    for ap in _apartments_cache:
        if str(ap["_id"]) == str(ap_id) or str(ap.get("external_id")) == str(ap_id): return ap
    return None

async def add_apartment(data: dict):
    if "is_available" not in data: data["is_available"] = True
    await apartments_col.insert_one(data)
    await add_log("database", "add_apartment", details="Apartment added", extra={"title": data.get("title"), "is_available": data.get("is_available", True)})
    await refresh_apartments_cache()
    await export_site_json()

async def update_apartment(ap_id, data: dict):
    try:
        existing = await get_apartment(ap_id)
        old_local_images = set(_resolve_local_apartment_images(existing))
        res = await apartments_col.update_one({"_id": ObjectId(ap_id)}, {"$set": data})
        if res.matched_count == 0: res = await apartments_col.update_one({"external_id": int(ap_id)}, {"$set": data})
        if res.matched_count > 0:
            merged = dict(existing or {})
            merged.update(data)
            new_local_images = set(_resolve_local_apartment_images(merged))
            _delete_local_apartment_images(sorted(old_local_images - new_local_images))
            await add_log("database", "update_apartment", details=f"Apartment {ap_id} updated", extra={"changes": data})
            await refresh_apartments_cache()
            await export_site_json()
            return True
    except: pass
    return False

async def delete_apartment(ap_id):
    apartment = await get_apartment(ap_id)
    local_images = _resolve_local_apartment_images(apartment)
    try: await apartments_col.delete_one({"_id": ObjectId(ap_id)})
    except:
        try: await apartments_col.delete_one({"external_id": int(ap_id)})
        except: pass
    _delete_local_apartment_images(local_images)
    await add_log("database", "delete_apartment", details=f"Apartment {ap_id} deleted")
    await refresh_apartments_cache()
    await export_site_json()

async def is_apartment_free(ap_id, start_date_str, end_date_str):
    s_dt = datetime.datetime.strptime(start_date_str, "%d.%m.%Y")
    e_dt = datetime.datetime.strptime(end_date_str, "%d.%m.%Y")
    ap = await get_apartment(ap_id)
    if not ap: return True, None
    bookings = await bookings_col.find({"ap_id": ObjectId(ap["_id"]), "status": {"$in": ["paid_50", "confirmed", "completed"]}}).to_list(None)
    for b in bookings:
        bs = datetime.datetime.strptime(b['start_date'], "%d.%m.%Y")
        be = datetime.datetime.strptime(b['end_date'], "%d.%m.%Y")
        if (s_dt < be) and (e_dt > bs): return False, b['end_date']
    return True, None

async def find_next_free_dates(ap_id, start_date_str, duration_days):
    s_dt = datetime.datetime.strptime(start_date_str, "%d.%m.%Y")
    ap = await get_apartment(ap_id)
    if not ap: return []
    bookings = await bookings_col.find({"ap_id": ObjectId(ap["_id"]), "status": {"$in": ["paid_50", "confirmed", "completed"]}}).to_list(None)
    br = []
    for b in bookings: br.append((datetime.datetime.strptime(b['start_date'], "%d.%m.%Y"), datetime.datetime.strptime(b['end_date'], "%d.%m.%Y")))
    br.sort()
    def is_f(s, e):
        for b_s, b_e in br:
            if (s < b_e) and (e > b_s): return False
        return True
    before, after = [], []
    max_days = 60
    day_delta = datetime.timedelta(days=duration_days)
    i = 1
    while len(after) < 3 and i <= max_days:
        candidate = s_dt + datetime.timedelta(days=i)
        if is_f(candidate, candidate + day_delta):
            after.append(candidate)
        i += 1
    i = 1
    while len(before) < 3 and i <= max_days:
        candidate = s_dt - datetime.timedelta(days=i)
        if candidate <= datetime.datetime.now():
            if is_f(candidate, candidate + day_delta):
                before.append(candidate)
        else:
            if is_f(candidate, candidate + day_delta):
                before.append(candidate)
        i += 1
    return list(reversed(before)), after

async def create_booking(user_id, ap_id, s_d, e_d, ph, w, tp, name=None):
    ap = await get_apartment(ap_id)
    oid = ObjectId(ap["_id"]) if ap else ap_id
    doc = {"user_id": user_id, "ap_id": oid, "start_date": s_d, "end_date": e_d, "phone": ph, "wishes": w, "total_price": tp, "prepayment": tp * 0.5, "remaining": tp * 0.5, "paid_prepayment": 0, "paid_remaining": 0, "status": "pending_50", "created_at": datetime.datetime.utcnow()}
    if name:
        doc["name"] = name
    res = await bookings_col.insert_one(doc)
    await add_log("booking", "create_booking", details=f"Booking created for apartment {ap_id}", user_id=user_id, extra={"start_date": s_d, "end_date": e_d, "total_price": tp})
    return res.inserted_id

async def update_booking_payment(b_id, amt, is_f=False):
    f = "paid_remaining" if is_f else "paid_prepayment"
    await bookings_col.update_one({"_id": ObjectId(b_id)}, {"$inc": {f: amt}})
    return await get_booking(b_id)

async def get_booking(b_id):
    try: return await bookings_col.find_one({"_id": ObjectId(b_id)})
    except: return None

async def update_booking_status(b_id, status):
    await bookings_col.update_one({"_id": ObjectId(b_id)}, {"$set": {"status": status}})
    await add_log("booking", "update_booking_status", details=f"Booking {b_id} status updated", extra={"status": status})

async def get_active_bookings():
    return await bookings_col.find({"status": {"$in": ["pending_50", "paid_50", "confirmed"]}}).sort("created_at", 1).to_list(None)

async def get_apartment_bookings(ap_id):
    try: oid = ObjectId(ap_id)
    except: return []
    return await bookings_col.find({"ap_id": oid, "status": {"$in": ["paid_50", "confirmed", "completed"]}}).sort("start_date", 1).to_list(None)

async def get_all_staff():
    return await users_col.find({"role": "admin"}).to_list(None)

async def remove_staff(user_id):
    if int(user_id) in BOSS_IDS:
        return False
    await users_col.update_one({"user_id": int(user_id)}, {"$set": {"role": "user"}})
    await add_log("staff", "remove_staff", details=f"Removed staff role from {user_id}", user_id=int(user_id))
    return True

async def log_error(msg, tb):
    await errors_col.insert_one({"error": msg, "traceback": tb, "timestamp": datetime.datetime.utcnow()})
    await add_log("error", "exception", msg, level="ERROR", extra={"traceback": tb[:4000] if tb else ""})

async def cleanup_logs():
    await logs_col.delete_many({"timestamp": {"$lt": datetime.datetime.utcnow() - datetime.timedelta(days=30)}})

async def register_booking_message(b_id, chat_id, msg_id):
    try:
        await bookings_col.update_one(
            {"_id": ObjectId(b_id)},
            {"$push": {"admin_messages": {"chat_id": chat_id, "message_id": msg_id}}}
        )
    except: pass

async def cleanup_old_bookings():
    # 1. Cleanup unpaid pending bookings older than 1 hour
    await bookings_col.delete_many({
        "status": "pending_50", 
        "created_at": {"$lt": datetime.datetime.utcnow() - datetime.timedelta(hours=1)}, 
        "paid_prepayment": 0
    })
    
    # 2. Cleanup expired bookings (where end_date < today)
    today = datetime.datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    all_bookings = await bookings_col.find({}).to_list(None)
    to_delete_ids = []
    messages_to_delete = []
    
    for b in all_bookings:
        try:
            ed_str = b.get("end_date")
            if ed_str:
                ed_dt = datetime.datetime.strptime(ed_str, "%d.%m.%Y")
                if ed_dt < today:
                    to_delete_ids.append(b["_id"])
                    if "admin_messages" in b:
                        messages_to_delete.extend(b["admin_messages"])
        except Exception:
            continue
            
    if to_delete_ids:
        await bookings_col.delete_many({"_id": {"$in": to_delete_ids}})
        await add_log("database", "cleanup_expired_bookings", f"Deleted {len(to_delete_ids)} expired bookings")
    
    return messages_to_delete
