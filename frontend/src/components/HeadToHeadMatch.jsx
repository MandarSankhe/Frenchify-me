import React from "react";
import { Link } from "react-router-dom";

// Define color constants
const frenchBlue = "#0055A4";
const frenchRed = "#EF4135";
const frenchWhite = "#FFFFFF";

const HeadToHeadMatch = () => {
  const matches = [
    {
      title: "Writing Exam",
      image: "https://i0.wp.com/writershelpingwriters.net/wp-content/uploads/2021/06/iss_4266_03847.jpg?ssl=1", 
      description: "Test your writing skills in a head-to-head match.",
      route: "/writing-match",
    },
    {
      title: "Puzzle Exam",
      image: "https://media.istockphoto.com/id/1746657656/vector/confrontation.jpg?s=612x612&w=0&k=20&c=-Uq9mVh8v3VzctOu2kKeOVZr9dv7KiOsPDCRojMR8eE=", 
      description: "Solve puzzles and outsmart your opponent.",
      route: "/puzzle-match",
    },
    {
      title: "Quiz Exam",
      image: "https://media.gq.com/photos/5a85afc4a5e5ab37549d55ce/16:9/w_2560%2Cc_limit/gq-trivia.jpg", 
      description: "Answer quick questions in a thrilling quiz match.",
      route: "/quiz-match",
    },
  ];

  return (
    <div className="container my-5">
      <h2 className="text-center mb-4" style={{ color: frenchBlue, fontFamily: 'Arial, sans-serif' }}>
        Choose Your Match Type
      </h2>
      <div className="row">
        {matches.map((match, index) => (
          <div key={index} className="col-md-4 d-flex align-items-stretch mb-4">
            <div
              className="card shadow-sm border-0"
              style={{
                borderRadius: "15px",
                backgroundColor: frenchWhite,
                overflow: "hidden",
                height: "100%",
              }}
            >
              <img 
                src={match.image} 
                className="card-img-top" 
                alt={match.title} 
                style={{ height: "200px", objectFit: "cover", borderTopLeftRadius: "15px", borderTopRightRadius: "15px" }}
              />
              <div className="card-body d-flex flex-column">
                <h5 className="card-title" style={{ color: frenchBlue }}>{match.title}</h5>
                <p className="card-text flex-grow-1" style={{ color: "#555" }}>{match.description}</p>
                <Link 
                  to={match.route} 
                  className="btn"
                  style={{
                    backgroundColor: frenchBlue,
                    color: frenchWhite,
                    borderRadius: "20px",
                    padding: "10px 20px",
                    textAlign: "center",
                    fontWeight: "bold",
                    transition: "background-color 0.3s ease",
                  }}
                >
                  Start Match
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HeadToHeadMatch;
