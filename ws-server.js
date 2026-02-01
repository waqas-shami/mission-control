import { Server } from 'socket.io';
import { createServer } from 'http';
import Redis from 'ioredis';

const PORT = process.env.PORT || 3001;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
    transports: ['websocket', 'polling'],
  },
});

// Redis subscriber for cross-container communication
const redisSubscriber = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
const redisPublisher = new Redis(process.env.REDIS_URL || 'redis:6379');

// Subscribe to task channels
redisSubscriber.subscribe('task:created', 'task:updated', 'task:deleted', 'task:moved');

redisSubscriber.on('message', (channel, message) => {
  try {
    const data = JSON.parse(message);
    console.log(`Redis message on ${channel}:`, data.id || data);
    // Broadcast to all connected clients
    io.emit(channel, data);
  } catch (e) {
    console.error('Error parsing Redis message:', e);
  }
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join specific rooms
  socket.on('join', (room: string) => {
    socket.join(room);
    console.log(`Client ${socket.id} joined room: ${room}`);
  });

  socket.on('leave', (room: string) => {
    socket.leave(room);
  });

  // Task move event
  socket.on('task:move', async (data: { id: string; column_id: string }) => {
    console.log(`Task moved: ${data.id} -> ${data.column_id}`);
    // Broadcast to all clients
    io.emit('task:moved', data);
    // Also publish to Redis for other containers
    await redisPublisher.publish('task:moved', JSON.stringify(data));
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
