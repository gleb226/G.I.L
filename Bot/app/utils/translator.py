from deep_translator import GoogleTranslator
import asyncio
import re

# Simple translation cache
_translation_cache = {}

async def translate_text(text, src='uk', dest='en'):
    if not text or len(text.strip()) == 0:
        return text

    cache_key = f"{src}:{dest}:{text}"
    if cache_key in _translation_cache:
        return _translation_cache[cache_key]

    try:
        # Try up to 2 times
        for _ in range(2):
            try:
                loop = asyncio.get_event_loop()
                translated = await loop.run_in_executor(
                    None, 
                    lambda: GoogleTranslator(source=src, target=dest).translate(text)
                )

                if translated and translated != text:
                    translated = re.sub(r'\b(вул\.|вулиця|Street|St\.)\b', 'St', translated, flags=re.IGNORECASE)
                    translated = translated.replace("м²", "m²").replace("м2", "m²").replace("sq.m.", "m²")
                    _translation_cache[cache_key] = translated
                    return translated
            except Exception:
                await asyncio.sleep(0.5)
                continue

        return text
    except Exception:
        return text