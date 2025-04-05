// UserSettings.js
import React, { useState, useEffect } from "react";
import { useMutation, gql } from "@apollo/client";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "./LoadingSpinner";
import { downloadTranscript } from "../context/transcriptUtils"; // Import the shared function

const GRAPHQL_ENDPOINT = `${process.env.REACT_APP_API_URL || "http://localhost:4000"}/graphql`;
const API_ENDPOINT = process.env.REACT_APP_API_URL || "http://localhost:4000";

const UPDATE_USER_MUTATION = gql`
  mutation UpdateUser($id: ID!, $input: UserUpdateInput!, $profileImageUrl: String) {
    updateUser(id: $id, input: $input, profileImageUrl: $profileImageUrl) {
      id
      languageLevel
      profileImage
      username
      email
    }
  }
`;

const UserSettings = () => {
  const { user, updateUserdata } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    languageLevel: "Beginner",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [transcriptUrl, setTranscriptUrl] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [updateUser] = useMutation(UPDATE_USER_MUTATION);

  // Brand Colors
  const frenchBlue = "#0055A4";
  const frenchRed = "#EF4135";
  const frenchWhite = "#FFFFFF";

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
    }
  };

  // New function: use the shared transcriptUtils function to generate the transcript
  const handleDownloadTranscript = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const pdfUrl = await downloadTranscript(user, GRAPHQL_ENDPOINT);
      setTranscriptUrl(pdfUrl);
      setShowModal(true);
    } catch (error) {
      console.error("Error generating transcript:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setLoading(true);
    
    try {
      let imageUrl = user.profileImage;
      
      // Upload new image if selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append('image', selectedFile);
        
        const uploadResponse = await fetch(`${API_ENDPOINT}/api/upload-image`, {
          method: 'POST',
          body: formData,
        });
        
        console.log("Upload response:", uploadResponse);
        if (!uploadResponse.ok) throw new Error('Image upload failed');
        const { imageUrl: newUrl } = await uploadResponse.json();
        imageUrl = newUrl;
      }
  
      // Update user with new image URL and language level
      const { data } = await updateUser({
        variables: {
          id: user.id,
          input: { 
            languageLevel: formData.languageLevel,
          },
          profileImageUrl: imageUrl
        },
      });
  
      if (data?.updateUser) {
        updateUserdata(data.updateUser);
        setSuccessMessage("Profile updated successfully!");
      }
    } catch (error) {
      setErrorMessage(error.message);
      console.error("Update error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container-fluid min-vh-100" style={{ 
        background: frenchWhite,
        padding: '2rem 0'
      }}>
        <div className="row justify-content-center">
          <div className="col-xxl-8 col-xl-10 col-lg-12">
            <div className="card shadow-lg border-0" style={{
              borderRadius: '1.5rem',
              overflow: 'hidden'
            }}>
              <div className="card-header p-4" style={{
                background: frenchBlue,
                position: 'relative'
              }}>
                <h1 className="text-white mb-0 display-5 fw-bold">Profile Settings</h1>
                <div className="position-absolute top-0 end-0 m-3">
                  <Link to="/dashboard" className="btn btn-light btn-sm rounded-pill px-3">
                    <i className="bi bi-arrow-left me-2"></i>Back to Dashboard
                  </Link>
                </div>
              </div>

              <div className="card-body p-4 p-xl-5">
                <div className="row g-4">
                  {/* Profile Picture Section */}
                  <div className="col-12 col-md-4 text-center">
                    <div className="avatar-upload">
                      <div className="avatar-preview mx-auto" style={{
                        backgroundImage: `url(${previewUrl || '/default-avatar.jpg'})`,
                        borderRadius: '50%',
                        width: '200px',
                        height: '200px',
                        margin: '0 auto',
                        boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }} />
                      <button 
                        className="btn btn-outline-secondary mt-3" 
                        onClick={() => document.getElementById("fileInput").click()}
                      >
                        <i className="bi bi-camera-fill me-2"></i>Change Profile Picture
                      </button>
                      <input 
                        type="file" 
                        id="fileInput"
                        className="d-none" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                      />
                    </div>

                    <div className="mt-4">
                      <button 
                        onClick={handleDownloadTranscript}
                        className="btn btn-outline-primary w-100 py-3 rounded-pill d-flex align-items-center justify-content-center"
                      >
                        <i className="bi bi-file-earmark-pdf me-2"></i>
                        Generate Transcript
                      </button>
                    </div>
                  </div>

                  {/* Profile Form Section */}
                  <div className="col-12 col-md-8">
                    <form onSubmit={handleSubmit}>
                      <div className="row g-4">
                        {/* Username Field */}
                        <div className="col-12">
                          <div className="form-floating">
                            <input
                              type="text"
                              className="form-control form-control-lg"
                              id="username"
                              value={formData.username}
                              disabled
                              style={{ borderColor: frenchBlue }}
                            />
                            <label htmlFor="username" className="text-muted">
                              <i className="bi bi-person-fill me-2"></i>Username
                            </label>
                          </div>
                        </div>

                        {/* Email Field */}
                        <div className="col-12">
                          <div className="form-floating">
                            <input
                              type="email"
                              className="form-control form-control-lg"
                              id="email"
                              value={formData.email}
                              disabled
                              style={{ borderColor: frenchBlue }}
                            />
                            <label htmlFor="email" className="text-muted">
                              <i className="bi bi-envelope-fill me-2"></i>Email Address
                            </label>
                          </div>
                        </div>

                        {/* Language Level Select */}
                        <div className="col-12">
                          <div className="form-floating">
                            <select
                              name="languageLevel"
                              className="form-select form-select-lg"
                              value={formData.languageLevel}
                              onChange={handleInputChange}
                              style={{ borderColor: frenchBlue }}
                            >
                              <option value="Beginner">Beginner</option>
                              <option value="Intermediate">Intermediate</option>
                              <option value="Advanced">Advanced</option>
                            </select>
                            <label htmlFor="languageLevel" className="text-muted">
                              <i className="bi bi-translate me-2"></i>Proficiency Level
                            </label>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="col-12 mt-4">
                          <button 
                            type="submit" 
                            className="btn btn-lg w-100 rounded-pill text-white"
                            style={{
                              background: frenchBlue,
                              transition: 'transform 0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'none'}
                          >
                            <i className="bi bi-save-fill me-2"></i>
                            Update Profile
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {successMessage && (
          <div className="toast show position-fixed top-0 end-0 m-4" role="alert">
            <div className="toast-header bg-success text-white">
              <i className="bi bi-check-circle-fill me-2"></i>
              <strong className="me-auto">Success!</strong>
              <button type="button" className="btn-close" onClick={() => setSuccessMessage('')}></button>
            </div>
            <div className="toast-body">{successMessage}</div>
          </div>
        )}

        {errorMessage && (
          <div className="toast show position-fixed top-0 end-0 m-4" role="alert">
            <div className="toast-header bg-danger text-white">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              <strong className="me-auto">Error!</strong>
              <button type="button" className="btn-close" onClick={() => setErrorMessage('')}></button>
            </div>
            <div className="toast-body">{errorMessage}</div>
          </div>
        )}

        {/* Transcript Modal */}
        {showModal && (
          <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content overflow-hidden" style={{ borderRadius: '1rem' }}>
                <div className="modal-header" style={{ background: frenchBlue, color: frenchWhite }}>
                  <h5 className="modal-title">
                    <i className="bi bi-file-earmark-pdf-fill me-2"></i>
                    Transcript Ready!
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close btn-close-white" 
                    onClick={() => setShowModal(false)}
                  ></button>
                </div>
                <div className="modal-body text-center py-4">
                  <i className="bi bi-file-earmark-check-fill display-4" style={{ color: frenchBlue, marginBottom: '1rem' }}></i>
                  <p className="lead mb-4">Your learning transcript is ready to view or download.</p>
                  <div className="d-flex justify-content-center gap-3">
                    <button 
                      className="btn btn-outline-secondary px-4 rounded-pill"
                      onClick={() => setShowModal(false)}
                    >
                      Close
                    </button>
                    <button 
                      className="btn btn-primary px-4 rounded-pill"
                      onClick={() => {
                        window.open(transcriptUrl, "_blank");
                        setShowModal(false);
                      }}
                    >
                      <i className="bi bi-download me-2"></i>Open PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {loading && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1050 }}>
          <LoadingSpinner />
        </div>
      )}
      </div>
    </>
  );
};

export default UserSettings;
