// components/Home.jsx
import React from "react";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="container mt-5">
      <div className="text-center">
        <h1>Welcome to FrenchifyMe</h1>
        <p>Your ultimate platform for TCF and TEF French exam preparation!</p>
        <Link to="/register" className="btn btn-primary mt-3">
          Get Started
        </Link>
      </div>
      <section className="mt-5">
        <div className="row">
          <div className="col-md-4">
            <h3>Comprehensive Exercises</h3>
            <p>Practice reading, writing, listening, and speaking with our tailored exercises designed for all proficiency levels.</p>
          </div>
          <div className="col-md-4">
            <h3>Personalized Learning</h3>
            <p>Track your progress and get personalized feedback to help you focus on areas that need improvement.</p>
          </div>
          <div className="col-md-4">
            <h3>Mock Exams</h3>
            <p>Take mock exams that simulate the TCF/TEF format to gauge your readiness for the real test.</p>
          </div>
        </div>
      </section>
      <section className="mt-5 text-center">
        <h2>Ready to Start Your French Journey?</h2>
        <Link to="/register" className="btn btn-success mt-3">
          Sign Up Now
        </Link>
      </section>
    </div>
  );
};

export default Home;
