import React, { useRef, useEffect, useState, useCallback } from "react";
import io from "socket.io-client";
import SimplePeer from "simple-peer";

const frenchBlue = "#0055A4";
const frenchRed = "#EF4135";
const frenchWhite = "#FFFFFF";
const darkGray = "#2E2E2E";

// Set your Socket.IO server URL; adjust if needed
const SOCKET_SERVER_URL = "https://frenchify-me.onrender.com";

const MeetingRoom = () => {
  const [stream, setStream] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [otherUsers, setOtherUsers] = useState([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  const localVideo = useRef();
  const remoteVideo = useRef();
  const screenStreamRef = useRef(null);
  const peerRef = useRef(null);
  const socketRef = useRef();

  // Get room id from the URL query parameter
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get("room");

  // Function to create and initialize a peer connection
  const createPeer = useCallback((initiator, targetUserId, stream) => {
    console.log(`Creating peer connection: initiator=${initiator}, targetUser=${targetUserId}`);
    
    try {
      const peer = new SimplePeer({
        initiator,
        trickle: false,
        stream,
      });

      // Set up peer event handlers
      peer.on("signal", (data) => {
        console.log("Signaling data generated", { initiator, targetUserId });
        if (initiator) {
          socketRef.current.emit("callUser", {
            userToCall: targetUserId,
            signalData: data,
            from: socketRef.current.id,
          });
        } else {
          socketRef.current.emit("answerCall", { signal: data, to: targetUserId });
        }
      });

      peer.on("stream", (currentStream) => {
        console.log("Received stream from peer");
        if (remoteVideo.current) {
          remoteVideo.current.srcObject = currentStream;
        }
      });

      peer.on("error", (err) => {
        console.error("Peer connection error:", err);
        setConnectionError(`Connection error: ${err.message}`);
      });

      return peer;
    } catch (err) {
      console.error("Error creating peer:", err);
      setConnectionError(`Failed to create peer: ${err.message}`);
      return null;
    }
  }, []);

  // Reset all call state but avoid using peer.destroy()
  const handleEndCall = () => {
    // Clear the remote video
    if (remoteVideo.current && remoteVideo.current.srcObject) {
      const tracks = remoteVideo.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      remoteVideo.current.srcObject = null;
    }
    
    // Don't try to destroy the peer, just remove the reference
    // This avoids the process.nextTick error
    peerRef.current = null;
    
    // Reset state
    setCallAccepted(false);
    setReceivingCall(false);
    
    // Notify other users if needed
    if (socketRef.current && caller) {
      socketRef.current.emit("call-ended", { to: caller });
    }
  };

  // Initialize socket connection and media stream
  useEffect(() => {
    // Clean up function for the entire component
    const cleanup = () => {
      // Stop all tracks in the local stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Stop screen share if active
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // End call if active
      if (callAccepted) {
        handleEndCall();
      }
      
      // Disconnect socket
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };

    // Initialize socket
    socketRef.current = io(SOCKET_SERVER_URL);
    
    // Socket event listeners
    const setupSocketListeners = () => {
      // When joining a room, get the other users
      socketRef.current.on("all users", (users) => {
        console.log("Received all users:", users);
        setOtherUsers(users);
      });

      // Listen for an incoming call
      socketRef.current.on("callUser", (data) => {
        console.log("Incoming call from:", data.from);
        setReceivingCall(true);
        setCaller(data.from);
        setCallerSignal(data.signal);
      });

      // When call is accepted
      socketRef.current.on("callAccepted", (signal) => {
        console.log("Call accepted, received signal");
        setCallAccepted(true);
        if (peerRef.current) {
          peerRef.current.signal(signal);
        }
      });

      // Handle call ended by the other user
      socketRef.current.on("call-ended", () => {
        console.log("Call ended by the other user");
        handleEndCall();
      });

      // Handle disconnection events
      socketRef.current.on("user-disconnected", (userId) => {
        console.log("User disconnected:", userId);
        if (callAccepted && caller === userId) {
          // Reset call state if the user we're in a call with disconnects
          handleEndCall();
        }
        
        // Update other users list
        setOtherUsers(prev => prev.filter(id => id !== userId));
      });

      // Handle reconnection
      socketRef.current.on("connect", () => {
        console.log("Socket reconnected, rejoining room");
        socketRef.current.emit("join room", roomId);
      });
    };

    // Get user media
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((mediaStream) => {
        console.log("Got local media stream");
        setStream(mediaStream);
        if (localVideo.current) {
          localVideo.current.srcObject = mediaStream;
        }
        
        setupSocketListeners();
        
        // Join the room after we have our stream
        socketRef.current.emit("join room", roomId);
      })
      .catch((err) => {
        console.error("Failed to get stream", err);
        setConnectionError(`Media access error: ${err.message}`);
      });

    return cleanup;
  }, [roomId]);

  // Handle calling another user
  const callUser = useCallback((userId) => {
    console.log("Initiating call to:", userId);
    if (!stream) {
      setConnectionError("No local stream available");
      return;
    }
    
    // Create a new peer as initiator
    const newPeer = createPeer(true, userId, stream);
    peerRef.current = newPeer;
  }, [stream, createPeer]);

  // Handle answering an incoming call
  const answerCall = useCallback(() => {
    console.log("Answering call from:", caller);
    if (!stream) {
      setConnectionError("No local stream available");
      return;
    }
    
    setCallAccepted(true);
    
    // Create a new peer to answer the call
    const newPeer = createPeer(false, caller, stream);
    peerRef.current = newPeer;
    
    // Signal with the callerSignal
    if (newPeer && callerSignal) {
      newPeer.signal(callerSignal);
    }
  }, [stream, caller, callerSignal, createPeer]);

  // Toggle screen sharing
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        screenStreamRef.current = displayStream;
        setIsScreenSharing(true);

        // Replace local video display
        if (localVideo.current) {
          localVideo.current.srcObject = displayStream;
        }
        
        // Replace track in the peer connection if it exists
        if (peerRef.current && peerRef.current._pc) {
          const screenTrack = displayStream.getVideoTracks()[0];
          const senders = peerRef.current._pc.getSenders();
          const videoSender = senders.find(s => s.track && s.track.kind === "video");
          if (videoSender) {
            videoSender.replaceTrack(screenTrack);
          }
          
          // Add track ended event listener
          screenTrack.onended = () => {
            toggleScreenShare();
          };
        }
      } catch (err) {
        console.error("Error sharing screen:", err);
        setConnectionError(`Screen sharing error: ${err.message}`);
      }
    } else {
      // Revert to camera
      if (stream && localVideo.current) {
        localVideo.current.srcObject = stream;
      }
      
      // Replace track in peer connection
      if (peerRef.current && peerRef.current._pc && stream) {
        const cameraTrack = stream.getVideoTracks()[0];
        const senders = peerRef.current._pc.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === "video");
        if (videoSender && cameraTrack) {
          videoSender.replaceTrack(cameraTrack);
        }
      }
      
      // Stop screen sharing tracks
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }
      
      setIsScreenSharing(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>Meeting Room</h1>
        {roomId && <p style={styles.roomInfo}>Room ID: {roomId}</p>}
      </header>
      
      {connectionError && (
        <div style={styles.errorMessage}>
          <p>{connectionError}</p>
          <button 
            style={styles.retryButton} 
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      )}
      
      <div style={styles.videoContainer}>
        <div style={styles.videoWrapper}>
          <h4 style={styles.videoTitle}>Local Stream {isScreenSharing && "(Screen Sharing)"}</h4>
          <video
            playsInline
            muted
            ref={localVideo}
            autoPlay
            style={styles.video}
          />
        </div>
        <div style={styles.videoWrapper}>
          <h4 style={styles.videoTitle}>Remote Stream</h4>
          <video
            playsInline
            ref={remoteVideo}
            autoPlay
            style={styles.video}
          />
        </div>
      </div>
      
      <div style={styles.buttonBar}>
        {otherUsers.length > 0 && !callAccepted && !receivingCall && (
          <div>
            <p style={styles.usersText}>
              {otherUsers.length} other {otherUsers.length === 1 ? 'user' : 'users'} in the room
            </p>
            {otherUsers.map(userId => (
              <button 
                key={userId}
                style={styles.button} 
                onClick={() => callUser(userId)}
              >
                Call User {userId.substring(0, 5)}...
              </button>
            ))}
          </div>
        )}
        
        {receivingCall && !callAccepted && (
          <div style={styles.incomingCall}>
            <h3 style={styles.incomingText}>Incoming Call from {caller.substring(0, 8)}...</h3>
            <button style={styles.button} onClick={answerCall}>Answer</button>
          </div>
        )}
        
        {callAccepted && (
          <div style={styles.callControls}>
            <p style={styles.callStatus}>Call in progress...</p>
            <button 
              style={{...styles.button, backgroundColor: frenchRed}} 
              onClick={handleEndCall}
            >
              End Call
            </button>
          </div>
        )}
        
        {stream && (
          <button 
            style={{
              ...styles.button, 
              backgroundColor: isScreenSharing ? frenchRed : frenchBlue
            }} 
            onClick={toggleScreenShare}
          >
            {isScreenSharing ? "Stop Screen Share" : "Share Screen"}
          </button>
        )}
      </div>
      
      <div style={styles.connectionInfo}>
        <p>Socket ID: {socketRef.current?.id || 'Connecting...'}</p>
        <p>Connection Status: {socketRef.current?.connected ? 'Connected' : 'Disconnected'}</p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    background: darkGray,
    color: frenchWhite,
    minHeight: "100vh",
    padding: "20px",
    fontFamily: "Arial, sans-serif"
  },
  header: {
    textAlign: "center",
    padding: "10px 0",
    borderBottom: `2px solid ${frenchBlue}`,
    marginBottom: "20px"
  },
  headerTitle: {
    margin: "0",
    fontSize: "2rem"
  },
  roomInfo: {
    margin: "5px 0",
    fontSize: "1rem",
    opacity: 0.8
  },
  videoContainer: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "20px"
  },
  videoWrapper: {
    textAlign: "center"
  },
  videoTitle: {
    marginBottom: "10px"
  },
  video: {
    width: "320px",
    height: "240px",
    background: "#000",
    border: `4px solid ${frenchBlue}`,
    borderRadius: "10px",
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.5)",
    objectFit: "cover"
  },
  buttonBar: {
    marginTop: "30px",
    textAlign: "center"
  },
  button: {
    backgroundColor: frenchBlue,
    color: frenchWhite,
    padding: "12px 24px",
    border: "none",
    borderRadius: "5px",
    margin: "0 10px",
    cursor: "pointer",
    fontSize: "1rem"
  },
  incomingCall: {
    marginBottom: "20px"
  },
  incomingText: {
    margin: "10px 0"
  },
  callStatus: {
    fontSize: "1.1rem",
    marginTop: "10px"
  },
  callControls: {
    margin: "10px 0"
  },
  usersText: {
    margin: "10px 0"
  },
  errorMessage: {
    backgroundColor: frenchRed,
    color: frenchWhite,
    padding: "10px",
    borderRadius: "5px",
    margin: "10px 0",
    textAlign: "center"
  },
  retryButton: {
    backgroundColor: frenchWhite,
    color: frenchRed,
    padding: "8px 16px",
    border: "none",
    borderRadius: "5px",
    margin: "10px 0",
    cursor: "pointer",
    fontSize: "0.9rem"
  },
  connectionInfo: {
    marginTop: "20px",
    textAlign: "center",
    fontSize: "0.8rem",
    opacity: 0.7
  }
};

export default MeetingRoom;