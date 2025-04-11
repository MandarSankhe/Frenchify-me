import React, { useRef, useEffect, useState } from "react";
import io from "socket.io-client";
import SimplePeer from "simple-peer";

const frenchBlue = "#0055A4";
const frenchRed = "#EF4135";
const frenchWhite = "#FFFFFF";

// Set your Socket.IO server URL; adjust if needed
const SOCKET_SERVER_URL = "http://localhost:8736";

const MeetingRoom = () => {
  const [stream, setStream] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [peer, setPeer] = useState(null);
  const [otherUser, setOtherUser] = useState(null); // ID of the other user in the room

  const localVideo = useRef();
  const remoteVideo = useRef();

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

  return (
    <div className="container my-5">
      <h2 style={{ color: frenchBlue }}>Meeting Room</h2>
      <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap" }}>
        <div>
          <h4>Local Stream</h4>
          <video
            playsInline
            muted
            ref={localVideo}
            autoPlay
            style={{ width: "300px", border: `2px solid ${frenchBlue}` }}
          />
        </div>
        <div>
          <h4>Remote Stream</h4>
          <video
            playsInline
            ref={remoteVideo}
            autoPlay
            style={{ width: "300px", border: `2px solid ${frenchBlue}` }}
          />
        </div>
      </div>
      <div className="mt-3">
        {/* Show "Call" button only if no call is active, no incoming call, and there's another user */}
        {!callAccepted && !receivingCall && otherUser && (
          <button
            onClick={callUser}
            style={{
              backgroundColor: frenchBlue,
              color: frenchWhite,
              padding: "10px 20px",
              border: "none",
              borderRadius: "5px",
            }}
          >
            Call
          </button>
        )}
        {receivingCall && !callAccepted && (
          <div>
            <h3 style={{ color: frenchBlue }}>Incoming Call...</h3>
            <button
              onClick={answerCall}
              style={{
                backgroundColor: frenchBlue,
                color: frenchWhite,
                padding: "10px 20px",
                border: "none",
                borderRadius: "5px",
              }}
            >
              Answer
            </button>
          </div>
        )}
        {callAccepted && <p style={{ color: frenchBlue }}>Call in progress...</p>}
      </div>
    </div>
  );
};

export default MeetingRoom;
