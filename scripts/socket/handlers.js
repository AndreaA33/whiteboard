import s_whiteboard from '../s_whiteboard.js';
import RedisService from '../services/RedisService.js';

export const socketHandlers = (io, DOMPurify) => {
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        socket.on('joinWhiteboard', async (data) => {
            const { wid, windowWidthHeight } = data;
            socket.join(wid);
            console.log('Client joined whiteboard:', wid);

            // Send initial whiteboard data to client
            socket.emit('whiteboardConfig', {
                readOnly: false,
                elements: [],
                background: '#ffffff'
            });

            // Broadcast user joined
            socket.to(wid).emit('refreshUserBadges');
            
            // Send screen resolution update
            if (windowWidthHeight) {
                socket.to(wid).emit('updateScreenResolution', windowWidthHeight);
            }
        });

        socket.on('drawToWhiteboard', async (content) => {
            try {
                const sanitizedData = DOMPurify.sanitize(content);
                const wid = content.wid;

                // Store in Redis
                await RedisService.addDrawingToWhiteboard(wid, sanitizedData);

                // Broadcast to others
                socket.to(wid).emit('drawToWhiteboard', sanitizedData);
            } catch (error) {
                console.error('Error handling draw event:', error);
            }
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
};

export default socketHandlers; 