import React, { useState, useEffect } from "react";
import { useMutation, gql } from "@apollo/client";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { useAuth } from "../context/AuthContext"; // import your auth context

// GraphQL Mutation with file upload variable
const UPDATE_USER_MUTATION = gql`
  mutation UpdateUser($id: ID!, $input: UserUpdateInput!, $profileImage: Upload) {
    updateUser(id: $id, input: $input, profileImage: $profileImage) {
      id
      languageLevel
      profileImage
    }
  }
`;

const UserSettings = () => {
  const { user } = useAuth(); // get logged-in user from context
  const navigate = useNavigate();

  // Set initial state only when user is available
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    languageLevel: "Beginner",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [updateUser] = useMutation(UPDATE_USER_MUTATION);

  // Populate form state when user data is loaded
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        email: user.email || "",
        languageLevel: user.languageLevel || "Beginner",
      });
      setPreviewUrl(user.profileImage || "");
    }
  }, [user]);

  // Handle Input Changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({ ...prevState, [name]: value }));
  };

  // Handle Image Selection – store File object and generate a preview URL.
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
      console.log("File selected inside handleFileChange:", file);
      console.log("Preview URL:", preview);
    }
  };

  // Log the data being sent to the resolver before the mutation
  const logData = () => {
    console.log("Sending data to resolver:");
    console.log("User ID:", user.id);
    console.log("Form Data:", formData);
    console.log("Selected File:", selectedFile);  // If file is selected
    console.log("Selected File (Preview URL):", previewUrl);
  };

  // Handle Form Submission – pass the file as a separate variable if available.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!user) {
      setErrorMessage("User not logged in.");
      return;
    }

    // Log the data being sent
    logData();

    try {
      await updateUser({
        variables: {
          id: user.id,
          input: {
            languageLevel: formData.languageLevel,
          },
          profileImage: selectedFile, // undefined if no file is selected
        },
      });

      setSuccessMessage("Profile updated successfully!");
      navigate("/dashboard");
    } catch (error) {
      setErrorMessage("Error updating profile. Please try again.");
      console.error("Update error:", error);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container d-flex justify-content-center align-items-center vh-100">
        <div className="card shadow p-4 w-100" style={{ maxWidth: "400px" }}>
          <h1 className="text-center mb-3">Update Profile</h1>

          {successMessage && (
            <p className="text-success text-center">{successMessage}</p>
          )}
          {errorMessage && (
            <p className="text-danger text-center">{errorMessage}</p>
          )}

          <form onSubmit={handleSubmit}>
            {/* Profile Image */}
            <div className="mb-3 text-center">
              <label className="form-label">Profile Picture</label>
              <div>
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Profile Preview"
                    className="rounded-circle border"
                    style={{
                      width: "100px",
                      height: "100px",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <p>No image selected</p>
                )}
              </div>
              <input
                type="file"
                className="form-control mt-2"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>

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
              <button
                type="submit"
                className="btn text-white"
                style={{ backgroundColor: "#0055A4" }}
              >
                Update Profile
              </button>
            </div>
          </form>

          <p className="d-grid text-center mt-3">
            <Link
              to="/dashboard"
              className="btn text-white text-decoration-none"
              style={{ backgroundColor: "#EF4135" }}
            >
              Go back to Dashboard
            </Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default UserSettings;
