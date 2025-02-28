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
      return "https://www.tesl-lugano.ch/wp-content/uploads/2023/10/francese-cover-ragazzi.jpg";
    case "Intermediate":
      return "https://www.learnfrenchathome.com/wp-content/uploads/2023/12/IB-French-A-Level-French-Courses-GCSE.jpg";
    case "Advanced":
      return "https://www.frenchclass.in/wp-content/uploads/2024/04/French-Language-Certifications-Banner-Image.webp";
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
        const res = await fetch(
          "http://localhost:4000/graphql",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query }),
          }
        );
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
        
        Provide detailed feedback on the answer, including:
        - Strengths
        - Weaknesses
        - Language and grammar assessment
        Conclude with a score out of 10.
      `;

      const res = await fetch(
        "http://localhost:4000/generate-feedback",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        }
      );

      const data = await res.json();
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

  // If no exam is selected, show the exam selection screen with updated UI
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
          <h4 style={{ color: frenchBlue }}>Exercise {exerciseIndex + 1}:</h4>
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
        <div className="mt-4">
          <h5 style={{ color: frenchBlue }}>Feedback:</h5>
          <p dangerouslySetInnerHTML={{ __html: feedback }} />
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