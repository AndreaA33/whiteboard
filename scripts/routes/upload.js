import express from 'express';
import formidable from 'formidable';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSafeFilePath } from '../utils.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'public', 'uploads');

// Ensure upload directory exists
fs.ensureDirSync(UPLOAD_DIR);

/**
 * @api {post} /api/upload Upload file to whiteboard
 * @apiName UploadFile
 * @apiGroup Whiteboard
 * @apiVersion 1.0.0
 * 
 * @apiParam {String} wid Whiteboard ID
 * @apiParam {String} at Access token
 * @apiParam {String} imagedata Base64 encoded image data
 * @apiParam {Number} date Timestamp
 * 
 * @apiSuccess {String} success Success message
 */
router.post('/upload', async (req, res) => {
    if (req.accessToken && req.body.at !== req.accessToken) {
        return res.status(401).json({ error: 'Invalid access token' });
    }

    try {
        const form = formidable({
            uploadDir: UPLOAD_DIR,
            keepExtensions: true,
            maxFileSize: 5 * 1024 * 1024 // 5MB limit
        });

        const [fields, files] = await form.parse(req);
        
        if (fields.imagedata && fields.wid) {
            const whiteboardId = fields.wid[0];
            const imageData = fields.imagedata[0];
            const date = fields.date ? fields.date[0] : Date.now();
            
            const uploadDir = path.join(UPLOAD_DIR, whiteboardId);
            fs.ensureDirSync(uploadDir);
            
            const fileName = `${whiteboardId}_${date}.png`;
            const filePath = getSafeFilePath(uploadDir, fileName);
            
            // Remove header from base64 string
            const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
            
            await fs.writeFile(filePath, base64Data, 'base64');
            res.json({ success: true });
        } else {
            res.status(400).json({ error: 'Missing required fields' });
        }
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Upload failed' });
    }
});

export default router;