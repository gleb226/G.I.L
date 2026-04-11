from typing import Any, Awaitable, Callable, Dict
import time
from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, Message, CallbackQuery
from app.databases.mongodb import get_user, update_user_pref

# Simple in-memory cache for users to reduce DB load
_user_cache = {}
_CACHE_TTL = 300  # 5 minutes

class LanguageMiddleware(BaseMiddleware):
    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any]
    ) -> Any:
        user_id = None
        if isinstance(event, (Message, CallbackQuery)):
            user_id = event.from_user.id

        lang = 'uk'
        user = None
        
        if user_id:
            now = time.time()
            if user_id in _user_cache and (now - _user_cache[user_id]['ts']) < _CACHE_TTL:
                user = _user_cache[user_id]['user']
            else:
                user = await get_user(user_id)
                if user:
                    _user_cache[user_id] = {'user': user, 'ts': now}

            if user:
                if not user.get("language"):
                    lang = "uk"
                    await update_user_pref(user_id, language=lang)
                    user["language"] = lang
                    _user_cache[user_id] = {'user': user, 'ts': now}
                else:
                    lang = user.get('language', 'uk')

        data['lang'] = lang
        data['user'] = user
        return await handler(event, data)
