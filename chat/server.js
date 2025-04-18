const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors({}));

// Create an HTTP server
const server = http.createServer(app);

// Initialize Socket.IO server
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for simplicity; adjust as needed
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: "*",
  },
  pingTimeout: 60000, // Increase timeout for better connection stability
  pingInterval: 25000, // More frequent pings to detect disconnections faster
});

// Store active rooms and users
const rooms = new Map();

// A simple route to verify the server is running
app.get("/", (req, res) => {
  res.send("Socket.IO server is running.");
});

// Socket.IO connection logic
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);


  // Listen for room joining
  socket.on('join chat room', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
  });

  // Listen for room joining
  socket.on("join room", (roomId) => {
    Array.from(socket.rooms).forEach(room => {
      if (room !== socket.id) {
        socket.leave(room);
      }
    });

    // Join the requested room
    socket.join(roomId);
   
    // Get all users in the room except the current one
    const users = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
      .filter(id => id !== socket.id);
   
    console.log(`Socket ${socket.id} joined room ${roomId}. Other users: ${users.join(', ')}`);
   
    // Send the list of other users to the socket that just joined
    socket.emit("all users", users);
   
    // Update room tracking
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(socket.id);
   
    // Store the room ID in the socket for reference on disconnect
    socket.roomId = roomId;
  });

  // Listen for chat messages and broadcast them
  socket.on('chat message', (data) => {
    console.log('Received message:', data);
    // data should include the room and message info
    io.to(data.room).emit('chat message', data.message);
  });

  // Handle call initiation
  socket.on("callUser", (data) => {
    console.log(`Call initiated from ${data.from} to ${data.userToCall}`);
    io.to(data.userToCall).emit("callUser", {
      signal: data.signalData,
      from: data.from,
    });
  });

  // Handle answering a call
  socket.on("answerCall", (data) => {
    console.log(`Call answered by ${socket.id} to ${data.to}`);
    io.to(data.to).emit("callAccepted", data.signal);
  });

  // Handle call ended
  socket.on("call-ended", (data) => {
    console.log(`Call ended by ${socket.id} to ${data.to}`);
    io.to(data.to).emit("call-ended");
  });

  // ===== WHITEBOARD HANDLERS =====
// Handle drawing events
socket.on('drawing', (drawingData) => {
  console.log(`Drawing event in room ${drawingData.room}:`, drawingData);
  
  // IMPORTANT: Broadcast to all OTHER clients in the room, not back to sender
  socket.to(drawingData.room).emit('drawing', drawingData);
  
  // For debugging, log which client sent the drawing data
  console.log(`Drawing event from ${socket.id} in room ${drawingData.room}:`, drawingData);
});

// Handle clear canvas events
socket.on('clear-canvas', (data) => {
  console.log(`Clear canvas event in room ${data.room}`);
  // Broadcast to all OTHER clients in the room
  socket.to(data.room).emit('clear-canvas');
});
 
  // Handle disconnections
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
   
    // Notify other users in the room
    if (socket.roomId && rooms.has(socket.roomId)) {
      const roomUsers = rooms.get(socket.roomId);
      roomUsers.delete(socket.id);
     
      // Notify all other users in the room about this disconnection
      socket.to(socket.roomId).emit("user-disconnected", socket.id);
     
      // Clean up empty rooms
      if (roomUsers.size === 0) {
        rooms.delete(socket.roomId);
        console.log(`Room ${socket.roomId} is now empty and removed`);
      }
    }
  });
});

// Server health check route that returns active rooms and users
app.get("/status", (req, res) => {
  const status = {
    uptime: process.uptime(),
    rooms: Array.from(rooms.entries()).map(([roomId, users]) => ({
      roomId,
      userCount: users.size,
      users: Array.from(users)
    })),
    connections: io.engine.clientsCount
  };
  res.json(status);
});

const PORT = process.env.PORT || 8736;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});