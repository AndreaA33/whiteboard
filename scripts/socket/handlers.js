import s_whiteboard from '../s_whiteboard.js';

export const socketHandlers = {
    async handleDrawing(socket, data) {
        try {
            await s_whiteboard.handleEventsAndData(data);
        } catch (error) {
            console.error('Error handling drawing:', error);
        }
    },

    async handleJoinRoom(socket, roomId) {
        try {
            socket.join(roomId);
            console.log(`User joined room: ${roomId}`);
        } catch (error) {
            console.error('Error joining room:', error);
        }
    },

    async handleLeaveRoom(socket, roomId) {
        try {
            socket.leave(roomId);
            console.log(`User left room: ${roomId}`);
        } catch (error) {
            console.error('Error leaving room:', error);
        }
    }
};

export default socketHandlers; 