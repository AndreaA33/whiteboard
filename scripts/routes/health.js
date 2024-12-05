import express from 'express';
const router = express.Router();

/**
 * @api {get} /api/health Health check endpoint
 * @apiName GetHealth
 * @apiGroup System
 * @apiVersion 1.0.0
 * @apiDescription Check if the server is running and healthy
 * 
 * @apiSuccess {String} status Health status of the server
 * @apiSuccess {String} timestamp Current server timestamp
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "status": "healthy",
 *       "timestamp": "2024-01-01T00:00:00.000Z"
 *     }
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

export default router;