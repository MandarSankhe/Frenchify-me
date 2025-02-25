import React, { useState, useEffect, useRef } from "react";
import { ReactMic } from "react-mic";
import LoadingSpinner from "./LoadingSpinner"; // Import your LoadingSpinner component

const SpeakingMock = () => {
  const [recording, setRecording] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiAudio, setAiAudio] = useState(null);
  const [initialQuestion, setInitialQuestion] = useState("");
  const [initialAudio, setInitialAudio] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  const aiAudioRef = useRef(null);
  const initialAudioRef = useRef(null);

  // Fetch the initial interview question on component mount
  useEffect(() => {
    const fetchInitialQuestion = async () => {
      setInitialLoading(true);
      try {
        const response = await fetch("http://localhost:4000/api/initial-question", {
          method: "POST",
        });
        const data = await response.json();
        if (data.question) {
          setInitialQuestion(data.question);
          // Assume data.audio is a base64 string; if it's a Blob, adjust accordingly
          setInitialAudio(`data:audio/wav;base64,${data.audio}`);
        }
      } catch (error) {
        console.error("Error fetching initial question:", error);
      }
      setInitialLoading(false);
    };
    fetchInitialQuestion();
  }, []);

  // Play the initial question audio when it's loaded
  useEffect(() => {
    if (initialAudio && initialAudioRef.current) {
      initialAudioRef.current.play();
    }
  }, [initialAudio]);

  // Play AI response audio when available
  useEffect(() => {
    if (aiAudio && aiAudioRef.current) {
      aiAudioRef.current.play();
    }
  }, [aiAudio]);

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
        setUserInput(data.text); // Store user's transcribed speech

        // Send the transcribed text to the AI endpoint for the next interview question
        const aiResponseRes = await fetch("http://localhost:4000/api/ai-response", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: data.text }),
        });

        const aiData = await aiResponseRes.json();

        if (aiData.response) {
          setAiResponse(aiData.response); // Set AI response text
          setAiAudio(`data:audio/wav;base64,${aiData.audio}`);
        } else {
          setAiResponse("Sorry, I didn't understand that.");
        }
      } else {
        setAiResponse("Unable to evaluate speech. Please try again.");
      }
    } catch (error) {
      console.error("Error processing speech:", error);
      setAiResponse("Error processing the audio file.");
    }

    setIsLoading(false);
  };

  // Clean up object URLs when component unmounts or when URLs are updated
  useEffect(() => {
    return () => {
      if (initialAudio && initialAudio.startsWith("blob:")) {
        URL.revokeObjectURL(initialAudio);
      }
      if (aiAudio && aiAudio.startsWith("blob:")) {
        URL.revokeObjectURL(aiAudio);
      }
    };
  }, [initialAudio, aiAudio]);

  return (
    <div
      className="container-fluid min-vh-100 d-flex flex-column align-items-center justify-content-center"
      style={{
        background: "linear-gradient(135deg, #f5f7fa, #c3cfe2)",
        padding: "2rem",
      }}
    >
      <div className="card shadow-lg p-4 mb-5" style={{ maxWidth: "800px", width: "100%" }}>
        <h2 className="text-center mb-4" style={{ fontWeight: "700", color: "#343a40" }}>
          Live Interview Practice
        </h2>

        {/* Interviewer Question */}
        {initialLoading ? (
          <div className="text-center my-3">
            <LoadingSpinner />
          </div>
        ) : (
          initialQuestion && (
            <div className="mb-4">
              <h4 className="text-primary">Interviewer Question:</h4>
              <p className="lead" style={{ fontSize: "1.2rem" }}>{initialQuestion}</p>
              <audio ref={initialAudioRef} src={initialAudio} controls hidden />
            </div>
          )
        )}

        {/* Recording Controls */}
        <div className="text-center mb-4">
          <button
            onClick={startRecording}
            className="btn btn-success mx-2"
            style={{ minWidth: "140px" }}
          >
            Start Recording
          </button>
          <button
            onClick={stopRecording}
            className="btn btn-danger mx-2"
            style={{ minWidth: "140px" }}
          >
            Stop Recording
          </button>
          <div className="mt-3">
            <ReactMic
              record={recording}
              className="sound-wave"
              onStop={onStop}
              strokeColor="#007bff"
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

        {/* Display User Answer */}
        {userInput && (
          <div className="mb-4">
            <h4 className="text-secondary">Your Answer:</h4>
            <p style={{ fontSize: "1.1rem" }}>{userInput}</p>
          </div>
        )}

        {/* Display Interviewer Follow-up */}
        {aiResponse && (
          <div className="mb-4">
            <h4 className="text-info">Interviewer Follow-up:</h4>
            <p style={{ fontSize: "1.1rem" }}>{aiResponse}</p>
            <audio ref={aiAudioRef} src={aiAudio} controls hidden />
          </div>
        )}

        <div className="text-center">
          <small className="text-muted">
            Note: Answer the interviewer's question above. The conversation will continue with follow-up questions.
          </small>
        </div>
      </div>
    </div>
  );
};

export default SpeakingMock;
