import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://10.10.20.75:6379', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
  retryStrategy: (times) => Math.min(times * 100, 3000),
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Redis connected');
});

export const getRedis = () => redis;

export const cacheGet = async (key: string) => {
  try {
    return await redis.get(key);
  } catch (error) {
    console.error('Redis cache get error:', error);
    return null;
  }
};

export const cacheSet = async (key: string, value: string, ttlSeconds?: number) => {
  try {
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, value);
    } else {
      await redis.set(key, value);
    }
  } catch (error) {
    console.error('Redis cache set error:', error);
  }
};

export const publishMessage = async (channel: string, message: any) => {
  try {
    await redis.publish(channel, typeof message === 'string' ? message : JSON.stringify(message));
  } catch (error) {
    console.error('Redis publish error:', error);
  }
};

export const subscribeToChannel = async (channel: string, callback: (message: string) => void) => {
  const subscriber = redis.duplicate();
  await subscriber.subscribe(channel);
  subscriber.on('message', (ch, message) => {
    if (ch === channel) {
      callback(message);
    }
  });
  return subscriber;
};

export default redis;
