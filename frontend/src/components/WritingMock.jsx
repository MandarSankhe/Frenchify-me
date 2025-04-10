import React, { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
import LoadingSpinner from "./LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import { Helmet } from "react-helmet";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks"; // Import remark-breaks

// French flag colors
const frenchBlue = "#0055A4";
const frenchRed = "#EF4135";
const frenchWhite = "#FFFFFF";

// Style constants
const customStyles = {
  fontFamily: "'Inter', sans-serif",
  borderRadius: "12px",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  shadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
};

const getExamImage = (level) => {
  switch (level) {
    case "Beginner":
      return "images/writing1.png";
    case "Intermediate":
      return "images/writing2.png";
    case "Advanced":
      return "images/writing3.png";
    default:
      return "https://www.globaltimes.cn/Portals/0/attachment/2022/2022-09-16/913af628-a364-4f82-8bc3-2bfc27f19699.jpeg";
  }
};

const levelBadges = {
  Beginner: { text: "A1-A2", color: frenchBlue },
  Intermediate: { text: "B1-B2", color: "#FFD700" },
  Advanced: { text: "C1-C2", color: frenchRed },
};

const WritingMock = () => {
  const { user } = useAuth();
  const [allExams, setAllExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [currentExercise, setCurrentExercise] = useState(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  // We use one state value "response" to hold the text from both physical and onscreen keyboards.
  const [response, setResponse] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  // We also maintain a controlled value for the on-screen keyboard.
  const [keyboardInput, setKeyboardInput] = useState("");
  const keyboardRef = useRef(null);

  const GRAPHQL_ENDPOINT = `${process.env.REACT_APP_API_URL || "http://localhost:4000"}/graphql`;
  const API_ENDPOINT = process.env.REACT_APP_API_URL || "http://localhost:4000";

  // Fetch exams
  useEffect(() => {
    const fetchExams = async () => {
      const query = `{ tcfWritings { id title level exercise1 exercise2 exercise3 } }`;
      try {
        const res = await fetch(GRAPHQL_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const { data } = await res.json();
        setAllExams(data.tcfWritings);
      } catch (error) {
        console.error("Error fetching exams:", error);
      }
    };
    fetchExams();
  }, []);

  // Update both response and the keyboard's input when the on-screen keyboard changes.
  const handleKeyboardChange = (input) => {
    setKeyboardInput(input);
    setResponse(input);
    setWordCount(input.trim().split(/\s+/).filter(Boolean).length);
  };

  // When the user types with a physical keyboard, update both states and inform the on-screen keyboard.
  const handleTextareaChange = (e) => {
    const newValue = e.target.value;
    setResponse(newValue);
    setWordCount(newValue.trim().split(/\s+/).filter(Boolean).length);
    setKeyboardInput(newValue);
    if (keyboardRef.current) {
      keyboardRef.current.setInput(newValue);
    }
  };

  const handleExamSelect = (exam) => {
    setSelectedExam(exam);
    setCurrentExercise(exam.exercise1);
    setExerciseIndex(0);
    setFeedback("");
    setResponse("");
    setKeyboardInput("");
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const prompt = `
      Evaluate the following TCF French Writing Test answer based on the question:
      Question: ${currentExercise}
      Answer: ${response}
      
      Provide detailed feedback on the answer in English, must have 4 points:
      - **Strengths:** (e.g., clear structure, effective use of descriptive language)
      - **Weaknesses:** (e.g., brevity, grammatical mistakes)
      - **Language and grammar assessment:** (e.g., vocabulary, syntax)
      - **Score:**
      Conclude with a score out of 10. Above 4 sections are must.
    `;
      const res = await fetch(`${API_ENDPOINT}/generate-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const { feedback } = await res.json();
      setFeedback(feedback);

      // Extract the score: first remove any <br> tags and then match "Score: <number>/10"
      console.log("Feedback:", feedback);
      const scoreMatch = feedback.match(/([\d.]+)\s*\/\s*10/);
      console.log("Score Match:", scoreMatch);
      const score = scoreMatch?.[1] || "0";
      console.log("Extracted Score:", score);

      await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `mutation ($input: TestScoreInput!) {
            submitTestScore(input: $input) { id }
          }`,
          variables: {
            input: {
              userId: user.id,
              testModelName: "TcfWriting",
              testId: selectedExam.id,
              score: parseFloat(score)
            }
          }
        })
      });

      // Clear states after submission.
      setResponse("");
      setKeyboardInput("");
      if (keyboardRef.current) {
        keyboardRef.current.clearInput();
      }
    } catch (error) {
      setFeedback("Error submitting response");
    } finally {
      setLoading(false);
    }
  };

  const handleNextExercise = () => {
    const exercises = [selectedExam.exercise1, selectedExam.exercise2, selectedExam.exercise3];
    if (exerciseIndex >= exercises.length - 1) {
      setSelectedExam(null);
      return;
    }
    setExerciseIndex((prev) => prev + 1);
    setCurrentExercise(exercises[exerciseIndex + 1]);
    setFeedback("");
    setResponse("");
    setKeyboardInput("");
  };

  const countWords = (text) => text.trim().split(/\s+/).filter(Boolean).length;

  // Pre-process feedback for rendering and score extraction
  const plainFeedback = feedback.replace(/<br\s*\/?>/g, "\n");
  const extractedScore = feedback.replace(/<br\s*\/?>/g, " ").match(/([\d.]+)\s*\/\s*10/)?.[1] || "0";

  return (
    <div style={{ ...customStyles, minHeight: "100vh", backgroundColor: frenchWhite }}>
      <Helmet>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          .keyboard-button { font-family: 'Inter', sans-serif !important; }
          textarea:focus { border-color: ${frenchBlue} !important; box-shadow: 0 0 0 3px ${frenchBlue}33 !important; }
        `}</style>
      </Helmet>

      {!selectedExam ? (
        <div className="container py-5">
          <h1 className="text-center mb-5 display-4 fw-bold" style={{ color: frenchRed }}>
            TCF Writing Exams
          </h1>
          <div className="row g-4">
            {allExams.map((exam) => (
              <div key={exam.id} className="col-lg-4 col-md-6">
                <div
                  className="card h-100 border-0 shadow-sm overflow-hidden"
                  style={{
                    cursor: "pointer",
                    transition: "transform 0.3s, box-shadow 0.3s",
                    borderRadius: customStyles.borderRadius,
                  }}
                  onClick={() => handleExamSelect(exam)}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-8px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
                >
                  <div className="position-relative" style={{ height: "200px", overflow: "hidden" }}>
                    <img
                      src={getExamImage(exam.level)}
                      alt={exam.title}
                      className="img-fluid"
                      style={{ objectFit: "cover", height: "100%", width: "100%" }}
                    />
                    <div className="position-absolute top-0 end-0 m-3">
                      <span
                        className="badge rounded-pill px-3 py-2"
                        style={{
                          backgroundColor: levelBadges[exam.level].color,
                          color: frenchWhite,
                          fontSize: "0.9rem",
                        }}
                      >
                        {levelBadges[exam.level].text}
                      </span>
                    </div>
                  </div>
                  <div className="card-body d-flex flex-column">
                    <h3 className="card-title mb-3" style={{ color: frenchBlue }}>
                      {exam.title}
                    </h3>
                    <div className="mt-auto">
                      <hr style={{ borderColor: frenchRed }} />
                      <div className="d-flex justify-content-between align-items-center">
                        <small className="text-muted">3 Exercises</small>
                        <button
                          className="btn btn-sm"
                          style={{
                            backgroundColor: frenchRed,
                            color: frenchWhite,
                            padding: "0.25rem 1rem",
                          }}
                        >
                          Start Test
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="container py-5">
          <div className="shadow-lg rounded-3 p-4" style={{ backgroundColor: frenchWhite }}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <button
                className="btn fw-medium"
                onClick={() => setSelectedExam(null)}
                style={{
                  backgroundColor: frenchRed,
                  color: frenchWhite,
                  padding: "0.75rem 1.5rem",
                  borderRadius: "8px",
                }}
              >
                ← Back to Exams
              </button>
              <div className="text-end">
                <h1 className="mb-1" style={{ color: frenchBlue }}>
                  {selectedExam.title}
                </h1>
                <span
                  className="badge rounded-pill px-3 py-2"
                  style={{
                    backgroundColor: levelBadges[selectedExam.level].color,
                    color: frenchWhite,
                  }}
                >
                  {levelBadges[selectedExam.level].text}
                </span>
              </div>
            </div>

            {/* Exercise Content */}
            <div className="mb-4">
              <div
                className="mb-4 p-3 rounded"
                style={{ backgroundColor: "#f8f9fa", border: `2px solid ${frenchBlue}` }}
              >
                <h4 style={{ color: frenchBlue }} className="mb-3">
                  Exercise {exerciseIndex + 1} of 3
                </h4>
                <p className="lead mb-0" style={{ color: frenchBlue }}>
                  {currentExercise}
                </p>
              </div>

              <textarea
                className="form-control mb-3"
                rows="6"
                value={response}
                onChange={handleTextareaChange}
                placeholder="Write your response here..."
                style={{
                  border: `2px solid ${frenchBlue}`,
                  borderRadius: "8px",
                  fontSize: "1rem",
                  lineHeight: "1.6",
                }}
              />

              <div className="d-flex justify-content-between align-items-center mb-4">
                <span
                  className="badge px-3 py-2"
                  style={{
                    backgroundColor: frenchBlue,
                    color: frenchWhite,
                    borderRadius: "20px",
                  }}
                >
                  {wordCount} words
                </span>
                <button
                  className="btn fw-medium"
                  onClick={handleSubmit}
                  disabled={loading || feedback}
                  style={{
                    backgroundColor: frenchRed,
                    color: frenchWhite,
                    padding: "0.75rem 2rem",
                    borderRadius: "8px",
                    opacity: loading || feedback ? 0.7 : 1,
                  }}
                >
                  {loading ? "Analyzing..." : "Submit Response"}
                </button>
              </div>

              <Keyboard
                keyboardRef={(r) => (keyboardRef.current = r)}
                layout={{ default: ["é è à ç ù û ë ï ô œ ê î", "{space}"] }}
                input={keyboardInput}
                onChange={handleKeyboardChange}
                theme="hg-theme-default hg-layout-default"
                display={{ "{space}": "SPACE" }}
                buttonTheme={[
                  {
                    class: "hg-red",
                    buttons: "{space}",
                    style: { backgroundColor: frenchRed, color: frenchWhite },
                  },
                ]}
                style={{ borderRadius: "8px" }}
              />
            </div>

            {/* Feedback Section */}
            {feedback && (
              <div className="mt-4 p-4 rounded-3" style={{ border: `2px solid ${frenchBlue}` }}>
                <h3 className="mb-4" style={{ color: frenchBlue }}>
                  Feedback
                </h3>
                <div
                  className="score-display mb-4 p-3 text-center rounded"
                  style={{ backgroundColor: frenchBlue, color: frenchWhite }}
                >
                  {extractedScore}/10
                </div>

                <div className="feedback-content" style={{ color: frenchBlue }}>
                  <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                    {plainFeedback}
                  </ReactMarkdown>
                </div>

                <div className="text-center mt-4">
                  <button
                    className="btn fw-medium"
                    onClick={handleNextExercise}
                    style={{
                      backgroundColor: frenchBlue,
                      color: frenchWhite,
                      padding: "0.75rem 2.5rem",
                      borderRadius: "8px",
                    }}
                  >
                    Next Exercise →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {loading && <LoadingSpinner />}
    </div>
  );
};

export default WritingMock;
