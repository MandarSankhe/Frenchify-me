// components/Login.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { gql, useMutation } from "@apollo/client";

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      id
      username
      email
      languageLevel
    }
  }
`;

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loginMutation] = useMutation(LOGIN_MUTATION);

  // Success and Error messages
  const [errorMessage, setErrorMessage] = useState("");

  // Validate login form
  const validateForm = () => {
    let newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = "Email address is required.";
    } else {
      // Email format validation
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return; // Validate form

    // Clear any previous errors before sending the mutation
    setErrors({});
    setErrorMessage("");

    try {
      const { data } = await loginMutation({
        variables: {
          email: formData.email,
          password: formData.password,
        },
      });
      if (data?.login) {
        login(data.login); // Pass user data to the context
        navigate("/dashboard");
      } else {
        setErrorMessage("Invalid credentials! Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrorMessage("Failed to login. Please check your credentials.");
    }
  };

  return (
    <div className="container mt-5">
      <h2 className="text-primary text-center mb-2">Login</h2>
      <form onSubmit={handleSubmit} noValidate className="mx-auto" style={{ maxWidth: "600px" }}>
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

        {/* Error Message */}
        {errorMessage && (
          <div className="alert alert-danger text-center" role="alert">
            {errorMessage}
          </div>
        )}

        {/* Forgot Password Link */}
        <div className="text-center mb-3">
          <Link to="/forgot-password" className="text-danger">
            Forgot Password?
          </Link>
        </div>


        <div className="d-flex justify-content-center mb-3">
          <button type="submit" className="btn btn-primary mt-2 p-2 ps-4 pe-4">
            Login
          </button>
        </div>
        <div className="text-center">
          <p className="mt-2">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary">
              Register here
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Login;