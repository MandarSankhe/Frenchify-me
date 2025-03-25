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
      status
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

const HeadToHeadImagePuzzleMatch = () => {
  // French flag color palette
  const frenchBlue = "#0055A4";
  const frenchRed = "#EF4135";
  const frenchWhite = "#FFFFFF";

  const { user } = useAuth();
  const [selectedExam, setSelectedExam] = useState(null);
  const [opponentUsername, setOpponentUsername] = useState("");
  const [activeMatch, setActiveMatch] = useState(null);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const { data: historyData } = useQuery(GET_USER_IMAGE_MATCH_HISTORY, {
    variables: { userId: user?.id },
    skip: !user?.id
  });
  const [loading, setLoading] = useState(false);
  // Fetch users for dropdown
  const [selectedOpponent, setSelectedOpponent] = useState("");
  const { data: usersData, loading: usersLoading, error: usersError } = useQuery(GET_USERS);
  
  // Fetch exams
  const { data: examData, loading: examLoading, error: examError } = useQuery(GET_IMAGE_EXAMS);
  
  // Fetch pending matches
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


  useEffect(() => {
  // Don't update if activeMatch is completed
  if (activeMatch?.status === 'completed') return;

  if (pendingData?.pendingImageMatches) {
    const match = pendingData.pendingImageMatches.find(m => 
      m.status === "active" || m.status === "pending"
    );
    setActiveMatch(match || null);
  }
}, [pendingData, activeMatch?.status]); // Add activeMatch.status as a dependency

  const handleCreateMatch = async () => {
    if (!selectedExam || !selectedOpponent) {
      alert("Please select an exam and enter opponent username");
      return;
    }

    // Add a check for the initiatorId and other values
    if (!user.id) {
      console.error("User ID is missing");
      return;
    }
    if (!selectedExam.id) {
      console.error("Exam ID is missing");
      return;
    }
    if (!selectedOpponent) {
      console.error("Opponent Username is missing");
      return;
    }

    const matchInput = {
      initiatorId: user.id,
      opponentUsername: selectedOpponent,
      examId: selectedExam.id,
    };

    // Log the variables being sent to ensure they are correctly structured
    console.log("Creating match with the following input:", matchInput);

    setLoading(true);
    try {
      const { data } = await createMatch({
        variables: {
          input: matchInput,
        },
      });
      console.log("Match created:", { data });

      // If mutation is successful, set the active match
      setActiveMatch(data.createImageMatch);
      refetchPending();
    } catch (error) {
      console.error("Error creating match:", error);
      if (error.networkError) {
        console.error("Network Error:", error.networkError);
      }
      if (error.graphQLErrors) {
        console.error("GraphQL Errors:", error.graphQLErrors);
      }
      alert("Failed to create match. Please check your input and try again.");
    } finally {
      setLoading(false);
    }
  };


  const handleAcceptMatch = async (matchId) => {
    setLoading(true);
    try {
      const { data } = await acceptMatch({
        variables: { matchId, opponentId: user.id }
      });
      setActiveMatch(prev => ({ ...prev, status: data.acceptImageMatch.status }));
      refetchPending();
    } catch (error) {
      console.error("Error accepting match:", error);
      alert("Failed to accept match");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentAnswer || !activeMatch) return;
  
    try {
      const isInitiator = user.id === activeMatch.initiator.id;
      const currentQuestionIndex = isInitiator 
        ? activeMatch.initiatorCurrent 
        : activeMatch.opponentCurrent;
  
      const { data } = await submitAnswer({
        variables: {
          input: {
            matchId: activeMatch.id,
            userId: user.id,
            questionIndex: currentQuestionIndex,
            answer: currentAnswer
          }
        }
      });
      
      // Update local state with new match data directly
      setActiveMatch(data.submitImageAnswer);
      
      setCurrentAnswer("");
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
  
    } catch (error) {
      console.error("Submission error:", error);
      alert("Answer submission failed: " + error.message);
    }
  };

  const renderWordDisplay = (question) => {
    if (!question?.correctWord) return null;
    
    const wordLength = question.correctWord.length;
    const letters = Array(wordLength).fill("_");
  
    question.revealedLetters?.forEach(({ position, char }) => {
      if (position < wordLength) letters[position] = char;
    });
  
    return (
      <div className="word-display d-flex justify-content-center mb-4">
        {letters.map((char, index) => (
          <span 
            key={index} 
            className="letter-box border-bottom mx-1" 
            style={{
              width: "40px",
              height: "40px",
              fontSize: "1.5rem",
              textAlign: "center",
              color: frenchBlue
            }}
          >
            {char}
          </span>
        ))}
      </div>
    );
  };

  if (loading || examLoading || pendingLoading) return <LoadingSpinner />;
  if (!user) return <div className="container">Please log in to play.</div>;
  if (examError) return <div>Error loading exams: {examError.message}</div>;
  if (pendingError) return <div>Error loading matches: {pendingError.message}</div>;

  if (activeMatch) {
    if (activeMatch.status === "pending") {
      return (
        <div className="container my-4" style={{ maxWidth: "800px" }}>
          <div className="card shadow-lg border-0" style={{ backgroundColor: frenchWhite }}>
            <div 
              className="card-header p-4" 
              style={{ backgroundColor: frenchBlue, color: frenchWhite }}
            >
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
      const currentQuestionIndex = isInitiator 
        ? activeMatch.initiatorCurrent
        : activeMatch.opponentCurrent;

      if (currentQuestionIndex >= activeMatch.questions.length) {
        return (
          <div className="container text-center my-5">
            <h2 style={{ color: frenchBlue }}>Waiting for opponent to finish...</h2>
            <div className="spinner-border text-primary mt-3"></div>
          </div>
        );
      }

      const currentQuestion = activeMatch.questions[currentQuestionIndex];

      return (
        <div className="container my-4" style={{ maxWidth: "1000px" }}>
          <div className="card shadow-lg border-0" style={{ backgroundColor: frenchWhite }}>
            <div 
              className="card-header p-4" 
              style={{ backgroundColor: frenchBlue, color: frenchWhite }}
            >
              <h2 className="mb-0">{activeMatch.examTitle}</h2>
            </div>
            
            <div className="card-body p-4">
              <div className="row mb-4">
                <div className="col-md-6 mb-3 mb-md-0">
                  <div 
                    className={`h-100 p-3 rounded ${isInitiator ? "border-3 border-primary" : ""}`}
                    style={{ borderColor: frenchBlue }}
                  >
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
                  <div 
                    className={`h-100 p-3 rounded ${!isInitiator ? "border-3 border-primary" : ""}`}
                    style={{ borderColor: frenchBlue }}
                  >
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

              {renderWordDisplay(currentQuestion)}

              <div className="row justify-content-center">
                <div className="col-md-8">
                  <div className="input-group">
                    <input
                      type="text"
                      value={currentAnswer}
                      onChange={(e) => setCurrentAnswer(e.target.value.toUpperCase())}
                      maxLength={currentQuestion.correctWord?.length || 20}
                      className="form-control form-control-lg text-center"
                      placeholder="Enter your answer..."
                      style={{ 
                        borderColor: frenchBlue,
                        fontSize: "1.25rem"
                      }}
                    />
                    <button 
                      className="btn btn-lg"
                      style={{ backgroundColor: frenchBlue, color: frenchWhite }}
                      onClick={handleSubmitAnswer}
                      disabled={!currentAnswer}
                    >
                      Submit
                    </button>
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
          <div className="card shadow-lg border-0" style={{ backgroundColor: frenchWhite }}>
            <div 
              className="card-header p-4" 
              style={{ backgroundColor: frenchBlue, color: frenchWhite }}
            >
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

  return (
    <div className="container my-5" style={{ maxWidth: "1000px" }}>
      <div className="card shadow-lg border-0" style={{ backgroundColor: frenchWhite }}>
        <div 
          className="card-header p-4" 
          style={{ backgroundColor: frenchBlue, color: frenchWhite }}
        >
          <h2 className="mb-0">Create New Image Puzzle Match</h2>
        </div>
        
        <div className="card-body p-4">
          <div className="row g-4">
            <div className="col-md-6">
              <div className="mb-4">
                <label className="form-label h5" style={{ color: frenchBlue }}>Select Exam</label>
                <select
                  className="form-select form-select-lg"
                  onChange={(e) => setSelectedExam(JSON.parse(e.target.value))}
                  style={{ borderColor: frenchBlue }}
                >
                  <option value="">-- Select Exam --</option>
                  {examData?.imageExams?.map(exam => (
                    <option 
                      key={exam.id} 
                      value={JSON.stringify(exam)}
                    >
                      {exam.title} ({exam.level})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="col-md-6">
              <div className="mb-4">
                <label className="form-label h5" style={{ color: frenchBlue }}>Select Opponent</label>
                <select
                  className="form-select form-select-lg"
                  value={selectedOpponent}
                  onChange={(e) => setSelectedOpponent(e.target.value)}
                  style={{ borderColor: frenchBlue }}
                >
                  <option value="">-- Select Opponent --</option>
                  {usersData?.users
                    .filter(u => u.id !== user.id)
                    .map(u => (
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
              className="btn btn-lg"
              style={{ backgroundColor: frenchRed, color: frenchWhite }}
              onClick={handleCreateMatch}
              disabled={!selectedExam || !selectedOpponent}
            >
              Start Match
            </button>
          </div>

          {pendingData?.pendingImageMatches?.length > 0 && (
            <div className="mt-5">
              <h4 className="mb-4" style={{ color: frenchBlue }}>Pending Matches</h4>
              <div className="list-group">
                {pendingData.pendingImageMatches.map(match => (
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
              <h4 className="mb-4" style={{ color: frenchBlue }}>Match History</h4>
              <div className="list-group">
                {historyData?.userImageMatches?.length > 0 ? (
                  historyData.userImageMatches.map(match => {
                    const isInitiator = user.id === match.initiator.id;
                    const userScore = isInitiator ? match.totalScore.initiator : match.totalScore.opponent;
                    const opponentScore = isInitiator ? match.totalScore.opponent : match.totalScore.initiator;
                    const opponentUsername = isInitiator ? match.opponent.username : match.initiator.username;
                    const result = userScore > opponentScore ? "Won" : userScore < opponentScore ? "Lost" : "Draw";

                    return (
                      <div 
                        key={match.id}
                        className="list-group-item rounded mb-3 shadow-sm"
                        style={{ borderLeft: `4px solid ${result === "Won" ? frenchBlue : result === "Lost" ? frenchRed : "#cccccc"}` }}
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
                            className={`badge ${result === "Won" ? "bg-primary" : result === "Lost" ? "bg-danger" : "bg-secondary"}`}
                            style={{ minWidth: "70px" }}
                          >
                            {result}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="alert alert-info">
                    No match history yet. Start a new match!
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