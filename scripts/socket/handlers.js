import s_whiteboard from '../s_whiteboard.js';
import RedisService from '../services/RedisService.js';

export const socketHandlers = (io, DOMPurify) => {
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        socket.on('joinWhiteboard', async (wid) => {
            socket.join(wid);
            console.log('Client joined whiteboard:', wid);

            // Check if whiteboard exists in Redis
            let whiteboardData = await RedisService.get(`whiteboard:${wid}`);
            if (!whiteboardData) {
                // Initialize new whiteboard
                whiteboardData = JSON.stringify({ elements: [], background: '#ffffff' });
                await RedisService.set(`whiteboard:${wid}`, whiteboardData);
            }

            // Send initial whiteboard data to client
            socket.emit('whiteboardConfig', JSON.parse(whiteboardData));
        });

        socket.on('draw', async (data) => {
            const sanitizedData = DOMPurify.sanitize(data);
            const wid = data.wid;

            // Store drawing in Redis
            await RedisService.rpush(`whiteboard:${wid}:drawings`, JSON.stringify(sanitizedData));

            // Broadcast drawing to others
            socket.to(wid).emit('draw', sanitizedData);
        });

        // Add reconnection handling
        socket.on('recover-state', async (data) => {
            try {
                const { whiteboardId, lastSequence } = data;
                const operations = await WhiteboardInfoBackendService
                    .getOperationsSince(whiteboardId, lastSequence);
                
                socket.emit('state-update', {
                    operations,
                    currentSequence: WhiteboardInfoBackendService
                        .getCurrentSequence(whiteboardId)
                });
            } catch (err) {
                socket.emit('recovery-failed');
            }
        });

        // Add conflict resolution
        socket.on('operation', (data) => {
            const transformed = transformOperation(data);
            io.to(data.whiteboardId).emit('operation', transformed);
        });
    });
};

export default socketHandlers; 