import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { BookOpen, UserCheck, ClipboardList } from "lucide-react";

const frenchBlue = "#0055A4";
const frenchRed = "#EF4135";
const frenchWhite = "#FFFFFF";
const lightBlue = "#E6F0FA";
const lightRed = "#FDECEA";

const Home = () => {
  const services = [
    {
      icon: <BookOpen size={48} color={frenchBlue} className="mb-3" />,
      title: "Comprehensive Exams",
      description: "Our exams cover every topic you need for mastery, ensuring you're well-prepared.",
    },
    {
      icon: <UserCheck size={48} color={frenchRed} className="mb-3" />,
      title: "Personalized Learning",
      description: "Tailored courses designed to meet your unique needs and learning pace.",
    },
    {
      icon: <ClipboardList size={48} color={frenchBlue} className="mb-3" />,
      title: "Mock Exams",
      description: "Practice exams to help you excel and build confidence before the real tests.",
    },
  ];

  const teamMembers = [
    { name: "Mandar", image: "mandaricon.png", linkedin: "https://www.linkedin.com/in/mandar-sankhe" },
    { name: "Rachna", image: "rachnaicon.png", linkedin: "https://www.linkedin.com/in/rachna-poonit-6a3b4b1ab/" },
    { name: "Vipul", image: "vipulicon.png", linkedin: "https://www.linkedin.com/in/thatvipulprajapati" },
  ];

  return (
    <div className="container-fluid px-0">
      {/* Hero Section */}
      <section 
        className="py-5" 
        style={{ 
          background: `linear-gradient(135deg, ${lightBlue} 0%, ${frenchWhite} 100%)`,
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div className="container py-5">
          <div className="row align-items-center">
            <div className="col-lg-6 mb-5 mb-lg-0">
              <h1 
                className="display-4 fw-bold mb-4" 
                style={{ color: frenchBlue, lineHeight: 1.3 }}
              >
                Discover & Learn French
              </h1>
              <p 
                className="lead mb-4" 
                style={{ color: frenchBlue, fontSize: "1.25rem" }}
              >
                Your ultimate platform for French Learning
              </p>
              <div className="d-flex flex-wrap gap-3">
                <button 
                  className="btn btn-lg px-4 py-3 fw-bold"
                  style={{ 
                    backgroundColor: frenchRed,
                    color: frenchWhite,
                    borderRadius: "8px",
                    boxShadow: "0 4px 15px rgba(239, 65, 53, 0.3)"
                  }}
                >
                  Get Started
                </button>
                <button 
                  className="btn btn-lg px-4 py-3 fw-bold"
                  style={{ 
                    backgroundColor: frenchBlue,
                    color: frenchWhite,
                    borderRadius: "8px",
                    boxShadow: "0 4px 15px rgba(0, 85, 164, 0.3)"
                  }}
                >
                  Our Services
                </button>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="position-relative">
                <div 
                  className="position-absolute top-0 start-0 w-100 h-100 rounded-4"
                  style={{ 
                    backgroundColor: lightRed,
                    transform: "rotate(5deg)",
                    zIndex: 0
                  }}
                ></div>
                <img
                  src="animated-logo.gif"
                  alt="Animated Logo"
                  className="img-fluid position-relative rounded-4"
                  style={{ 
                    zIndex: 1,
                    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)"
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-5" style={{ backgroundColor: frenchWhite }}>
        <div className="container py-4">
          <h2 
            className="text-center mb-5 fw-bold" 
            style={{ 
              color: frenchBlue,
              fontSize: "2.5rem",
              position: "relative",
              display: "inline-block",
              margin: "0 auto",
              paddingBottom: "10px"
            }}
          >
            Our Services
            <span 
              style={{ 
                position: "absolute",
                bottom: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: "80px",
                height: "4px",
                backgroundColor: frenchRed,
                borderRadius: "2px"
              }}
            ></span>
          </h2>
          
          <div className="row g-4 mt-4">
            {services.map((service, index) => (
              <div key={index} className="col-md-4">
                <div 
                  className="h-100 p-4 rounded-4 transition-all"
                  style={{ 
                    backgroundColor: index % 2 === 0 ? lightBlue : lightRed,
                    border: `2px solid ${index % 2 === 0 ? frenchBlue : frenchRed}`,
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)",
                    transition: "transform 0.3s, box-shadow 0.3s",
                    cursor: "pointer",
                    transform: "translateY(0)"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-10px)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  <div className="text-center mb-4">
                    {service.icon}
                  </div>
                  <h3 
                    className="text-center mb-3 fw-bold" 
                    style={{ color: index % 2 === 0 ? frenchBlue : frenchRed }}
                  >
                    {service.title}
                  </h3>
                  <p 
                    className="text-center mb-0" 
                    style={{ color: frenchBlue }}
                  >
                    {service.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-5" style={{ backgroundColor: lightBlue }}>
        <div className="container py-4">
          <h2 
            className="text-center mb-5 fw-bold" 
            style={{ 
              color: frenchBlue,
              fontSize: "2.5rem",
              position: "relative",
              display: "inline-block",
              margin: "0 auto",
              paddingBottom: "10px"
            }}
          >
            Our Team
            <span 
              style={{ 
                position: "absolute",
                bottom: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: "80px",
                height: "4px",
                backgroundColor: frenchRed,
                borderRadius: "2px"
              }}
            ></span>
          </h2>
          
          <div className="row justify-content-center g-4 mt-4">
            {teamMembers.map((member, index) => (
              <div key={index} className="col-md-4 col-sm-6 text-center">
                <a 
                  href={member.linkedin} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-decoration-none"
                >
                  <div className="p-4">
                    <div className="position-relative d-inline-block">
                      <div 
                        className="position-absolute top-0 start-0 w-100 h-100 rounded-circle"
                        style={{ 
                          backgroundColor: frenchRed,
                          transform: "rotate(5deg)",
                          opacity: 0.1
                        }}
                      ></div>
                      <img
                        src={member.image}
                        alt={member.name}
                        className="img-fluid rounded-circle border-4"
                        style={{ 
                          width: "200px",
                          height: "200px",
                          objectFit: "cover",
                          border: `4px solid ${frenchBlue}`,
                          transition: "transform 0.3s",
                          transform: "scale(1)"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                      />
                    </div>
                    <h3 
                      className="mt-4 mb-2 fw-bold" 
                      style={{ color: frenchBlue }}
                    >
                      {member.name}
                    </h3>
                    <div 
                      className="d-inline-flex align-items-center"
                      style={{ color: frenchRed }}
                    >
                      <span className="me-2">View Profile</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"/>
                      </svg>
                    </div>
                  </div>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-5" style={{ backgroundColor: frenchWhite }}>
        <div className="container py-4">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div 
                className="p-4 p-md-5 rounded-4 shadow-sm"
                style={{ 
                  backgroundColor: lightRed,
                  border: `2px solid ${frenchRed}`,
                }}
              >
                <h2 
                  className="text-center mb-4 fw-bold" 
                  style={{ 
                    color: frenchBlue,
                    fontSize: "2.5rem"
                  }}
                >
                  Contact Us
                </h2>
                
                <form>
                  <div className="mb-4">
                    <label 
                      htmlFor="name" 
                      className="form-label fw-bold" 
                      style={{ color: frenchBlue }}
                    >
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      className="form-control py-3"
                      placeholder="Your name"
                      style={{ 
                        borderColor: frenchBlue,
                        borderRadius: "8px"
                      }}
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label 
                      htmlFor="email" 
                      className="form-label fw-bold" 
                      style={{ color: frenchBlue }}
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      className="form-control py-3"
                      placeholder="Your email"
                      style={{ 
                        borderColor: frenchBlue,
                        borderRadius: "8px"
                      }}
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label 
                      htmlFor="message" 
                      className="form-label fw-bold" 
                      style={{ color: frenchBlue }}
                    >
                      Message
                    </label>
                    <textarea
                      id="message"
                      className="form-control py-3"
                      rows="5"
                      placeholder="Your message"
                      style={{ 
                        borderColor: frenchBlue,
                        borderRadius: "8px"
                      }}
                    ></textarea>
                  </div>
                  
                  <div className="text-center">
                    <button 
                      type="submit" 
                      className="btn btn-lg px-5 py-3 fw-bold"
                      style={{ 
                        backgroundColor: frenchBlue,
                        color: frenchWhite,
                        borderRadius: "8px",
                        boxShadow: "0 4px 15px rgba(0, 85, 164, 0.3)"
                      }}
                    >
                      Send Message
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Donation Section */}
      <section className="py-5">
        <div className="container">
          <div 
            className="row align-items-center p-4 p-md-5 rounded-4"
            style={{
              background: `linear-gradient(135deg, ${frenchBlue} 0%, ${frenchRed} 100%)`,
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
              color: frenchWhite
            }}
          >
            <div className="col-md-8 mb-4 mb-md-0">
              <h3 className="fw-bold mb-3" style={{ fontSize: "1.75rem" }}>Support Our Mission</h3>
              <p className="mb-0" style={{ fontSize: "1.1rem", lineHeight: 1.6 }}>
                Help us continue creating high-quality French learning resources. Every contribution counts!
              </p>
            </div>
            
            <div className="col-md-4 text-center text-md-end">
            <button 
              className="btn btn-light fw-bold px-4 py-2"
              style={{
                color: frenchRed,
                border: `2px solid ${frenchWhite}`,
                borderRadius: "6px",
                fontSize: "1.2rem",
                transition: "0.3s"
              }}
              onMouseEnter={(e) => e.target.style.opacity = 0.95}
              onMouseLeave={(e) => e.target.style.opacity = 1}
              onClick={() => window.location.href = "/donate"} // Update when the donation page is ready
            >
              Donate Now ❤️
            </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;