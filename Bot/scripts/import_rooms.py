import asyncio
import os
import re
import sys
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup


BASE_URL = "https://rooms.net.ua/"
LIST_URL = urljoin(BASE_URL, "apartments/")

FEATURE_MAP = {
    "телевізор": "tv",
    "холодильник": "refrigerator",
    "мікрохвильова піч": "microwave",
    "гаряча вода": "hot_water",
    "кондиціонер": "air_conditioner",
    "поряд супермаркет": "near_supermarket",
    "smart tv": "smart_tv",
    "балкон": "balcony",
    "варильна поверхня": "hob",
    "газова плита": "gas_hob",
    "електроплита": "electro_hob",
    "інтернет": "internet",
    "wi-fi": "wifi",
    "wifi": "wifi",
    "парковка": "parking",
    "домофон": "intercom",
    "під'їзд на коді": "coded_entry",
    "пральна машина": "washing_machine",
    "супутникове телебачення": "satellite_tv",
    "кабельне телебачення": "cable_tv",
    "телебачення t2": "t2_tv",
}

FEATURE_LABELS = {
    "uk": {
        "tv": "телевізор",
        "refrigerator": "холодильник",
        "fridge": "холодильник",
        "microwave": "мікрохвильова піч",
        "hot_water": "гаряча вода",
        "air_conditioner": "кондиціонер",
        "near_supermarket": "поруч магазин",
        "smart_tv": "Smart TV",
        "balcony": "балкон",
        "hob": "варильна поверхня",
        "gas_hob": "газова плита",
        "electro_hob": "електрична плита",
        "internet": "інтернет",
        "wifi": "Wi-Fi",
        "parking": "парковка",
        "intercom": "домофон",
        "coded_entry": "під'їзд на коді",
        "washing_machine": "пральна машина",
        "satellite_tv": "супутникове ТБ",
        "cable_tv": "кабельне ТБ",
        "t2_tv": "ТБ T2",
    },
    "en": {
        "tv": "TV",
        "refrigerator": "refrigerator",
        "fridge": "refrigerator",
        "microwave": "microwave",
        "hot_water": "hot water",
        "air_conditioner": "air conditioning",
        "near_supermarket": "near supermarket",
        "smart_tv": "Smart TV",
        "balcony": "balcony",
        "hob": "cooktop",
        "gas_hob": "gas hob",
        "electro_hob": "electric hob",
        "internet": "internet",
        "wifi": "Wi-Fi",
        "parking": "parking",
        "intercom": "intercom",
        "coded_entry": "coded entry",
        "washing_machine": "washing machine",
        "satellite_tv": "satellite TV",
        "cable_tv": "cable TV",
        "t2_tv": "T2 TV",
    },
}


def project_root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


sys.path.append(project_root())

from app.databases.mongodb import apartments_col, export_site_json, refresh_apartments_cache
from app.utils.translator import translate_text


def fetch(url: str) -> str:
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    response.encoding = response.apparent_encoding or "utf-8"
    return response.text


def parse_listing_entries(html: str):
    soup = BeautifulSoup(html, "html.parser")
    entries = {}
    pattern = re.compile(
        r"(?P<price>\d+)\s*грн\.\s*(?P<guests>\d+)\s+(?P<title>.+?)\s+квартира\s*\(\s*(?P<rooms>\d+)-кімнатна\s*\)",
        re.IGNORECASE,
    )

    for anchor in soup.select("a[href]"):
        href = anchor.get("href", "").strip()
        match_href = re.search(r"/apartments/(\d+)/", href)
        if not match_href:
            continue

        external_id = int(match_href.group(1))
        text = " ".join(anchor.get_text(" ", strip=True).split())
        match = pattern.search(text)
        if not match:
            continue

        entries[external_id] = {
            "external_id": external_id,
            "url": urljoin(BASE_URL, href),
            "price": int(match.group("price")),
            "guests": int(match.group("guests")),
            "rooms": int(match.group("rooms")),
            "raw_title": match.group("title").strip(),
        }

    return list(entries.values())


def parse_detail(external_id: int, html: str):
    soup = BeautifulSoup(html, "html.parser")
    page_text = " ".join(soup.get_text(" ", strip=True).split())
    lowered = page_text.lower()

    heading = soup.find(["h1", "h2"])
    heading_text = heading.get_text(" ", strip=True) if heading else ""
    heading_text = re.sub(r"^Ужгород,\s*", "", heading_text).strip()

    floor_match = re.search(r"(\d+)\s*поверх", lowered, re.IGNORECASE)
    floor = int(floor_match.group(1)) if floor_match else None

    lat_lng_match = re.search(r"([0-9]{2}\.[0-9]+)\s*,\s*([0-9]{2}\.[0-9]+)", html)
    lat = float(lat_lng_match.group(1)) if lat_lng_match else 48.621
    lng = float(lat_lng_match.group(2)) if lat_lng_match else 22.288

    gallery = []
    for img in soup.select("img[src]"):
        src = img.get("src", "")
        if "photos/" in src:
            absolute = urljoin(BASE_URL, src.split("?")[0])
            if absolute not in gallery:
                gallery.append(absolute)

    features = []
    for label, key in FEATURE_MAP.items():
        if label in lowered and key not in features:
            features.append(key)

    address = heading_text or f"Apartment {external_id}"
    return {
        "address": address,
        "floor": floor,
        "lat": lat,
        "lng": lng,
        "gallery": gallery,
        "img": gallery[0] if gallery else "",
        "features": features,
    }


def format_features(features: list[str], locale: str, fallback: str) -> str:
    if not features:
        return fallback
    labels = FEATURE_LABELS.get(locale, {})
    return ", ".join(labels.get(feature, feature) for feature in features)


async def build_apartment(entry: dict, semaphore: asyncio.Semaphore):
    async with semaphore:
        detail_html = await asyncio.to_thread(fetch, entry["url"])
        detail = await asyncio.to_thread(parse_detail, entry["external_id"], detail_html)

    title_uk = detail["address"]
    title_en = await translate_text(title_uk)
    if not title_en or title_en == title_uk:
        title_en = title_uk

    features_text_uk = format_features(detail["features"], "uk", "базові зручності")
    features_text_en = format_features(detail["features"], "en", "basic amenities")
    floor_text_uk = f"Розташовані на {detail['floor']} поверсі. " if detail["floor"] else ""
    floor_text_en = f"Located on floor {detail['floor']}. " if detail["floor"] else ""

    description_uk = (
        f"Апартаменти за адресою {detail['address']}. "
        f"Кількість кімнат: {entry['rooms']}. "
        f"Кількість гостей: {entry['guests']}. "
        f"{floor_text_uk}"
        f"Зручності: {features_text_uk}."
    )
    description_en = await translate_text(description_uk)
    if not description_en or description_en == description_uk:
        description_en = (
            f"Apartment at {detail['address']}. "
            f"Rooms: {entry['rooms']}. "
            f"Guests: {entry['guests']}. "
            f"{floor_text_en}"
            f"Amenities: {features_text_en}."
        )

    return {
        "external_id": entry["external_id"],
        "source_url": entry["url"],
        "title": {"uk": title_uk, "en": title_en},
        "description": {"uk": description_uk, "en": description_en},
        "rooms": entry["rooms"],
        "beds": entry["guests"],
        "guests": entry["guests"],
        "area": "-",
        "address": detail["address"],
        "lat": detail["lat"],
        "lng": detail["lng"],
        "price": entry["price"],
        "img": detail["img"],
        "gallery": detail["gallery"],
        "features": detail["features"],
        "floor": detail["floor"],
        "is_available": True,
        "availableFromMonth": 1,
        "availableToMonth": 12,
    }


async def upsert_apartment(apartment: dict):
    await apartments_col.update_one(
        {"external_id": apartment["external_id"]},
        {"$set": apartment},
        upsert=True,
    )


async def main():
    listing_html = await asyncio.to_thread(fetch, LIST_URL)
    entries = parse_listing_entries(listing_html)
    semaphore = asyncio.Semaphore(40)
    async def process(entry, index):
        print(f"[{index}/{len(entries)}] {entry['url']}")
        return await build_apartment(entry, semaphore)
    apartments = await asyncio.gather(*(process(entry, idx) for idx, entry in enumerate(entries, start=1)))

    for apartment in apartments:
        await upsert_apartment(apartment)

    await refresh_apartments_cache()
    await export_site_json()
    print(f"Imported or updated {len(apartments)} apartments.")


if __name__ == "__main__":
    asyncio.run(main())
