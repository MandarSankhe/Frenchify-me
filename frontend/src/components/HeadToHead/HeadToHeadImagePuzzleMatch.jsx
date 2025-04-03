import React, { useState, useEffect } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import LoadingSpinner from "../LoadingSpinner";
import { useAuth } from "../../context/AuthContext";

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
      }
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
      questions {
        imageUrl
        correctWord
        revealedLetters { position char }
        initiatorAnswer
        opponentAnswer
        initiatorScore
        opponentScore
      }
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
      questions { 
        imageUrl 
        correctWord
        revealedLetters { position char }  
      }
      initiator { 
        id 
        username 
      }
      opponent { 
        id 
        username 
      }
      status
      totalScore { 
        initiator 
        opponent 
      }
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
      questions { 
        imageUrl 
        correctWord
        revealedLetters { position char }  
      }
      initiator { 
        id 
        username 
      }
      opponent { 
        id 
        username 
      }
      status
      totalScore { 
        initiator 
        opponent 
      }
      createdAt
    }
  }
`;

const SUBMIT_IMAGE_ANSWER = gql`
  mutation SubmitImageAnswer($input: SubmitImageAnswerInput!) {
    submitImageAnswer(input: $input) {
      id
      initiatorCurrent  
      opponentCurrent   
      questions {
        imageUrl
        correctWord
        revealedLetters { position char }
        initiatorAnswer
        opponentAnswer
        initiatorScore
        opponentScore
      }
      totalScore { initiator opponent }
      initiator {
        id
        username
      }
      opponent {
        id
        username
      }
      status
    }
  }
`;

const GET_USER_IMAGE_MATCH_HISTORY = gql`
  query GetUserImageMatchHistory($userId: ID!) {
    userImageMatches(userId: $userId) {
      id
      examTitle
      status
      totalScore {
        initiator
        opponent
      }
      initiator {
        id
        username
      }
      opponent {
        id
        username
      }
      createdAt
    }
  }
`;

// New mutation to finish an image match after time expires
const FINISH_IMAGE_MATCH = gql`
  mutation FinishImageMatch($matchId: ID!) {
    finishImageMatch(matchId: $matchId) {
      id
      status
      totalScore {
        initiator
        opponent
      }
      initiator {
        id
        username
      }
      opponent {
        id
        username
      }
      examTitle
      createdAt
      initiatorCurrent
      opponentCurrent
      questions {
        imageUrl
        correctWord
        revealedLetters { position char }
        initiatorAnswer
        opponentAnswer
        initiatorScore
        opponentScore
      }
    }
  }
`;

const HeadToHeadImagePuzzleMatch = () => {
  // French flag color palette
  const frenchBlue = "#0055A4";
  const frenchRed = "#EF4135";
  const frenchWhite = "#FFFFFF";

  const { user } = useAuth();
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedOpponent, setSelectedOpponent] = useState("");
  const [activeMatch, setActiveMatch] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  // Local state to track the letters that have been revealed for the current question.
  const [localRevealed, setLocalRevealed] = useState([]);
  // Modal state for wrong letter press
  const [showWrongModal, setShowWrongModal] = useState(false);
  const [wrongLetter, setWrongLetter] = useState(null);
  // New state for the countdown (in milliseconds)
  const [timeLeft, setTimeLeft] = useState(300000); // 5 minutes

  // Queries
  const { data: historyData } = useQuery(GET_USER_IMAGE_MATCH_HISTORY, {
    variables: { userId: user?.id },
    skip: !user?.id
  });
  const { data: usersData, loading: usersLoading, error: usersError } = useQuery(GET_USERS);
  const { data: examData, loading: examLoading, error: examError } = useQuery(GET_IMAGE_EXAMS);
  const { 
    data: pendingData, 
    loading: pendingLoading, 
    error: pendingError,
    refetch: refetchPending 
  } = useQuery(GET_PENDING_IMAGE_MATCHES, {
    variables: { userId: user?.id },
    skip: !user?.id,
    fetchPolicy: "network-only",
    pollInterval: 3000
  });

  // Mutations
  const [createMatch] = useMutation(CREATE_IMAGE_MATCH);
  const [acceptMatch] = useMutation(ACCEPT_IMAGE_MATCH);
  const [submitAnswer] = useMutation(SUBMIT_IMAGE_ANSWER);
  const [finishMatch] = useMutation(FINISH_IMAGE_MATCH);

  // Whenever pending matches update, set an active match if available.
  // Add a check when setting the active match
  useEffect(() => {
    if (pendingData?.pendingImageMatches) {
      const match = pendingData.pendingImageMatches.find(
        (m) => m.status === "active" || m.status === "pending"
      );
      if (match) {
        // Validate createdAt date
        const createdAtDate = new Date(Number(match.createdAt));
        if (isNaN(createdAtDate.getTime())) {
          console.error("Invalid createdAt date in match:", match.createdAt);
          return;
        }
        setActiveMatch(match);
      }
    }
  }, [pendingData, activeMatch?.status, activeMatch]);

  // Whenever the active match changes, initialize the local revealed letters for the current question.
  useEffect(() => {
    if (activeMatch && activeMatch.questions) {
      const isInitiator = user.id === activeMatch.initiator.id;
      const currentIndex = isInitiator
        ? activeMatch.initiatorCurrent
        : activeMatch.opponentCurrent;
      const currentQuestion = activeMatch.questions[currentIndex];
      if (currentQuestion) {
        const wordLength = currentQuestion.correctWord.length;
        const initial = Array(wordLength).fill("");
        if (currentQuestion.revealedLetters?.length > 0) {
          currentQuestion.revealedLetters.forEach(({ position, char }) => {
            if (position < wordLength) initial[position] = char.toUpperCase();
          });
        }
        setLocalRevealed(initial);
      }
    }
  }, [activeMatch, user.id]);


  useEffect(() => {
    let timerInterval;
    if (activeMatch && activeMatch.status === "active") {
      const createdAtDate = new Date(Number(activeMatch.createdAt));
      if (isNaN(createdAtDate.getTime())) {
        console.error("Invalid createdAt date:", activeMatch.createdAt);
        return;
      }
      
      const endTime = createdAtDate.getTime() + 5 * 60 * 1000; // 5 minutes
  
      const updateTimer = () => {
        const now = Date.now();
        const diff = endTime - now;
        if (diff <= 0) {
          setTimeLeft(0);
          clearInterval(timerInterval);
          // Call finishMatch and update activeMatch with the result
          finishMatch({ variables: { matchId: activeMatch.id } })
            .then(({ data }) => {
              setActiveMatch(data.finishImageMatch);
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
  }, [activeMatch, finishMatch]);
  
  

  // Helper to format milliseconds into mm:ss

  const formatTime = (milliseconds) => {
    if (typeof milliseconds !== "number" || isNaN(milliseconds)) {
      return "00:00";
    }
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };
  // Handler to create a new match.
  const handleCreateMatch = async () => {
    if (!selectedExam || !selectedOpponent) {
      alert("Please select an exam and an opponent.");
      return;
    }
    if (!user.id) {
      console.error("User ID is missing");
      return;
    }
    if (!selectedExam.id) {
      console.error("Exam ID is missing");
      return;
    }
    const matchInput = {
      initiatorId: user.id,
      opponentUsername: selectedOpponent,
      examId: selectedExam.id,
    };

    console.log("Creating match with the following input:", matchInput);
    setLoading(true);
    try {
      const { data } = await createMatch({
        variables: { input: matchInput }
      });
      console.log("Match created:", data);
      setActiveMatch(data.createImageMatch);
      refetchPending();
    } catch (error) {
      console.error("Error creating match:", error);
      alert("Failed to create match. Please check your input and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handler to accept a match.
  const handleAcceptMatch = async (matchId) => {
    setLoading(true);
    try {
      const { data } = await acceptMatch({
        variables: { matchId, opponentId: user.id }
      });
      // Set the full match data received from the mutation
      setActiveMatch(data.acceptImageMatch);
      refetchPending();
    } catch (error) {
      console.error("Error accepting match:", error);
      alert("Failed to accept match");
    } finally {
      setLoading(false);
    }
  };

  // Function to submit the answer using the on-screen keyboard input.
  const handleSubmit = async () => {
    if (!activeMatch) return;
    const isInitiator = user.id === activeMatch.initiator.id;
    const currentIndex = isInitiator ? activeMatch.initiatorCurrent : activeMatch.opponentCurrent;
    const currentQuestion = activeMatch.questions[currentIndex];
    const answer = localRevealed.join("");
    if (answer.length !== currentQuestion.correctWord.length) {
      alert("Please complete all letters or press Pass.");
      return;
    }
    try {
      const { data } = await submitAnswer({
        variables: {
          input: {
            matchId: activeMatch.id,
            userId: user.id,
            questionIndex: currentIndex,
            answer
          }
        }
      });
      setActiveMatch(data.submitImageAnswer);
      // Optionally scroll to top to show progress.
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Submission error:", error);
      alert("Answer submission failed: " + error.message);
    }
  };

  // On-screen keyboard: when a letter is clicked, check if it fits into any blank position.
  const handleLetterClick = (letter) => {
    if (!activeMatch) return;
    const isInitiator = user.id === activeMatch.initiator.id;
    const currentIndex = isInitiator ? activeMatch.initiatorCurrent : activeMatch.opponentCurrent;
    const currentQuestion = activeMatch.questions[currentIndex];
    const correctWord = currentQuestion.correctWord.toUpperCase();
    let found = false;
    const updatedRevealed = [...localRevealed];
    // Check each blank that is not already filled.
    for (let i = 0; i < correctWord.length; i++) {
      if (updatedRevealed[i] === "" && correctWord[i] === letter) {
        updatedRevealed[i] = letter;
        found = true;
      }
    }
    if (found) {
      setLocalRevealed(updatedRevealed);
      // If the word is complete, automatically submit the answer.
      if (updatedRevealed.join("") === correctWord) {
        setTimeout(handleSubmit, 500); // small delay for UX
      }
    } else {
      setWrongLetter(letter);
      setShowWrongModal(true);
    }
  };

  // Handler for "Pass" button: fill in the full answer and submit.
  const handlePass = async () => {
    if (!activeMatch) return;
    const isInitiator = user.id === activeMatch.initiator.id;
    const currentIndex = isInitiator ? activeMatch.initiatorCurrent : activeMatch.opponentCurrent;
    const currentQuestion = activeMatch.questions[currentIndex];
    const fullAnswer = currentQuestion.correctWord.toUpperCase();
    
    // Immediately update the UI to reveal the full answer.
    setLocalRevealed(fullAnswer.split(""));
    
    // Wait 1 second before submitting the answer.
    setTimeout(async () => {
      try {
        const { data } = await submitAnswer({
          variables: {
            input: {
              matchId: activeMatch.id,
              userId: user.id,
              questionIndex: currentIndex,
              answer: fullAnswer,
              isPass: true, // New flag indicating a pass
            }
          }
        });
        setActiveMatch(data.submitImageAnswer);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (error) {
        console.error("Submission error:", error);
        alert("Answer submission failed: " + error.message);
      }
    }, 1000);
  };
  
  // Custom render function for the word display using the local revealed letters.
  const renderWordDisplay = (question, guessed) => {
    if (!question?.correctWord) return null;
    const display = question.correctWord
      .toUpperCase()
      .split("")
      .map((letter, index) => (guessed[index] ? guessed[index] : "_"));
    return (
      <div className="word-display d-flex justify-content-center mb-4">
        {display.map((char, index) => (
          <span
            key={index}
            className="letter-box border-bottom mx-1"
            style={{
              width: "40px",
              height: "40px",
              fontSize: "1.5rem",
              textAlign: "center",
              color: frenchBlue,
              lineHeight: "40px"
            }}
          >
            {char}
          </span>
        ))}
      </div>
    );
  };

  // On-screen keyboard letters A-Z.
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  if (loading || examLoading || pendingLoading) return <LoadingSpinner />;
  if (!user) return <div className="container">Please log in to play.</div>;
  if (examError) return <div>Error loading exams: {examError.message}</div>;
  if (pendingError) return <div>Error loading matches: {pendingError.message}</div>;

  // Render pending or active match UI.
  if (activeMatch) {
    if (activeMatch.status === "pending") {
      return (
        <div className="container my-4" style={{ maxWidth: "800px" }}>
          <div className="card shadow-lg border-0" style={{ backgroundColor: frenchWhite }}>
            <div className="card-header p-4" style={{ backgroundColor: frenchBlue, color: frenchWhite }}>
              <h2 className="mb-0">{activeMatch.examTitle}</h2>
            </div>
            <div className="card-body p-4 text-center">
              {user.id === activeMatch.initiator.id ? (
                <>
                  <p className="lead mb-4">
                    Waiting for <strong>{activeMatch.opponent.username}</strong> to accept your challenge...
                  </p>
                  <button
                    className="btn btn-lg"
                    style={{ backgroundColor: frenchRed, color: frenchWhite }}
                    onClick={() => setActiveMatch(null)}
                  >
                    Cancel Match
                  </button>
                </>
              ) : (
                <>
                  <p className="lead mb-4">
                    <strong>{activeMatch.initiator.username}</strong> challenged you!
                  </p>
                  <button
                    className="btn btn-lg"
                    style={{ backgroundColor: frenchBlue, color: frenchWhite }}
                    onClick={() => handleAcceptMatch(activeMatch.id)}
                  >
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
      if (currentIndex >= activeMatch.questions.length) {
        return (
          <div className="container text-center my-5">
            <h2 style={{ color: frenchBlue }}>Waiting for opponent to finish...</h2>
            <div className="spinner-border text-primary mt-3"></div>
          </div>
        );
      }
      const currentQuestion = activeMatch.questions[currentIndex];

      return (
        <div className="container my-4" style={{ maxWidth: "1000px" }}>
          <div className="card shadow-lg border-0" style={{ backgroundColor: frenchWhite }}>
            <div className="card-header p-4" style={{ backgroundColor: frenchBlue, color: frenchWhite }}>
              <h2 className="mb-0">{activeMatch.examTitle}</h2>
            </div>
            <div className="card-body p-4">
              {/* Display the countdown clock */}
              <div className="clock-display mb-3" style={{ fontSize: "2rem", textAlign: "center", color: frenchBlue }}>
                Time Left: {formatTime(timeLeft)}
              </div>
              <div className="row mb-4">
                <div className="col-md-6 mb-3 mb-md-0">
                  <div className={`h-100 p-3 rounded ${isInitiator ? "border-3 border-primary" : ""}`}
                    style={{ borderColor: frenchBlue }}>
                    <h4 style={{ color: frenchBlue }}>
                      {activeMatch.initiator.username}
                      {isInitiator && " (You)"}
                    </h4>
                    <div className="progress mb-2" style={{ height: "25px" }}>
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{
                          width: `${(activeMatch.initiatorCurrent / activeMatch.questions.length) * 100}%`,
                          backgroundColor: frenchBlue
                        }}
                      >
                        {activeMatch.initiatorCurrent}/{activeMatch.questions.length}
                      </div>
                    </div>
                    <h5 style={{ color: frenchRed }}>Score: {activeMatch.totalScore.initiator}</h5>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className={`h-100 p-3 rounded ${!isInitiator ? "border-3 border-primary" : ""}`}
                    style={{ borderColor: frenchBlue }}>
                    <h4 style={{ color: frenchBlue }}>
                      {activeMatch.opponent.username}
                      {!isInitiator && " (You)"}
                    </h4>
                    <div className="progress mb-2" style={{ height: "25px" }}>
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{
                          width: `${(activeMatch.opponentCurrent / activeMatch.questions.length) * 100}%`,
                          backgroundColor: frenchBlue
                        }}
                      >
                        {activeMatch.opponentCurrent}/{activeMatch.questions.length}
                      </div>
                    </div>
                    <h5 style={{ color: frenchRed }}>Score: {activeMatch.totalScore.opponent}</h5>
                  </div>
                </div>
              </div>
              <div className="text-center mb-4">
                <img
                  src={currentQuestion.imageUrl}
                  alt="Puzzle"
                  className="img-fluid rounded shadow"
                  style={{ maxHeight: "400px" }}
                />
              </div>
              {renderWordDisplay(currentQuestion, localRevealed)}
              <div className="keyboard d-flex flex-wrap justify-content-center mt-3">
                {alphabet.map((letter) => (
                  <button
                    key={letter}
                    className="btn btn-light m-1"
                    style={{
                      width: "40px",
                      height: "40px",
                      fontWeight: "bold",
                      border: `2px solid ${frenchBlue}`
                    }}
                    onClick={() => handleLetterClick(letter)}
                  >
                    {letter}
                  </button>
                ))}
              </div>
              <div className="d-flex justify-content-center mt-4">
                <button
                  className="btn btn-warning mx-2"
                  onClick={handlePass}
                >
                  Pass
                </button>
                <button
                  className="btn btn-primary mx-2"
                  onClick={handleSubmit}
                  disabled={localRevealed.join("") !== currentQuestion.correctWord.toUpperCase()}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>

          {/* Wrong Letter Modal */}
          {showWrongModal && (
            <div
              className="modal d-block"
              tabIndex="-1"
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            >
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Incorrect Letter</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setShowWrongModal(false)}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <p>The letter <strong>{wrongLetter}</strong> is not in the correct position.</p>
                  </div>
                  <div className="modal-footer">
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowWrongModal(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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
          <div className="card shadow-lg border-0" style={{ backgroundColor: frenchWhite }}>
            <div className="card-header p-4" style={{ backgroundColor: frenchBlue, color: frenchWhite }}>
              <h2 className="mb-0">Match Completed - {activeMatch.examTitle}</h2>
            </div>
            <div className="card-body p-4 text-center">
              <h3 className="mb-4" style={{ color: frenchBlue }}>Final Scores</h3>
              <div className="row mb-4">
                <div className="col-6">
                  <h4 style={{ color: frenchBlue }}>{activeMatch.initiator.username}</h4>
                  <h2 style={{ color: frenchRed }}>{activeMatch.totalScore.initiator}</h2>
                </div>
                <div className="col-6">
                  <h4 style={{ color: frenchBlue }}>{activeMatch.opponent.username}</h4>
                  <h2 style={{ color: frenchRed }}>{activeMatch.totalScore.opponent}</h2>
                </div>
              </div>
              <div
                className="alert alert-primary h3 py-4"
                style={{
                  backgroundColor: frenchRed,
                  color: frenchWhite,
                  border: "none"
                }}
              >
                {winner === "It's a tie!" ? "🏆 It's a Tie!" : `🏆 Winner: ${winner}`}
              </div>
              <button
                className="btn btn-lg mt-3"
                style={{ backgroundColor: frenchBlue, color: frenchWhite }}
                onClick={() => setActiveMatch(null)}
              >
                New Match
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  // Render match creation view if no active match exists.
  return (
    <div className="container my-5" style={{ maxWidth: "1000px" }}>
      <div className="card shadow-lg border-0" style={{ backgroundColor: frenchWhite }}>
        <div className="card-header p-4" style={{ backgroundColor: frenchBlue, color: frenchWhite }}>
          <h2 className="mb-0">Create New Image Puzzle Match</h2>
        </div>
        <div className="card-body p-4">
          <div className="row g-4">
            <div className="col-md-6">
              <div className="mb-4">
                <label className="form-label h5" style={{ color: frenchBlue }}>
                  Select Exam
                </label>
                <select
                  className="form-select form-select-lg"
                  onChange={(e) => setSelectedExam(JSON.parse(e.target.value))}
                  style={{ borderColor: frenchBlue }}
                >
                  <option value="">-- Select Exam --</option>
                  {examData?.imageExams?.map((exam) => (
                    <option key={exam.id} value={JSON.stringify(exam)}>
                      {exam.title} ({exam.level})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-4">
                <label className="form-label h5" style={{ color: frenchBlue }}>
                  Select Opponent
                </label>
                <select
                  className="form-select form-select-lg"
                  value={selectedOpponent}
                  onChange={(e) => setSelectedOpponent(e.target.value)}
                  style={{ borderColor: frenchBlue }}
                >
                  <option value="">-- Select Opponent --</option>
                  {usersData?.users
                    .filter((u) => u.id !== user.id)
                    .map((u) => (
                      <option key={u.id} value={u.username}>
                        {u.username}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
          <div className="d-grid">
            <button
              className="btn btn-lg"
              style={{ backgroundColor: frenchBlue, color: frenchWhite }}
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? "Hide Match History" : "View Match History"}
            </button>
            <button
              className="btn btn-lg mt-3"
              style={{ backgroundColor: frenchRed, color: frenchWhite }}
              onClick={handleCreateMatch}
              disabled={!selectedExam || !selectedOpponent}
            >
              Start Match
            </button>
          </div>
          {pendingData?.pendingImageMatches?.length > 0 && (
            <div className="mt-5">
              <h4 className="mb-4" style={{ color: frenchBlue }}>
                Pending Matches
              </h4>
              <div className="list-group">
                {pendingData.pendingImageMatches.map((match) => (
                  <div
                    key={match.id}
                    className="list-group-item rounded mb-3 shadow-sm"
                    style={{ borderLeft: `4px solid ${frenchRed}` }}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h5 style={{ color: frenchBlue }}>{match.examTitle}</h5>
                        <p className="mb-0">
                          <span style={{ color: frenchRed }}>{match.initiator.username}</span> vs{" "}
                          <span style={{ color: frenchRed }}>{match.opponent.username}</span>
                        </p>
                      </div>
                      <button
                        className="btn btn-sm"
                        style={{ backgroundColor: frenchBlue, color: frenchWhite }}
                        onClick={() => setActiveMatch(match)}
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {showHistory && (
            <div className="mt-5">
              <h4 className="mb-4" style={{ color: frenchBlue }}>
                Match History
              </h4>
              <div className="list-group">
                {historyData?.userImageMatches?.length > 0 ? (
                  historyData.userImageMatches.map((match) => {
                    const isInitiator = user.id === match.initiator.id;
                    const userScore = isInitiator ? match.totalScore.initiator : match.totalScore.opponent;
                    const opponentScore = isInitiator ? match.totalScore.opponent : match.totalScore.initiator;
                    const opponentUsername = isInitiator ? match.opponent.username : match.initiator.username;
                    const result = userScore > opponentScore ? "Won" : userScore < opponentScore ? "Lost" : "Draw";
                    return (
                      <div
                        key={match.id}
                        className="list-group-item rounded mb-3 shadow-sm"
                        style={{
                          borderLeft: `4px solid ${
                            result === "Won" ? frenchBlue : result === "Lost" ? frenchRed : "#cccccc"
                          }`
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <div style={{ flex: 1 }}>
                            <h5 style={{ color: frenchBlue }}>{match.examTitle}</h5>
                            <div className="d-flex justify-content-between">
                              <div>
                                <span style={{ color: frenchRed }}>{opponentUsername}</span>
                                <span className="mx-2">vs</span>
                                <span style={{ color: frenchBlue }}>You</span>
                              </div>
                              <div>
                                <span style={{ color: frenchBlue }}>{userScore}</span>
                                <span className="mx-1">-</span>
                                <span style={{ color: frenchRed }}>{opponentScore}</span>
                              </div>
                            </div>
                            <small className="text-muted">
                              {new Date(match.createdAt).toLocaleDateString()}
                            </small>
                          </div>
                          <span
                            className={`badge ${
                              result === "Won" ? "bg-primary" : result === "Lost" ? "bg-danger" : "bg-secondary"
                            }`}
                            style={{ minWidth: "70px" }}
                          >
                            {result}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="alert alert-info">No match history yet. Start a new match!</div>
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
