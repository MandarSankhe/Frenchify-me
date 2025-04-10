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

// Add a cron job endpoint
app.get('/cron-job', (req, res) => {

  console.log('Cron job triggered');
  // Server: Sending a system broadcast via a separate event
io.emit('system message', {
  user: 'System',
  text: 'This is a scheduled update.',
  time: new Date(),
});

});

// Socket.IO connection logic
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Listen for room joining
  socket.on('join room', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
  });

  socket.on('callUser', (data) => {
    // Broadcast the callUser event to everyone in the room except the sender
    socket.to(data.userToCall).emit('callUser', {
      signal: data.signalData,
      from: data.from,
    });
  });

  socket.on('answerCall', (data) => {
    // Send the answer back to the caller
    socket.to(data.to).emit('callAccepted', data.signal);
  });

  // Listen for chat messages and broadcast them
  socket.on('chat message', (data) => {
    console.log('Received message:', data);
    // data should include the room and message info
    io.to(data.room).emit('chat message', data.message);
  });

  
// Client: Handling the system message differently
socket.on('system message', (message) => {
  // Maybe render this in a different style or place in the UI
  console.log('System message:', message);
});

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});


const PORT = process.env.PORT || 8736;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
