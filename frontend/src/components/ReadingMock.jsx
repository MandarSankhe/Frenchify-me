import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import "bootstrap/dist/css/bootstrap.min.css";
import { Clock, Eye, CheckCircle, Circle } from "lucide-react";

const ReadingMock = () => {
  // French flag color palette
  const frenchBlue = "#0055A4";
  const frenchRed = "#EF4135";
  const frenchWhite = "#FFFFFF";

  const { user } = useAuth();
  const [allExams, setAllExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [visitedQuestions, setVisitedQuestions] = useState({});
  const [showSummary, setShowSummary] = useState(false);
  const [score, setScore] = useState(0);
  const [liveScore, setLiveScore] = useState(0);

  // Timer states
  const [timeRemaining, setTimeRemaining] = useState(60 * 60); // 60 minutes in seconds
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [timerActive, setTimerActive] = useState(false);

  // Static images based on exam level
  const getExamImage = (level) => {
    switch (level) {
      case "Beginner":
        return "https://www.tesl-lugano.ch/wp-content/uploads/2023/10/francese-cover-ragazzi.jpg";
      case "Intermediate":
        return "https://www.learnfrenchathome.com/wp-content/uploads/2023/12/IB-French-A-Level-French-Courses-GCSE.jpg";
      case "Advanced":
        return "https://www.frenchclass.in/wp-content/uploads/2024/04/French-Language-Certifications-Banner-Image.webp";
      default:
        return "https://www.globaltimes.cn/Portals/0/attachment/2022/2022-09-16/913af628-a364-4f82-8bc3-2bfc27f19699.jpeg";
    }
  };

  // Format time remaining into MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Timer effect
  useEffect(() => {
    let timer;
    if (timerActive && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [timerActive, timeRemaining]);

  // Handle time up
  const handleTimeUp = () => {
    setTimerActive(false);
    handleSubmitExam();
    setShowTimeoutModal(true);
  };

  // Reset timer when new exam is selected
  useEffect(() => {
    if (selectedExam) {
      setTimeRemaining(60 * 60);
      setTimerActive(true);
    } else {
      setTimerActive(false);
    }
  }, [selectedExam]);

  // Mark the current question as visited whenever it changes
  useEffect(() => {
    const currentKey = `${currentDocumentIndex}-${currentQuestionIndex}`;
    setVisitedQuestions((prev) => ({ ...prev, [currentKey]: true }));
  }, [currentDocumentIndex, currentQuestionIndex]);

  // Fetch TCF readings
  useEffect(() => {
    const fetchAllTCFReadings = async () => {
      const query = `
        query GetAllTCFReadings {
          tcfReadings {
            id
            title
            level
            documents {
              document {
                title
                content
              }
              questions {
                questionText
                options
                correctAnswer
              }
            }
          }
        }
      `;
      try {
        const response = await fetch("http://localhost:4000/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const result = await response.json();
        if (result.errors) {
          console.error("GraphQL errors:", result.errors);
          throw new Error(result.errors[0].message);
        }
        setAllExams(result.data.tcfReadings);
      } catch (error) {
        console.error("Error fetching TCF readings:", error);
      }
    };

    fetchAllTCFReadings();
  }, []);

  // Live score calculation
  useEffect(() => {
    if (!selectedExam) return;
    let calculatedScore = 0;
    selectedExam.documents.forEach((docSet, docIndex) => {
      docSet.questions.forEach((question, qIndex) => {
        const key = `${docIndex}-${qIndex}`;
        if (userAnswers[key] === question.correctAnswer) {
          calculatedScore++;
        }
      });
    });
    setLiveScore(calculatedScore);
  }, [userAnswers, selectedExam]);

  // Helper: Return custom style based on exam level
  const getLevelStyle = (level) => {
    switch (level) {
      case "Beginner":
        return { border: `2px solid ${frenchBlue}` };
      case "Intermediate":
        // For intermediate, a light background with a blue border works nicely.
        return { border: `2px solid ${frenchBlue}`, backgroundColor: "#f8f9fa" };
      case "Advanced":
        return { border: `2px solid ${frenchRed}` };
      default:
        return { border: "2px solid #6c757d" };
    }
  };

  // Handler functions
  const handleExamSelection = (examId) => {
    const exam = allExams.find((e) => e.id === examId);
    setSelectedExam(exam);
    setCurrentDocumentIndex(0);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setVisitedQuestions({});
    setShowSummary(false);
    setScore(0);
    setLiveScore(0);
    setTimeRemaining(60 * 60);
    setTimerActive(true);
  };

  const handleAnswerChange = (e) => {
    const answerKey = `${currentDocumentIndex}-${currentQuestionIndex}`;
    setUserAnswers({ ...userAnswers, [answerKey]: e.target.value });
  };

  const handleNextQuestion = () => {
    setCurrentQuestionIndex((prev) => prev + 1);
  };

  const handlePreviousQuestion = () => {
    setCurrentQuestionIndex((prev) => prev - 1);
  };

  const handleNextDocument = () => {
    setCurrentDocumentIndex((prev) => prev + 1);
    setCurrentQuestionIndex(0);
  };

  const handlePreviousDocument = () => {
    setCurrentDocumentIndex((prev) => prev - 1);
    setCurrentQuestionIndex(0);
  };

  const handleJumpToQuestion = (docIndex, quesIndex) => {
    setCurrentDocumentIndex(docIndex);
    setCurrentQuestionIndex(quesIndex);
  };

  const handleSubmitExam = () => {
    if (!selectedExam) return;
    setTimerActive(false);
    let calculatedScore = 0;
    selectedExam.documents.forEach((docSet, docIndex) => {
      docSet.questions.forEach((question, qIndex) => {
        const key = `${docIndex}-${qIndex}`;
        if (userAnswers[key] === question.correctAnswer) {
          calculatedScore += 1;
        }
      });
    });
    setScore(calculatedScore);
    setShowSummary(true);
  };

  if (allExams.length === 0 && !selectedExam) {
    return (
      <div className="text-center my-5">
        <img
          src="animated-logo.gif"
          alt="Frenchify GIF"
          width={220}
          className="img-fluid my-3"
        />
      </div>
    );
  }

  // Exam selection view with custom French flag colors
  if (!selectedExam) {
    return (
      <div className="container my-5">
        <h2 className="mb-5 text-center" style={{ color: frenchRed }}>
          Select a TCF Reading Exam
        </h2>
        <div className="row">
          {allExams.map((exam) => (
            <div key={exam.id} className="col-md-4 mb-4">
              <div
                className="card h-100 shadow"
                style={{
                  cursor: "pointer",
                  transition: "transform 0.2s",
                  ...getLevelStyle(exam.level),
                }}
                onClick={() => handleExamSelection(exam.id)}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "scale(1.03)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
              >
                <img
                  src={getExamImage(exam.level)}
                  className="card-img-top"
                  alt={`${exam.level} Exam`}
                  style={{ height: "200px", objectFit: "cover" }}
                />
                <div className="card-body">
                  <h4 className="card-title">{exam.title}</h4>
                  <p className="card-text">Level: {exam.level}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Determine current question details
  const totalQuestions = selectedExam.documents.reduce(
    (acc, docSet) => acc + docSet.questions.length,
    0
  );
  let questionsBeforeCurrentDoc = 0;
  for (let i = 0; i < currentDocumentIndex; i++) {
    questionsBeforeCurrentDoc += selectedExam.documents[i].questions.length;
  }
  const globalQuestionNumber = questionsBeforeCurrentDoc + (currentQuestionIndex + 1);
  const { documents } = selectedExam;
  const currentDoc = documents[currentDocumentIndex];
  const questions = currentDoc.questions;
  const currentQuestion = questions[currentQuestionIndex];

  // Calculate progress percentage for progress bar
  const progressPercentage = Math.round((globalQuestionNumber / totalQuestions) * 100);

  return (
    <div className="container-fluid p-4">
      {/* Header with Timer */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>TCF Reading Mock Test</h2>
        <div className="d-flex align-items-center">
          <Clock className="me-2" size={28} />
          <span
            className="fw-bold"
            style={{ color: timeRemaining <= 300 ? frenchRed : frenchBlue }}
          >
            {formatTime(timeRemaining)}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="progress" style={{ height: "25px" }}>
          <div
            className="progress-bar progress-bar-striped"
            role="progressbar"
            style={{
              width: `${progressPercentage}%`,
              backgroundColor: frenchBlue,
            }}
            aria-valuenow={progressPercentage}
            aria-valuemin="0"
            aria-valuemax="100"
          >
            {progressPercentage}%
          </div>
        </div>
      </div>

      {/* Timeout Modal */}
      <div
        className={`modal fade ${showTimeoutModal ? "show" : ""}`}
        style={{ display: showTimeoutModal ? "block" : "none" }}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div
              className="modal-header"
              style={{ backgroundColor: frenchRed, color: frenchWhite }}
            >
              <h5 className="modal-title">Time's Up!</h5>
            </div>
            <div className="modal-body">
              <p>
                Your time has expired. Your answers have been automatically
                submitted.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-outline-danger"
                onClick={() => {
                  setShowTimeoutModal(false);
                  setSelectedExam(null);
                }}
              >
                Return to Exam List
              </button>
            </div>
          </div>
        </div>
      </div>
      {showTimeoutModal && <div className="modal-backdrop fade show"></div>}

      <div className="row">
        {/* Navigation Sidebar */}
        <div className="col-lg-3 mb-4">
          <button
            className="btn btn-outline-danger w-100 mb-3"
            onClick={() => setSelectedExam(null)}
          >
            Back to Exams
          </button>
          <div className="card shadow">
            <div
              className="card-header"
              style={{ backgroundColor: frenchBlue, color: frenchWhite }}
            >
              <strong>Exam Navigation</strong>
            </div>
            <div className="card-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <div className="mb-3">
                <strong>Live Score: </strong>
                {liveScore}/{totalQuestions}
              </div>
              {documents.map((docSet, docIdx) => (
                <div key={docIdx} className="mb-4">
                  <h6 className="mb-2">
                    Document {docIdx + 1}: {docSet.document.title}
                  </h6>
                  <ul className="list-group">
                    {docSet.questions.map((q, qIdx) => {
                      const questionNumber =
                        documents
                          .slice(0, docIdx)
                          .reduce((acc, ds) => acc + ds.questions.length, 0) +
                        qIdx +
                        1;
                      const key = `${docIdx}-${qIdx}`;
                      const isAnswered = userAnswers.hasOwnProperty(key);
                      const isVisited = visitedQuestions.hasOwnProperty(key);
                      return (
                        <li
                          key={qIdx}
                          className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
                            docIdx === currentDocumentIndex && qIdx === currentQuestionIndex
                              ? "active"
                              : ""
                          }`}
                          style={{ cursor: "pointer" }}
                          onClick={() => handleJumpToQuestion(docIdx, qIdx)}
                        >
                          <span>Q{questionNumber}</span>
                          <span>
                            {!isVisited ? (
                              <Circle size={20} className="text-muted" title="Unvisited" />
                            ) : isAnswered ? (
                              <CheckCircle
                                size={20}
                                style={{ color: frenchBlue }}
                                title="Answered"
                              />
                            ) : (
                              <Eye
                                size={20}
                                style={{ color: frenchRed }}
                                title="Visited (Unanswered)"
                              />
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

        {/* Main Content */}
        <div className="col-lg-9">
          <div className="card shadow-lg mb-4">
            <div
              className="card-header"
              style={{ backgroundColor: frenchRed, color: frenchWhite }}
            >
              <h5 className="mb-0">
                {selectedExam.title} - {selectedExam.level} Level
              </h5>
            </div>
            <div className="card-body">
              <h6>
                Document {currentDocumentIndex + 1}: {currentDoc.document.title}
              </h6>
              <p>{currentDoc.document.content}</p>
            </div>
          </div>

          {showSummary ? (
            // Summary / Results Section
            <div className="alert shadow p-4" style={{ backgroundColor: "#f8f9fa" }}>
              <h3 className="text-center" style={{ color: frenchRed }}>
                Test Completed!
              </h3>
              <p className="text-center fs-4">
                Your Final Score: {score} / {totalQuestions}
              </p>
              <hr />
              <h5>Review Your Answers</h5>
              {documents.map((docSet, docIdx) => (
                <div key={docIdx} className="mt-3">
                  <h6>
                    Document {docIdx + 1}: {docSet.document.title}
                  </h6>
                  {docSet.questions.map((question, qIdx) => {
                    const answerKey = `${docIdx}-${qIdx}`;
                    const userAnswer = userAnswers[answerKey];
                    const isCorrect = userAnswer === question.correctAnswer;
                    return (
                      <div key={qIdx} className="mt-2 p-2 border rounded">
                        <p className="mb-1">
                          <strong>Question:</strong> {question.questionText}
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
          ) : (
            <>
              {/* Current Question Card */}
              <div className="card shadow p-4 mb-4">
                <div className="card-header">
                  <h5 className="mb-0">
                    Question {globalQuestionNumber} of {totalQuestions}
                  </h5>
                </div>
                <div className="card-body">
                  <p className="fs-5">{currentQuestion.questionText}</p>
                  {/* Options in 2x2 grid */}
                  <div className="row">
                    {currentQuestion.options.map((option, idx) => {
                      const answerKey = `${currentDocumentIndex}-${currentQuestionIndex}`;
                      const selectedOption = userAnswers[answerKey];
                      return (
                        <div key={idx} className="col-6 mb-3">
                          <button
                            className="btn w-100"
                            style={{
                              backgroundColor: selectedOption === option ? frenchBlue : "transparent",
                              color: selectedOption === option ? frenchWhite : frenchBlue,
                              border: `2px solid ${frenchBlue}`,
                            }}
                            onClick={() =>
                              setUserAnswers({ ...userAnswers, [answerKey]: option })
                            }
                          >
                            {option}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="d-flex justify-content-between">
                <button
                  className="btn btn-outline-danger"
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0 && currentDocumentIndex === 0}
                >
                  Previous
                </button>
                {currentDocumentIndex === documents.length - 1 &&
                currentQuestionIndex === questions.length - 1 ? (
                  <button
                    className="btn"
                    style={{
                      backgroundColor: frenchRed,
                      color: frenchWhite,
                      border: "none",
                    }}
                    onClick={handleSubmitExam}
                  >
                    Submit Test
                  </button>
                ) : (
                  <button
                    className="btn"
                    style={{
                      backgroundColor: frenchBlue,
                      color: frenchWhite,
                      border: "none",
                    }}
                    onClick={
                      currentQuestionIndex < questions.length - 1
                        ? handleNextQuestion
                        : handleNextDocument
                    }
                  >
                    Next
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReadingMock;
