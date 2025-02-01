// components/Home.jsx
import React from "react";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="container mt-5">
      <div className="text-center">
        <h1 className="text-primary">Welcome to FrenchifyMe</h1>
        <p>Your ultimate platform for TCF and TEF French exam preparation!</p>
        <img src="../animated-logo.gif" alt="Frenchify GIF" className="img-fluid my-3" />
      </div>
      <section className="mt-5">
        <div className="row">
          <div className="col-md-4 px-3">
            <h3 className="text-center">Comprehensive Training</h3>
            <p className="text-center">Practice reading, writing, listening, and speaking with our tailored exercises designed for all levels.</p>
          </div>
          <div className="col-md-4 px-3">
            <h3 className="text-center">Personalized Learning</h3>
            <p className="text-center">Track your progress and get personalized feedback to help you focus on areas that need improvement.</p>
          </div>
          <div className="col-md-4 px-3">
            <h3 className="text-center">Mock Exams</h3>
            <p className="text-center">Take mock exams that simulate the TCF/TEF format to gauge your readiness for the real test.</p>
          </div>
        </div>
      </section>
      <section className="mt-5 text-center">
        <h2>Ready to Start Your French Journey?</h2>
        <Link to="/register" className="btn btn-success mt-3 p-2 ps-4 pe-4">
          Sign Up Now
        </Link>
      </section>
    </div>
  );
};

export default Home;
