import React, { useRef, useEffect, useState } from "react";
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
  const [peer, setPeer] = useState(null);
  const [otherUser, setOtherUser] = useState(null); // ID of the other user in the room
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const localVideo = useRef();
  const remoteVideo = useRef();
  const screenStreamRef = useRef(null); // to hold the display media stream

  // Get room id from the URL query parameter
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get("room");

  const socketRef = useRef();

  useEffect(() => {
    socketRef.current = io(SOCKET_SERVER_URL);

    // Get local video/audio stream
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        if (localVideo.current) {
          localVideo.current.srcObject = stream;
        }
        // Join the specified room
        socketRef.current.emit("join room", roomId);
      })
      .catch((err) => console.error("Failed to get stream", err));

    // When joining a room, get the other users (if any)
    socketRef.current.on("all users", (users) => {
      if (users.length > 0) {
        // Assume a one-to-one call; take the first user as the other peer
        setOtherUser(users[0]);
      }
    });

    // Listen for an incoming call from another user
    socketRef.current.on("callUser", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
    });

    // When the caller receives an answer, complete the connection
    socketRef.current.on("callAccepted", (signal) => {
      setCallAccepted(true);
      if (peer) {
        peer.signal(signal);
      }
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [roomId, peer]);

  const callUser = () => {
    // Create a SimplePeer as initiator
    const initiatorPeer = new SimplePeer({
      initiator: true,
      trickle: false,
      stream: stream,
    });

    // When SimplePeer generates signaling data, send it to the other user (by socket ID)
    initiatorPeer.on("signal", (data) => {
      socketRef.current.emit("callUser", {
        userToCall: otherUser,
        signalData: data,
        from: socketRef.current.id,
      });
    });

    // When a stream is received, set it as the remote video stream
    initiatorPeer.on("stream", (currentStream) => {
      if (remoteVideo.current) {
        remoteVideo.current.srcObject = currentStream;
      }
    });

    setPeer(initiatorPeer);
  };

  const answerCall = () => {
    setCallAccepted(true);
    // Create a SimplePeer as non-initiator to answer the incoming call
    const answererPeer = new SimplePeer({
      initiator: false,
      trickle: false,
      stream: stream,
    });
    
    answererPeer.on("signal", (data) => {
      socketRef.current.emit("answerCall", { signal: data, to: caller });
    });

    answererPeer.on("stream", (currentStream) => {
      if (remoteVideo.current) {
        remoteVideo.current.srcObject = currentStream;
      }
    });
    
    // Signal the caller with the received callerSignal
    answererPeer.signal(callerSignal);
    setPeer(answererPeer);
  };

  // Toggle screen sharing feature
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        // Capture display media (screen share)
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        screenStreamRef.current = displayStream;
        setIsScreenSharing(true);

        // Replace local video stream with screen share stream
        if (localVideo.current) {
          localVideo.current.srcObject = displayStream;
        }
        
        // If there is an active peer connection, replace the video track
        if (peer) {
          const screenTrack = displayStream.getVideoTracks()[0];
          const sender = peer._pc.getSenders().find(s => s.track && s.track.kind === "video");
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        }
        
        // When the user stops sharing manually, revert back to camera
        displayStream.getVideoTracks()[0].onended = () => {
          toggleScreenShare();
        };

      } catch (err) {
        console.error("Error sharing the screen: ", err);
      }
    } else {
      // Revert to original camera stream
      if (localVideo.current) {
        localVideo.current.srcObject = stream;
      }
      // If there is an active peer connection, replace the track with the original camera track
      if (peer && stream) {
        const cameraTrack = stream.getVideoTracks()[0];
        const sender = peer._pc.getSenders().find(s => s.track && s.track.kind === "video");
        if (sender) {
          sender.replaceTrack(cameraTrack);
        }
      }
      // Stop screen share stream if active
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
      setIsScreenSharing(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>Meeting Room</h1>
      </header>
      <div style={styles.videoContainer}>
        <div style={styles.videoWrapper}>
          <h4 style={styles.videoTitle}>Local Stream</h4>
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
        {/** Call button shows only if no call is active, no incoming call, and there's another user */}
        {!callAccepted && !receivingCall && otherUser && (
          <button style={styles.button} onClick={callUser}>Call</button>
        )}
        {receivingCall && !callAccepted && (
          <div style={styles.incomingCall}>
            <h3 style={styles.incomingText}>Incoming Call...</h3>
            <button style={styles.button} onClick={answerCall}>Answer</button>
          </div>
        )}
        {callAccepted && <p style={styles.callStatus}>Call in progress...</p>}
        {stream && (
          <button style={styles.button} onClick={toggleScreenShare}>
            {isScreenSharing ? "Stop Screen Share" : "Share Screen"}
          </button>
        )}
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
    border: `4px solid ${frenchBlue}`,
    borderRadius: "10px",
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.5)"
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
  }
};

export default MeetingRoom;
