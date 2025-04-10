// components/Login.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { gql, useMutation } from "@apollo/client";
import LoadingSpinner from "./LoadingSpinner";
import { Lock, Mail, AlertCircle } from "lucide-react";

// French color palette
const frenchBlue = "#0055A4";
const frenchRed = "#EF4135";
const frenchWhite = "#FFFFFF";

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      id
      username
      email
      languageLevel
      profileImage
    }
  }
`;

const Login = () => {
  // State for form data and validation errors
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  
  // Auth context and navigation
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loginMutation] = useMutation(LOGIN_MUTATION);
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Validate login form
  const validateForm = () => {
    let newErrors = {};
    
    // Email validation
    if (!formData.email) {
      newErrors.email = "Email address is required.";
    } else {
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
        newErrors.email = "Please enter a valid email address.";
      }
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required.";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form field changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return; // Validate form
    
    // Clear any previous errors before sending the mutation
    setErrors({});
    setErrorMessage("");
    setIsLoading(true);
    
    try {
      const { data } = await loginMutation({
        variables: {
          email: formData.email,
          password: formData.password,
        },
      });
      
      if (data?.login) {
        login(data.login); // Pass user data to the context
        const role = data.login.userType;
        if (role === "admin") {
          navigate("/admin-home"); // Admin dashboard
        } else if (role === "trainer") {
          navigate("/trainer-home"); // Trainer dashboard
        } else if (role === "pendingTutor") {
          navigate("/pending-tutor"); // Pending tutor page
        } else {
          navigate("/dashboard"); // Default: trainee/student dashboard
        }
      } else {
        setErrorMessage("Invalid credentials! Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrorMessage("Failed to login. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };


  const containerStyle = {
    minHeight: "100vh",
    backgroundColor: "#f8f9fa",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "2rem",
    backgroundImage: "radial-gradient(circle at 1px 1px, #e9ecef 1px, transparent 0)",
    backgroundSize: "40px 40px",
  };

  const cardStyle = {
    width: "100%",
    maxWidth: "1000px",
    display: "flex",
    borderRadius: "24px",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
    overflow: "hidden",
    backgroundColor: "#fff",
    minHeight: "600px",
    position: "relative",
  };

  const leftPanelStyle = {
    flex: "1",
    backgroundColor: frenchBlue,
    color: frenchWhite,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "4rem",
    backgroundImage: "linear-gradient(135deg, rgba(0, 85, 164, 0.9) 0%, rgba(0, 65, 134, 0.9) 100%), url('french-pattern.svg')",
    backgroundSize: "cover",
    position: "relative",
  };

  const rightPanelStyle = {
    flex: "1",
    backgroundColor: "#fff",
    padding: "4rem",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    position: "relative",
  };

  const inputStyle = {
    paddingLeft: "2.5rem",
    borderRadius: "8px",
    height: "48px",
    border: "1px solid #e0e0e0",
    transition: "all 0.3s ease",
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Decorative elements */}
        <div style={{
          position: "absolute",
          top: "-60px",
          right: "-60px",
          width: "120px",
          height: "120px",
          backgroundColor: frenchRed,
          borderRadius: "50%",
          transform: "rotate(45deg)"
        }}></div>

        {/* Left Panel */}
        <div style={leftPanelStyle}>
          <div style={{ position: "relative", zIndex: 1 }}>
            <h1 style={{ 
              fontSize: "2.5rem",
              fontWeight: "700",
              marginBottom: "1.5rem",
              fontFamily: "'Playfair Display', serif"
            }}>
              Bienvenue!
            </h1>
            <p style={{
              fontSize: "1.1rem",
              lineHeight: "1.6",
              marginBottom: "2.5rem",
              maxWidth: "400px",
              opacity: 0.9
            }}>
              Join our community of French language enthusiasts and take your skills to the next level.
            </p>
            <Link
              to="/register"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: frenchRed,
                color: frenchWhite,
                padding: "1rem 2rem",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "600",
                transition: "all 0.3s ease",
                boxShadow: "0 4px 6px rgba(239, 65, 53, 0.2)",
                ":hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 6px 12px rgba(239, 65, 53, 0.3)"
                }
              }}
            >
              Create Account
            </Link>
          </div>
        </div>

        {/* Right Panel */}
        <div style={rightPanelStyle}>
          <div style={{ maxWidth: "400px", margin: "0 auto", width: "100%" }}>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <div style={{
                width: "60px",
                height: "60px",
                backgroundColor: frenchBlue,
                borderRadius: "12px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.5rem",
                transform: "rotate(45deg)"
              }}>
                <Lock size={28} color={frenchWhite} style={{ transform: "rotate(-45deg)" }} />
              </div>
              <h2 style={{ 
                fontSize: "2rem",
                fontWeight: "700",
                marginBottom: "0.5rem",
                color: frenchBlue
              }}>
                Welcome Back
              </h2>
              <p style={{ color: "#666", fontSize: "0.95rem" }}>
                Sign in to continue your French journey
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Email Input */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ position: "relative" }}>
                  <Mail 
                    size={20} 
                    style={{ 
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#666"
                    }} 
                  />
                  <input
                    type="email"
                    placeholder="Email address"
                    style={inputStyle}
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-100"
                  />
                </div>
                {errors.email && (
                  <div style={{
                    color: frenchRed,
                    fontSize: "0.875rem",
                    marginTop: "0.5rem",
                    display: "flex",
                    alignItems: "center"
                  }}>
                    <AlertCircle size={16} style={{ marginRight: "6px" }} />
                    {errors.email}
                  </div>
                )}
              </div>

              {/* Password Input */}
              <div style={{ marginBottom: "2rem" }}>
                <div style={{ position: "relative" }}>
                  <Lock 
                    size={20} 
                    style={{ 
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#666"
                    }} 
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    style={inputStyle}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-100"
                  />
                </div>
                {errors.password && (
                  <div style={{
                    color: frenchRed,
                    fontSize: "0.875rem",
                    marginTop: "0.5rem",
                    display: "flex",
                    alignItems: "center"
                  }}>
                    <AlertCircle size={16} style={{ marginRight: "6px" }} />
                    {errors.password}
                  </div>
                )}
              </div>

              {errorMessage && (
                <div style={{
                  backgroundColor: "#feeceb",
                  color: frenchRed,
                  padding: "1rem",
                  borderRadius: "8px",
                  marginBottom: "1.5rem",
                  display: "flex",
                  alignItems: "center"
                }}>
                  <AlertCircle size={18} style={{ marginRight: "8px" }} />
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: "100%",
                  backgroundColor: frenchBlue,
                  color: frenchWhite,
                  padding: "1rem",
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: "600",
                  fontSize: "1rem",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  marginBottom: "1.5rem",
                  ":hover": {
                    backgroundColor: "#00448e",
                    boxShadow: "0 4px 12px rgba(0, 85, 164, 0.3)"
                  }
                }}
              >
                {isLoading ? <LoadingSpinner size="24px" /> : "Sign In"}
              </button>

              <div style={{ 
                textAlign: "center",
                fontSize: "0.9rem",
                color: "#666"
              }}>
                <Link 
                  to="/forgot-password" 
                  style={{
                    color: frenchBlue,
                    textDecoration: "none",
                    fontWeight: "500",
                    ":hover": {
                      textDecoration: "underline"
                    }
                  }}
                >
                  Forgot Password?
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;