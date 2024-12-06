import Redis from 'ioredis';
import config from '../config/config.js';

class RedisService {
    constructor() {
        this.redis = new Redis({
            host: 'main-elasticache-redis-1.h5vflu.ng.0001.euw2.cache.amazonaws.com', // ElastiCache endpoint without port included in host
            port: 6379, // Default port for Redis (non-SSL)
            tls: { rejectUnauthorized: false },
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000); // Exponential backoff
                return delay;
            }
        });

        // Redis connection event handlers
        this.redis.on('error', (err) => {
            console.error('Redis Error:', err);
        });

        this.redis.on('connect', () => {
            console.log('Connected to Redis');
        });
    }

    // New isConnected method
    async isConnected() {
        try {
            await this.redis.ping();
            return true;
        } catch (err) {
            console.error('Redis connection failed:', err);
            return false;
        }
    }

    // Save whiteboard data with expiry
    async saveWhiteboardData(whiteboardId, data) {
        try {
            await this.redis.set(`whiteboard:${whiteboardId}`, JSON.stringify(data));
            await this.redis.expire(`whiteboard:${whiteboardId}`, 24 * 60 * 60); // 24 hours expiry
            return true;
        } catch (err) {
            console.error('Error saving whiteboard data:', err);
            return false;
        }
    }

    // Retrieve whiteboard data
    async getWhiteboardData(whiteboardId) {
        try {
            const data = await this.redis.get(`whiteboard:${whiteboardId}`);
            return data ? JSON.parse(data) : [];
        } catch (err) {
            console.error('Error getting whiteboard data:', err);
            return [];
        }
    }

    // Add a drawing to the whiteboard
    async addDrawingToWhiteboard(whiteboardId, drawingData) {
        try {
            const currentData = await this.getWhiteboardData(whiteboardId);
            currentData.push(drawingData);
            await this.saveWhiteboardData(whiteboardId, currentData);
            return true;
        } catch (err) {
            console.error('Error adding drawing to whiteboard:', err);
            return false;
        }
    }

    // Clear whiteboard data
    async clearWhiteboard(whiteboardId) {
        try {
            await this.redis.del(`whiteboard:${whiteboardId}`);
            return true;
        } catch (err) {
            console.error('Error clearing whiteboard:', err);
            return false;
        }
    }

    // Publish updates to subscribers
    async publishDrawingUpdate(whiteboardId, drawingData) {
        try {
            await this.redis.publish(`whiteboard:${whiteboardId}:updates`, JSON.stringify(drawingData));
            return true;
        } catch (err) {
            console.error('Error publishing drawing update:', err);
            return false;
        }
    }

    // Subscribe to drawing updates
    subscribeToDrawingUpdates(whiteboardId, callback) {
        const subscriber = this.redis.duplicate(); // Create a separate connection for subscription
        subscriber.subscribe(`whiteboard:${whiteboardId}:updates`, (err) => {
            if (err) {
                console.error('Error subscribing to updates:', err);
            }
        });

        subscriber.on('message', (channel, message) => {
            try {
                const drawingData = JSON.parse(message);
                callback(drawingData);
            } catch (err) {
                console.error('Error processing drawing update:', err);
            }
        });

        return subscriber; // Return subscriber to allow unsubscribing later if needed
    }

    // Get data with key
    async get(key) {
        try {
            const data = await this.redis.get(key);
            return data;
        } catch (err) {
            console.error('Error getting data from Redis:', err);
            return null;
        }
    }

    // Set data with key
    async set(key, value) {
        try {
            await this.redis.set(key, value);
            return true;
        } catch (err) {
            console.error('Error setting data in Redis:', err);
            return false;
        }
    }

    // Add to list
    async rpush(key, value) {
        try {
            await this.redis.rpush(key, value);
            return true;
        } catch (err) {
            console.error('Error pushing to list in Redis:', err);
            return false;
        }
    }

    // Get list range
    async lrange(key, start, end) {
        try {
            const data = await this.redis.lrange(key, start, end);
            return data;
        } catch (err) {
            console.error('Error getting list range from Redis:', err);
            return [];
        }
    }
}

export default new RedisService();
