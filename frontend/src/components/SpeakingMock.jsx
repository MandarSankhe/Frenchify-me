import React, { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { ReactMic } from "react-mic";
import LoadingSpinner from "./LoadingSpinner";
import { FaRedo, FaPlay, FaPause } from "react-icons/fa";
import TalkingHead from "./TalkingHead";
// import { FaRedo, FaPlay, FaPause } from "../../node_modules/react-icons/fa";

// Use the same exam image logic as in your writing mock.
const getExamImage = (topic) => {
  const lower = topic.toLowerCase();

  if (lower.includes("vols")) {
    return "https://www.tesl-lugano.ch/wp-content/uploads/2023/10/francese-cover-ragazzi.jpg";
  } else if (lower.includes("tourisme")) {
    return "https://www.learnfrenchathome.com/wp-content/uploads/2023/12/IB-French-A-Level-French-Courses-GCSE.jpg";
  } else if (lower.includes("technologies")) {
    return "https://www.frenchclass.in/wp-content/uploads/2024/04/French-Language-Certifications-Banner-Image.webp";
  }
  return "https://www.globaltimes.cn/Portals/0/attachment/2022/2022-09-16/913af628-a364-4f82-8bc3-2bfc27f19699.jpeg";
};

const frenchBlue = "#0055A4";
const frenchRed = "#EF4135";
const frenchWhite = "#FFFFFF";

const SpeakingMock = () => {

  const GRAPHQL_ENDPOINT = `${process.env.REACT_APP_API_URL || "http://localhost:4000"}/graphql`;
  const API_ENDPOINT = process.env.REACT_APP_API_URL || "http://localhost:4000";

  const [allExams, setAllExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);

  // currentMainQuestion: 1 means DB question from mainQuestion1, 2 from mainQuestion2, 3 from mainQuestion3
  const [currentMainQuestion, setCurrentMainQuestion] = useState(1);
  const currentMainQuestionRef = useRef(1);
  const [followupCount, setFollowupCount] = useState(0);
  // But use a ref for synchronous updates
  const followupCountRef = useRef(0);

  // userResponses: store user answers by overall question index
  const [userResponses, setUserResponses] = useState({});
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Final result state
  const [finalScore, setFinalScore] = useState(null);
  const [finalFeedback, setFinalFeedback] = useState("");

  const [recording, setRecording] = useState(false);
  const [lastPlayedAudioId, setLastPlayedAudioId] = useState(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioRef = useRef(null);

  const overallQuestionIndex = (currentMainQuestionRef.current - 1) * 3 + followupCountRef.current + 1;

  // Fetch speaking exams from GraphQL
  useEffect(() => {
    const fetchAllTCFSpeakings = async () => {
      const query = `
        query GetAllTCFSpeakings {
          tcfSpeakings {
            id
            topic
            mainQuestion1
            mainQuestion2
            mainQuestion3
          }
        }
      `;
      try {
        const res = await fetch(GRAPHQL_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const result = await res.json();
        setAllExams(result.data.tcfSpeakings);
      } catch (error) {
        console.error("Error fetching speaking exams:", error);
      }
    };
    fetchAllTCFSpeakings();
  }, []);

  // Handle exam selection
  const handleExamSelection = (examId) => {
    const exam = allExams.find((e) => e.id === examId);
    setSelectedExam(exam);
    setConversationHistory([]);
    setCurrentMainQuestion(1);
    setFollowupCount(0);
    followupCountRef.current = 0;
    currentMainQuestionRef.current = 1;
    setUserResponses({});
    setFinalScore(null);
    setFinalFeedback("");
  };

  // Handler to replay audio from start
  const handleReplayAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0; // Reset to beginning
      audioRef.current.play()
        .then(() => setIsAudioPlaying(true))
        .catch(err => console.error("Replay failed:", err));
    }
  };

  // Handler to toggle pause/play
  const toggleAudioPlayback = () => {
    if (audioRef.current) {
      if (isAudioPlaying) {
        audioRef.current.pause();
        setIsAudioPlaying(false);
      } else {
        audioRef.current.play()
          .then(() => setIsAudioPlaying(true))
          .catch(err => console.error("Play failed:", err));
      }
    }
  };

  // Auto-play latest AI audio using hidden <audio>
  useEffect(() => {
    const latestAIMessage = conversationHistory
      .filter((msg) => msg.role === "ai" && msg.audio)
      .slice(-1)[0];
    if (latestAIMessage && latestAIMessage.id !== lastPlayedAudioId && audioRef.current) {
      audioRef.current.src = latestAIMessage.audio;
      audioRef.current
        .play()
        .then(() => {
          setLastPlayedAudioId(latestAIMessage.id);
          setIsAudioPlaying(true);
        })
        .catch((err) => console.warn("Auto-play failed:", err));
    }
  }, [conversationHistory, lastPlayedAudioId]);

  // Fetch DB question from TCFSpeaking given mainQuestion number (1, 2, or 3)
  const fetchDBQuestion = async (mainQNumber) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_ENDPOINT}/api/initial-question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: selectedExam.topic, questionNumber: mainQNumber }),
      });
      const data = await res.json();
      if (
        data.question &&
        data.audio &&
        data.audio.data &&
        data.audio.data.length > 0 &&
        data.audio.data[0].url
      ) {
        const audioUrl = data.audio.data[0].url;
        const aiMessage = {
          id: Date.now(),
          role: "ai",
          text: data.question,
          audio: audioUrl,
        };
        setConversationHistory((prev) => [...prev, aiMessage]);
      }
    } catch (err) {
      console.error("Error fetching DB question:", err);
    }
    setIsLoading(false);
  };

  // Scoring function
  const calculateScore = async (userResponses, conversationHistory) => {
    try {

      // Extract AI responses from the conversation history
      const aiResponses = conversationHistory
      .filter((msg) => msg.role === "ai")
      .map((msg) => msg.text)
      .join("\n");
      
      const response = await fetch(`${API_ENDPOINT}/api/calculate-speaking-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userResponses, topic: selectedExam.topic, aiResponses }),
      });
      const data = await response.json();
      return data.score;
    } catch (error) {
      console.error("Error calculating speaking score:", error);
      return null;
    }
  };

  // Generate final feedback
  const generateFinalFeedback = async (userResponses, conversationHistory) => {
    // Extract AI responses from conversationHistory
    const aiResponses = conversationHistory
      .filter(msg => msg.role === "ai")
      .map(msg => msg.text)
      .join("\n");
  
    try {
      const response = await fetch(`${API_ENDPOINT}/api/generate-speaking-final-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userResponses, topic: selectedExam.topic, aiResponses }),
      });
      const data = await response.json();
      return data.feedback;
    } catch (error) {
      console.error("Error generating final feedback:", error);
      return null;
    }
  };
  
  // Start Conversation Screen (before any conversation)
  if (selectedExam && conversationHistory.length === 0) {
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
          <div className="mb-3 text-start">
            <button
              className="btn"
              style={{
                backgroundColor: frenchBlue,
                color: frenchWhite,
                marginRight: "1rem",
              }}
              onClick={() => setSelectedExam(null)}
            >
              Back to Exam Selection
            </button>
          </div>
  
          <h2 className="text-center mb-4" style={{ fontWeight: "700", color: frenchBlue }}>
            🎙 Frenchify - Speak & Learn
          </h2>
  
          <h4 className="text-center mb-4" style={{ color: frenchRed }}>
            Topic: {selectedExam.topic}
          </h4>
  
          {isLoading && (
            <div className="text-center my-3">
              <LoadingSpinner />
            </div>
          )}
  
          <div className="text-center mb-4">
            {/* For Q1 (DB question) */}
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
              onClick={() => {
                setFollowupCount(0);
                followupCountRef.current = 0;
                currentMainQuestionRef.current = 1
                fetchDBQuestion(1); // Q1 from DB
              }}
            >
              Start Conversation
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Start & stop recording
  const startRecording = () => setRecording(true);
  const stopRecording = () => setRecording(false);

  // onStop: Transcribe + AI follow-up
  const onStop = async (recordedBlob) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", recordedBlob.blob);

      // Ensure the speech is recognized in French
      const speechResponse = await fetch(`${API_ENDPOINT}/api/speech-to-text`, {
        method: "POST",
        body: formData,
      });
      const data = await speechResponse.json();

      if (data.text) {
        // Save user's response for current overall question
        setUserResponses((prev) => ({
          ...prev,
          [overallQuestionIndex]: data.text,
        }));

        // Add user's message to conversation
        const userMessage = {
          id: Date.now(),
          role: "user",
          text: data.text,
          audio: null,
        };
        setConversationHistory((prev) => [...prev, userMessage]);

        console.log("#rp: followupCount before processing AI follow-up:", followupCountRef.current);
        console.log("#rp: current DB question no: ", currentMainQuestionRef.current);
        // If less than 2 AI follow-ups for the current DB question, generate the next AI follow-up
        if (followupCountRef.current < 2) {
          const aiResponseRes = await fetch(`${API_ENDPOINT}/api/ai-response-to-speech`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: data.text,
              topic: selectedExam.topic,
              questionNumber: currentMainQuestion,
              followupCount: followupCountRef.current,
            }),
          });
          const aiData = await aiResponseRes.json();
          if (
            aiData.response &&
            aiData.audio &&
            aiData.audio.data &&
            aiData.audio.data.length > 0 &&
            aiData.audio.data[0].url
          ) {
            const audioUrl = aiData.audio.data[0].url;
            const aiMessage = {
              id: Date.now() + 1,
              role: "ai",
              text: aiData.response,
              audio: audioUrl,
            };
            setConversationHistory((prev) => [...prev, aiMessage]);

            // Increment the ref value and also update state for re-rendering
            followupCountRef.current = followupCountRef.current + 1;
            setFollowupCount(followupCountRef.current);
            console.log("Updated followupCount to:", followupCountRef.current);
          } else {
            setConversationHistory((prev) => [
              ...prev,
              { id: Date.now(), role: "ai", text: "Je n'ai pas compris.", audio: null },
            ]);
          }
        } 
        // If followupCount is already 2, then auto-fetch the next DB question
        else if (followupCountRef.current === 2 && currentMainQuestionRef.current < 3) {
          currentMainQuestionRef.current = currentMainQuestionRef.current + 1;
          console.log("Auto-fetching next DB question: mainQuestion", currentMainQuestionRef.current);
          setIsLoading(true);
          try {
            const nextRes = await fetch(`${API_ENDPOINT}/api/initial-question`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ topic: selectedExam.topic, questionNumber: currentMainQuestionRef.current }),
            });
            const nextData = await nextRes.json();
            if (
              nextData.question &&
              nextData.audio &&
              nextData.audio.data &&
              nextData.audio.data.length > 0 &&
              nextData.audio.data[0].url
            ) {
              const audioUrl = nextData.audio.data[0].url;
              const aiMessage = {
                id: Date.now() + 2,
                role: "ai",
                text: nextData.question,
                audio: audioUrl,
              };
              setConversationHistory((prev) => [...prev, aiMessage]);
              setCurrentMainQuestion(currentMainQuestionRef.current);
              console.log()
              followupCountRef.current = 0;
              setFollowupCount(0);
              console.log("New main question set:", currentMainQuestionRef.current);
            }
          } catch (err) {
            console.error("Error fetching next question automatically:", err);
          }
          setIsLoading(false);
        }
      } else {
        setConversationHistory((prev) => [
          ...prev,
          { id: Date.now(), role: "ai", text: "Audio non compris.", audio: null },
        ]);
      }
    } catch (error) {
      console.error("Error processing speech:", error);
      setConversationHistory((prev) => [
        ...prev,
        { id: Date.now(), role: "ai", text: "Erreur dans le traitement.", audio: null },
      ]);
    }
    setIsLoading(false);
  };

  // handleFinishTest: When currentMainQuestion === 3 and followupCount === 2 (Q9 reached)
  const handleFinishTest = async () => {
    setIsLoading(true);
    const score = await calculateScore(userResponses, conversationHistory);
    const finalFeedbackApi = await generateFinalFeedback(userResponses, conversationHistory);
    setFinalScore(score);
    setFinalFeedback("Final Feedback: " + finalFeedbackApi);
    setIsLoading(false);

    // Save user score to database: TODO Mandar/Rachna
    
  };

  // If no exam selected, show exam selection screen
  if (!selectedExam) {
    return (
      <div className="container my-5">
        <h2 className="mb-5 text-center" style={{ color: frenchRed }}>
          Select a TCF Speaking Exam
        </h2>
        <div className="row">
          {allExams && allExams.length > 0 ? (
            allExams.map((exam) => (
              <div key={exam.id} className="col-md-4 mb-4">
                <div
                  className="card h-100 shadow"
                  style={{
                    cursor: "pointer",
                    transition: "transform 0.2s",
                  }}
                  onClick={() => handleExamSelection(exam.id)}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <img
                    src={getExamImage(exam.topic)}
                    className="card-img-top"
                    alt="Speaking Exam"
                    style={{ height: "200px", objectFit: "cover" }}
                  />
                  <div className="card-body">
                    <h4 className="card-title">{exam.topic}</h4>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center">No speaking exams available</p>
          )}
        </div>
      </div>
    );
  }

  // If conversation hasn't started yet, show Start Conversation screen
  if (selectedExam && conversationHistory.length === 0) {
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
          <div className="mb-3 text-start">
            <button
              className="btn"
              style={{
                backgroundColor: frenchBlue,
                color: frenchWhite,
                marginRight: "1rem",
              }}
              onClick={() => setSelectedExam(null)}
            >
              Back to Exam Selection
            </button>
          </div>
  
          <h2 className="text-center mb-4" style={{ fontWeight: "700", color: frenchBlue }}>
            🎙 Frenchify - Speak & Learn
          </h2>
  
          <h4 className="text-center mb-4" style={{ color: frenchRed }}>
            Topic: {selectedExam.topic}
          </h4>
  
          {isLoading && (
            <div className="text-center my-3">
              <LoadingSpinner />
            </div>
          )}
  
          <div className="text-center mb-4">
            {/* For Q1 (DB question) */}
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
              onClick={() => {
                setFollowupCount(0);
                followupCountRef.current = 0;
                currentMainQuestionRef.current = 1;
                fetchDBQuestion(1); // Q1 from DB
              }}
            >
              Start Conversation
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main conversation UI
  return (
    <div className="container my-5">
      {isLoading && <LoadingSpinner />}
  
      <div className="mb-4">
        <button
          className="btn"
          style={{
            backgroundColor: frenchBlue,
            color: frenchWhite,
            marginRight: "1rem",
          }}
          onClick={() => setSelectedExam(null)}
        >
          Back to Exam Selection
        </button>
      </div>
      <h2 className="text-center mb-4" style={{ color: frenchBlue }}>
        Speaking Exam: {selectedExam.topic}
      </h2>
  
      <TalkingHead audioRef={audioRef} />
      <div className="chat-container mb-4" style={{ maxHeight: "300px", overflowY: "auto" }}>
        {conversationHistory.length > 0 &&
          conversationHistory
            .slice()
            .reverse()
            .map((msg) => (
              <div
                key={msg.id}
                className="card mb-3"
                style={{
                  backgroundColor: msg.role === "user" ? "#e6f7ff" : "#f1f1f1",
                  border: msg.role === "user" ? `2px solid ${frenchBlue}` : "1px solid #ccc",
                  padding: "1rem",
                }}
              >
                <h5 style={{ color: msg.role === "user" ? frenchBlue : frenchRed }}>
                  {msg.role === "user" ? "🗣 You said:" : "🤖 AI Response:"}
                </h5>
                <p>{msg.text}</p>
              </div>
            ))}
      </div>
  
      <div className="text-center my-4">
        <button
          className="btn me-2"
          style={{
            backgroundColor: frenchBlue,
            color: frenchWhite,
            padding: "0.75rem 1.5rem",
            fontSize: "1.1rem",
            borderRadius: "0.3rem",
          }}
          onClick={startRecording}
          disabled={recording}
        >
          Start Recording
        </button>
        <button
          className="btn me-2"
          style={{
            backgroundColor: frenchRed,
            color: frenchWhite,
            padding: "0.75rem 1.5rem",
            fontSize: "1.1rem",
            borderRadius: "0.3rem",
          }}
          onClick={stopRecording}
          disabled={!recording}
        >
          Stop Recording
        </button>
        {/* Replay and Pause buttons */}
        <button
          className="btn me-2"
          title="Replay audio"
          onClick={handleReplayAudio}
          style={{ backgroundColor: "transparent", border: "none" }}
        >
          <FaRedo size={24} color={frenchBlue} />
        </button>
        <button
          className="btn me-2"
          onClick={toggleAudioPlayback}
          style={{ backgroundColor: "transparent", border: "none" }}
        >
          {isAudioPlaying ? (
            <FaPause size={24} color={frenchRed} />
          ) : (
            <FaPlay size={24} color={frenchBlue} />
          )}
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
  
      {/* Finish Test Button: when on Q3 DB and 2 follow-ups done (i.e., Q9 reached) */}
      {currentMainQuestion === 3 && followupCount === 2 && finalScore === null && (
        <div className="text-center my-4">
          <button
            className="btn"
            style={{
              backgroundColor: frenchRed,
              color: frenchWhite,
              padding: "0.5rem 1rem",
              fontSize: "1rem",
              borderRadius: "0.3rem",
            }}
            onClick={handleFinishTest}
          >
            Finish Test & See Results
          </button>
        </div>
      )}
  
      {finalScore !== null && (
        <div className="container my-5">
          <h2 className="text-center mb-4" style={{ color: frenchBlue }}>
            Test Completed!
          </h2>
          <h4 className="text-center mb-4" style={{ color: frenchRed }}>
            Final Score: {finalScore}/10
          </h4>
          <div className="card p-4">
            <h5>Feedback Summary:</h5>
            <p>{finalFeedback}</p>
          </div>
          <div className="text-center mt-4">
            <button
              className="btn"
              style={{ backgroundColor: frenchBlue, color: frenchWhite }}
              onClick={() => window.location.reload()}
            >
              Restart Test
            </button>
          </div>
        </div>
      )}
  
      <audio ref={audioRef} style={{ display: "none" }} />
    </div>
  );
};

export default SpeakingMock;

