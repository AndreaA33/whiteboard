import Redis from 'ioredis';
import config from '../config/config.js';

class RedisService {
    constructor() {
        this.redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: 6379,
            tls: process.env.REDIS_TLS === 'true' ? {} : null,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            }
        });

        this.redis.on('error', (err) => {
            console.error('Redis Error:', err);
        });

        this.redis.on('connect', () => {
            console.log('Connected to Redis');
        });
    }

    async saveWhiteboardData(whiteboardId, data) {
        try {
            await this.redis.set(`whiteboard:${whiteboardId}`, JSON.stringify(data));
            // Set expiry to 24 hours
            await this.redis.expire(`whiteboard:${whiteboardId}`, 24 * 60 * 60);
            return true;
        } catch (err) {
            console.error('Error saving whiteboard data:', err);
            return false;
        }
    }

    async getWhiteboardData(whiteboardId) {
        try {
            const data = await this.redis.get(`whiteboard:${whiteboardId}`);
            return data ? JSON.parse(data) : [];
        } catch (err) {
            console.error('Error getting whiteboard data:', err);
            return [];
        }
    }

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

    async clearWhiteboard(whiteboardId) {
        try {
            await this.redis.del(`whiteboard:${whiteboardId}`);
            return true;
        } catch (err) {
            console.error('Error clearing whiteboard:', err);
            return false;
        }
    }

    async publishDrawingUpdate(whiteboardId, drawingData) {
        try {
            await this.redis.publish(`whiteboard:${whiteboardId}:updates`, JSON.stringify(drawingData));
            return true;
        } catch (err) {
            console.error('Error publishing drawing update:', err);
            return false;
        }
    }

    subscribeToDrawingUpdates(whiteboardId, callback) {
        const subscriber = this.redis.duplicate();
        subscriber.subscribe(`whiteboard:${whiteboardId}:updates`, (err) => {
            if (err) {
                console.error('Error subscribing to updates:', err);
                return;
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

        return subscriber;
    }
}

export default new RedisService();