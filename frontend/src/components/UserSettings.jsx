import React, { useState } from "react";
import { useMutation, gql } from "@apollo/client";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";

// GraphQL Mutation
const UPDATE_USER_MUTATION = gql`
  mutation UpdateUser($id: ID!, $input: UserUpdateInput!) {
    updateUser(id: $id, input: $input) {
      id
      languageLevel
    }
  }
`;

const UserSettings = ({ user }) => {
  const [formData, setFormData] = useState({
    username: user?.username || "",
    email: user?.email || "",
    password: "",
    languageLevel: user?.languageLevel || "Beginner",
  });

  const navigate = useNavigate();
  const [updateUser] = useMutation(UPDATE_USER_MUTATION);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Handle Input Changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updateUser({
        variables: {
          id: user.id,
          input: {
            languageLevel: formData.languageLevel,
          },
        },
      });

      setSuccessMessage("Profile updated successfully!");
      navigate("/dashboard");
    } catch (error) {
      setErrorMessage("Error updating profile. Please try again.");
      console.error(error);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container d-flex justify-content-center align-items-center vh-100">
        <div className="card shadow p-4 w-100" style={{ maxWidth: "400px" }}>
          <h1 className="text-center mb-3">Update Profile</h1>

          {successMessage && <p className="text-success text-center">{successMessage}</p>}
          {errorMessage && <p className="text-danger text-center">{errorMessage}</p>}

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div className="mb-3">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-control"
                value={formData.username}
                disabled
              />
            </div>

            {/* Email */}
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={formData.email}
                disabled
              />
            </div>

          

           

            {/* Language Level */}
            <div className="mb-3">
              <label className="form-label">Language Level</label>
              <select
                name="languageLevel"
                className="form-select"
                value={formData.languageLevel}
                onChange={handleInputChange}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="d-grid">
              <button type="submit" className="btn text-white" style={{ backgroundColor: "#0055A4" }}>
                Update Profile
              </button>
            </div>
          </form>

          <p className="d-grid text-center mt-3">
            <Link to="/dashboard" className=" btn text-white text-decoration-none" style={{ backgroundColor: "#EF4135" }}>
              Go back to Dashboard
            </Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default UserSettings;
