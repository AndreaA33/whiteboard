import express from 'express';
import RedisService from '../services/RedisService.js';

const router = express.Router();

router.get('/api/whiteboard/:id', async (req, res) => {
    try {
        const whiteboardId = req.params.id;
        let whiteboardData = await RedisService.get(`whiteboard:${whiteboardId}`);
        
        if (!whiteboardData) {
            // Initialize new whiteboard with default configuration
            const defaultConfig = {
                elements: [],
                background: '#ffffff',
                settings: {
                    readOnly: false,
                    displayInfo: false,
                    showSmallestScreenIndicator: true,
                    imageDownloadFormat: 'png',
                    drawBackgroundGrid: false
                }
            };
            
            await RedisService.set(`whiteboard:${whiteboardId}`, JSON.stringify(defaultConfig));
            whiteboardData = JSON.stringify(defaultConfig);
        }

        res.json(JSON.parse(whiteboardData));
    } catch (error) {
        console.error('Error getting whiteboard configuration:', error);
        res.status(500).json({ error: 'Failed to load whiteboard configuration' });
    }
});

export default router;