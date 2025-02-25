import React, { useState, useEffect, useRef } from "react";
import { ReactMic } from "react-mic";
import LoadingSpinner from "./LoadingSpinner"; // Import your LoadingSpinner component

// French color palette
const frenchBlue = "#0055A4";
const frenchRed = "#EF4135";
const frenchWhite = "#FFFFFF";

const SpeakingMock = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [initialAudio, setInitialAudio] = useState(null);

  const aiAudioRef = useRef(null);
  const initialAudioRef = useRef(null);

  // Fetch the initial interview question when "Start Interview" is clicked
  const fetchInitialQuestion = async () => {
    setInitialLoading(true);
    try {
      const response = await fetch("http://localhost:4000/api/initial-question", {
        method: "POST",
      });
      const data = await response.json();
      if (data.question) {
        // Set audio if available
        const audioSrc = `data:audio/wav;base64,${data.audio}`;
        setInitialAudio(audioSrc);
        // Add initial question to conversation history as a system message
        setConversationHistory((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: "initial",
            text: data.question,
            audio: audioSrc,
            active: false,
          },
        ]);
      }
    } catch (error) {
      console.error("Error fetching initial question:", error);
    }
    setInitialLoading(false);
  };

  // Play the initial question audio when it's loaded
  useEffect(() => {
    if (initialAudio && initialAudioRef.current) {
      initialAudioRef.current.play();
    }
  }, [initialAudio]);

  // Play AI response audio when available
  useEffect(() => {
    // Find the most recent interviewer message with audio
    const latestInterviewer = conversationHistory
      .filter((msg) => msg.role === "interviewer" && msg.audio)
      .slice(-1)[0];
    if (latestInterviewer && aiAudioRef.current) {
      aiAudioRef.current.play();
    }
  }, [conversationHistory]);

  const startRecording = () => {
    setRecording(true);
  };

  const stopRecording = () => {
    setRecording(false);
  };

  const onStop = async (recordedBlob) => {
    const formData = new FormData();
    formData.append("file", recordedBlob.blob);

    setIsLoading(true);

    try {
      // Convert speech to text
      const speechResponse = await fetch("http://localhost:4000/api/speech-to-text", {
        method: "POST",
        body: formData,
      });
      const data = await speechResponse.json();

      if (data.text) {
        // Mark any existing active messages as inactive
        setConversationHistory((prev) =>
          prev.map((msg) => ({ ...msg, active: false }))
        );
        // Add new user message
        const userMessage = {
          id: Date.now(),
          role: "user",
          text: data.text,
          active: true,
        };
        setConversationHistory((prev) => [...prev, userMessage]);

        // Send the transcribed text to the AI endpoint for the next interviewer response
        const aiResponseRes = await fetch("http://localhost:4000/api/ai-response", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: data.text }),
        });

        const aiData = await aiResponseRes.json();

        if (aiData.response) {
          // Mark previous active messages as inactive again
          setConversationHistory((prev) =>
            prev.map((msg) => ({ ...msg, active: false }))
          );
          // Add new interviewer response
          const interviewerMessage = {
            id: Date.now() + 1,
            role: "interviewer",
            text: aiData.response,
            audio: `data:audio/wav;base64,${aiData.audio}`,
            active: true,
          };
          setConversationHistory((prev) => [...prev, interviewerMessage]);
        } else {
          // In case no response, add a fallback interviewer message
          setConversationHistory((prev) => [
            ...prev,
            {
              id: Date.now() + 1,
              role: "interviewer",
              text: "Sorry, I didn't understand that.",
              active: true,
            },
          ]);
        }
      } else {
        setConversationHistory((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: "interviewer",
            text: "Unable to evaluate speech. Please try again.",
            active: true,
          },
        ]);
      }
    } catch (error) {
      console.error("Error processing speech:", error);
      setConversationHistory((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "interviewer",
          text: "Error processing the audio file.",
          active: true,
        },
      ]);
    }

    setIsLoading(false);
  };

  // Clean up object URLs when component unmounts or when URLs are updated
  useEffect(() => {
    return () => {
      // Cleanup if needed (currently using data URLs, so not required)
    };
  }, []);

  const handleStartInterview = () => {
    setHasStarted(true);
    fetchInitialQuestion();
  };

  return (
    <div
      className="container-fluid min-vh-100 d-flex flex-column align-items-center justify-content-center"
      style={{
        background: `linear-gradient(135deg, ${frenchBlue} 40%, ${frenchWhite} 100%)`,
        padding: "2rem",
      }}
    >
      <div
        className="card shadow-lg p-4 mb-5"
        style={{
          maxWidth: "800px",
          width: "100%",
          border: `1px solid ${frenchBlue}`,
        }}
      >
        <h2
          className="text-center mb-4"
          style={{
            fontWeight: "700",
            color: frenchBlue,
          }}
        >
          Live Interview Practice
        </h2>

        {/* Start Interview Button */}
        {!hasStarted && (
          <div className="text-center mb-4">
            <button
              className="btn"
              style={{
                backgroundColor: frenchRed,
                color: frenchWhite,
                padding: "0.75rem 1.5rem",
                fontSize: "1.1rem",
                fontWeight: "600",
                borderRadius: "0.3rem",
              }}
              onClick={handleStartInterview}
            >
              Start Interview
            </button>
          </div>
        )}

        {/* Interview & Chat Area */}
        {hasStarted && (
          <>
            {/* Interviewer Question */}
            {initialLoading ? (
              <div className="text-center my-3">
                <LoadingSpinner />
              </div>
            ) : (
              conversationHistory
                .filter((msg) => msg.role === "initial")
                .map((msg) => (
                  <div key={msg.id} className="mb-4">
                    <h4
                      style={{
                        color: frenchRed,
                        fontWeight: "600",
                      }}
                    >
                      Interviewer Question:
                    </h4>
                    <p className="lead" style={{ fontSize: "1.2rem" }}>
                      {msg.text}
                    </p>
                    {msg.audio && (
                      <audio ref={initialAudioRef} src={msg.audio} controls hidden />
                    )}
                  </div>
                ))
            )}

            {/* Recording Controls */}
            <div className="text-center mb-4">
              <button
                onClick={startRecording}
                className="btn mx-2"
                style={{
                  backgroundColor: frenchBlue,
                  color: frenchWhite,
                  minWidth: "140px",
                }}
              >
                Start Recording
              </button>
              <button
                onClick={stopRecording}
                className="btn mx-2"
                style={{
                  backgroundColor: frenchRed,
                  color: frenchWhite,
                  minWidth: "140px",
                }}
              >
                Stop Recording
              </button>
              <div className="mt-3">
                <ReactMic
                  record={recording}
                  className="sound-wave"
                  onStop={onStop}
                  strokeColor={frenchBlue}
                  backgroundColor="#fff"
                  mimeType="audio/wav"
                />
              </div>
            </div>

            {/* Loading Spinner for AI response */}
            {isLoading && (
              <div className="text-center my-3">
                <LoadingSpinner />
              </div>
            )}

            {/* Chat History: New messages are shown at the top */}
            <div className="chat-container" style={{ maxHeight: "300px", overflowY: "auto" }}>
              {conversationHistory
                .filter((msg) => msg.role !== "initial")
                .slice()
                .reverse()
                .map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      backgroundColor: msg.active ? "#e6f7ff" : "#f1f1f1",
                      border: msg.active
                        ? `2px solid ${frenchBlue}`
                        : "1px solid #ccc",
                      borderRadius: "0.5rem",
                      padding: "0.75rem 1rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <h5
                      style={{
                        marginBottom: "0.5rem",
                        color: msg.role === "user" ? frenchBlue : frenchRed,
                      }}
                    >
                      {msg.role === "user"
                        ? "Your Answer:"
                        : "Interviewer Follow-up:"}
                    </h5>
                    <p style={{ margin: 0, fontSize: "1rem" }}>{msg.text}</p>
                    {msg.audio && msg.role === "interviewer" && (
                      <audio
                        ref={aiAudioRef}
                        src={msg.audio}
                        controls
                        style={{ marginTop: "0.5rem" }}
                      />
                    )}
                  </div>
                ))}
            </div>
          </>
        )}

        <div className="text-center mt-4">
          <small className="text-muted">
            Note: Answer the interviewer's question above. The conversation will
            continue with follow-up questions.
          </small>
        </div>
      </div>
    </div>
  );
};

export default SpeakingMock;
