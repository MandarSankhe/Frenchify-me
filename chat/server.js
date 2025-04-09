const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require("cors");

const app = express();
app.use(cors({

}));

// Create an HTTP server
const server = http.createServer(app);

// Initialize Socket.IO server
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for simplicity; adjust as needed
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: "*", // Allow all headers for simplicity; adjust as needed
  }
});

// A simple route to verify the server is running
app.get('/', (req, res) => {
  res.send('Socket.IO server is running.');
});

// Socket.IO connection logic
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Listen for room joining
  socket.on('join room', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
  });

  // Listen for chat messages and broadcast them
  socket.on('chat message', (data) => {
    console.log('Received message:', data);
    // data should include the room and message info
    io.to(data.room).emit('chat message', data.message);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});


const PORT = process.env.PORT || 8736;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
