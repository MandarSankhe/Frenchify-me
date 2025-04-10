import React, { useRef, useEffect, useState } from "react";
import io from "socket.io-client";
import SimplePeer from "simple-peer";

const frenchBlue = "#0055A4";
const frenchRed = "#EF4135";
const frenchWhite = "#FFFFFF";

// Set your Socket.IO server URL; adjust if needed
const SOCKET_SERVER_URL = "http://localhost:8736"; // Adjust this to your server URL

const MeetingRoom = () => {
  const [stream, setStream] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [peer, setPeer] = useState(null);
  const localVideo = useRef();
  const remoteVideo = useRef();

  // Get room id from the URL query parameter
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get("room");

  const socketRef = useRef();

  useEffect(() => {
    // Connect to the Socket.IO server
    socketRef.current = io(SOCKET_SERVER_URL);

    // Get local video/audio stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        if (localVideo.current) {
          localVideo.current.srcObject = stream;
        }
        // Join the specified room
        socketRef.current.emit("join room", roomId);
      })
      .catch((err) => console.error("Failed to get stream", err));

    socketRef.current.on("callUser", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
    });

    socketRef.current.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer && peer.signal(signal);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [roomId, peer]);

  const callUser = () => {
    const initiatorPeer = new SimplePeer({
      initiator: true,
      trickle: false,
      stream: stream,
    });
    initiatorPeer.on("signal", (data) => {
      socketRef.current.emit("callUser", {
        userToCall: roomId, // We use roomId as an identifier for the other peer in this simple example.
        signalData: data,
        from: socketRef.current.id,
      });
    });
    initiatorPeer.on("stream", (currentStream) => {
      if (remoteVideo.current) {
        remoteVideo.current.srcObject = currentStream;
      }
    });
    setPeer(initiatorPeer);
  };

  const answerCall = () => {
    setCallAccepted(true);
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
    answererPeer.signal(callerSignal);
    setPeer(answererPeer);
  };

  return (
    <div className="container my-5">
      <h2 style={{ color: frenchBlue }}>Meeting Room</h2>
      <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap" }}>
        <div>
          <h4>Local Stream</h4>
          <video playsInline muted ref={localVideo} autoPlay style={{ width: "300px", border: `2px solid ${frenchBlue}` }} />
        </div>
        <div>
          <h4>Remote Stream</h4>
          <video playsInline ref={remoteVideo} autoPlay style={{ width: "300px", border: `2px solid ${frenchBlue}` }} />
        </div>
      </div>
      <div className="mt-3">
        {!callAccepted && !receivingCall && (
          <button onClick={callUser} style={{ backgroundColor: frenchBlue, color: frenchWhite, padding: "10px 20px", border: "none", borderRadius: "5px" }}>
            Call
          </button>
        )}
        {receivingCall && !callAccepted && (
          <div>
            <h3 style={{ color: frenchBlue }}>Incoming Call...</h3>
            <button onClick={answerCall} style={{ backgroundColor: frenchBlue, color: frenchWhite, padding: "10px 20px", border: "none", borderRadius: "5px" }}>
              Answer
            </button>
          </div>
        )}
        {callAccepted && (
          <p style={{ color: frenchBlue }}>Call in progress...</p>
        )}
      </div>
    </div>
  );
};

export default MeetingRoom;
