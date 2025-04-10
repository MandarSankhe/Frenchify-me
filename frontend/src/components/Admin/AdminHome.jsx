import React, { useState } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import LoadingSpinner from "../LoadingSpinner";

const PENDING_TUTORS_QUERY = gql`
  query PendingTutors {
    pendingTutors {
      id
      username
      email
      languageLevel
    }
  }
`;

const VERIFY_TUTOR_MUTATION = gql`
  mutation VerifyTutor($userId: ID!) {
    verifyTutor(userId: $userId) {
      id
      username
      userType
    }
  }
`;

const USERS_QUERY = gql`
  query Users {
    users {
      id
      username
      email
      languageLevel
      userType
    }
  }
`;

const AdminHome = () => {
  // Query for pending tutor verification requests
  const {
    data: pendingData,
    loading: pendingLoading,
    error: pendingError,
    refetch: refetchPending,
  } = useQuery(PENDING_TUTORS_QUERY);

  // Query for fetching all users
  const {
    data: allUsersData,
    loading: allUsersLoading,
    error: allUsersError,
  } = useQuery(USERS_QUERY);

  const [verifyTutor] = useMutation(VERIFY_TUTOR_MUTATION);
  const [message, setMessage] = useState("");

  const handleVerify = async (userId) => {
    try {
      await verifyTutor({ variables: { userId } });
      setMessage("Tutor verified successfully!");
      refetchPending();
    } catch (err) {
      console.error("Error verifying tutor:", err);
      setMessage("Failed to verify tutor.");
    }
  };

  // Filter users into trainees (students) and tutors.
  const students =
    allUsersData?.users.filter((user) => user.userType === "trainee") || [];
  // Tutors include both verified tutors ("trainer") and pending ones ("pendingTutor")
  const tutors =
    allUsersData?.users.filter(
      (user) => user.userType === "trainer" || user.userType === "pendingTutor"
    ) || [];

    return (
        <div className="container-fluid py-4">
          <div className="row mb-4">
            <div className="col-12">
              <div className="card shadow-sm border-0">
                <div className="card-body">
                  <h2 className="mb-3 text-primary">Admin Dashboard</h2>
                  <p className="lead text-muted">
                    Manage tutor verification requests and user accounts
                  </p>
                  
                  {message && (
                    <div className={`alert alert-${message.includes("success") ? "success" : "danger"} alert-dismissible fade show`}>
                      {message}
                      <button type="button" className="btn-close" onClick={() => setMessage("")}></button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
    
          {/* Pending Tutor Verification Section */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card shadow-sm border-0">
                <div className="card-header bg-primary text-white">
                  <h3 className="mb-0">Pending Tutor Requests</h3>
                </div>
                <div className="card-body">
                  {pendingLoading ? (
                    <div className="text-center py-4">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                        <LoadingSpinner />
                    </div>
                  ) : pendingError ? (
                    <div className="alert alert-danger">Error loading pending tutor requests.</div>
                  ) : pendingData.pendingTutors.length === 0 ? (
                    <div className="alert alert-info">No pending tutor requests at this time.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Language Level</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingData.pendingTutors.map((tutor) => (
                            <tr key={tutor.id}>
                              <td>
                                <span className="fw-bold">{tutor.username}</span>
                              </td>
                              <td>{tutor.email}</td>
                              <td>
                                <span className="badge bg-info text-dark">
                                  {tutor.languageLevel}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => handleVerify(tutor.id)}
                                >
                                  <i className="bi bi-check-circle me-1"></i> Verify
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
    
          {/* User Management Section */}
          <div className="row">
            {/* Students Column */}
            <div className="col-lg-6 mb-4">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-success text-white">
                  <h3 className="mb-0">
                    <i className="bi bi-people me-2"></i>Students
                    <span className="badge bg-light text-dark ms-2">
                      {students.length}
                    </span>
                  </h3>
                </div>
                <div className="card-body">
                  {allUsersLoading ? (
                    <div className="text-center py-4">
                      <div className="spinner-border text-success" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      < LoadingSpinner />
                    </div>
                  ) : allUsersError ? (
                    <div className="alert alert-danger">Error loading students.</div>
                  ) : students.length === 0 ? (
                    <div className="alert alert-info">No student records found.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead className="table-light">
                          <tr>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Level</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((student) => (
                            <tr key={student.id}>
                              <td>
                                <span className="fw-bold">{student.username}</span>
                              </td>
                              <td>{student.email}</td>
                              <td>
                                <span className="badge bg-secondary">
                                  {student.languageLevel}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
    
            {/* Tutors Column */}
            <div className="col-lg-6 mb-4">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-warning text-dark">
                  <h3 className="mb-0">
                    <i className="bi bi-person-badge me-2"></i>Tutors
                    <span className="badge bg-light text-dark ms-2">
                      {tutors.length}
                    </span>
                  </h3>
                </div>
                <div className="card-body">
                  {allUsersLoading ? (
                    <div className="text-center py-4">
                      <div className="spinner-border text-warning" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : allUsersError ? (
                    <div className="alert alert-danger">Error loading tutors.</div>
                  ) : tutors.length === 0 ? (
                    <div className="alert alert-info">No tutor records found.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead className="table-light">
                          <tr>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Level</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tutors.map((tutor) => (
                            <tr key={tutor.id}>
                              <td>
                                <span className="fw-bold">{tutor.username}</span>
                              </td>
                              <td>{tutor.email}</td>
                              <td>
                                <span className="badge bg-secondary">
                                  {tutor.languageLevel}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`badge ${
                                    tutor.userType === "pendingTutor"
                                      ? "bg-warning text-dark"
                                      : "bg-success"
                                  }`}
                                >
                                  {tutor.userType === "pendingTutor"
                                    ? "Pending"
                                    : "Verified"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    };
    
    export default AdminHome;
