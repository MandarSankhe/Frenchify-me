import React, { useState } from "react";
import { gql, useMutation } from "@apollo/client";
import LoadingSpinner from "./LoadingSpinner";

const FORGOT_PASSWORD_MUTATION = gql`
  mutation ForgotPassword($email: String!) {
    forgotPassword(email: $email)
  }
`;

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotPassword] = useMutation(FORGOT_PASSWORD_MUTATION);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const { data } = await forgotPassword({ variables: { email } });
      setMessage(data.forgotPassword);
    } catch (error) {
      setMessage("Error sending password reset email: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <h2 className="text-center">Forgot Password</h2>
      {loading && <LoadingSpinner />} {/* Show spinner when loading */}
      <form onSubmit={handleSubmit} className="mx-auto" style={{ maxWidth: "500px" }}>
        <div className="mb-3">
          <label htmlFor="email" className="form-label">
            Enter your email
          </label>
          <input
            type="email"
            className="form-control"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary w-100">Send Reset Link</button>
        {message && <div className="alert alert-info mt-3">{message}</div>}
      </form>
    </div>
  );
};

export default ForgotPassword;