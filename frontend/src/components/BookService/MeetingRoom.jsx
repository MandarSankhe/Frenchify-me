import React, { useRef, useEffect, useState, useCallback } from "react";
import io from "socket.io-client";
import SimplePeer from "simple-peer";
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash } from "react-icons/fa";
import SharedWhiteboard from "./SharedWhiteboard"; // Import the new component
import Chat from "../HeadToHead/Chat";
import { useAuth } from "../../context/AuthContext";

const frenchBlue = "#0055A4";
const frenchRed = "#EF4135";
const frenchWhite = "#FFFFFF";
const darkGray = "#2E2E2E";

// Set your Socket.IO server URL; adjust if needed
//const SOCKET_SERVER_URL = "https://frenchify-me.onrender.com";
const SOCKET_SERVER_URL = "http://localhost:8736"; // For local testing

const MeetingRoom = () => {
  const { user } = useAuth();
  const [stream, setStream] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [otherUsers, setOtherUsers] = useState([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [isCalling, setIsCalling] = useState(false); // Outgoing call status
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [videoSize, setVideoSize] = useState(320); // adjustable width for videos

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
        setIsCalling(false); // Reset calling state on error
      });

      return peer;
    } catch (err) {
      console.error("Error creating peer:", err);
      setConnectionError(`Failed to create peer: ${err.message}`);
      setIsCalling(false); // Reset calling state on error
      return null;
    }
  }, []);

  // Reset call state without calling peer.destroy()
  const handleEndCall = () => {
    // Clear the remote video
    if (remoteVideo.current && remoteVideo.current.srcObject) {
      const tracks = remoteVideo.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      remoteVideo.current.srcObject = null;
    }
    
    // Remove peer reference
    peerRef.current = null;
    
    // Reset state
    setCallAccepted(false);
    setReceivingCall(false);
    setIsCalling(false);
    
    // Notify other users if needed
    if (socketRef.current && caller) {
      socketRef.current.emit("call-ended", { to: caller });
    }
  };

  // Initialize socket connection and media stream
  useEffect(() => {
    // Cleanup function for the component
    const cleanup = () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (callAccepted || isCalling) {
        handleEndCall();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };

    socketRef.current = io(SOCKET_SERVER_URL);
    
    // Socket event listeners
    const setupSocketListeners = () => {
      socketRef.current.on("all users", (users) => {
        console.log("Received all users:", users);
        setOtherUsers(users);
      });

      socketRef.current.on("callUser", (data) => {
        console.log("Incoming call from:", data.from);
        setReceivingCall(true);
        setCaller(data.from);
        setCallerSignal(data.signal);
      });

      socketRef.current.on("callAccepted", (signal) => {
        console.log("Call accepted, received signal");
        setCallAccepted(true);
        setIsCalling(false);
        if (peerRef.current) {
          peerRef.current.signal(signal);
        }
      });

      socketRef.current.on("call-ended", () => {
        console.log("Call ended by the other user");
        handleEndCall();
      });

      socketRef.current.on("user-disconnected", (userId) => {
        console.log("User disconnected:", userId);
        if ((callAccepted || isCalling) && caller === userId) {
          handleEndCall();
        }
        setOtherUsers(prev => prev.filter(id => id !== userId));
      });

      socketRef.current.on("connect", () => {
        console.log("Socket reconnected, rejoining room");
        socketRef.current.emit("join room", roomId);
      });
    };

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((mediaStream) => {
        console.log("Got local media stream");
        setStream(mediaStream);
        if (localVideo.current) {
          localVideo.current.srcObject = mediaStream;
        }
        
        setupSocketListeners();
        socketRef.current.emit("join room", roomId);
      })
      .catch((err) => {
        console.error("Failed to get stream", err);
        setConnectionError(`Media access error: ${err.message}`);
      });

    return cleanup;
  }, [roomId]);

  // Existing functions (callUser, answerCall, toggleScreenShare, etc.)
  // Handle calling another user
  const callUser = useCallback((userId) => {
    console.log("Initiating call to:", userId);
    if (!stream) {
      setConnectionError("No local stream available");
      return;
    }
    
    setIsCalling(true);
    setCaller(userId);
    
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
    
    const newPeer = createPeer(false, caller, stream);
    peerRef.current = newPeer;
    
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

        if (localVideo.current) {
          localVideo.current.srcObject = displayStream;
        }
        
        if (peerRef.current && peerRef.current._pc) {
          const screenTrack = displayStream.getVideoTracks()[0];
          const senders = peerRef.current._pc.getSenders();
          const videoSender = senders.find(s => s.track && s.track.kind === "video");
          if (videoSender) {
            videoSender.replaceTrack(screenTrack);
          }
          
          screenTrack.onended = () => {
            toggleScreenShare();
          };
        }
      } catch (err) {
        console.error("Error sharing screen:", err);
        setConnectionError(`Screen sharing error: ${err.message}`);
      }
    } else {
      if (stream && localVideo.current) {
        localVideo.current.srcObject = stream;
      }
      
      if (peerRef.current && peerRef.current._pc && stream) {
        const cameraTrack = stream.getVideoTracks()[0];
        const senders = peerRef.current._pc.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === "video");
        if (videoSender && cameraTrack) {
          videoSender.replaceTrack(cameraTrack);
        }
      }
      
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }
      
      setIsScreenSharing(false);
    }
  };

  // Toggle mute/unmute functionality
  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(prev => !prev);
    }
  };

  // Toggle video on/off functionality
  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(prev => !prev);
    }
  };

  // Handler to adjust video sizes via a slider (values between 240 and 640)
  const handleVideoSizeChange = (e) => {
    setVideoSize(Number(e.target.value));
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
      
      {/* Add the SharedWhiteboard component here */}
      <SharedWhiteboard socketRef={socketRef} roomId={roomId} />
      
      <div style={styles.videoContainer}>
        <div style={styles.videoWrapper}>
          <h4 style={styles.videoTitle}>
            Local Stream {isScreenSharing && "(Screen Sharing)"}
          </h4>
          <video
            playsInline
            muted
            ref={localVideo}
            autoPlay
            style={{ ...styles.video, width: videoSize, height: videoSize * 0.75 }}
          />
        </div>
        <div style={styles.videoWrapper}>
          <h4 style={styles.videoTitle}>Remote Stream</h4>
          <video
            playsInline
            ref={remoteVideo}
            autoPlay
            style={{ ...styles.video, width: videoSize, height: videoSize * 0.75 }}
          />
        </div>
      </div>
      
      <div style={styles.buttonBar}>
        <div style={styles.controlsRow}>
          <button style={styles.controlButton} onClick={toggleMute}>
            {isMuted ? <FaMicrophoneSlash size={20} /> : <FaMicrophone size={20} />}
          </button>
          <button style={styles.controlButton} onClick={toggleVideo}>
            {isVideoOff ? <FaVideoSlash size={20} /> : <FaVideo size={20} />}
          </button>
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
        
        <div style={styles.controlsRow}>
          {otherUsers.length > 0 && !callAccepted && !receivingCall && !isCalling && (
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
          
          {isCalling && !callAccepted && (
            <div style={styles.callControls}>
              <p style={styles.callStatus}>Calling...</p>
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
        </div>
        
        <div style={styles.sliderContainer}>
          <label htmlFor="videoSize" style={styles.sliderLabel}>Adjust Video Size:</label>
          <input
            type="range"
            id="videoSize"
            name="videoSize"
            min="240"
            max="640"
            value={videoSize}
            onChange={handleVideoSizeChange}
          />
        </div>
      </div>
      
      <div style={styles.connectionInfo}>
        <p>Socket ID: {socketRef.current?.id || 'Connecting...'}</p>
        <p>Connection Status: {socketRef.current?.connected ? 'Connected' : 'Disconnected'}</p>
      </div>
      <Chat matchId={roomId} currentUser={user} socketRef={socketRef} />
    </div>
  );
};

const styles = {
  container: {
    background: darkGray,
    color: frenchWhite,
    minHeight: "100vh",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    textAlign: "center",
    padding: "10px 0",
    borderBottom: `2px solid ${frenchBlue}`,
    marginBottom: "20px",
  },
  headerTitle: {
    margin: "0",
    fontSize: "2rem",
  },
  roomInfo: {
    margin: "5px 0",
    fontSize: "1rem",
    opacity: 0.8,
  },
  videoContainer: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "20px",
  },
  videoWrapper: {
    textAlign: "center",
  },
  videoTitle: {
    marginBottom: "10px",
  },
  video: {
    background: "#000",
    border: `4px solid ${frenchBlue}`,
    borderRadius: "10px",
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.5)",
    objectFit: "cover",
  },
  buttonBar: {
    marginTop: "30px",
    textAlign: "center",
  },
  controlsRow: {
    marginBottom: "20px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
  },
  controlButton: {
    backgroundColor: frenchBlue,
    color: frenchWhite,
    border: "none",
    padding: "10px",
    borderRadius: "5px",
    cursor: "pointer",
  },
  button: {
    backgroundColor: frenchBlue,
    color: frenchWhite,
    padding: "12px 24px",
    border: "none",
    borderRadius: "5px",
    margin: "0 10px",
    cursor: "pointer",
    fontSize: "1rem",
  },
  usersText: {
    margin: "10px 0",
    textAlign: "center",
  },
  incomingCall: {
    marginBottom: "20px",
  },
  incomingText: {
    margin: "10px 0",
  },
  callStatus: {
    fontSize: "1.1rem",
    marginTop: "10px",
  },
  callControls: {
    margin: "10px 0",
  },
  sliderContainer: {
    marginTop: "20px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",
  },
  sliderLabel: {
    fontSize: "0.9rem",
  },
  errorMessage: {
    backgroundColor: frenchRed,
    color: frenchWhite,
    padding: "10px",
    borderRadius: "5px",
    margin: "10px 0",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: frenchWhite,
    color: frenchRed,
    padding: "8px 16px",
    border: "none",
    borderRadius: "5px",
    marginTop: "10px",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  connectionInfo: {
    marginTop: "20px",
    textAlign: "center",
    fontSize: "0.8rem",
    opacity: 0.7,
  },
};

export default MeetingRoom;
