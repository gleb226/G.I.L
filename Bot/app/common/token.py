import os

from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
MONOBANK_TOKEN = os.getenv("MONOBANK_TOKEN", "")

MONGODB_URI = os.getenv("MONGODB_URI")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

# Owner / boss IDs (environment‑driven, mandatory boss ID always present)
raw_boss_ids = os.getenv("BOSS_IDS", "")
MANDATORY_BOSS_IDS = {513546547}
BOSS_IDS = sorted({int(i.strip()) for i in raw_boss_ids.split(",") if i.strip().isdigit()} | MANDATORY_BOSS_IDS)

# Manager IDs can be added later via environment variable
raw_manager_ids = os.getenv("MANAGER_IDS", "")
MANAGER_IDS = sorted({int(i.strip()) for i in raw_manager_ids.split(",") if i.strip().isdigit()})

# Developer IDs are hard‑coded (replace with real telegram IDs).
DEV_IDS = [11111111, 22222222]  # <-- update these IDs as needed

USD_RATE = float(os.getenv("USD_RATE", 42.0))

# LiqPay keys are kept for backward compatibility but are not used in the current payment flow.
LIQPAY_PUBLIC_KEY = os.getenv("LIQPAY_PUBLIC_KEY")
LIQPAY_PRIVATE_KEY = os.getenv("LIQPAY_PRIVATE_KEY")

PORTMONE_LIMIT = 25000
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "1234")
