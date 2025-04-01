import React from "react";
import { Link } from "react-router-dom";

const frenchBlue = "#0055A4";
const frenchWhite = "#FFFFFF";

const HeadToHeadMatch = () => {
  const matches = [
    {
      title: "Writing H2H",
      image: "/images/writing-h2h.png",
      description: "Test your writing skills in a head-to-head match, feedback will be provided by AI",
      route: "/writing-match",
    },
    {
      title: "Image Puzzle H2H",
      image: "/images/image-h2h.png",
      description: "Solve image puzzles, guess the word for given image and outsmart your opponent.",
      route: "/image-match",
    },
  ];

  return (
    <div className="container my-5">
      <h2 className="text-center mb-4" style={{ 
        color: frenchBlue, 
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
      }}>
        Choose Your Match Type
      </h2>
      <div className="row justify-content-center">
        {matches.map((match, index) => (
          <div key={index} className="col-md-6 col-lg-4 d-flex align-items-stretch mb-4">
            <div
              className="card shadow-sm border-0 h-100"
              style={{
                borderRadius: "15px",
                backgroundColor: frenchWhite,
                overflow: "hidden",
                transition: "transform 0.3s ease",
                width: "100%", // Use full available width
              }}
            >
              <div style={{
                position: "relative",
                height: "250px", // Fixed height for image container
                overflow: "hidden"
              }}>
                <img 
                  src={match.image} 
                  className="card-img-top" 
                  alt={match.title} 
                  style={{ 
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "auto",
                    height: "100%",
                    maxWidth: "100%",
                    objectFit: "contain",
                    borderTopLeftRadius: "15px",
                    borderTopRightRadius: "15px"
                  }}
                />
              </div>
              <div className="card-body d-flex flex-column p-4">
                <h5 className="card-title mb-3" style={{ 
                  color: frenchBlue,
                  fontSize: "1.5rem",
                  minHeight: "3rem"
                }}>
                  {match.title}
                </h5>
                <p className="card-text flex-grow-1 mb-4" style={{ 
                  color: "#555",
                  fontSize: "1rem",
                  lineHeight: "1.5"
                }}>
                  {match.description}
                </p>
                <Link 
                  to={match.route} 
                  className="btn align-self-start"
                  style={{
                    backgroundColor: frenchBlue,
                    color: frenchWhite,
                    borderRadius: "20px",
                    padding: "12px 30px",
                    fontWeight: "600",
                    transition: "all 0.3s ease",
                    textDecoration: "none",
                    border: "none",
                    width: "auto",
                    marginTop: "auto"
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