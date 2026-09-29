import json
import logging

from redis.asyncio import Redis

from app.config import settings

logger = logging.getLogger(__name__)

redis: Redis | None = None


async def connect_redis() -> None:
    global redis
    if settings.redis_url:
        redis = Redis.from_url(settings.redis_url, decode_responses=True)
    else:
        redis = Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            username=settings.redis_username,
            password=settings.redis_password,
            decode_responses=True,
        )
    await redis.ping()
    # Logged from the live connection so a URL's password never reaches the log.
    connection = redis.connection_pool.connection_kwargs
    logger.info("Connected to Redis at %s:%s", connection.get("host"), connection.get("port"))


async def disconnect_redis() -> None:
    global redis
    if redis is not None:
        await redis.close()
        redis = None


def get_redis() -> Redis:
    if redis is None:
        raise RuntimeError("Redis client is not connected")
    return redis


async def set_value(key: str, value: object, ttl: int | None = None) -> None:
    data = json.dumps(value)
    client = get_redis()
    if ttl is not None:
        await client.set(key, data, ex=ttl)
        return
    await client.set(key, data)


async def get_value(key: str) -> object | None:
    data = await get_redis().get(key)
    if data is None:
        return None
    return json.loads(data)
