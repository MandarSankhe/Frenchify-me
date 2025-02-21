import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
import LoadingSpinner from "./LoadingSpinner";


const WritingMock = () => {
  const [allExams, setAllExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [currentExercise, setCurrentExercise] = useState(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [response, setResponse] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [keyboardInput, setKeyboardInput] = useState("");

  const handleKeyboardChange = (input) => {
    // Sync on-screen keyboard input directly with the response
    setKeyboardInput(input);
    setResponse(input); // Update the response directly with the on-screen keyboard input
  };
  
  const handlePhysicalKeyboardInput = (e) => {
    const newValue = e.target.value;
    setResponse(newValue); // Update response state with physical keyboard input
    setKeyboardInput(newValue); // Sync on-screen keyboard with physical input
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
        const res = await fetch("https://p6ib6bv3bg.execute-api.us-east-1.amazonaws.com/dev/graphql", {
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
  
      const res = await fetch("https://p6ib6bv3bg.execute-api.us-east-1.amazonaws.com/dev/generate-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });
  
      const data = await res.json();
      setFeedback(data.feedback || "No feedback received.");
      setResponse(""); // Clear the input field
  
    } catch (error) {
      setFeedback("Error fetching feedback. Please try again.");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };
  

  // const handleSubmitExercise = async () => {
  //   setLoading(true);
  //   try {
  //     const prompt = `
  //       Evaluate the following TCF Writing Test answer based on the question:
  //       Question: ${currentExercise}
  //       Answer: ${response}
  //       Provide detailed feedback covering:
  //         1. Content evaluation.
  //         2. Grammar and style assessment.
  //         3. Adherence to word count and the question.
  //         Conclude with a score out of 10.
  //     `;
  //     const apiResponse = await fetch(
  //       "https://api-inference.huggingface.co/models/google/flan-t5-large",
  //       {
  //         method: "POST",
  //         headers: {
  //           Authorization: `Bearer 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`,
  //           "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify({ inputs: prompt }),
  //       }
  //     );
  //     const result = await apiResponse.json();
  //     console.log(result);
  //     console.log(prompt);
  //     console.log(result.generated_text);
  //     console.log(result[0].generated_text);
  //     setFeedback(result[0].generated_text || "No feedback received.");
  //     setResponse("");
  //   } catch (error) {
  //     setFeedback("Error fetching feedback. Please try again.");
  //     console.error("Error:", error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

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
    } else {
      alert("You have completed all exercises!");
      setSelectedExam(null);
    }
  };

  if (!selectedExam) {
    return (
      <div className="container">
        <h2 className="mb-4 text-center">Select a TCF Writing Exam</h2>
        <div className="list-group">
          {allExams && allExams.length > 0 ? (
            allExams.map((exam) => (
              <button
                key={exam.id}
                className="list-group-item list-group-item-action"
                onClick={() => handleExamSelection(exam.id)}
              >
                <strong>{exam.title}</strong> - Level: {exam.level}
              </button>
            ))
          ) : (
            <p className="text-center">No exams available</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {loading && <LoadingSpinner />}
      <h2 className="text-center mb-4">Writing Test: {selectedExam.title}</h2>
      <div className="mb-4">
        <button className="btn btn-secondary" onClick={() => setSelectedExam(null)}>
          Back to Exam Selection
        </button>
      </div>
      <div className="mb-4">
        <h4>Exercise {exerciseIndex + 1}:</h4>
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
        layout={{
          default: [
            "é è à ç ù û ë ï ô œ ê î",
            "{space}",
          ],
        }}
        input={keyboardInput} // Sync on-screen keyboard input with the response
        onChange={handleKeyboardChange} // Append on-screen keyboard input to response
        onKeyPress={(button) => console.log(button)}
      />
      {feedback && (
        <div className="mt-4">
          <h5>Feedback:</h5>
          <p dangerouslySetInnerHTML={{ __html: feedback }} />
        </div>
      )}
      <div className="text-center">
        <button className="btn btn-primary me-2" onClick={handleSubmitExercise} disabled={loading}>
          {loading ? "Submitting..." : "Submit Exercise"}
        </button>
        {feedback && (
          <button className="btn btn-success" onClick={handleNextExercise}>
            Next Exercise
          </button>
        )}
      </div>
    </div>
  );
};

export default WritingMock;