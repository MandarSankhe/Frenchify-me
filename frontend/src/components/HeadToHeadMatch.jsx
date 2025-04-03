import React from "react";
import { Link } from "react-router-dom";

const frenchBlue = "#0055A4";
const frenchWhite = "#FFFFFF";
const deepGray = "#1f1f1f";
const softGray = "#f8f9fa";

const HeadToHeadMatch = () => {
  const matches = [
    {
      title: "Writing H2H",
      image: "/images/writing-h2h.png",
      description: "Test your writing skills in a head-to-head match, feedback will be provided by AI.",
      route: "/writing-match",
    },
    {
      title: "Image Puzzle H2H",
      image: "/images/image-h2h.png",
      description: "Solve image puzzles, guess the word for the given image, and outsmart your opponent.",
      route: "/image-match",
    },
  ];

  return (
    <div className="container py-5" style={{ backgroundColor: softGray }}>
      <h2
        className="text-center mb-5"
        style={{
          color: frenchBlue,
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          fontWeight: 700,
          fontSize: "2.5rem",
          textShadow: "1px 1px 2px rgba(0,0,0,0.15)",
        }}
      >
        Choose Your Match Type
      </h2>
      <div className="row justify-content-center">
        {matches.map((match, index) => (
          <div
            key={index}
            className="col-md-6 col-lg-4 d-flex align-items-stretch mb-4"
          >
            <div
              className="card shadow-lg border-0 h-100"
              style={{
                borderRadius: "20px",
                overflow: "hidden",
                backgroundColor: "#ffffff",
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.03)";
                e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.075)";
              }}
            >
              <div
                style={{
                  position: "relative",
                  height: "250px",
                  overflow: "hidden",
                  backgroundColor: "#eef3f7",
                }}
              >
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
                  }}
                />
              </div>
              <div className="card-body d-flex flex-column p-4">
                <h5
                  className="card-title"
                  style={{
                    color: deepGray,
                    fontWeight: 600,
                    fontSize: "1.6rem",
                    marginBottom: "1rem",
                  }}
                >
                  {match.title}
                </h5>
                <p
                  className="card-text flex-grow-1"
                  style={{
                    color: "#555",
                    fontSize: "1.05rem",
                    lineHeight: "1.6",
                    marginBottom: "1.5rem",
                  }}
                >
                  {match.description}
                </p>
                <Link
                  to={match.route}
                  className="btn align-self-start"
                  style={{
                    backgroundColor: frenchBlue,
                    color: frenchWhite,
                    borderRadius: "25px",
                    padding: "12px 28px",
                    fontWeight: "600",
                    fontSize: "1rem",
                    letterSpacing: "0.5px",
                    boxShadow: "0 4px 12px rgba(0, 85, 164, 0.3)",
                    transition: "all 0.3s ease",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.boxShadow =
                      "0 6px 18px rgba(0, 85, 164, 0.5)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(0, 85, 164, 0.3)")
                  }
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
