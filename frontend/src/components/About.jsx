import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const About = () => {
  // Color definitions
  const frenchBlue = "#0055A4";
  const frenchRed = "#EF4135";
  const lightBlue = "#E6F0FA";
  const lightRed = "#FDECEA";

  return (
    <div className="container my-5">
      {/* Hero Section */}
      <section 
        className="text-center p-5 rounded mb-5"
        style={{ 
          backgroundColor: lightBlue,
          borderBottom: `5px solid ${frenchBlue}`
        }}
      >
        <h1 className="display-4 fw-bold mb-3" style={{ color: frenchBlue }}>
          Learn French Free - Master TEF & TCF Exams for Immigration & Careers
        </h1>
        <p 
          className="lead fs-4" 
          style={{ 
            color: frenchRed,
            maxWidth: "800px",
            margin: "0 auto"
          }}
        >
          Canada's premier free platform for French language learning - preparing you for immigration, education, and professional success
        </p>
      </section>

      {/* Our Story Section */}
      <section className="row mb-5">
        <div className="col-lg-8 mx-auto">
          <div className="card border-0 shadow-lg overflow-hidden">
            <div className="row g-0">
              <div 
                className="col-md-5 d-flex align-items-center"
                style={{ backgroundColor: lightRed }}
              >
                <img
                  src="VRMX Ghibly.png"
                  alt="Founders creating French learning platform"
                  className="img-fluid p-3"
                />
              </div>
              <div className="col-md-7">
                <div className="card-body p-4">
                  <h2 
                    className="display-6 mb-4 fw-bold" 
                    style={{ color: frenchBlue }}
                  >
                    Our Story
                  </h2>
                  <p style={{ color: frenchBlue }}>
                    <span className="d-block fw-bold mb-2" style={{ color: frenchRed }}>It all began at the University of Waterloo...</span>
                    One of our founders was struggling to find proper resources to learn French for his academic and career goals. Frustrated by the lack of accessible, high-quality and free learning materials specifically designed for <strong>TEF/TCF exams</strong> and <strong>Canadian immigration</strong>, he teamed up with two friends to create a solution.
                  </p>
                  <p style={{ color: frenchBlue }}>
                    What started as a personal challenge transformed into a mission to help thousands of learners across Canada. We built this platform to provide:
                  </p>
                  <ul className="mb-3" style={{ color: frenchBlue }}>
                    <li><strong>Free, high-quality French lessons</strong> tailored for exam success</li>
                    <li><strong>Dynamic content generation</strong> to keep materials fresh and relevant</li>
                    <li><strong>Immigration-focused curriculum</strong> aligned with IRCC requirements</li>
                  </ul>
                  <p style={{ color: frenchBlue }}>
                    Today, we're proud to serve students, professionals, and immigrants across Canada, helping them achieve their language goals without financial barriers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="row g-4 mb-5">
        <div className="col-lg-6">
          <div 
            className="card h-100 border-0 shadow-lg"
            style={{ borderTop: `5px solid ${frenchRed}` }}
          >
            <div className="card-body p-4">
              <div 
                className="d-flex align-items-center mb-4"
                style={{ color: frenchRed }}
              >
                <div className="bg-danger bg-opacity-10 p-3 rounded-circle me-3">
                  <i className="bi bi-bullseye fs-4"></i>
                </div>
                <h2 className="h3 mb-0">Our Mission</h2>
              </div>
              <p className="card-text fs-5" style={{ color: frenchBlue }}>
                To provide <strong>free, high-quality French lessons</strong> that empower immigrants, students, and professionals to achieve their goals. Whether preparing for <strong>TEF Canada</strong>, <strong>TCF Canada</strong>, or improving French for <strong>Express Entry</strong>, we make language learning accessible to all.
              </p>
            </div>
          </div>
        </div>
        
        <div className="col-lg-6">
          <div 
            className="card h-100 border-0 shadow-lg"
            style={{ borderTop: `5px solid ${frenchBlue}` }}
          >
            <div className="card-body p-4">
              <div 
                className="d-flex align-items-center mb-4"
                style={{ color: frenchBlue }}
              >
                <div className="bg-primary bg-opacity-10 p-3 rounded-circle me-3">
                  <i className="bi bi-eye fs-4"></i>
                </div>
                <h2 className="h3 mb-0">Our Vision</h2>
              </div>
              <p className="card-text fs-5" style={{ color: frenchBlue }}>
                To become Canada's most trusted <strong>free French learning resource</strong>, helping thousands succeed in their <strong>Canadian immigration</strong> journey, <strong>university applications</strong>, and <strong>career advancement</strong> through language mastery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Learn With Us */}
      <section className="row align-items-center g-5 mb-5">
        <div className="col-lg-6">
          <div className="p-3 rounded" style={{ backgroundColor: lightRed }}>
            <img
              src="VRMX Ghibly.png"
              alt="Free French Learning Platform for TEF TCF Exams"
              className="img-fluid rounded shadow"
              style={{ border: `3px solid ${frenchRed}` }}
            />
          </div>
        </div>
        
        <div className="col-lg-6">
          <h2 
            className="display-6 mb-4 fw-bold" 
            style={{ color: frenchBlue }}
          >
            Why Learn With Us?
          </h2>
          <ul className="list-unstyled">
            <li className="mb-3 d-flex">
              <span 
                className="me-3 fw-bold" 
                style={{ 
                  color: frenchRed,
                  minWidth: "30px"
                }}
              >
                01
              </span>
              <span style={{ color: frenchBlue }}>
                <strong>Completely Free</strong> - No hidden fees for our <strong>French lessons</strong> and <strong>exam preparation</strong> materials
              </span>
            </li>
            <li className="mb-3 d-flex">
              <span 
                className="me-3 fw-bold" 
                style={{ 
                  color: frenchRed,
                  minWidth: "30px"
                }}
              >
                02
              </span>
              <span style={{ color: frenchBlue }}>
                <strong>Exam-Focused</strong> - Specialized courses for <strong>TEF Canada</strong> and <strong>TCF Canada</strong> test takers
              </span>
            </li>
            <li className="mb-3 d-flex">
              <span 
                className="me-3 fw-bold" 
                style={{ 
                  color: frenchRed,
                  minWidth: "30px"
                }}
              >
                03
              </span>
              <span style={{ color: frenchBlue }}>
                <strong>Immigration Ready</strong> - Curriculum aligned with <strong>IRCC</strong> requirements for <strong>Express Entry</strong> points
              </span>
            </li>
            <li className="mb-3 d-flex">
              <span 
                className="me-3 fw-bold" 
                style={{ 
                  color: frenchRed,
                  minWidth: "30px"
                }}
              >
                04
              </span>
              <span style={{ color: frenchBlue }}>
                <strong>Career Boost</strong> - Business French for professionals seeking <strong>bilingual jobs</strong> in Canada
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        className="p-5 rounded text-center mb-5"
        style={{ 
          backgroundColor: lightBlue,
          borderTop: `5px solid ${frenchBlue}`
        }}
      >
        <h2 
          className="display-6 mb-4 fw-bold" 
          style={{ color: frenchBlue }}
        >
          Start Your French Learning Journey Today
        </h2>
        <p 
          className="lead mb-4 mx-auto" 
          style={{ 
            color: frenchBlue,
            maxWidth: "800px"
          }}
        >
          Join thousands of successful learners who achieved their <strong>Canadian immigration</strong>, <strong>education</strong>, and <strong>career goals</strong> through our free French courses.
        </p>
        <div className="d-flex justify-content-center gap-3">
          <button 
            className="btn btn-lg px-4 py-2 fw-bold"
            style={{ 
              backgroundColor: frenchRed,
              color: "white"
            }}
          >
            Get Started - It's Free
          </button>
          <button 
            className="btn btn-lg px-4 py-2 fw-bold"
            style={{ 
              backgroundColor: frenchBlue,
              color: "white"
            }}
          >
            Explore TEF/TCF Courses
          </button>
        </div>
      </section>
    </div>
  );
};

export default About;