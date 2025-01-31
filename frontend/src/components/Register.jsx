// components/Register.jsx
import React, { useState } from "react";
import { useMutation, gql } from "@apollo/client";
import { Link, useNavigate } from "react-router-dom";

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
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    languageLevel: "Beginner",
  });

  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  
  const [createUser] = useMutation(CREATE_USER_MUTATION);
  const navigate = useNavigate();

  // Success and Error messages
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Validate registration form
  const validateForm = () => {
    let newErrors = {};

    // Username validation
    if (!formData.username) {
      newErrors.username = "Username is required.";
    } else {
      // Username format validation: only letters, numbers, and underscores
      if (!/^\w+$/.test(formData.username)) {
        newErrors.username = "Username can only contain letters, numbers, and underscores, without spaces.";
      } 
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = "Email is required.";
    } else {
      // Email format validation
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
        newErrors.email = "Please enter a valid email address.";
      }
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required.";
    } else {
      // Password format validation: at least 5 characters
      if (formData.password.length < 5) {
        newErrors.password = "Password must be at least 5 characters.";
      }
    }

    // Confirm Password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = "Confirm password is required.";
    } else {
      // Password match
      if (formData.password !== confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return; // Validate form

    // Clear any previous errors before sending the mutation
    setErrors({});
    setSuccessMessage("");
    setErrorMessage(""); 

    try {
      await createUser({ variables: { input: formData } });
      setSuccessMessage("User registered successfully! You can now ");
    } catch (error) {
      console.error("Error registering user:", error);
      setErrorMessage("Failed to register user. Please try again.");
      // Reset form data and confirm password on failure
      setFormData({
        username: "",
        email: "",
        password: "",
        languageLevel: "Beginner",
      });
      setConfirmPassword("");
    }
  };

  return (
    <div className="container mt-5">
      <h2 className="text-primary text-center mb-2">Register</h2>
      <form onSubmit={handleSubmit} noValidate className="mx-auto" style={{ maxWidth: "600px" }}>
        <div className="mb-3">
          <label htmlFor="username" className="form-label">
            Username
          </label>
          {errors.username && (
            <div className="text-danger mb-2 d-flex align-items-center">
              <img src="../error-icon.png" width={17} alt="Error" className="me-2" />
              {errors.username}
            </div>
          )}
          <input
            type="text"
            className="form-control"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="email" className="form-label">
            Email address
          </label>
          {errors.email && (
            <div className="text-danger mb-2 d-flex align-items-center">
              <img src="../error-icon.png" width={17} alt="Error" className="me-2" />
              {errors.email}
            </div>
          )}
          <input
            type="email"
            className="form-control"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="password" className="form-label">
            Password
          </label>
          {errors.password && (
            <div className="text-danger mb-2 d-flex align-items-center">
              <img src="../error-icon.png" width={17} alt="Error" className="me-2" />
              {errors.password}
            </div>
          )}
          <input
            type="password"
            className="form-control"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="confirmpassword" className="form-label">
            Confirm Password
          </label>
          {errors.confirmPassword && (
            <div className="text-danger mb-2 d-flex align-items-center">
              <img src="../error-icon.png" width={17} alt="Error" className="me-2" />
              {errors.confirmPassword}
            </div>
          )}
          <input
            type="password"
            className="form-control"
            id="confirmpassword"
            name="confirmpassword"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="languageLevel" className="form-label">
            Language Level
          </label>
          <select
            className="form-select"
            id="languageLevel"
            name="languageLevel"
            value={formData.languageLevel}
            onChange={handleChange}
          >
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>

        {/* Success and Error Messages */}
        {successMessage && (
          <div className="alert alert-success text-center" role="alert">
            {successMessage}
            <Link to="/login" className="alert-link">Login here</Link>.
          </div>
        )}

        {errorMessage && (
          <div className="alert alert-danger text-center" role="alert">
            {errorMessage}
          </div>
        )}
        
        <div className="d-flex justify-content-center mb-3">
          <button type="submit" className="btn btn-primary mt-2 p-2 ps-4 pe-4">
            Register
          </button>
        </div>
        <div className="text-center">
          <p className="mt-2">
            Already have an account?{" "}
            <Link to="/login" className="text-primary">
              Login
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Register;
