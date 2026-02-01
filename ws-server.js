import { Server } from 'socket.io';
import { createServer } from 'http';
import Redis from 'ioredis';

const PORT = process.env.PORT || 3001;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
  },
});

// Redis subscriber for cross-container communication
const redisSubscriber = new Redis(process.env.REDIS_URL || 'redis://10.10.20.75:6379');
const redisPublisher = new Redis(process.env.REDIS_URL || 'redis://10.10.20.75:6379');

redisSubscriber.subscribe('task:created', 'task:updated', 'task:deleted', 'entity:updated');

redisSubscriber.on('message', (channel, message) => {
  io.emit(channel, JSON.parse(message));
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

  // Task events
  socket.on('task:move', async (data) => {
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
