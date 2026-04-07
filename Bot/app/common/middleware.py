from typing import Any, Awaitable, Callable, Dict

from aiogram import BaseMiddleware

from aiogram.types import TelegramObject, Message, CallbackQuery

from app.databases.mongodb import get_user



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

            user = await get_user(user_id)

            if user:

                lang = user.get('language', 'uk')

        

                                                        

        data['lang'] = lang

        data['user'] = user

        return await handler(event, data)
