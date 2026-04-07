FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/Bot

COPY Bot/requirements.txt /app/Bot/requirements.txt
RUN pip install --no-cache-dir -r /app/Bot/requirements.txt

COPY Bot /app/Bot
COPY Site /app/Site

EXPOSE 8000

CMD ["python", "bot.py"]
