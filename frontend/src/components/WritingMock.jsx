import React, { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
import LoadingSpinner from "./LoadingSpinner";

// French flag colors
const frenchBlue = "#0055A4";
const frenchRed = "#EF4135";
const frenchWhite = "#FFFFFF";

// Helper to return an exam image based on level
const getExamImage = (level) => {
  switch (level) {
    case "Beginner":
      return "https://st.depositphotos.com/68420530/61027/i/450/depositphotos_610276066-stock-photo-cheerful-young-pupil-secondary-school.jpg";
    case "Intermediate":
      return "https://www.learnfrenchathome.com/wp-content/uploads/2023/12/IB-French-A-Level-French-Courses-GCSE.jpg";
    case "Advanced":
      return "https://admissionsight.com/wp-content/uploads/2020/09/shutterstock_2072405507-768x512.jpg";
    default:
      return "https://www.globaltimes.cn/Portals/0/attachment/2022/2022-09-16/913af628-a364-4f82-8bc3-2bfc27f19699.jpeg";
  }
};

// Helper to return a border style based on exam level
const getLevelStyle = (level) => {
  switch (level) {
    case "Beginner":
      return { border: `2px solid ${frenchBlue}` };
    case "Intermediate":
      return { border: `2px solid ${frenchBlue}`, backgroundColor: "#f8f9fa" };
    case "Advanced":
      return { border: `2px solid ${frenchRed}` };
    default:
      return { border: "2px solid #6c757d" };
  }
};

// Dynamic FeedbackDisplay Component
const FeedbackDisplay = ({ feedback }) => {
  if (!feedback) return null;

  // Remove any <think> blocks (and their content)
  const feedbackWithoutThink = feedback.replace(/<think>[\s\S]*?<\/think>/gi, "");

  // Extract overall score.
  // This regex now accepts optional asterisks around "Score:" and supports decimals.
  let extractedScore = null;
  const scoreMatch = feedbackWithoutThink.match(/(?:\*+)?Score:(?:\*+)?\s*([0-9]+\.?[0-9]*\/10)/i);
  if (scoreMatch) {
    extractedScore = scoreMatch[1];
  }

  // Split feedback into lines using <br> as a delimiter.
  const lines = feedbackWithoutThink
    .split(/<br\s*\/?>/gi)
    .map(line => line.trim())
    .filter(Boolean);

  // Containers for dynamic sections and overall commentary.
  const sections = {};
  let currentSection = null;
  const commentary = [];

  // Helper to extract header tokens from a line (anything between **)
  const processLineForHeaders = (line) => {
    const headerRegex = /\*\*(.+?)\*\*/g;
    let match;
    const headerTokens = [];
    let modifiedLine = line;
    while ((match = headerRegex.exec(line)) !== null) {
      const token = match[1].trim();
      headerTokens.push(token);
      // Remove this header token from the line.
      modifiedLine = modifiedLine.replace(match[0], "").trim();
    }
    return { headerTokens, modifiedLine };
  };

  // Process each line dynamically.
  lines.forEach((line) => {
    const { headerTokens, modifiedLine } = processLineForHeaders(line);
    if (headerTokens.length > 0) {
      headerTokens.forEach((token) => {
        // If the token contains "score:", extract the score and do not treat it as a header.
        if (/score:/i.test(token)) {
          const innerScoreMatch = token.match(/Score:\s*([0-9]+\.?[0-9]*\/10)/i);
          if (innerScoreMatch) {
            extractedScore = innerScoreMatch[1];
          }
          // Do not update currentSection for a score token.
        } else {
          // Otherwise, treat this token as a new section header.
          currentSection = token;
          if (!sections[currentSection]) {
            sections[currentSection] = [];
          }
        }
      });
    }
    // If there is remaining text, add it under the current section (if any), or as overall commentary.
    if (modifiedLine) {
      if (currentSection) {
        sections[currentSection].push(modifiedLine);
      } else {
        commentary.push(modifiedLine);
      }
    }
  });

  return (
    <div>
      {extractedScore && (
        <h4 style={{ color: frenchRed, marginBottom: "1rem" }}>
          Score: {extractedScore}
        </h4>
      )}
      {Object.entries(sections).map(([section, items]) => (
        <div key={section} className="mb-3">
          <h5 style={{ color: frenchBlue }}>{section}</h5>
          <ul>
            {items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
      {commentary.length > 0 && (
        <div className="mb-3">
          <h5 style={{ color: frenchBlue }}>Overall Comments</h5>
          <p>{commentary.join(" ")}</p>
        </div>
      )}
    </div>
  );
};

const WritingMock = () => {
  const [allExams, setAllExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [currentExercise, setCurrentExercise] = useState(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [response, setResponse] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [keyboardInput, setKeyboardInput] = useState("");

  // Create a ref for the on-screen keyboard
  const keyboardRef = useRef(null);

  const GRAPHQL_ENDPOINT = `${process.env.REACT_APP_API_URL || "http://localhost:4000"}/graphql`;
  const API_ENDPOINT = process.env.REACT_APP_API_URL || "http://localhost:4000";

  // Handle input from on-screen keyboard
  const handleKeyboardChange = (input) => {
    setKeyboardInput(input);
    setResponse(input);
    setWordCount(countWords(input));
  };

  // Function to count the number of words
  const countWords = (text) => {
    return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  };

  // Handle input from the physical keyboard
  const handlePhysicalKeyboardInput = (e) => {
    const newValue = e.target.value;
    setResponse(newValue);
    setKeyboardInput(newValue);
    setWordCount(countWords(newValue));
    if (keyboardRef.current) {
      keyboardRef.current.setInput(newValue);
    }
  };

  // Fetch all writing exams
  useEffect(() => {
    const fetchAllTCFWritings = async () => {
      const query = `
        query GetAllTCFWritings {
          tcfWritings {
            id
            title
            level
            exercise1
            exercise2
            exercise3
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
        setAllExams(result.data.tcfWritings);
      } catch (error) {
        console.error("Error fetching TCF writings:", error);
      }
    };

    fetchAllTCFWritings();
  }, []);

  const handleExamSelection = (examId) => {
    const exam = allExams.find((e) => e.id === examId);
    setSelectedExam(exam);
    setExerciseIndex(0);
    setFeedback("");
    setCurrentExercise(exam.exercise1);
    setWordCount(0);
  };

  const handleSubmitExercise = async () => {
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

      const data = await res.json();
      // If no feedback is returned, set a default message.
      setFeedback(data.feedback || "No feedback received.");
      setResponse("");
      setKeyboardInput("");
      if (keyboardRef.current) {
        keyboardRef.current.setInput("");
      }
      setWordCount(0);
    } catch (error) {
      setFeedback("Error fetching feedback. Please try again.");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNextExercise = () => {
    const exercises = [
      selectedExam.exercise1,
      selectedExam.exercise2,
      selectedExam.exercise3,
    ];
    if (exerciseIndex + 1 < exercises.length) {
      setExerciseIndex(exerciseIndex + 1);
      setCurrentExercise(exercises[exerciseIndex + 1]);
      setFeedback("");
      setResponse("");
      setKeyboardInput("");
      if (keyboardRef.current) {
        keyboardRef.current.setInput("");
      }
    } else {
      alert("You have completed all exercises!");
      setSelectedExam(null);
    }
  };

  // Styles for inline styling using French flag colors
  const containerStyle = {
    backgroundColor: frenchWhite,
    minHeight: "100vh",
    padding: "2rem",
  };

  const headerStyle = { color: frenchBlue, fontWeight: "bold" };
  const buttonStyle = {
    backgroundColor: frenchRed,
    borderColor: frenchRed,
    color: frenchWhite,
  };
  const secondaryButtonStyle = {
    backgroundColor: frenchBlue,
    borderColor: frenchBlue,
    color: frenchWhite,
  };

  // If no exam is selected, show the exam selection screen
  if (!selectedExam) {
    return (
      <div className="container my-5">
        <h2 className="mb-5 text-center" style={{ color: frenchRed }}>
          Select a TCF Writing Exam
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
            ))
          ) : (
            <p className="text-center">No exams available</p>
          )}
        </div>
      </div>
    );
  }

  // Main writing exam interface
  return (
    <div className="container" style={containerStyle}>
      {loading && <LoadingSpinner />}
      <h2 className="text-center mb-4" style={headerStyle}>
        Writing Test: {selectedExam.title}
      </h2>
      <div className="mb-4">
        <button
          className="btn mb-3"
          style={secondaryButtonStyle}
          onClick={() => setSelectedExam(null)}
        >
          Back to Exam Selection
        </button>
      </div>
      <div className="mb-4">
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-md-between text-center text-md-start">
          <h4 style={{ color: frenchBlue }}>
            Exercise {exerciseIndex + 1}:
          </h4>
          <span className="fw-bold text-primary fs-5 mt-2 mt-md-0 mb-2 text-center text-md-end">
            Word Count: <span className="fs-4">{wordCount}</span>
          </span>
        </div>
        <p>{currentExercise}</p>
        <textarea
          className="form-control"
          rows="5"
          value={response}
          onChange={handlePhysicalKeyboardInput}
          placeholder="Write your answer here..."
        />
      </div>
      <Keyboard
        keyboardRef={(r) => (keyboardRef.current = r)}
        layout={{
          default: ["é è à ç ù û ë ï ô œ ê î", "{space}"],
        }}
        input={keyboardInput}
        onChange={handleKeyboardChange}
      />
      {feedback && (
        <div className="mt-4 p-3 border rounded" style={{ backgroundColor: "#f8f9fa" }}>
          <h5 style={{ color: frenchBlue, borderBottom: `1px solid ${frenchBlue}` }}>
            Feedback
          </h5>
          <FeedbackDisplay feedback={feedback} />
        </div>
      )}
      <div className="text-center mt-5">
        <button
          className="btn me-2 py-2 px-3"
          style={buttonStyle}
          onClick={handleSubmitExercise}
          disabled={loading || feedback}
        >
          {loading ? "Submitting..." : "Submit Exercise"}
        </button>
        {feedback && (
          <button
            className="btn me-2 py-2 px-3"
            style={secondaryButtonStyle}
            onClick={handleNextExercise}
          >
            Next Exercise
          </button>
        )}
      </div>
    </div>
  );
};

export default WritingMock;
