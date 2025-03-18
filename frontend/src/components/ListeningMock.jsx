import React, { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import LoadingSpinner from "./LoadingSpinner";

const frenchBlue = "#0055A4";
const frenchRed = "#EF4135";
const frenchWhite = "#FFFFFF";

const ListeningMock = () => {
  const [examList, setExamList] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [mode, setMode] = useState(null); // "practice" or "mock"
  const [showModeModal, setShowModeModal] = useState(true);
  const [currentPassageIndex, setCurrentPassageIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // keys: global question index (0-indexed)
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [timer, setTimer] = useState(90); // 90 seconds per passage in mock mode
  const [audioError, setAudioError] = useState("");
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioReady, setAudioReady] = useState(false); // audio is loaded and started
  const audioRef = useRef(null);

  // Fetch exam list from GraphQL
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await fetch("http://localhost:4000/graphql", {
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
                  totalQuestions
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
        console.error("Error fetching exam data:", err);
      }
    };
    fetchExams();
  }, []);

  // Timer effect for mock mode - start countdown only when audio is ready and not playing
  useEffect(() => {
    if (mode !== "mock" || isAudioPlaying || !audioReady) return;
    if (timer === 0) {
      handleNextPassage();
      setTimer(90);
      return;
    }
    const countdown = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(countdown);
  }, [timer, mode, currentPassageIndex, isAudioPlaying, audioReady]);

  // Fetch passage audio from API endpoint (using questionIndex: 0 to fetch passage TTS)
  const fetchPassageAudio = async (passageIdx) => {
    if (!selectedExam) return;
    setIsLoading(true);
    setAudioError("");
    setAudioReady(false); // reset audioReady when fetching new passage
    try {
      const response = await fetch("http://localhost:4000/api/mock-listening-question", {
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
            : "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"; // fallback URL
        setAudioUrl(fetchedAudioUrl);
        if (fetchedAudioUrl && audioRef.current) {
          audioRef.current.src = fetchedAudioUrl;
          audioRef.current.load();
          // Auto-play is triggered via onLoadedData below.
        }
      }
    } catch (err) {
      console.error("Error fetching passage audio:", err);
      setAudioError("Error fetching audio.");
    }
    setIsLoading(false);
  };

  // When a mode is selected, load the first passage audio.
  const handleModeSelect = async (selectedMode) => {
    setMode(selectedMode);
    setShowModeModal(false);
    if (selectedExam) {
      await fetchPassageAudio(0);
    }
  };

  // onLoadedData: when audio loads, try to auto-play and mark as playing (for mock mode)
  const handleAudioLoaded = () => {
    if (mode === "mock" && audioRef.current) {
      audioRef.current
        .play()
        .then(() => {
          setIsAudioPlaying(true);
          setAudioReady(true);
        })
        .catch((err) => console.error("Audio play error on loaded data:", err));
    }
  };

  // onEnded: when audio finishes in mock mode, mark it as ended so timer can start
  const handleAudioEnded = () => {
    if (mode === "mock") {
      setIsAudioPlaying(false);
      // Timer will now start because isAudioPlaying is false and audioReady remains true.
    }
  };

  // Handle answer selection for a question in the current passage.
  const handleAnswerSelect = (questionIndex, option) => {
    // Here, we want global numbering. Compute the base index from previous passages.
    const baseQuestionNumber = selectedExam.passages
      .slice(0, currentPassageIndex)
      .reduce((acc, passage) => acc + passage.questions.length, 0);
    const globalIndex = baseQuestionNumber + questionIndex;
    setUserAnswers((prev) => ({ ...prev, [globalIndex]: option }));
  };

  // Proceed to the next passage.
  const handleNextPassage = async () => {
    if (!selectedExam) return;
    if (currentPassageIndex < selectedExam.passages.length - 1) {
      const newPassageIndex = currentPassageIndex + 1;
      setCurrentPassageIndex(newPassageIndex);
      await fetchPassageAudio(newPassageIndex);
      if (mode === "mock") {
        setTimer(90);
      }
    } else {
      // End of exam: calculate and log score.
      let score = 0;
      let globalIndex = 0;
      selectedExam.passages.forEach((passage) => {
        passage.questions.forEach((q) => {
          if (userAnswers[globalIndex] === q.correctAnswer) {
            score += 1;
          }
          globalIndex++;
        });
      });
      console.log("Final Score:", score);
      alert("Test Completed! Check the console for your score.");
    }
  };

  // In Practice mode, allow the user to play/pause the audio.
  const handlePlayPause = () => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play().catch((err) => {
          console.warn("Audio play error:", err);
          setAudioError("Unable to play audio. Please try again later.");
        });
      } else {
        audioRef.current.pause();
      }
    }
  };

  // --- Exam Selection UI ---
  if (!selectedExam) {
    return (
      <div className="container my-5">
        <h2 className="mb-5 text-center" style={{ color: frenchRed }}>
          Select a TCF Listening Exam
        </h2>
        <div className="row">
          {examList && examList.length > 0 ? (
            examList.map((exam) => (
              <div key={exam.id} className="col-md-4 mb-4">
                <div
                  className="card h-100 shadow"
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedExam(exam)}
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
  // --- End Exam Selection UI ---

  // Modal for mode selection.
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

  const currentPassage = selectedExam.passages[currentPassageIndex];
  // Compute the base question number for the current passage.
  const baseQuestionNumber = selectedExam.passages
    .slice(0, currentPassageIndex)
    .reduce((acc, passage) => acc + passage.questions.length, 0);

  // Group questions into pairs (2 per row)
  const questionPairs = [];
  for (let i = 0; i < currentPassage.questions.length; i += 2) {
    questionPairs.push(currentPassage.questions.slice(i, i + 2));
  }

  return (
    <div className="container my-5">
      {showModeModal && renderModeModal()}
      {isLoading && <LoadingSpinner />}
      <div className="mb-4">
        <h2 className="text-center" style={{ color: frenchBlue }}>{selectedExam.title}</h2>
        <h4 className="text-center" style={{ color: frenchRed }}>
          Mode: {mode === "practice" ? "Practice" : "Mock Test"}
        </h4>
      </div>
      {mode === "mock" && (
        <div className="text-center mb-3">
          <span style={{ fontWeight: "bold", fontSize: "1.2rem" }}>
            Time Remaining: {timer} s
          </span>
        </div>
      )}
      {/* In practice mode, display passage text; in mock mode, hide it */}
      {mode !== "mock" && (
        <div className="card p-4 mb-4">
          <h5>
            Passage {currentPassageIndex + 1} of {selectedExam.passages.length}
          </h5>
          <p style={{ fontStyle: "italic" }}>Listening Passage:</p>
          <p>{currentPassage.passageText}</p>
        </div>
      )}
      <div className="card p-4 mb-4">
        <h5>Questions</h5>
        {questionPairs.map((pair, pairIndex) => (
          <div key={pairIndex} className="row mb-3">
            {pair.map((q, qIndex) => {
              const localIndex = pairIndex * 2 + qIndex;
              const globalIndex = baseQuestionNumber + localIndex; // 0-indexed global
              return (
                <div key={qIndex} className="col-md-6">
                  <div className="border p-2">
                    <p>
                      <strong>Question {globalIndex + 1}:</strong> {q.questionText}
                    </p>
                    {q.options.map((option, idx) => (
                      <div key={idx} className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name={`question-${globalIndex}`}
                          id={`question-${globalIndex}-option-${idx}`}
                          onChange={() => handleAnswerSelect(localIndex, option)}
                          checked={userAnswers[globalIndex] === option}
                        />
                        <label className="form-check-label" htmlFor={`question-${globalIndex}-option-${idx}`}>
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {mode === "practice" && (
        <div className="mb-3">
          <button
            className="btn me-2"
            style={{ backgroundColor: frenchBlue, color: frenchWhite }}
            onClick={handlePlayPause}
          >
            Play / Pause Audio
          </button>
        </div>
      )}
      <div className="text-center mb-3">
        <button
          className="btn"
          style={{ backgroundColor: frenchRed, color: frenchWhite }}
          onClick={handleNextPassage}
        >
          {currentPassageIndex < selectedExam.passages.length - 1 ? "Next Passage" : "Finish Test"}
        </button>
      </div>
      {audioError && (
        <div className="alert alert-danger" role="alert">
          {audioError}
        </div>
      )}
      {/* Audio element: In practice mode it's visible; in mock mode it's hidden */}
      <audio
        ref={audioRef}
        autoPlay={mode === "mock"}
        onLoadedData={handleAudioLoaded}
        onEnded={handleAudioEnded}
        style={{
          display: "block",
          width: "100%",
          visibility: mode === "practice" ? "visible" : "hidden"
        }}
        controls={mode === "practice"}
        onError={() => setAudioError("Audio failed to load.")}
      />
    </div>
  );
};

export default ListeningMock;
