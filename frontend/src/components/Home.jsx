import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const Home = () => {
  // French flag colors
  const frenchBlue = "#0055A4";
  const frenchRed = "#EF4135";
  const frenchWhite = "#FFFFFF";

  return (
    <div>
      {/* Hero Section */}
      <div className="container mt-5">
        <div className="row align-items-center">
          {/* Animated Logo */}
          <div className="col-md-6 text-center mb-4 mb-md-0">
            <img
              src="animated-logo.gif"
              alt="Animated Logo"
              className="img-fluid"
              style={{
                maxWidth: "80%",
                borderRadius: "10px",
                boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
              }}
            />
          </div>
          {/* Welcome Message */}
          <div className="col-md-6">
            <h1 style={{ color: frenchRed, fontWeight: "bold" }}>
              Bienvenue sur Frenchify
            </h1>
            <p className="lead" style={{ color: frenchBlue }}>
              Your ultimate destination to learn French—with interactive lessons,
              engaging mock tests, and a vibrant community to support your journey.
            </p>
            <a
              href="/readingmock"
              className="btn btn-lg"
              style={{
                backgroundColor: frenchRed,
                color: frenchWhite,
                border: "none",
              }}
            >
              Get Started
            </a>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mt-5">
        <h2 className="text-center mb-4" style={{ color: frenchBlue }}>
          What We Offer
        </h2>
        <div className="row">
          {/* Feature Card 1 */}
          <div className="col-md-4 mb-4">
            <div
              className="card h-100 shadow"
              style={{ border: `2px solid ${frenchBlue}` }}
            >
              <div className="card-body">
                <h5 className="card-title" style={{ color: frenchRed }}>
                  Interactive Lessons
                </h5>
                <p className="card-text">
                  Learn French through immersive lessons designed to engage and inspire.
                </p>
              </div>
            </div>
          </div>
          {/* Feature Card 2 */}
          <div className="col-md-4 mb-4">
            <div
              className="card h-100 shadow"
              style={{ border: `2px solid ${frenchBlue}` }}
            >
              <div className="card-body">
                <h5 className="card-title" style={{ color: frenchRed }}>
                  Realistic Mock Exams
                </h5>
                <p className="card-text">
                  Prepare for your exams with our realistic mock tests and detailed feedback.
                </p>
              </div>
            </div>
          </div>
          {/* Feature Card 3 */}
          <div className="col-md-4 mb-4">
            <div
              className="card h-100 shadow"
              style={{ border: `2px solid ${frenchBlue}` }}
            >
              <div className="card-body">
                <h5 className="card-title" style={{ color: frenchRed }}>
                  Community Support
                </h5>
                <p className="card-text">
                  Connect with fellow learners and native speakers for tips, support,
                  and cultural insights.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-5 py-4" style={{ backgroundColor: frenchBlue }}>
        <div className="container text-center">
          <p style={{ color: frenchWhite, margin: 0 }}>
            &copy; {new Date().getFullYear()} Frenchify. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
