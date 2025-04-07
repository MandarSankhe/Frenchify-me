// Chat.jsx
import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { AnimatePresence, motion } from "framer-motion";
import { FaCommentDots, FaTimes, FaPaperPlane } from "react-icons/fa";

// Use your API endpoint from the environment or default to localhost
const API_ENDPOINT = process.env.CHAT_API_URL || "http://localhost:8736";
// Initialize socket instance (consider using a singleton for production)
const socket = io(API_ENDPOINT);

const Chat = ({ matchId, currentUser }) => {
  // Colors and gradients
  const frenchBlue = "#0055A4";
  const frenchRed = "#EF4135";
  const frenchWhite = "#FFFFFF";
  const blueGradient = "linear-gradient(135deg, #0055A4, #003366)";
  const redGradient = "linear-gradient(135deg, #EF4135, #CC3333)";

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  // isOpen controls whether chat is expanded (true) or collapsed as a small bubble (false)
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);

  // Helper: play notification sound (you can change the URL as needed)
  const playNotificationSound = () => {
    const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
    audio.play().catch((error) => console.log("Sound play error:", error));
  };

  // Handle incoming messages with current isOpen and currentUser.username in dependencies
  useEffect(() => {
    const handleIncomingMessage = (message) => {
      setMessages((prev) => [...prev, message]);
      // If chat is closed and the message is not from the current user, increment unread count and play sound
      if (!isOpen && message.user !== currentUser.username) {
        setUnreadCount((prev) => prev + 1);
        playNotificationSound();
      }
    };

    if (matchId) {
      socket.emit("join room", matchId);
    }
    socket.on("chat message", handleIncomingMessage);
    return () => {
      socket.off("chat message", handleIncomingMessage);
      socket.emit("leave room", matchId);
    };
  }, [matchId, isOpen, currentUser.username]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (input.trim() === "") return;
    const message = {
      user: currentUser.username,
      text: input,
      time: new Date().toISOString(),
    };
    // Emit the message to the specific room
    socket.emit("chat message", { room: matchId, message });
    // Do not update local state immediately—the message will be added via the server broadcast
    setInput("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Framer Motion variants for the chat container animation
  const containerVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.8 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 50, scale: 0.8 },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      // Fixed at bottom-right of the viewport
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 1000,
      }}
    >
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            key="chat-open"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3 }}
            style={{
              width: "320px",
              height: "400px",
              display: "flex",
              flexDirection: "column",
              background: frenchWhite,
              border: `2px solid ${frenchBlue}`,
              borderRadius: "15px",
              boxShadow: "0 12px 24px rgba(0, 0, 0, 0.15)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                background: blueGradient,
                color: frenchWhite,
                padding: "10px 15px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
              onClick={() => setIsOpen(false)}
            >
              <div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
                Chat
              </div>
              <div>
                <FaTimes style={{ fontSize: "1.2rem" }} />
              </div>
            </div>
            {/* Messages */}
            <div
              style={{
                flex: 1,
                padding: "10px",
                overflowY: "auto",
                background: "linear-gradient(45deg, #f8f9fa, #ffffff)",
              }}
            >
              {messages.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    marginTop: "20px",
                    color: "#adb5bd",
                  }}
                >
                  <FaCommentDots style={{ fontSize: "2rem" }} />
                  <p>Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isOwn = msg.user === currentUser.username;
                  return (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        justifyContent: isOwn ? "flex-end" : "flex-start",
                        marginBottom: "8px",
                      }}
                    >
                      <div
                        style={{
                          background: isOwn ? blueGradient : "#f1f3f5",
                          color: isOwn ? frenchWhite : "#212529",
                          padding: "8px 12px",
                          borderRadius: "12px",
                          maxWidth: "70%",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.8rem",
                            marginBottom: "4px",
                            fontWeight: "600",
                          }}
                        >
                          {isOwn ? "You" : msg.user}
                        </div>
                        <div style={{ fontSize: "0.9rem", lineHeight: "1.3" }}>
                          {msg.text}
                        </div>
                        <div
                          style={{
                            textAlign: "right",
                            fontSize: "0.7rem",
                            opacity: 0.7,
                          }}
                        >
                          {new Date(msg.time).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            {/* Input */}
            <div
              style={{
                padding: "10px",
                borderTop: `1px solid ${frenchBlue}40`,
                background: "#f8f9fa",
                display: "flex",
                alignItems: "center",
              }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                style={{
                  flex: 1,
                  borderRadius: "20px",
                  padding: "8px 12px",
                  border: `1px solid ${frenchBlue}40`,
                  outline: "none",
                }}
              />
              <button
                onClick={handleSend}
                style={{
                  marginLeft: "8px",
                  background: redGradient,
                  border: "none",
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  color: frenchWhite,
                  cursor: "pointer",
                }}
              >
                <FaPaperPlane />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="chat-closed"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => {
              setIsOpen(true);
              setUnreadCount(0); // Reset unread when opening chat
            }}
            style={{
              position: "relative",
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: blueGradient,
              color: frenchWhite,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 12px 24px rgba(0, 0, 0, 0.15)",
              cursor: "pointer",
            }}
          >
            <FaCommentDots style={{ fontSize: "1.5rem" }} />
            {/* Unread message badge */}
            {unreadCount > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "-5px",
                  right: "-5px",
                  background: "red",
                  color: "white",
                  borderRadius: "50%",
                  width: "20px",
                  height: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                }}
              >
                {unreadCount}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Chat;
