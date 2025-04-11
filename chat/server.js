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
});

// A simple route to verify the server is running
app.get("/", (req, res) => {
  res.send("Socket.IO server is running.");
});

// Cron job endpoint for system broadcasts
app.get("/cron-job", (req, res) => {
  console.log("Cron job triggered");
  io.emit("system message", {
    user: "System",
    text: "This is a scheduled update.",
    time: new Date(),
  });
  res.send("Cron job executed");
});

// Socket.IO connection logic
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Listen for room joining
  socket.on("join room", (room) => {
    socket.join(room);
    // Get all users in the room except the current one
    const users = io.sockets.adapter.rooms.get(room);
    let otherUsers = [];
    if (users) {
      otherUsers = Array.from(users).filter((id) => id !== socket.id);
    }
    // Send the list of other users to the socket that just joined
    socket.emit("all users", otherUsers);
    console.log(`Socket ${socket.id} joined room ${room}. Other users: ${otherUsers}`);
  });

  // Handle call initiation
  socket.on("callUser", (data) => {
    socket.to(data.userToCall).emit("callUser", {
      signal: data.signalData,
      from: data.from,
    });
  });

  // Handle answering a call
  socket.on("answerCall", (data) => {
    socket.to(data.to).emit("callAccepted", data.signal);
  });

  // Listen for chat messages and broadcast them to the room
  socket.on("chat message", (data) => {
    console.log("Received message:", data);
    io.to(data.room).emit("chat message", data.message);
  });

  // Log system messages (if any)
  socket.on("system message", (message) => {
    console.log("System message:", message);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 8736;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
