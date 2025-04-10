// components/Register.jsx
import React, { useState } from "react";
import { useMutation, gql } from "@apollo/client";
import { Link } from "react-router-dom";
import LoadingSpinner from "./LoadingSpinner";
import {
  Flag,
  ChevronDown,
  User,
  Mail,
  Lock,
  AlertCircle,
  Languages
} from "lucide-react";

/*
 * French color palette
 */
const frenchBlue = "#0055A4";
const frenchRed = "#EF4135";
const frenchWhite = "#FFFFFF";

const darkText = "#2D3748"; // for body text

/*
 * GraphQL mutation for creating a new user
 */
const CREATE_USER_MUTATION = gql`
  mutation CreateUser($input: UserInput!) {
    createUser(input: $input) {
      id
      username
      email
      languageLevel
    }
  }
`;

const Register = () => {
  // State for tracking form fields
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    languageLevel: "Beginner",
    userType: "trainee",
  });
  // State for confirm password
  const [confirmPassword, setConfirmPassword] = useState("");
  // State for form validation errors
  const [errors, setErrors] = useState({});
  
  // Apollo createUser mutation + loading state
  const [createUser] = useMutation(CREATE_USER_MUTATION);
  const [loading, setLoading] = useState(false);

  // Success and error messages for UI
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  /**
   * Validate registration form inputs
   */
  const validateForm = () => {
    let newErrors = {};

    // Username validation
    if (!formData.username) {
      newErrors.username = "Username is required.";
    } else {
      // Username format validation: only letters, numbers, underscores
      if (!/^\w+$/.test(formData.username)) {
        newErrors.username =
          "Username can only contain letters, numbers, and underscores, without spaces.";
      }
      // Must contain at least one letter and be at least 5 characters
      if (!/[a-zA-Z]/.test(formData.username)) {
        newErrors.username = "Username must contain at least one letter.";
      }
      if (formData.username.length < 5) {
        newErrors.username = "Username must be at least 5 characters long.";
      }
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = "Email is required.";
    } else {
      // Simple email pattern check
      if (
        !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)
      ) {
        newErrors.email = "Please enter a valid email address.";
      }
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required.";
    } else {
      // Minimum length check
      if (formData.password.length < 5) {
        newErrors.password = "Password must be at least 5 characters.";
      }
    }

    // Confirm Password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = "Confirm password is required.";
    } else if (formData.password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle changes to input fields
   */
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  /**
   * Handle confirm password change
   */
  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
  };

  /**
   * Form submission for registration
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return; // Validate form

    // Clear previous messages
    setErrors({});
    setSuccessMessage("");
    setErrorMessage("");
    setLoading(true);

    try {
      await createUser({ variables: { input: formData } });
      setSuccessMessage("User registered successfully! You can now ");
    } catch (error) {
      console.error("Error registering user:", error);
      setErrorMessage("Failed to register user. Please try again.");

      // Reset fields on failure
      setFormData({
        username: "",
        email: "",
        password: "",
        languageLevel: "Beginner",
        userType: "trainee",
      });
      setConfirmPassword("");
    } finally {
      setLoading(false);
    }
  };

  /*
   * The main container: large "card" with two columns
   *   - Left side: "Bienvenue!" text, plus snippet
   *   - Right side: actual form
   */
  const containerStyle = {
    minHeight: "100vh",
    width: "100%",
    background: `linear-gradient(135deg, ${frenchWhite} 0%, rgba(0,85,164,0.15) 100%)`,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "2rem",
  };

  // Outer card with two columns (flex children)
  const cardStyle = {
    width: "100%",
    maxWidth: "1200px",
    backgroundColor: "#fff",
    borderRadius: "20px",
    display: "flex",
    boxShadow: "0 25px 50px rgba(0,85,164,0.15)",
    overflow: "hidden",
  };

  // Left side: "Bienvenue!" area + snippet
  const leftSideStyle = {
    flex: "1",
    backgroundColor: frenchBlue,
    color: frenchWhite,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "3rem 2rem",
    gap: "2rem",
  };

  const headingStyle = {
    fontSize: "2.25rem",
    fontWeight: "700",
    margin: 0,
    lineHeight: 1.2,
  };

  const subHeadingStyle = {
    fontSize: "1rem",
    lineHeight: 1.5,
    opacity: 0.9,
    marginTop: "0.75rem",
  };

  const snippetContainerStyle = {
    fontSize: "0.85rem",
    lineHeight: 1.4,
    opacity: 0.9,
  };

  // Right side: registration form
  const rightSideStyle = {
    flex: "1.3",
    padding: "3rem",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  };

  // Two-column input rows
  const twoColumnStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "1.5rem",
  };

  const columnStyle = {
    flex: "1 1 45%",
  };

  // Input styling
  const inputStyle = {
    paddingLeft: "3rem",
    borderRadius: "12px",
    height: "48px",
    border: "2px solid #E2E8F0",
    width: "100%",
    fontSize: "1rem",
    color: darkText,
  };

  // Select styling
  const selectStyle = {
    ...inputStyle,
    appearance: "none",
    paddingRight: "3rem",
    cursor: "pointer",
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        
        {/* LEFT COLUMN: "Bienvenue!" and snippet */}
        <div style={leftSideStyle}>
          <div>
            <h1 style={headingStyle}>Bienvenue!</h1>
            <p style={subHeadingStyle}>
              Join our community of French language enthusiasts
              and take your skills to the next level.
            </p>
          </div>

          <div style={snippetContainerStyle}>
            {/* Already have an account? */}
            <p style={{ marginBottom: "0.5rem" }}>
              Already have an account?{" "}
              <Link
                to="/login"
                style={{
                  color: frenchRed,
                  fontWeight: "bold",
                  textDecoration: "none",
                }}
              >
                Sign In (Se connecter)
              </Link>
            </p>
            {/* Terms of Service */}
            <p>
              By continuing, you agree to our <br />
              <Link
                to="/terms"
                style={{ color: frenchRed, textDecoration: "none" }}
              >
                Terms of Service (Conditions d'utilisation)
              </Link>
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Registration Form */}
        <div style={rightSideStyle}>
          {/* 
            Title, success message, etc.
            You can customize heading text here if you want
          */}
          <div style={{ marginBottom: "1.5rem" }}>
            <h2
              style={{
                fontWeight: "700",
                marginBottom: "0.5rem",
                fontSize: "1.5rem",
                color: darkText,
              }}
            >
              Create Your Account
            </h2>
            <span style={{ color: "#4A5568" }}>
              (Commencez votre voyage linguistique!)
            </span>
          </div>

          {/* The Form */}
          <form onSubmit={handleSubmit} noValidate>
            {/* 
              Two-column layout for 
              - username & email
              - password & confirm password
              - language level & userType
            */}
            {/* First Row: username + email */}
            <div style={twoColumnStyle}>
              <div style={columnStyle}>
                {/* Username */}
                <div style={{ marginBottom: "1rem", position: "relative" }}>
                  <User
                    size={20}
                    style={{
                      position: "absolute",
                      left: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#718096",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Username (Nom d'utilisateur)"
                    style={inputStyle}
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                  />
                  {errors.username && (
                    <div style={errorMessageStyle}>
                      <AlertCircle size={18} style={{ marginRight: "8px" }} />
                      {errors.username}
                    </div>
                  )}
                </div>
              </div>

              <div style={columnStyle}>
                {/* Email */}
                <div style={{ marginBottom: "1rem", position: "relative" }}>
                  <Mail
                    size={20}
                    style={{
                      position: "absolute",
                      left: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#718096",
                    }}
                  />
                  <input
                    type="email"
                    placeholder="Email Address (Adresse e-mail)"
                    style={inputStyle}
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                  {errors.email && (
                    <div style={errorMessageStyle}>
                      <AlertCircle size={18} style={{ marginRight: "8px" }} />
                      {errors.email}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Second Row: password + confirm password */}
            <div style={twoColumnStyle}>
              <div style={columnStyle}>
                {/* Password */}
                <div style={{ marginBottom: "1rem", position: "relative" }}>
                  <Lock
                    size={20}
                    style={{
                      position: "absolute",
                      left: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#718096",
                    }}
                  />
                  <input
                    type="password"
                    placeholder="Password (Mot de passe)"
                    style={inputStyle}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  {errors.password && (
                    <div style={errorMessageStyle}>
                      <AlertCircle size={18} style={{ marginRight: "8px" }} />
                      {errors.password}
                    </div>
                  )}
                </div>
              </div>

              <div style={columnStyle}>
                {/* Confirm Password */}
                <div style={{ marginBottom: "1rem", position: "relative" }}>
                  <Lock
                    size={20}
                    style={{
                      position: "absolute",
                      left: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#718096",
                    }}
                  />
                  <input
                    type="password"
                    placeholder="Confirm Password (Confirmez le mot de passe)"
                    style={inputStyle}
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                  />
                  {errors.confirmPassword && (
                    <div style={errorMessageStyle}>
                      <AlertCircle size={18} style={{ marginRight: "8px" }} />
                      {errors.confirmPassword}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Third Row: languageLevel + userType */}
            <div style={twoColumnStyle}>
              <div style={columnStyle}>
                {/* Language Level */}
                <div style={{ marginBottom: "1rem", position: "relative" }}>
                  <Languages
                    size={20}
                    style={{
                      position: "absolute",
                      left: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#718096",
                    }}
                  />
                  <select
                    style={selectStyle}
                    id="languageLevel"
                    name="languageLevel"
                    value={formData.languageLevel}
                    onChange={handleChange}
                  >
                    <option value="Beginner">Beginner (Débutant)</option>
                    <option value="Intermediate">Intermediate (Intermédiaire)</option>
                    <option value="Advanced">Advanced (Avancé)</option>
                  </select>
                  <ChevronDown
                    size={20}
                    style={{
                      position: "absolute",
                      right: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#718096",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              </div>

              <div style={columnStyle}>
                {/* User Type */}
                <div style={{ marginBottom: "1rem", position: "relative" }}>
                  <User
                    size={20}
                    style={{
                      position: "absolute",
                      left: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#718096",
                    }}
                  />
                  <select
                    style={selectStyle}
                    id="userType"
                    name="userType"
                    value={formData.userType}
                    onChange={handleChange}
                  >
                    <option value="trainee">Student (Étudiant)</option>
                    <option value="pendingTutor">Tutor (Tuteur)</option>
                  </select>
                  <ChevronDown
                    size={20}
                    style={{
                      position: "absolute",
                      right: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#718096",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div style={{ textAlign: "center", marginTop: "2rem" }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  maxWidth: "360px",
                  backgroundColor: frenchBlue,
                  color: frenchWhite,
                  padding: "0.85rem 1.25rem",
                  borderRadius: "12px",
                  border: "none",
                  fontWeight: "700",
                  fontSize: "1rem",
                  cursor: "pointer",
                }}
              >
                {loading ? (
                  <LoadingSpinner size="26px" />
                ) : (
                  <>
                    Create Account
                    <span
                      style={{
                        display: "block",
                        fontSize: "0.85em",
                        fontWeight: "500",
                        opacity: 0.8,
                      }}
                    >
                      (Créer un compte)
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div style={successMessageStyle}>
                <span style={{ fontSize: "1.4em" }}>🎉</span>
                {successMessage}
                <Link to="/login" style={successLinkStyle}>
                  Login here (Connectez-vous ici)
                </Link>
              </div>
            )}

            {/* Error Message (If needed) */}
            {errorMessage && (
              <div style={errorBoxStyle}>
                <AlertCircle size={18} style={{ marginRight: "8px" }} />
                {errorMessage}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

/*
 * Style objects for error and success messages
 */
const errorMessageStyle = {
  color: "#E53E3E",
  fontSize: "0.85rem",
  marginTop: "0.4rem",
  display: "flex",
  alignItems: "center",
  padding: "0.4rem 0.8rem",
  backgroundColor: "#FEF2F2",
  borderRadius: "8px",
  border: "1px solid #FECACA",
};

const errorBoxStyle = {
  marginTop: "1.5rem",
  color: "#E53E3E",
  fontSize: "0.9rem",
  display: "flex",
  alignItems: "center",
  padding: "0.75rem 1rem",
  backgroundColor: "#FEF2F2",
  borderRadius: "8px",
  border: "1px solid #FECACA",
};

const successMessageStyle = {
  backgroundColor: "#F0FFF4",
  color: "#2F855A",
  padding: "1rem",
  borderRadius: "12px",
  marginTop: "2rem",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.75rem",
  border: "1px solid #C6F6D5",
};

const successLinkStyle = {
  color: "#2F855A",
  marginLeft: "6px",
  fontWeight: "600",
  textDecoration: "none",
};

export default Register;
