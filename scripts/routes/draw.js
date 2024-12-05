import express from 'express';
import s_whiteboard from '../s_whiteboard.js';
const router = express.Router();

/**
 * @api {post} /api/draw Draw on whiteboard
 * @apiName Draw
 * @apiGroup Whiteboard
 * @apiVersion 1.0.0
 * 
 * @apiParam {String} wid Whiteboard ID
 * @apiParam {String} at Access token
 * @apiParam {Object} content Drawing content
 */
router.post('/draw', async (req, res) => {
    const { wid, at, content } = req.body;

    if (req.accessToken && at !== req.accessToken) {
        return res.status(401).json({ error: 'Invalid access token' });
    }

    try {
        await s_whiteboard.handleEventsAndData({
            ...content,
            wid,
            at
        });
        
        // Broadcast to other clients via socket.io
        req.io.to(wid).emit('drawToWhiteboard', content);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Draw error:', err);
        res.status(500).json({ error: 'Failed to process drawing' });
    }
});

export default router;