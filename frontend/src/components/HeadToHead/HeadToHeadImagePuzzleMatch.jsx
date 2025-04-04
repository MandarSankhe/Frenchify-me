import React, { useState, useEffect, useRef } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import LoadingSpinner from "../LoadingSpinner";
import { useAuth } from "../../context/AuthContext";

// GraphQL Queries & Mutations
const GET_USERS = gql`
  query GetUsers {
    users {
      id
      username
    }
  }
`;

const GET_IMAGE_EXAMS = gql`
  query GetImageExams {
    imageExams {
      id
      title
      level
      questions {
        imageUrl
        correctWord
        revealedLetters {
          position
          char
        }
        hints
      }
      createdAt
    }
  }
`;

const GET_PENDING_IMAGE_MATCHES = gql`
  query GetPendingImageMatches($userId: ID!) {
    pendingImageMatches(userId: $userId) {
      id
      examId
      examTitle
      initiatorCurrent 
      opponentCurrent   
      initiator { id username }
      opponent { id username }
      status
      totalScore { initiator opponent }
      createdAt
    }
  }
`;

const GET_IMAGE_MATCH = gql`
  query GetImageMatch($matchId: ID!) {
    imageMatch(matchId: $matchId) {
      id
      examId
      examTitle
      initiatorCurrent  
      opponentCurrent   
      initiator { id username }
      opponent { id username }
      status
      totalScore { initiator opponent }
      createdAt
    }
  }
`;

const CREATE_IMAGE_MATCH = gql`
  mutation CreateImageMatch($input: CreateImageMatchInput!) {
    createImageMatch(input: $input) {
      id
      examId
      examTitle
      initiatorCurrent  
      opponentCurrent   
      initiator { id username }
      opponent { id username }
      status
      totalScore { initiator opponent }
      createdAt
    }
  }
`;

const ACCEPT_IMAGE_MATCH = gql`
  mutation AcceptImageMatch($matchId: ID!, $opponentId: ID!) {
    acceptImageMatch(matchId: $matchId, opponentId: $opponentId) {
      id
      examId
      examTitle
      initiatorCurrent  
      opponentCurrent   
      initiator { id username }
      opponent { id username }
      status
      totalScore { initiator opponent }
      createdAt
    }
  }
`;

const SUBMIT_IMAGE_ANSWER = gql`
  mutation SubmitImageAnswer($input: SubmitImageAnswerInput!) {
    submitImageAnswer(input: $input) {
      id
      examId
      examTitle
      initiatorCurrent  
      opponentCurrent   
      totalScore { initiator opponent }
      initiator { id username }
      opponent { id username }
      status
      createdAt
    }
  }
`;

const FINISH_IMAGE_MATCH = gql`
  mutation FinishImageMatch($matchId: ID!) {
    finishImageMatch(matchId: $matchId) {
      id
      examId
      examTitle
      initiatorCurrent
      opponentCurrent
      totalScore { initiator opponent }
      initiator { id username }
      opponent { id username }
      status
      createdAt
    }
  }
`;

const GET_USER_IMAGE_MATCH_HISTORY = gql`
  query GetUserImageMatchHistory($userId: ID!) {
    userImageMatches(userId: $userId) {
      id
      examTitle
      status
      totalScore { initiator opponent }
      initiator { id username }
      opponent { id username }
      createdAt
    }
  }
`;

const HeadToHeadImagePuzzleMatch = () => {
  // French flag colors
  const frenchBlue = "#0055A4";
  const frenchRed = "#EF4135";
  const frenchWhite = "#FFFFFF";

  const { user } = useAuth();
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedOpponent, setSelectedOpponent] = useState("");
  const [activeMatch, setActiveMatch] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localRevealed, setLocalRevealed] = useState([]);
  const [showWrongModal, setShowWrongModal] = useState(false);
  const [wrongLetter, setWrongLetter] = useState(null);
  const [timeLeft, setTimeLeft] = useState(300000); // 5 minutes

  // New states for hint feature
  const [showHint, setShowHint] = useState(false);
  const [currentHintIndex, setCurrentHintIndex] = useState(0);

  // Submission flag to avoid double submission per question.
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const hasSubmittedRef = useRef(false);

  const currentQuestionIndex = activeMatch
    ? user.id === activeMatch.initiator.id
      ? activeMatch.initiatorCurrent
      : activeMatch.opponentCurrent
    : -1;

  const prevQuestionIndexRef = useRef(null);

  // Queries
  const { data: historyData } = useQuery(GET_USER_IMAGE_MATCH_HISTORY, {
    variables: { userId: user?.id },
    skip: !user?.id,
  });
  const { data: usersData } = useQuery(GET_USERS);
  const { data: examData, loading: examLoading, error: examError } = useQuery(GET_IMAGE_EXAMS);
  const { data: pendingData, loading: pendingLoading, error: pendingError, refetch: refetchPending } = useQuery(
    GET_PENDING_IMAGE_MATCHES,
    {
      variables: { userId: user?.id },
      skip: !user?.id,
      fetchPolicy: "network-only",
      pollInterval: 3000,
    }
  );

  // New: Poll the current match by its id—even if completed—so both users update.
  const {
    data: currentMatchData,
    startPolling,
    stopPolling,
  } = useQuery(GET_IMAGE_MATCH, {
    variables: { matchId: activeMatch ? activeMatch.id : "" },
    skip: !activeMatch, // only poll if there is an active match
    pollInterval: 3000,
  });

  // Mutations
  const [createMatch] = useMutation(CREATE_IMAGE_MATCH);
  const [acceptMatch] = useMutation(ACCEPT_IMAGE_MATCH);
  const [submitAnswer] = useMutation(SUBMIT_IMAGE_ANSWER);
  const [finishMatch] = useMutation(FINISH_IMAGE_MATCH);

  // Reset submission flag when a new question loads.
  useEffect(() => {
    setHasSubmitted(false);
    hasSubmittedRef.current = false;
  }, [currentQuestionIndex]);

  // Reset hint states when the active match changes (e.g. new question)
  useEffect(() => {
    setShowHint(false);
    setCurrentHintIndex(0);
  }, [currentQuestionIndex, activeMatch]);

  // Update activeMatch when pending matches update.
  useEffect(() => {
    if (pendingData?.pendingImageMatches) {
      const match = pendingData.pendingImageMatches.find(
        (m) => m.status === "active" || m.status === "pending"
      );
      if (match) {
        const createdAtDate = new Date(Number(match.createdAt));
        if (isNaN(createdAtDate.getTime())) {
          console.error("Invalid createdAt date:", match.createdAt);
          return;
        }
        setActiveMatch(match);
      }
    }
  }, [pendingData]);

  // New: When currentMatchData returns an updated match, update activeMatch if it is completed.
  useEffect(() => {
    if (currentMatchData && currentMatchData.imageMatch) {
      if (
        currentMatchData.imageMatch.status === "completed" &&
        activeMatch?.status !== "completed"
      ) {
        setActiveMatch(currentMatchData.imageMatch);
        // Stop polling once the match is complete.
        stopPolling();
      }
    }
  }, [currentMatchData, activeMatch, stopPolling]);

  // Initialize localRevealed letters when activeMatch or examData updates.
  useEffect(() => {
    if (activeMatch && examData) {
      const exam = examData.imageExams.find((e) => e.id === activeMatch.examId);
      if (!exam) return;
      const isInitiator = user.id === activeMatch.initiator.id;
      const currentIndex = isInitiator ? activeMatch.initiatorCurrent : activeMatch.opponentCurrent;
      // Only update localRevealed if the question index has changed
      if (prevQuestionIndexRef.current !== currentIndex) {
        const currentQuestion = exam.questions[currentIndex];
        if (currentQuestion) {
          const initial = currentQuestion.correctWord.split("").map((char) =>
            char === " " ? " " : ""
          );
          if (currentQuestion.revealedLetters?.length > 0) {
            currentQuestion.revealedLetters.forEach(({ position, char }) => {
              if (position < initial.length) initial[position] = char.toUpperCase();
            });
          }
          setLocalRevealed(initial);
          prevQuestionIndexRef.current = currentIndex;
        }
      }
    }
  }, [activeMatch, examData, user.id]);
    
  // Auto-submit useEffect: if answer is complete and not already submitted.
  useEffect(() => {
    if (activeMatch && examData && !hasSubmittedRef.current) {
      const exam = examData.imageExams.find((e) => e.id === activeMatch.examId);
      if (!exam) return;
      const isInitiator = user.id === activeMatch.initiator.id;
      const currentIndex = isInitiator ? activeMatch.initiatorCurrent : activeMatch.opponentCurrent;
      const currentQuestion = exam.questions[currentIndex];
      if (currentQuestion && localRevealed.join("") === currentQuestion.correctWord.toUpperCase()) {
        hasSubmittedRef.current = true;
        setTimeout(() => {
          handleSubmit();
        }, 500);
      }
    }
  }, [localRevealed, activeMatch, examData, user.id]);

  // Timer effect to update timeLeft and finish match if time expires.
  useEffect(() => {
    let timerInterval;
    if (activeMatch && activeMatch.status === "active") {
      const createdAtDate = new Date(Number(activeMatch.createdAt));
      if (isNaN(createdAtDate.getTime())) {
        console.error("Invalid createdAt date:", activeMatch.createdAt);
        return;
      }
      const endTime = createdAtDate.getTime() + 5 * 60 * 1000;
      const updateTimer = () => {
        const now = Date.now();
        const diff = endTime - now;
        if (diff <= 0) {
          setTimeLeft(0);
          clearInterval(timerInterval);
          finishMatch({ variables: { matchId: activeMatch.id } })
            .then(({ data }) => {
              setActiveMatch(data.finishImageMatch);
              refetchPending();
            })
            .catch((error) => console.error("Error finishing match:", error));
        } else {
          setTimeLeft(diff);
        }
      };
      updateTimer();
      timerInterval = setInterval(updateTimer, 1000);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [activeMatch, finishMatch, refetchPending]);

  const formatTime = (milliseconds) => {
    if (typeof milliseconds !== "number" || isNaN(milliseconds)) return "00:00";
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleCreateMatch = async () => {
    if (!selectedExam || !selectedOpponent) {
      alert("Please select an exam and an opponent.");
      return;
    }
    if (!user.id || !selectedExam.id) {
      console.error("Missing user or exam ID");
      return;
    }
    const matchInput = {
      initiatorId: user.id,
      opponentUsername: selectedOpponent,
      examId: selectedExam.id,
    };
    setLoading(true);
    try {
      const { data } = await createMatch({ variables: { input: matchInput } });
      setActiveMatch(data.createImageMatch);
      refetchPending();
    } catch (error) {
      console.error("Error creating match:", error);
      alert("Failed to create match. Please check your input and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptMatch = async (matchId) => {
    setLoading(true);
    try {
      const { data } = await acceptMatch({ variables: { matchId, opponentId: user.id } });
      setActiveMatch(data.acceptImageMatch);
      refetchPending();
    } catch (error) {
      console.error("Error accepting match:", error);
      alert("Failed to accept match");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!activeMatch || !examData) return;
    const isInitiator = user.id === activeMatch.initiator.id;
    const currentIndex = isInitiator ? activeMatch.initiatorCurrent : activeMatch.opponentCurrent;
    const exam = examData.imageExams.find((e) => e.id === activeMatch.examId);
    if (!exam) return;
    const currentQuestion = exam.questions[currentIndex];
    const answer = localRevealed.join("");
    try {
      const { data } = await submitAnswer({
        variables: {
          input: {
            matchId: activeMatch.id,
            userId: user.id,
            questionIndex: currentIndex,
            answer,
          },
        },
      });
      setActiveMatch(data.submitImageAnswer);
      refetchPending();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Submission error:", error);
      alert("Answer submission failed: " + error.message);
    }
  };

  const handleLetterClick = (letter) => {
    if (!activeMatch || !examData) return;
    const isInitiator = user.id === activeMatch.initiator.id;
    const currentIndex = isInitiator ? activeMatch.initiatorCurrent : activeMatch.opponentCurrent;
    const exam = examData.imageExams.find((e) => e.id === activeMatch.examId);
    if (!exam) return;
    const currentQuestion = exam.questions[currentIndex];
    const correctWord = currentQuestion.correctWord.toUpperCase();
  
    // Normalize the input letter (remove diacritics) for comparison.
    const normalizedInput = letter.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
    let filled = false;
    const updatedRevealed = [...localRevealed];
  
    // Loop over each letter in the correct answer.
    for (let i = 0; i < correctWord.length; i++) {
      const correctLetter = correctWord[i];
      // Normalize the letter from the correct answer.
      const normalizedCorrectLetter = correctLetter.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      // If the normalized letters match and the slot is empty, fill it with the actual (possibly accented) letter.
      if (normalizedCorrectLetter === normalizedInput && updatedRevealed[i] === "") {
        updatedRevealed[i] = correctLetter;
        filled = true;
      }
    }
  
    if (filled) {
      setLocalRevealed(updatedRevealed);
    } else {
      setWrongLetter(letter);
      setShowWrongModal(true);
    }
  };
  

  const handlePass = async () => {
    if (!activeMatch || !examData) return;
    const isInitiator = user.id === activeMatch.initiator.id;
    const currentIndex = isInitiator ? activeMatch.initiatorCurrent : activeMatch.opponentCurrent;
    const exam = examData.imageExams.find((e) => e.id === activeMatch.examId);
    if (!exam) return;
    const currentQuestion = exam.questions[currentIndex];
    const fullAnswer = currentQuestion.correctWord.toUpperCase();

    // Block auto-submit FIRST
    hasSubmittedRef.current = true;
    setHasSubmitted(true);
    
    // Update local state
    setLocalRevealed(fullAnswer.split(""));

    // Immediate submission with shorter timeout
    setTimeout(async () => {
      try {
        const { data } = await submitAnswer({
          variables: {
            input: {
              matchId: activeMatch.id,
              userId: user.id,
              questionIndex: currentIndex,
              answer: fullAnswer,
              isPass: true, // Ensure isPass is explicitly true
            },
          },
        });
        setActiveMatch(data.submitImageAnswer);
        refetchPending();
      } catch (error) {
        console.error("Submission error:", error);
        alert("Answer submission failed: " + error.message);
      }
    }, 500);
  };

  const renderWordDisplay = (question, guessed) => {
    if (!question?.correctWord) return null;
    const display = question.correctWord
      .toUpperCase()
      .split("")
      .map((letter, index) => (guessed[index] ? guessed[index] : "_"));
    
    return (
      <div className="word-display d-flex justify-content-center mb-4 flex-wrap">
        {display.map((char, index) => (
          <div
            key={index}
            className="letter-box mx-2 d-flex align-items-center justify-content-center"
            style={{
              width: "50px",
              height: "60px",
              fontSize: "2rem",
              backgroundColor: frenchWhite,
              borderRadius: "8px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              border: `2px solid ${frenchBlue}`,
              transition: "all 0.3s ease",
              transform: char !== "_" ? "translateY(-5px)" : "none"
            }}
          >
            <span style={{ 
              color: char !== "_" ? frenchBlue : "#adb5bd",
              fontWeight: "600",
              textShadow: char !== "_" ? "0 2px 4px rgba(0, 0, 0, 0.1)" : "none"
            }}>
              {char}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  if (loading || examLoading || pendingLoading) return <LoadingSpinner />;
  if (!user) return <div className="container">Please log in to play.</div>;
  if (examError) return <div>Error loading exams: {examError.message}</div>;
  if (pendingError) return <div>Error loading matches: {pendingError.message}</div>;

  if (activeMatch) {
    if (activeMatch.status === "pending") {
      return (
        <div className="container my-5" style={{ maxWidth: "800px" }}>
          <div className="h2hcard card shadow-lg border-0 overflow-hidden" style={{ 
            backgroundColor: frenchWhite,
            borderRadius: "20px"
          }}>
            <div className="card-header p-4 text-center" style={{ 
              backgroundColor: frenchBlue,
              color: frenchWhite,
              borderBottom: `4px solid ${frenchRed}`
            }}>
              <h2 className="mb-0 display-5 fw-bold">{activeMatch.examTitle}</h2>
            </div>
            <div className="card-body p-5 text-center">
              <div className="animation-container mb-4">
                <div className="spinner-grow text-light" role="status" style={{ 
                  width: "80px", 
                  height: "80px",
                  backgroundColor: frenchRed
                }}>
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
              
              {user.id === activeMatch.initiator.id ? (
                <>
                  <p className="lead mb-4 fs-5">
                    Waiting for <span className="fw-bold" style={{ color: frenchRed }}>
                      {activeMatch.opponent.username}
                    </span> to accept your challenge...
                  </p>
                  <button 
                    className="btn btn-lg px-5 py-3" 
                    style={{ 
                      backgroundColor: frenchRed,
                      color: frenchWhite,
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
                    }}
                    onClick={() => setActiveMatch(null)}
                  >
                    <i className="bi bi-x-circle me-2"></i>
                    Cancel Match
                  </button>
                </>
              ) : (
                <>
                  <p className="lead mb-4 fs-5">
                    <span className="fw-bold" style={{ color: frenchRed }}>
                      {activeMatch.initiator.username}
                    </span> challenged you!
                  </p>
                  <button 
                    className="btn btn-lg px-5 py-3" 
                    style={{ 
                      backgroundColor: frenchBlue,
                      color: frenchWhite,
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
                    }}
                    onClick={() => handleAcceptMatch(activeMatch.id)}
                  >
                    <i className="bi bi-trophy me-2"></i>
                    Accept Challenge
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      );
    } else if (activeMatch.status === "active") {
      const isInitiator = user.id === activeMatch.initiator.id;
      const currentIndex = isInitiator ? activeMatch.initiatorCurrent : activeMatch.opponentCurrent;
      if (!examData) return <LoadingSpinner />;
      const exam = examData.imageExams.find((e) => e.id === activeMatch.examId);
      if (!exam) return <div>Error loading exam data.</div>;
      if (currentIndex >= exam.questions.length) {
        return (
          <div className="container text-center my-5">
            <h2 style={{ color: frenchBlue }}>Waiting for opponent to finish...</h2>
            <div className="spinner-border text-primary mt-3"></div>
          </div>
        );
      }
      const currentQuestion = exam.questions[currentIndex];
      return (
        <div className="container my-5" style={{ maxWidth: "1200px", zoom: 0.8 }}>
          <div className="card shadow-lg border-0 overflow-hidden" style={{ 
            backgroundColor: frenchWhite,
            borderRadius: "20px"
          }}>
            <div className="card-header p-4" style={{ 
              backgroundColor: frenchBlue,
              color: frenchWhite,
              borderBottom: `4px solid ${frenchRed}`
            }}>
              <div className="d-flex justify-content-between align-items-center">
                <h2 className="mb-0 display-5 fw-bold">{activeMatch.examTitle}</h2>
                <div className="clock-display" style={{ fontSize: "1.5rem" }}>
                  <i className="bi bi-clock-history me-2"></i>
                  {formatTime(timeLeft)}
                </div>
              </div>
            </div>
  
            <div className="card-body p-4">
              {/* Player Progress Section */}
              <div className="row mb-5 g-4">
                <div className="col-md-6">
                  <div className={`player-card p-4 rounded-3 ${isInitiator ? "active-player" : ""}`}>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h4 className="mb-0">
                        <i className="bi bi-person-fill me-2"></i>
                        {activeMatch.initiator.username}
                        {isInitiator && <span className="badge bg-primary ms-2">You</span>}
                      </h4>
                      <div className="score-display" style={{ fontSize: "1.5rem", color: frenchRed }}>
                        {activeMatch.totalScore.initiator}
                      </div>
                    </div>
                    <div className="progress" style={{ height: "20px", borderRadius: "10px" }}>
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{
                          width: `${(activeMatch.initiatorCurrent / exam.questions.length) * 100}%`,
                          backgroundColor: frenchBlue,
                          borderRadius: "10px"
                        }}
                      >
                        <span className="progress-text">
                          {activeMatch.initiatorCurrent}/{exam.questions.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className={`player-card p-4 rounded-3 ${!isInitiator ? "active-player" : ""}`}>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h4 className="mb-0">
                        <i className="bi bi-person-fill me-2"></i>
                        {activeMatch.opponent.username}
                        {!isInitiator && <span className="badge bg-primary ms-2">You</span>}
                      </h4>
                      <div className="score-display" style={{ fontSize: "1.5rem", color: frenchRed }}>
                        {activeMatch.totalScore.opponent}
                      </div>
                    </div>
                    <div className="progress" style={{ height: "20px", borderRadius: "10px" }}>
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{
                          width: `${(activeMatch.opponentCurrent / exam.questions.length) * 100}%`,
                          backgroundColor: frenchBlue,
                          borderRadius: "10px"
                        }}
                      >
                        <span className="progress-text">
                          {activeMatch.opponentCurrent}/{exam.questions.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
  
              {/* Main Game Area split into two columns */}
              <div className="row">
                {/* Left Column: Image & Word Display */}
                <div className="col-md-6 d-flex flex-column align-items-center">
                  <div className="image-container mb-4 text-center">
                    <img 
                      src={currentQuestion.imageUrl} 
                      alt="Puzzle" 
                      className="img-fluid rounded-3 shadow-lg" 
                      style={{ 
                        maxHeight: "250px",
                        border: `4px solid ${frenchBlue}`,
                        borderRadius: "15px"
                      }}
                    />
                  </div>
                  {renderWordDisplay(currentQuestion, localRevealed)}
                </div>
  
                {/* Right Column: Controls */}
                <div className="col-md-6">
                  <div className="controls-container">
                    <div className="keyboard-container mb-4">
                      <div className="d-flex flex-wrap justify-content-center gap-2">
                        {alphabet.map((letter) => (
                          <button
                            key={letter}
                            className="btn keyboard-key"
                            style={{
                              width: "50px",
                              height: "50px",
                              fontSize: "1.25rem",
                              fontWeight: "600",
                              backgroundColor: frenchWhite,
                              color: frenchBlue,
                              border: `2px solid ${frenchBlue}`,
                              borderRadius: "10px",
                              transition: "all 0.2s ease"
                            }}
                            onMouseOver={(e) => e.target.style.transform = "scale(1.1)"}
                            onMouseOut={(e) => e.target.style.transform = "scale(1)"}
                            onClick={() => handleLetterClick(letter)}
                          >
                            {letter}
                          </button>
                        ))}
                      </div>
                    </div>
  
                    <div className="action-buttons d-flex justify-content-center gap-3 mb-4">
                      <button 
                        className="btn btn-lg px-4 py-2"
                        style={{
                          backgroundColor: frenchRed,
                          color: frenchWhite,
                          borderRadius: "10px"
                        }}
                        onClick={handlePass}
                      >
                        <i className="bi bi-arrow-clockwise me-2"></i>
                        Pass
                      </button>
                      <button 
                        className="btn btn-lg px-4 py-2"
                        style={{
                          backgroundColor: frenchBlue,
                          color: frenchWhite,
                          borderRadius: "10px"
                        }}
                        onClick={handleSubmit}
                        disabled={localRevealed.some(letter => letter === "")}
                      >
                        <i className="bi bi-check-circle me-2"></i>
                        Submit
                      </button>
                    </div>
  
                    {/* Enhanced Hint System */}
                    <div className="hint-container">
                      {!showHint ? (
                        <div className="text-center">
                          <button 
                            className="btn btn-lg px-4 py-2"
                            style={{
                              backgroundColor: "#17a2b8",
                              color: frenchWhite,
                              borderRadius: "10px"
                            }}
                            onClick={() => setShowHint(true)}
                          >
                            <i className="bi bi-lightbulb me-2"></i>
                            Reveal Hint ({currentQuestion.hints.length} available)
                          </button>
                        </div>
                      ) : (
                        <div className="hint-card shadow-lg p-4 rounded-3" style={{
                          backgroundColor: frenchWhite,
                          border: `2px solid ${frenchBlue}`,
                          borderRadius: "15px"
                        }}>
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <h4 className="mb-0" style={{ color: frenchBlue }}>
                              <i className="bi bi-lightbulb-fill me-2"></i>
                              Hint {currentHintIndex + 1}/{currentQuestion.hints.length}
                            </h4>
                            <div className="hint-navigation">
                              {currentHintIndex > 0 && (
                                <button
                                  className="btn btn-sm me-2"
                                  style={{ backgroundColor: frenchBlue, color: frenchWhite }}
                                  onClick={() => setCurrentHintIndex(currentHintIndex - 1)}
                                >
                                  <i className="bi bi-chevron-left"></i>
                                </button>
                              )}
                              {currentHintIndex < currentQuestion.hints.length - 1 && (
                                <button
                                  className="btn btn-sm"
                                  style={{ backgroundColor: frenchBlue, color: frenchWhite }}
                                  onClick={() => setCurrentHintIndex(currentHintIndex + 1)}
                                >
                                  <i className="bi bi-chevron-right"></i>
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="hint-content fs-5" style={{ color: frenchBlue }}>
                            {currentQuestion.hints[currentHintIndex]}
                          </div>
                          <div className="text-end mt-3">
                            <button
                              className="btn btn-sm"
                              style={{ backgroundColor: frenchRed, color: frenchWhite }}
                              onClick={() => setShowHint(false)}
                            >
                              <i className="bi bi-x-lg me-2"></i>
                              Close Hints
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
  
            </div>
          </div>
        </div>
      );
    } else if (activeMatch.status === "completed") {
      let winner;
      if (activeMatch.totalScore.initiator > activeMatch.totalScore.opponent) {
        winner = activeMatch.initiator.username;
      } else if (activeMatch.totalScore.initiator < activeMatch.totalScore.opponent) {
        winner = activeMatch.opponent.username;
      } else {
        winner = "It's a tie!";
      }
      return (
        <div className="container my-5" style={{ maxWidth: "800px" }}>
          <div className="card shadow-lg border-0 overflow-hidden" style={{ 
            backgroundColor: frenchWhite,
            borderRadius: "20px"
          }}>
            <div className="card-header p-4 text-center" style={{ 
              backgroundColor: frenchBlue,
              color: frenchWhite,
              borderBottom: `4px solid ${frenchRed}`
            }}>
              <h2 className="mb-0 display-5 fw-bold">Match Completed - {activeMatch.examTitle}</h2>
            </div>
            <div className="card-body p-5 text-center">
              <div className="trophy-animation mb-4">
                <i className="bi bi-trophy-fill" style={{ fontSize: "4rem", color: frenchRed }}></i>
              </div>
              
              <h3 className="mb-4" style={{ color: frenchBlue }}>Final Scores</h3>
              
              <div className="row g-4 mb-5">
                <div className="col-6">
                  <div className="score-card p-3 rounded-3" style={{ backgroundColor: "#f8f9fa" }}>
                    <h4 style={{ color: frenchBlue }}>{activeMatch.initiator.username}</h4>
                    <div className="display-2 fw-bold" style={{ color: frenchRed }}>
                      {activeMatch.totalScore.initiator}
                    </div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="score-card p-3 rounded-3" style={{ backgroundColor: "#f8f9fa" }}>
                    <h4 style={{ color: frenchBlue }}>{activeMatch.opponent.username}</h4>
                    <div className="display-2 fw-bold" style={{ color: frenchRed }}>
                      {activeMatch.totalScore.opponent}
                    </div>
                  </div>
                </div>
              </div>
  
              <div className="winner-card p-4 mb-5 rounded-3" style={{ 
                backgroundColor: frenchRed,
                color: frenchWhite
              }}>
                <h2 className="mb-0">
                  {winner === "It's a tie!" ? (
                    <>
                      <i className="bi bi-emoji-dizzy me-2"></i>
                      It's a Tie!
                    </>
                  ) : (
                    <>
                      <i className="bi bi-star-fill me-2"></i>
                      Champion: {winner}
                    </>
                  )}
                </h2>
              </div>
  
              <button 
                className="btn btn-lg px-5 py-3" 
                style={{ 
                  backgroundColor: frenchBlue,
                  color: frenchWhite,
                  borderRadius: "12px"
                }}
                onClick={() => setActiveMatch(null)}
              >
                <i className="bi bi-plus-circle me-2"></i>
                Start New Match
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="container my-5" style={{ maxWidth: "1200px" }}>
      <div className="card shadow-lg border-0 overflow-hidden" style={{ 
        backgroundColor: frenchWhite,
        borderRadius: "20px",
        border: `2px solid ${frenchBlue}`
      }}>
        <div className="card-header p-4" style={{ 
          backgroundColor: frenchBlue, 
          color: frenchWhite,
          borderBottom: `4px solid ${frenchRed}`
        }}>
          <h2 className="mb-0 display-5 fw-bold">
            <i className="bi bi-puzzle-fill me-2"></i>
            Create New Image Puzzle Match
          </h2>
        </div>
        
        <div className="card-body p-4">
          {/* Form Section */}
          <div className="row g-4 mb-4">
            <div className="col-md-6">
              <div className="form-card p-3 rounded-3" style={{ 
                backgroundColor: "#f8f9fa",
                border: `2px solid ${frenchBlue}`
              }}>
                <label className="form-label h5 mb-3" style={{ color: frenchBlue }}>
                  <i className="bi bi-journal-bookmark me-2"></i>
                  Select Exam
                </label>
                <select
                  className="form-select form-select-lg mb-3"
                  onChange={(e) => setSelectedExam(JSON.parse(e.target.value))}
                  style={{ 
                    borderColor: frenchBlue,
                    borderRadius: "10px",
                    fontSize: "1.1rem"
                  }}
                >
                  <option value="">-- Select Exam --</option>
                  {examData?.imageExams?.map((exam) => (
                    <option 
                      key={exam.id} 
                      value={JSON.stringify(exam)}
                      style={{ fontSize: "1rem" }}
                    >
                      {exam.title} ({exam.level})
                    </option>
                  ))}
                </select>
              </div>
            </div>
  
            <div className="col-md-6">
              <div className="form-card p-3 rounded-3" style={{ 
                backgroundColor: "#f8f9fa",
                border: `2px solid ${frenchBlue}`
              }}>
                <label className="form-label h5 mb-3" style={{ color: frenchBlue }}>
                  <i className="bi bi-people-fill me-2"></i>
                  Select Opponent
                </label>
                <select
                  className="form-select form-select-lg mb-3"
                  value={selectedOpponent}
                  onChange={(e) => setSelectedOpponent(e.target.value)}
                  style={{ 
                    borderColor: frenchBlue,
                    borderRadius: "10px",
                    fontSize: "1.1rem"
                  }}
                >
                  <option value="">-- Select Opponent --</option>
                  {usersData?.users
                    .filter((u) => u.id !== user.id)
                    .map((u) => (
                      <option 
                        key={u.id} 
                        value={u.username}
                        style={{ fontSize: "1rem" }}
                      >
                        {u.username}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
  
          {/* Control Buttons */}
          <div className="control-buttons text-center mb-5">
            <button
              className="btn btn-lg mx-2 px-4 py-3"
              style={{ 
                backgroundColor: frenchBlue,
                color: frenchWhite,
                borderRadius: "12px",
                transition: "transform 0.2s ease"
              }}
              onMouseOver={(e) => e.target.style.transform = "scale(1.05)"}
              onMouseOut={(e) => e.target.style.transform = "scale(1)"}
              onClick={() => setShowHistory(!showHistory)}
            >
              <i className="bi bi-clock-history me-2"></i>
              {showHistory ? "Hide Match History" : "View Match History"}
            </button>
            <button
              className="btn btn-lg mx-2 px-4 py-3"
              style={{ 
                backgroundColor: frenchRed,
                color: frenchWhite,
                borderRadius: "12px",
                transition: "transform 0.2s ease",
                opacity: (!selectedExam || !selectedOpponent) ? 0.6 : 1
              }}
              onMouseOver={(e) => e.target.style.transform = "scale(1.05)"}
              onMouseOut={(e) => e.target.style.transform = "scale(1)"}
              onClick={handleCreateMatch}
              disabled={!selectedExam || !selectedOpponent}
            >
              <i className="bi bi-play-circle me-2"></i>
              Start Match
            </button>
          </div>
  
          {/* Pending Matches */}
          {pendingData?.pendingImageMatches?.length > 0 && (
            <div className="pending-matches mt-4">
              <h4 className="mb-4" style={{ color: frenchBlue }}>
                <i className="bi bi-hourglass-split me-2"></i>
                Pending Matches
              </h4>
              <div className="row g-4">
                {pendingData.pendingImageMatches.map((match) => (
                  <div key={match.id} className="col-md-6">
                    <div className="pending-card p-3 rounded-3" style={{ 
                      backgroundColor: "#f8f9fa",
                      borderLeft: `4px solid ${frenchRed}`,
                      transition: "transform 0.2s ease"
                    }}>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h5 style={{ color: frenchBlue }}>{match.examTitle}</h5>
                          <div className="vs-text" style={{ color: frenchRed }}>
                            <span>{match.initiator.username}</span> 
                            <span className="mx-2">vs</span>
                            <span>{match.opponent.username}</span>
                          </div>
                        </div>
                        <button 
                          className="btn btn-sm" 
                          style={{ 
                            backgroundColor: frenchBlue,
                            color: frenchWhite,
                            borderRadius: "8px",
                            padding: "8px 16px"
                          }}
                          onClick={() => setActiveMatch(match)}
                        >
                          <i className="bi bi-eye me-2"></i>
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
  
          {/* Match History */}
          {showHistory && (
            <div className="match-history mt-5">
              <h4 className="mb-4" style={{ color: frenchBlue }}>
                <i className="bi bi-award me-2"></i>
                Match History
              </h4>
              <div className="row g-4">
                {historyData?.userImageMatches?.length > 0 ? (
                  historyData.userImageMatches.map((match) => {
                    const isInitiator = user.id === match.initiator.id;
                    const userScore = isInitiator ? match.totalScore.initiator : match.totalScore.opponent;
                    const opponentScore = isInitiator ? match.totalScore.opponent : match.totalScore.initiator;
                    const opponentUsername = isInitiator ? match.opponent.username : match.initiator.username;
                    const result = userScore > opponentScore ? "Won" : userScore < opponentScore ? "Lost" : "Draw";
  
                    return (
                      <div key={match.id} className="col-12">
                        <div className="history-card p-3 rounded-3" style={{ 
                          backgroundColor: "#f8f9fa",
                          borderLeft: `4px solid ${result === "Won" ? frenchBlue : result === "Lost" ? frenchRed : "#cccccc"}`,
                          transition: "transform 0.2s ease"
                        }}>
                          <div className="d-flex justify-content-between align-items-center">
                            <div style={{ flex: 1 }}>
                              <h5 style={{ color: frenchBlue }}>{match.examTitle}</h5>
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <div>
                                  <span className="badge bg-light text-dark me-2">
                                    <i className="bi bi-calendar me-1"></i>
                                    {new Date(match.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <div>
                                  <span style={{ color: frenchRed, fontWeight: "500" }}>{opponentUsername}</span>
                                  <span className="mx-2" style={{ color: frenchBlue }}>vs</span>
                                  <span style={{ color: frenchBlue, fontWeight: "500" }}>You</span>
                                </div>
                              </div>
                              <div className="d-flex justify-content-between align-items-center">
                                <div className="score-display">
                                  <span className="h4" style={{ color: frenchBlue }}>{userScore}</span>
                                  <span className="mx-2" style={{ color: frenchRed }}>-</span>
                                  <span className="h4" style={{ color: frenchRed }}>{opponentScore}</span>
                                </div>
                                <span className={`badge ${result === "Won" ? "bg-primary" : result === "Lost" ? "bg-danger" : "bg-secondary"} p-2`} 
                                  style={{ 
                                    minWidth: "80px",
                                    borderRadius: "8px",
                                    fontSize: "0.9rem"
                                  }}>
                                  <i className={`bi ${result === "Won" ? "bi-trophy" : result === "Lost" ? "bi-emoji-frown" : "bi-hand-thumbs-up"} me-2`}></i>
                                  {result}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-12">
                    <div className="alert alert-info rounded-3 d-flex align-items-center">
                      <i className="bi bi-info-circle me-2 fs-4"></i>
                      No match history yet. Start a new match!
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeadToHeadImagePuzzleMatch;
