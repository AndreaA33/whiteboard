import express from 'express';
import s_whiteboard from '../s_whiteboard.js';
const router = express.Router();

/**
 * @api {get} /api/loadwhiteboard Load whiteboard data
 * @apiName LoadWhiteboard
 * @apiGroup Whiteboard
 * @apiVersion 1.0.0
 * 
 * @apiParam {String} wid Whiteboard ID
 * @apiParam {String} at Access token
 * 
 * @apiSuccess {Object[]} data Array of whiteboard elements
 */
router.get('/loadwhiteboard', async (req, res) => {
    const { wid, at } = req.query;
    
    if (req.accessToken && at !== req.accessToken) {
        return res.status(401).json({ error: 'Invalid access token' });
    }

    try {
        const data = await s_whiteboard.loadStoredData(wid);
        res.json(data);
    } catch (err) {
        console.error('Error loading whiteboard:', err);
        res.status(500).json({ error: 'Failed to load whiteboard data' });
    }
});

export default router;