import React, { useState, useRef, useEffect } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
import LoadingSpinner from "./LoadingSpinner";
import { useAuth } from "../context/AuthContext";

// --- GraphQL definitions ---
const GET_TCF_WRITINGS = gql`
  query GetTCFWritings {
    tcfWritings {
      id
      title
      level
      exercise1
    }
  }
`;

const GET_PENDING_MATCHES = gql`
  query GetPendingMatches($userId: ID!) {
    pendingMatches(userId: $userId) {
      id
      examId
      examTitle
      examQuestion
      initiator {
        id
        username
      }
      opponent {
        id
        username
      }
      status
      initiatorAnswer
      opponentAnswer
      initiatorFeedback
      opponentFeedback
      createdAt
    }
  }
`;

const GET_MATCH_DETAILS = gql`
  query GetMatchDetails($matchId: ID!) {
    match(matchId: $matchId) {
      id
      examId
      examTitle
      examQuestion
      initiator {
        id
        username
      }
      opponent {
        id
        username
      }
      status
      initiatorAnswer
      opponentAnswer
      initiatorFeedback
      opponentFeedback
      createdAt
    }
  }
`;

const CREATE_WRITING_MATCH = gql`
  mutation CreateWritingMatch($input: CreateWritingMatchInput!) {
    createWritingMatch(input: $input) {
      id
      examId
      examTitle
      examQuestion
      initiator {
        id
        username
      }
      opponent {
        id
        username
      }
      status
      createdAt
    }
  }
`;

const ACCEPT_WRITING_MATCH = gql`
  mutation AcceptWritingMatch($matchId: ID!, $opponentId: ID!) {
    acceptWritingMatch(matchId: $matchId, opponentId: $opponentId) {
      id
      examId
      examTitle
      examQuestion
      initiator {
        id
        username
      }
      opponent {
        id
        username
      }
      status
      initiatorAnswer
      opponentAnswer
      initiatorFeedback
      opponentFeedback
      createdAt
    }
  }
`;

const SUBMIT_MATCH_ANSWER = gql`
  mutation SubmitWritingMatchAnswer($input: SubmitWritingMatchAnswerInput!) {
    submitWritingMatchAnswer(input: $input) {
      id
      initiatorAnswer
      opponentAnswer
      status
    }
  }
`;

const FINALIZE_WRITING_MATCH = gql`
  mutation FinalizeWritingMatch($matchId: ID!) {
    finalizeWritingMatch(matchId: $matchId) {
      id
      examId
      examTitle
      examQuestion
      initiator {
        id
        username
      }
      opponent {
        id
        username
      }
      initiatorFeedback
      opponentFeedback
      status
      createdAt
    }
  }
`;

// --- Component ---
const HeadToHeadMatch = () => {
  const { user } = useAuth();

  const [opponentUsername, setOpponentUsername] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedExam, setSelectedExam] = useState(null);
  const [activeMatch, setActiveMatch] = useState(null);
  const [answer, setAnswer] = useState("");
  const [keyboardInput, setKeyboardInput] = useState("");
  const [loading, setLoading] = useState(false);
  const keyboardRef = useRef(null);

  // Fetch exams
  const { data: examData, loading: examLoading } = useQuery(GET_TCF_WRITINGS);

  // Fetch pending matches (this may not return completed matches)
  const { data: pendingData, loading: pendingLoading, refetch: refetchPending } = useQuery(
    GET_PENDING_MATCHES,
    {
      variables: { userId: user?.id },
      skip: !user?.id,
      fetchPolicy: "network-only",
    }
  );

  // When pending matches update, update activeMatch if available.
  useEffect(() => {
    if (pendingData && pendingData.pendingMatches) {
      console.log("Pending matches:", pendingData.pendingMatches);
      if (activeMatch) {
        const updatedMatch = pendingData.pendingMatches.find(
          (match) => match.id === activeMatch.id
        );
        if (updatedMatch) {
          setActiveMatch(updatedMatch);
        }
      } else {
        const active = pendingData.pendingMatches.find(
          (match) => match.status === "active" || match.status === "pending"
        );
        if (active) {
          setActiveMatch(active);
        }
      }
    }
  }, [pendingData]);

  // When exam data changes
  useEffect(() => {
    if (examData && examData.tcfWritings) {
      const exam = examData.tcfWritings.find((ex) => ex.id === selectedExamId);
      setSelectedExam(exam);
    }
  }, [selectedExamId, examData]);

  // NEW: When a match is active and not pending, poll for match details including feedback.
  const { data: matchDetailsData, loading: matchDetailsLoading } = useQuery(GET_MATCH_DETAILS, {
    variables: { matchId: activeMatch?.id },
    skip: !activeMatch || activeMatch.status === "pending",
    pollInterval: 3000,
  });

  useEffect(() => {
    if (matchDetailsData && matchDetailsData.match) {
      setActiveMatch(matchDetailsData.match);
    }
  }, [matchDetailsData]);

  const [createMatch] = useMutation(CREATE_WRITING_MATCH);
  const [acceptMatch] = useMutation(ACCEPT_WRITING_MATCH);
  const [submitAnswer] = useMutation(SUBMIT_MATCH_ANSWER);
  const [finalizeMatch] = useMutation(FINALIZE_WRITING_MATCH);

  const handleCreateMatch = async () => {
    if (!opponentUsername || !selectedExam) {
      alert("Please enter opponent username and select an exam.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await createMatch({
        variables: {
          input: {
            initiatorId: user.id,
            opponentUsername,
            examId: selectedExam.id,
            examTitle: selectedExam.title,
            examQuestion: selectedExam.exercise1,
          },
        },
      });
      console.log("Created match:", data.createWritingMatch);
      refetchPending();
    } catch (error) {
      console.error("Error creating match:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptMatch = async (matchId) => {
    setLoading(true);
    try {
      const { data } = await acceptMatch({
        variables: { matchId, opponentId: user.id },
      });
      console.log("Accepted match:", data.acceptWritingMatch);
      setActiveMatch(data.acceptWritingMatch);
      refetchPending();
    } catch (error) {
      console.error("Error accepting match:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    setLoading(true);
    try {
      const { data } = await submitAnswer({
        variables: {
          input: { matchId: activeMatch.id, userId: user.id, answer },
        },
      });
      // Update activeMatch with new answer data
      setActiveMatch(data.submitWritingMatchAnswer);
      // If both answers exist, finalize the match to generate feedback.
      if (
        data.submitWritingMatchAnswer.initiatorAnswer &&
        data.submitWritingMatchAnswer.opponentAnswer
      ) {
        const result = await finalizeMatch({ variables: { matchId: activeMatch.id } });
        setActiveMatch(result.data.finalizeWritingMatch);
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyboardChange = (input) => {
    setKeyboardInput(input);
    setAnswer(input);
  };

  const handlePhysicalKeyboardInput = (e) => {
    const newValue = e.target.value;
    setAnswer(newValue);
    setKeyboardInput(newValue);
    if (keyboardRef.current) {
      keyboardRef.current.setInput(newValue);
    }
  };

  if (loading || examLoading || pendingLoading || matchDetailsLoading) return <LoadingSpinner />;
  if (!user) return <div>Please log in.</div>;

  // Defensive check: if activeMatch exists but is missing initiator data, show fallback.
  if (activeMatch && !activeMatch.initiator) {
    return <div>Loading match details...</div>;
  }

  // If both answers exist but feedback is not yet loaded, show a loading spinner.
  if (
    activeMatch &&
    activeMatch.initiatorAnswer &&
    activeMatch.opponentAnswer &&
    (!activeMatch.initiatorFeedback || !activeMatch.opponentFeedback)
  ) {
    return (
      <div className="container my-5">
        <LoadingSpinner message="Waiting for feedback to load..." />
      </div>
    );
  }

  if (activeMatch) {
    const isInitiator = user.id === activeMatch.initiator.id;
    const myAnswer = isInitiator ? activeMatch.initiatorAnswer : activeMatch.opponentAnswer;
    const opponentAnswer = isInitiator ? activeMatch.opponentAnswer : activeMatch.initiatorAnswer;
    const myFeedback = isInitiator ? activeMatch.initiatorFeedback : activeMatch.opponentFeedback;
    const oppFeedback = isInitiator ? activeMatch.opponentFeedback : activeMatch.initiatorFeedback;

    // If match status is pending, display waiting view for match acceptance.
    if (activeMatch.status === "pending") {
      return (
        <div className="container my-5">
          <h2>{activeMatch.examTitle}</h2>
          <p>
            <strong>Question:</strong> {activeMatch.examQuestion}
          </p>
          {isInitiator ? (
            <p>
              Match Request Sent. Waiting for <strong>{activeMatch.opponent.username}</strong> to
              accept.
            </p>
          ) : (
            <div>
              <p>
                You have received a match request from{" "}
                <strong>{activeMatch.initiator.username}</strong>.
              </p>
              <button onClick={() => handleAcceptMatch(activeMatch.id)} className="btn btn-success">
                Accept Match
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="container my-5">
        <h2>{activeMatch.examTitle}</h2>
        <p>
          <strong>Question:</strong> {activeMatch.examQuestion}
        </p>
        <div className="row">
          <div className="col-md-6">
            <h4>Your Answer</h4>
            {myAnswer ? (
              <div className="border p-2">{myAnswer}</div>
            ) : (
              <>
                <textarea
                  className="form-control mb-3"
                  rows="6"
                  value={answer}
                  onChange={handlePhysicalKeyboardInput}
                  placeholder="Write your answer here..."
                />
                <Keyboard
                  keyboardRef={(r) => (keyboardRef.current = r)}
                  layout={{ default: ["é è à ç ù û ë ï ô œ ê î", "{space}"] }}
                  input={keyboardInput}
                  onChange={handleKeyboardChange}
                />
                <button onClick={handleSubmitAnswer} className="btn btn-primary mt-3">
                  Submit Your Answer
                </button>
              </>
            )}
            {myFeedback && (
              <div className="mt-3">
                <h5>Your Feedback</h5>
                <div dangerouslySetInnerHTML={{ __html: myFeedback }} />
              </div>
            )}
          </div>
          <div className="col-md-6">
            <h4>Opponent's Answer</h4>
            {opponentAnswer ? (
              activeMatch.status === "completed" ? (
                <div className="border p-2">{opponentAnswer}</div>
              ) : (
                <div className="alert alert-info">Opponent has submitted their answer.</div>
              )
            ) : (
              <div className="alert alert-warning">
                Waiting for opponent to submit their answer...
              </div>
            )}
            {oppFeedback && activeMatch.status === "completed" && (
              <div className="mt-3">
                <h5>Opponent's Feedback</h5>
                <div dangerouslySetInnerHTML={{ __html: oppFeedback }} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container my-5">
      <h2>Head-to-Head Writing Match</h2>
      <div className="card p-3 mb-4">
        <h4>Create Match Request</h4>
        <div className="mb-3">
          <input
            type="text"
            placeholder="Opponent Username"
            value={opponentUsername}
            onChange={(e) => setOpponentUsername(e.target.value)}
            className="form-control mb-2"
          />
          <label>Select Exam:</label>
          <select
            className="form-select mb-2"
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
          >
            <option value="">-- Select Exam --</option>
            {examData &&
              examData.tcfWritings.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title} ({exam.level})
                </option>
              ))}
          </select>
        </div>
        <button onClick={handleCreateMatch} className="btn btn-primary">
          Send Match Request
        </button>
      </div>

      {pendingData && pendingData.pendingMatches.length > 0 ? (
        <div>
          <h4>Pending Match Requests</h4>
          <table className="table">
            <thead>
              <tr>
                <th>Exam</th>
                <th>Question</th>
                <th>From</th>
                <th>To</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingData.pendingMatches.map((pendingMatch) => (
                <tr key={pendingMatch.id}>
                  <td>{pendingMatch.examTitle}</td>
                  <td>{pendingMatch.examQuestion}</td>
                  <td>{pendingMatch.initiator.username}</td>
                  <td>{pendingMatch.opponent.username}</td>
                  <td>
                    {user.id === pendingMatch.opponent.id ? (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleAcceptMatch(pendingMatch.id)}
                      >
                        Accept
                      </button>
                    ) : (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setActiveMatch(pendingMatch)}
                      >
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No pending match requests.</p>
      )}
    </div>
  );
};

export default HeadToHeadMatch;
