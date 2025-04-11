import React, { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { Clock, Eye, CheckCircle, Circle } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";
import { useAuth } from "../context/AuthContext";


// French color palette
const frenchBlue = "#0055A4";
const frenchRed = "#EF4135";
const frenchWhite = "#FFFFFF";

const GRAPHQL_ENDPOINT = `${process.env.REACT_APP_API_URL || "http://localhost:4000"}/graphql`;
const API_ENDPOINT = process.env.REACT_APP_API_URL || "http://localhost:4000";

// (Optionally, if you have an auth context, import it here)
// import { useAuth } from "../context/AuthContext";

const ListeningMock = () => {
  // Exam list and exam selection
  const [examList, setExamList] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);

  // Mode and modal control
  const [mode, setMode] = useState(null); // "practice" or "mock"
  const [showModeModal, setShowModeModal] = useState(true);

  // Passage navigation state (each passage will show all its questions)
  const [currentPassageIndex, setCurrentPassageIndex] = useState(0);

  // Score, answer tracking, and visit tracking
  const [userAnswers, setUserAnswers] = useState({}); // Keys: "passageIndex-questionIndex"
  const [visitedQuestions, setVisitedQuestions] = useState({});
  const [liveScore, setLiveScore] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [score, setScore] = useState(0);

  // Timer state (per passage in mock mode)
  const [timer, setTimer] = useState(90); // 90 seconds per passage
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  // Audio states
  const [audioUrl, setAudioUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [audioError, setAudioError] = useState("");
  const audioRef = useRef(null);

  // (Optional) If you are using an authentication context, you might need the user information:
  const { user } = useAuth();

  // -------------------------
  // Fetch Listening Exams
  // -------------------------
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await fetch(GRAPHQL_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              query GetTCFListenings {
                tcfListenings {
                  id
                  title
                  difficulty
                  passages {
                    passageText
                    questions {
                      questionText
                      options
                      correctAnswer
                    }
                  }
                }
              }
            `
          })
        });
        const result = await res.json();
        if (result.data && result.data.tcfListenings) {
          setExamList(result.data.tcfListenings);
        }
      } catch (err) {
        console.error("Error fetching listening exams:", err);
      }
    };
    fetchExams();
  }, []);

  // -------------------------
  // Timer effect for mock mode
  // -------------------------
  useEffect(() => {
    if (mode !== "mock" || isAudioPlaying || !audioReady) return;
    if (timer === 0) {
      handleSubmitExam();
      return;
    }
    const countdown = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(countdown);
  }, [timer, mode, isAudioPlaying, audioReady]);

  // -------------------------
  // Audio Handling
  // -------------------------
  const fetchPassageAudio = async (passageIdx) => {
    if (!selectedExam) return;
    setIsLoading(true);
    setAudioError("");
    setAudioReady(false);
    try {
      const response = await fetch(`${API_ENDPOINT}/api/mock-listening-question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: selectedExam.id,
          passageIndex: passageIdx,
          questionIndex: 0
        }),
      });
      const data = await response.json();
      if (data.error) {
        console.error("API Error:", data.error);
        setAudioError(data.error);
      } else {
        const fetchedAudioUrl =
          typeof data.audio === "string"
            ? data.audio
            : data.audio?.data && data.audio.data.length > 0
            ? data.audio.data[0].url
            : "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
        setAudioUrl(fetchedAudioUrl);
        if (fetchedAudioUrl && audioRef.current) {
          audioRef.current.src = fetchedAudioUrl;
          audioRef.current.load();
        }
      }
    } catch (err) {
      console.error("Error fetching audio:", err);
      setAudioError("Error fetching audio.");
    }
    setIsLoading(false);
  };

  // -------------------------
  // Mode Selection
  // -------------------------
  const handleModeSelect = async (selectedMode) => {
    setMode(selectedMode);
    setShowModeModal(false);
    if (selectedExam) {
      await fetchPassageAudio(0);
    }
  };

  // Auto-play audio on load for both mock and practice modes
  const handleAudioLoaded = () => {
    if (audioRef.current) {
      audioRef.current
        .play()
        .then(() => {
          setIsAudioPlaying(true);
          setAudioReady(true);
        })
        .catch((err) => console.error("Audio play error:", err));
    }
  };

  const handleAudioEnded = () => {
    if (mode === "mock") {
      setIsAudioPlaying(false);
      // Timer will now start because audioReady remains true.
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play().catch((err) => {
          console.warn("Audio play error:", err);
          setAudioError("Unable to play audio.");
        });
      } else {
        audioRef.current.pause();
      }
    }
  };

  // -------------------------
  // Answer and Visit Tracking
  // -------------------------
  useEffect(() => {
    if (!selectedExam) return;
    const currentPassage = selectedExam.passages[currentPassageIndex];
    currentPassage.questions.forEach((_, qIdx) => {
      const key = `${currentPassageIndex}-${qIdx}`;
      setVisitedQuestions((prev) => ({ ...prev, [key]: true }));
    });
  }, [currentPassageIndex, selectedExam]);

  // Calculate live score
  useEffect(() => {
    if (!selectedExam) return;
    let calculatedScore = 0;
    selectedExam.passages.forEach((passage, pIndex) => {
      passage.questions.forEach((question, qIndex) => {
        const key = `${pIndex}-${qIndex}`;
        if (userAnswers[key] === question.correctAnswer) {
          calculatedScore++;
        }
      });
    });
    setLiveScore(calculatedScore);
  }, [userAnswers, selectedExam]);

  // -------------------------
  // Passage Navigation and Submission
  // -------------------------
  const handleNextPassage = async () => {
    if (!selectedExam) return;
    if (currentPassageIndex < selectedExam.passages.length - 1) {
      const newPassageIndex = currentPassageIndex + 1;
      setCurrentPassageIndex(newPassageIndex);
      setTimer(90);
      await fetchPassageAudio(newPassageIndex);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Last passage: submit exam
      handleSubmitExam();
    }
  };

  const handlePreviousPassage = () => {
    if (currentPassageIndex > 0) {
      setCurrentPassageIndex(currentPassageIndex - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Submit exam and save the test score to the database
  const handleSubmitExam = async () => {
    let calculatedScore = 0;
    selectedExam.passages.forEach((passage, pIndex) => {
      passage.questions.forEach((question, qIndex) => {
        const key = `${pIndex}-${qIndex}`;
        if (userAnswers[key] === question.correctAnswer) {
          calculatedScore++;
        }
      });
    });
    setScore(calculatedScore);

    // Build mutation payload to save the score.
    const mutation = `
      mutation SubmitTestScore($input: TestScoreInput!) {
        submitTestScore(input: $input) {
          id
          userId
          testModelName
          testId
          score
          createdAt
        }
      }
    `;
    const variables = {
      input: {
        // If you have a user context, include the user id here.
        // For example, user.id, otherwise supply a test ID.
        userId: user.id, 
        testModelName: "TcfListening",
        testId: selectedExam.id,
        score: calculatedScore,
      },
    };

    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: mutation, variables }),
      });
      const result = await response.json();
      if (result.errors) {
        console.error("GraphQL errors:", result.errors);
      } else {
        console.log("Test score submitted successfully:", result.data.submitTestScore);
      }
    } catch (error) {
      console.error("Error submitting test score:", error);
    }
    setShowSummary(true);
  };

  // -------------------------
  // Left Navigation: Scroll to Question
  // -------------------------
  const scrollToQuestion = (pIdx, qIdx) => {
    const element = document.getElementById(`question-${pIdx}-${qIdx}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // -------------------------
  // Exam Selection UI
  // -------------------------
  if (!selectedExam) {
    return (
      <div className="container my-5">
        <h2 className="mb-5 text-center" style={{ color: frenchRed }}>
          Select a TCF Listening Exam
        </h2>
        <div className="row">
          {examList.map((exam) => (
            <div key={exam.id} className="col-md-4 mb-4">
              <div
                className="card h-100 shadow"
                style={{
                  cursor: "pointer",
                  transition: "transform 0.2s",
                  border: `2px solid ${frenchBlue}`
                }}
                onClick={() => setSelectedExam(exam)}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <div className="card-body">
                  <h4 className="card-title">{exam.title}</h4>
                  <p className="card-text">Difficulty: {exam.difficulty}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // -------------------------
  // Compute Total Questions for Navigation
  // -------------------------
  const totalQuestions = selectedExam.passages.reduce(
    (acc, passage) => acc + passage.questions.length,
    0
  );
  let questionsBeforeCurrentPassage = 0;
  for (let i = 0; i < currentPassageIndex; i++) {
    questionsBeforeCurrentPassage += selectedExam.passages[i].questions.length;
  }
  const currentPassage = selectedExam.passages[currentPassageIndex];

  // -------------------------
  // Mode Selection Modal
  // -------------------------
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

  // ---------------------------------------------------------------------------
  // Main Content Display: All Questions in Current Passage
  // ---------------------------------------------------------------------------
  return (
    <div className="container-fluid p-4">
      {/* Header with exam title and timer (for mock mode) */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>{selectedExam.title} - Listening Test</h2>
        {mode === "mock" && (
          <div className="d-flex align-items-center">
            <Clock className="me-2" size={28} />
            <span className="fw-bold" style={{ color: timer <= 10 ? frenchRed : frenchBlue }}>
              {timer}s
            </span>
          </div>
        )}
      </div>

      <div className="row">
        {/* Left Navigation Panel */}
        <div className="col-lg-3 mb-4">
          <button
            className="btn btn-outline-danger w-100 mb-3"
            onClick={() => {
              // Reset exam selection and states
              setSelectedExam(null);
              setMode(null);
              setShowModeModal(true);
              setUserAnswers({});
              setVisitedQuestions({});
              setScore(0);
              setLiveScore(0);
              setTimer(90);
            }}
          >
            Back to Exams
          </button>
          <div className="card shadow">
            <div className="card-header" style={{ backgroundColor: frenchBlue, color: frenchWhite }}>
              <strong>Exam Navigation</strong>
            </div>
            <div className="card-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <div className="mb-3">
                <strong>Live Score:</strong> {liveScore}/{totalQuestions}
              </div>
              {selectedExam.passages.map((passage, pIdx) => (
                <div key={pIdx} className="mb-4">
                  <h6 className="mb-2">Passage {pIdx + 1}</h6>
                  <ul className="list-group">
                    {passage.questions.map((q, qIdx) => {
                      const questionNumber = selectedExam.passages
                        .slice(0, pIdx)
                        .reduce((acc, p) => acc + p.questions.length, 0) + qIdx + 1;
                      const key = `${pIdx}-${qIdx}`;
                      return (
                        <li
                          key={qIdx}
                          className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                          style={{ cursor: "pointer" }}
                          onClick={() => scrollToQuestion(pIdx, qIdx)}
                        >
                          <span>Q{questionNumber}</span>
                          <span>
                            {!visitedQuestions[key] ? (
                              <Circle size={20} className="text-muted" title="Unvisited" />
                            ) : userAnswers[key] ? (
                              <CheckCircle size={20} style={{ color: frenchBlue }} title="Answered" />
                            ) : (
                              <Eye size={20} style={{ color: frenchRed }} title="Visited (Unanswered)" />
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Main Content: All Questions for Current Passage */}
        <div className="col-lg-9">
          <div className="card shadow-lg mb-4">
            <div className="card-header" style={{ backgroundColor: frenchRed, color: frenchWhite }}>
              <h5 className="mb-0">
                {selectedExam.title} - {selectedExam.difficulty}
              </h5>
            </div>
            <div className="card-body">
              {mode !== "mock" && (
                <div className="mb-3">
                  <h6>Passage {currentPassageIndex + 1}</h6>
                  <p style={{ fontStyle: "italic" }}>{currentPassage.passageText}</p>
                </div>
              )}
            </div>
          </div>

          {!showSummary ? (
            <>
              <div className="card shadow p-4 mb-4">
                <div className="card-header">
                  <h5 className="mb-0">Questions for Passage {currentPassageIndex + 1}</h5>
                </div>
                <div className="card-body">
                  {currentPassage.questions.map((question, qIdx) => {
                    const key = `${currentPassageIndex}-${qIdx}`;
                    const selectedOption = userAnswers[key];
                    const globalQuestionNumber = questionsBeforeCurrentPassage + qIdx + 1;
                    return (
                      <div key={qIdx} id={`question-${currentPassageIndex}-${qIdx}`} className="mb-4 border-bottom pb-3">
                        <p className="fs-5">
                          <strong>Question {globalQuestionNumber}:</strong> {question.questionText}
                        </p>
                        <div className="row">
                          {question.options.map((option, idx) => (
                            <div key={idx} className="col-6 mb-3">
                              <button
                                className="btn w-100"
                                style={{
                                  backgroundColor: selectedOption === option ? frenchBlue : "transparent",
                                  color: selectedOption === option ? frenchWhite : frenchBlue,
                                  border: `2px solid ${frenchBlue}`,
                                }}
                                onClick={() =>
                                  setUserAnswers({ ...userAnswers, [key]: option })
                                }
                              >
                                {option}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="d-flex justify-content-between mb-4">
                {currentPassageIndex > 0 && (
                  <button className="btn btn-outline-danger" onClick={handlePreviousPassage}>
                    Previous Passage
                  </button>
                )}
                {currentPassageIndex < selectedExam.passages.length - 1 ? (
                  <button
                    className="btn"
                    style={{ backgroundColor: frenchBlue, color: frenchWhite, border: "none" }}
                    onClick={handleNextPassage}
                  >
                    Next Passage
                  </button>
                ) : (
                  <button
                    className="btn"
                    style={{ backgroundColor: frenchRed, color: frenchWhite, border: "none" }}
                    onClick={handleSubmitExam}
                  >
                    Submit Test
                  </button>
                )}
              </div>

              {/* Audio Controls */}
              <div className="mb-4 text-center">
                {mode === "practice" && (
                  <button
                    className="btn me-2"
                    style={{ backgroundColor: frenchBlue, color: frenchWhite }}
                    onClick={handlePlayPause}
                  >
                    Play / Pause Audio
                  </button>
                )}
              </div>

              {/* Audio Element */}
              <audio
                ref={audioRef}
                autoPlay={mode === "mock"}
                onLoadedData={handleAudioLoaded}
                onEnded={handleAudioEnded}
                style={{
                  display: "block",
                  width: "100%",
                  visibility: mode === "practice" ? "visible" : "hidden",
                }}
                controls={mode === "practice"}
                onError={() => setAudioError("Audio failed to load.")}
              />
            </>
          ) : (
            <div className="alert shadow p-4" style={{ backgroundColor: "#f8f9fa" }}>
              <h3 className="text-center" style={{ color: frenchRed }}>Test Completed!</h3>
              <p className="text-center fs-4">
                Your Final Score: {score} / {totalQuestions}
              </p>
              <hr />
              <h5>Review Your Answers</h5>
              {selectedExam.passages.map((passage, pIdx) => (
                <div key={pIdx} className="mt-3">
                  <h6>Passage {pIdx + 1}</h6>
                  {passage.questions.map((question, qIdx) => {
                    const key = `${pIdx}-${qIdx}`;
                    const userAnswer = userAnswers[key];
                    const isCorrect = userAnswer === question.correctAnswer;
                    const globalQuestionNumber =
                      selectedExam.passages
                        .slice(0, pIdx)
                        .reduce((acc, p) => acc + p.questions.length, 0) + qIdx + 1;
                    return (
                      <div key={qIdx} className="mt-2 p-2 border rounded">
                        <p className="mb-1">
                          <strong>Question {globalQuestionNumber}:</strong> {question.questionText}
                        </p>
                        {isCorrect ? (
                          <p className="mb-0" style={{ color: frenchBlue }}>
                            Your answer: {userAnswer} (Correct)
                          </p>
                        ) : (
                          <p className="mb-0" style={{ color: frenchRed }}>
                            Your answer: {userAnswer ?? "No answer selected"} (Incorrect)
                            <br />
                            Correct answer: {question.correctAnswer}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModeModal && renderModeModal()}
      {isLoading && <LoadingSpinner />}

      {audioError && (
        <div className="alert alert-danger mt-3" role="alert">
          {audioError}
        </div>
      )}
    </div>
  );
};

export default ListeningMock;