import React, { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import LoadingSpinner from "./LoadingSpinner";

const frenchBlue = "#0055A4";
const frenchRed = "#EF4135";
const frenchWhite = "#FFFFFF";

const ListeningTraining = () => {
  const [allExams, setAllExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [mode, setMode] = useState(null); // "practice" or "mock"
  const [showModeModal, setShowModeModal] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isExamListLoading, setIsExamListLoading] = useState(true);
  const [questionData, setQuestionData] = useState(null);
  const [finalScore, setFinalScore] = useState(null);
  const [audioError, setAudioError] = useState("");
  const [countdown, setCountdown] = useState(15);

  const audioRef = useRef(null);

  const GRAPHQL_ENDPOINT = `${process.env.REACT_APP_API_URL || "http://localhost:4000"}/graphql`;
  const API_ENDPOINT = process.env.REACT_APP_API_URL || "http://localhost:4000";

  // Fetch listening exams via GraphQL
  useEffect(() => {
    const fetchExams = async () => {
      setIsExamListLoading(true);
      try {
        const res = await fetch(GRAPHQL_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              query GetTCFListeningTrainings {
                tcfListeningtrainings {
                  id
                  title
                  difficulty
                  questions {
                    audioText
                    questionText
                    options
                    correctAnswer
                  }
                }
              }
            `,
          }),
        });
        const result = await res.json();
        setAllExams(result.data.tcfListeningtrainings);
      } catch (error) {
        console.error("Error fetching listening exams:", error);
      } finally {
        setIsExamListLoading(false);
      }
    };
    fetchExams();
  }, []);

  // Handle exam selection – open modal for mode selection
  const handleExamSelection = (examId) => {
    const exam = allExams.find((e) => e.id === examId);
    setSelectedExam(exam);
    setShowModeModal(true);
  };

  // When user picks a mode, close the modal and start with question 0
  const handleModeSelect = (selectedMode) => {
    setMode(selectedMode);
    setShowModeModal(false);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setFinalScore(null);
    fetchQuestion(selectedExam.id, 0);
  };

  // Fetch question audio (and other info) using backend endpoint
  const fetchQuestion = async (examId, questionIndex) => {
    setIsLoading(true);
    setAudioError("");
    // If in mock mode, reset countdown for every new question
    if (mode === "mock") setCountdown(15);
    try {
      const res = await fetch(`${API_ENDPOINT}/api/listening-question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId, questionIndex }),
      });
      const data = await res.json();
      setQuestionData(data);
      if (data.audio && audioRef.current) {
        // Check if the audio is directly a string or in the nested format
        const audioUrl =
          typeof data.audio === "string"
            ? data.audio
            : data.audio?.data && data.audio.data.length > 0
            ? data.audio.data[0].url
            : "";
        if (audioUrl) {
          audioRef.current.src = audioUrl;
          audioRef.current.load();
          audioRef.current.play().catch((err) => {
            console.warn("Audio play error:", err);
            setAudioError("Unable to play audio. Please try again later.");
          });
        } else {
          setAudioError("Audio not available.");
        }
      }
    } catch (error) {
      console.error("Error fetching question:", error);
      setAudioError("Error fetching audio.");
    }
    setIsLoading(false);
  };

  // Handle answer selection
  const handleAnswerSelect = (option) => {
    setUserAnswers((prev) => ({ ...prev, [currentQuestionIndex]: option }));
  };

  // Proceed to next question (or finish test)
  const handleNextQuestion = () => {
    if (currentQuestionIndex < selectedExam.questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      fetchQuestion(selectedExam.id, nextIndex);
    } else {
      // Calculate score based on correct answers
      let score = 0;
      selectedExam.questions.forEach((q, index) => {
        if (userAnswers[index] === q.correctAnswer) {
          score += 1;
        }
      });
      // Scale score to 10 (adjust as needed)
      const final = Math.round((score / selectedExam.questions.length) * 10);
      setFinalScore(final);
    }
  };

  // In practice mode, allow user to relisten the audio
  const handleRelisten = () => {
    if (audioRef.current) {
      audioRef.current.play().catch((err) => {
        console.warn("Relisten error:", err);
        setAudioError("Unable to play audio. Please try again later.");
      });
    }
  };

  const handleRestart = () => {
    window.location.reload();
  };

  // Countdown timer effect - only active in mock mode
  useEffect(() => {
    if (mode !== "mock") return;
    // Set countdown to 15 seconds at start of each question
    setCountdown(15);
    const timer = setInterval(() => {
      setCountdown((prevCount) => {
        if (prevCount <= 1) {
          clearInterval(timer);
          handleNextQuestion();
          return 15; // reset for next question (if any)
        }
        return prevCount - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentQuestionIndex, mode]);


  if (isExamListLoading) {
    return <LoadingSpinner />;
  }

  // Exam selection screen
  if (!selectedExam) {
    return (
      <div className="container my-5">
        <h2 className="mb-5 text-center" style={{ color: frenchRed }}>
          Select a TCF Listening Exam
        </h2>
        <div className="row">
          {allExams && allExams.length > 0 ? (
            allExams.map((exam) => (
              <div key={exam.id} className="col-md-4 mb-4">
                <div
                  className="card h-100 shadow"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleExamSelection(exam.id)}
                >
                  <div className="card-body">
                    <h4 className="card-title">{exam.title}</h4>
                    <p>Difficulty: {exam.difficulty}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center">No listening exams available</p>
          )}
        </div>
      </div>
    );
  }

  // Modal for mode selection (Practice vs. Mock Test)
  const renderModeModal = () => (
    <div
      className="modal show"
      style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
      tabIndex="-1"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header" style={{ backgroundColor: frenchBlue, color: frenchWhite }}>
            <h5 className="modal-title">Select Mode</h5>
          </div>
          <div className="modal-body">
            <p>Please choose your exam mode:</p>
            <div className="d-flex justify-content-around">
              <button className="btn btn-primary" onClick={() => handleModeSelect("practice")}>
                Practice
              </button>
              <button className="btn btn-danger" onClick={() => handleModeSelect("mock")}>
                Mock Test
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Test completion screen
  if (finalScore !== null) {
    return (
      <div className="container my-5">
        <h2 className="text-center mb-4" style={{ color: frenchBlue }}>
          Test Completed!
        </h2>
        <h4 className="text-center mb-4" style={{ color: frenchRed }}>
          Final Score: {finalScore}/10
        </h4>
        <div className="text-center">
          <button
            className="btn"
            style={{ backgroundColor: frenchBlue, color: frenchWhite }}
            onClick={handleRestart}
          >
            Restart Test
          </button>
        </div>
      </div>
    );
  }

  // Main Listening Test UI
  return (
    <div className="container my-5">
      {showModeModal && renderModeModal()}
      {isLoading && <LoadingSpinner />}
      <div className="mb-4">
        <button
          className="btn"
          style={{ backgroundColor: frenchBlue, color: frenchWhite }}
          onClick={() => setSelectedExam(null)}
        >
          Back to Exam Selection
        </button>
      </div>
      <h2 className="text-center mb-4" style={{ color: frenchBlue }}>
        Listening Exam: {selectedExam.title} ({mode === "practice" ? "Practice" : "Mock Test"})
      </h2>
      {mode === "mock" && (
        <div className="text-center mb-3">
          <span style={{ fontWeight: "bold" }}>Time Remaining: {countdown} s</span>
        </div>
      )}
      <div className="card p-4 mb-4">
        <h5>
          Question {currentQuestionIndex + 1} of {selectedExam.questions.length}
        </h5>
        {questionData && (
          <>
            <p>{questionData.questionText}</p>
            {audioError && (
              <div className="alert alert-danger" role="alert">
                {audioError}
              </div>
            )}
            <div>
              {questionData.options &&
                questionData.options.map((option, idx) => (
                  <div key={idx} className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="option"
                      id={`option${idx}`}
                      onChange={() => handleAnswerSelect(option)}
                      checked={userAnswers[currentQuestionIndex] === option}
                    />
                    <label className="form-check-label" htmlFor={`option${idx}`}>
                      {option}
                    </label>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
      <div className="text-center mb-3">
        {mode === "practice" && (
          <button
            className="btn me-2"
            style={{ backgroundColor: frenchBlue, color: frenchWhite }}
            onClick={handleRelisten}
          >
            Relisten
          </button>
        )}
        <button
          className="btn"
          style={{ backgroundColor: frenchRed, color: frenchWhite }}
          onClick={handleNextQuestion}
        >
          {currentQuestionIndex < selectedExam.questions.length - 1 ? "Next Question" : "Finish Test"}
        </button>
      </div>
      <audio ref={audioRef} style={{ display: "none" }} onError={() => setAudioError("Audio failed to load.")} />
    </div>
  );
};

export default ListeningTraining;
