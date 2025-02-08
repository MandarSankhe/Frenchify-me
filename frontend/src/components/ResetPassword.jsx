import React, { useState } from "react";
import { gql, useMutation } from "@apollo/client";
import { useParams, useNavigate } from "react-router-dom";

const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword($token: String!, $newPassword: String!) {
    resetPassword(token: $token, newPassword: $newPassword)
  }
`;

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [resetPassword] = useMutation(RESET_PASSWORD_MUTATION);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const { data } = await resetPassword({ variables: { token, newPassword } });
      setMessage(data.resetPassword);
      setTimeout(() => navigate("/login"), 3000); // Redirect after 3s
    } catch (error) {
      setMessage("Error resetting password. The link may have expired.");
    }
  };

  return (
    <div className="container mt-5">
      <h2 className="text-center">Reset Password</h2>
      <form onSubmit={handleSubmit} className="mx-auto" style={{ maxWidth: "500px" }}>
        <div className="mb-3">
          <label htmlFor="newPassword" className="form-label">
            Enter new password
          </label>
          <input
            type="password"
            className="form-control"
            id="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-success w-100">Reset Password</button>
        {message && <div className="alert alert-info mt-3">{message}</div>}
      </form>
    </div>
  );
};

export default ResetPassword;
