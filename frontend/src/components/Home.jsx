import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { BookOpen, UserCheck, ClipboardList } from "lucide-react";

const frenchBlue = "#0055A4";
const frenchRed = "#EF4135";
const frenchWhite = "#FFFFFF";

const styles = {
  // Updated hero section with grey gradient background and adjusted text colors
  heroSection: {
    background: `linear-gradient(135deg, #f7f7f7 40%, #e2e2e2 60%)`,
    padding: "4rem 2rem",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    marginBottom: "3rem",
  },
  heroHeading: {
    color: "#333333",
    fontWeight: "bold",
    fontSize: "2.5rem",
    textShadow: "1px 1px 3px rgba(0,0,0,0.1)",
  },
  heroSubHeading: {
    color: "#555555",
    fontSize: "1.25rem",
    marginBottom: "1.5rem",
  },
  btnPrimary: {
    backgroundColor: frenchRed,
    borderColor: frenchRed,
    color: frenchWhite,
    fontWeight: "bold",
    padding: "0.75rem 1.5rem",
    borderRadius: "4px",
    transition: "background-color 0.3s",
  },
  btnSecondary: {
    backgroundColor: frenchBlue,
    borderColor: frenchBlue,
    color: frenchWhite,
    fontWeight: "bold",
    padding: "0.75rem 1.5rem",
    borderRadius: "4px",
    transition: "background-color 0.3s",
  },
  sectionHeading: {
    color: frenchBlue,
    fontWeight: "bold",
    marginBottom: "2rem",
    textAlign: "center",
    fontSize: "2rem",
  },
  serviceBox: {
    border: `2px solid ${frenchBlue}`,
    borderRadius: "8px",
    padding: "1.5rem",
    height: "100%",
    boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
    transition: "transform 0.3s",
    backgroundColor: "#fff",
  },
  serviceBoxHover: {
    transform: "translateY(-5px)",
  },
  teamImage: {
    maxWidth: "70%",
    borderRadius: "50%",
    border: `4px solid ${frenchRed}`,
    marginBottom: "10px",
    transition: "transform 0.3s",
  },
  teamImageHover: {
    transform: "scale(1.05)",
  },
  teamName: {
    color: frenchBlue,
    fontWeight: "bold",
    marginTop: "0.5rem",
  },
  contactLabel: {
    color: frenchRed,
    fontWeight: "500",
  },
  contactBtn: {
    backgroundColor: frenchRed,
    borderColor: frenchRed,
    color: frenchWhite,
    fontWeight: "bold",
    padding: "0.75rem 1.5rem",
    borderRadius: "4px",
    transition: "background-color 0.3s",
  },
  contactForm: {
    backgroundColor: "#f8f9fa",
    padding: "2rem",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
  },
};

class Home extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      serviceBoxHoverIndex: null,
      teamHoverIndex: null,
    };
  }

  handleServiceMouseEnter(index) {
    this.setState({ serviceBoxHoverIndex: index });
  }

  handleServiceMouseLeave() {
    this.setState({ serviceBoxHoverIndex: null });
  }

  handleTeamMouseEnter(index) {
    this.setState({ teamHoverIndex: index });
  }

  handleTeamMouseLeave() {
    this.setState({ teamHoverIndex: null });
  }

  render() {
    const services = [
      {
        icon: <BookOpen size={48} color={frenchBlue} className="mb-3" />,
        title: "Comprehensive Exams",
        description:
          "Our exams cover every topic you need for mastery, ensuring you're well-prepared.",
        borderColor: frenchBlue,
      },
      {
        icon: <UserCheck size={48} color={frenchRed} className="mb-3" />,
        title: "Personalized Learning",
        description:
          "Tailored courses designed to meet your unique needs and learning pace.",
        borderColor: frenchRed,
      },
      {
        icon: <ClipboardList size={48} color={frenchBlue} className="mb-3" />,
        title: "Mock Exams",
        description:
          "Practice exams to help you excel and build confidence before the real tests.",
        borderColor: frenchBlue,
      },
    ];

    // Team members with their LinkedIn URLs
    const teamMembers = [
      { name: "Mandar", image: "mandaricon.png", linkedin: "https://www.linkedin.com/in/mandar-sankhe" },
      { name: "Rachna", image: "rachnaicon.png", linkedin: "https://www.linkedin.com/in/rachna-poonit-6a3b4b1ab/" },
      { name: "Vipul", image: "vipulicon.png", linkedin: "https://www.linkedin.com/in/thatvipulprajapati" },
    ];

    return (
      <div className="container py-5" style={{ backgroundColor: frenchWhite }}>
        {/* Hero Section */}
        <div style={styles.heroSection} className="mb-5">
          <div className="row align-items-center">
            <div className="col-md-6 text-center text-md-start">
              <h1 style={styles.heroHeading}>Discover & Learn French</h1>
              <p style={styles.heroSubHeading}>
                Your ultimate platform for French Learning
              </p>
              <div>
                <button style={styles.btnPrimary} className="btn me-2">
                  Get Started
                </button>
                <button style={styles.btnSecondary} className="btn">
                  Services
                </button>
              </div>
            </div>
            <div className="col-md-6 text-center">
              <img
                src="animated-logo.gif"
                alt="Animated Logo"
                className="img-fluid"
                style={{ maxWidth: "80%" }}
              />
            </div>
          </div>
        </div>

        {/* Our Services */}
        <div className="mb-5">
          <h2 style={styles.sectionHeading}>Our Services</h2>
          <div className="row">
            {services.map((service, index) => (
              <div key={index} className="col-md-4 mb-4">
                <div
                  style={{
                    ...styles.serviceBox,
                    border: `2px solid ${service.borderColor}`,
                    ...(this.state.serviceBoxHoverIndex === index
                      ? styles.serviceBoxHover
                      : {}),
                  }}
                  className="card text-center p-3"
                  onMouseEnter={() => this.handleServiceMouseEnter(index)}
                  onMouseLeave={() => this.handleServiceMouseLeave()}
                >
                  {service.icon}
                  <h5>{service.title}</h5>
                  <p>{service.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Our Team */}
        <div className="mb-5">
          <h2 style={styles.sectionHeading}>Our Team</h2>
          <div className="row justify-content-center">
            {teamMembers.map((member, index) => (
              <div
                key={index}
                className="col-6 col-md-4 text-center mb-4"
                onMouseEnter={() => this.handleTeamMouseEnter(index)}
                onMouseLeave={() => this.handleTeamMouseLeave()}
              >
                <a 
                  href={member.linkedin} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <img
                    src={member.image}
                    alt={member.name}
                    className="img-fluid"
                    style={{
                      ...styles.teamImage,
                      ...(this.state.teamHoverIndex === index
                        ? styles.teamImageHover
                        : {}),
                    }}
                  />
                  <h5 style={styles.teamName}>{member.name}</h5>
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Us */}
        <div>
          <h2 style={styles.sectionHeading}>Contact Us</h2>
          <div className="row justify-content-center">
            <div className="col-md-8">
              <form style={styles.contactForm}>
                <div className="mb-3">
                  <label
                    htmlFor="name"
                    style={styles.contactLabel}
                    className="form-label"
                  >
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    className="form-control"
                    placeholder="Your name"
                  />
                </div>
                <div className="mb-3">
                  <label
                    htmlFor="email"
                    style={styles.contactLabel}
                    className="form-label"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="form-control"
                    placeholder="Your email"
                  />
                </div>
                <div className="mb-3">
                  <label
                    htmlFor="message"
                    style={styles.contactLabel}
                    className="form-label"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    className="form-control"
                    rows="4"
                    placeholder="Your message"
                  ></textarea>
                </div>
                <button type="submit" style={styles.contactBtn} className="btn">
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Donation Section */}
        <div className="row align-items-center mt-5 py-4 px-3" style={{
          background: `linear-gradient(135deg, ${frenchBlue} 30%, ${frenchRed} 100%)`,
          borderRadius: "8px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          color: frenchWhite
        }}>
          {/* Left Column - Message & Icon */}
          <div className="col-md-8 text-md-start text-center">
            <h3 style={{ fontWeight: "bold" }}>Support Our Mission</h3>
            <p style={{ fontSize: "1.1rem", marginBottom: 0 }}>
              Help us continue creating high-quality French learning resources. Every contribution counts!
            </p>
          </div>

          {/* Right Column - Donate Button */}
          <div className="col-md-4 text-md-end text-center mt-3 mt-md-0">
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
    );
  }
}

export default Home;