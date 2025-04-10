import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BookingModal from "./BookingModal";
import { useAuth } from "../../context/AuthContext";

const frenchBlue = "#0055A4";

const GRAPHQL_URI = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/graphql`
  : "http://localhost:4000/graphql";

const VideoCallSession = () => {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeBooking, setActiveBooking] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch trainer list for non-trainer users
  useEffect(() => {
    const fetchTrainers = async () => {
      const query = `
        query GetTrainers {
          trainers {
            id
            username
            email
            profileImage
          }
        }
      `;
      try {
        const response = await fetch(GRAPHQL_URI, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const result = await response.json();
        if (result.errors) {
          setError(result.errors[0].message);
        } else {
          setTrainers(result.data.trainers);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (user && user.userType !== "trainer") {
      fetchTrainers();
    }
  }, [user]);

  // Fetch the active booking for the current trainee
  const fetchActiveBooking = async () => {
    const query = `
      query ActiveBooking($traineeId: ID!) {
        activeBookingByTrainee(traineeId: $traineeId) {
          id
          scheduledTime
          traineeRSVP
          trainerRSVP
          status
          trainer {
            id
            username
            email
          }
        }
      }
    `;
    try {
      const response = await fetch(GRAPHQL_URI, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { traineeId: user.id } }),
      });
      const result = await response.json();
      if (result.errors) {
        // In case no active booking exists, set to null
        setActiveBooking(null);
      } else {
        setActiveBooking(result.data.activeBookingByTrainee);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handler for Book Now button on each trainer card
  const handleBookNow = async (trainer) => {
    await fetchActiveBooking();
    // Allow a short delay for the state update
    setTimeout(() => {
      if (activeBooking) {
        if (activeBooking.trainer.id === trainer.id) {
          setSelectedTrainer(trainer);
          setShowModal(true);
        } else {
          alert(
            `You already have a scheduled booking with ${activeBooking.trainer.username}. Please complete or wait until that session has passed before booking another.`
          );
        }
      } else {
        setSelectedTrainer(trainer);
        setShowModal(true);
      }
    }, 300);
  };

  if (loading)
    return <p className="text-center my-5">Loading trainers...</p>;
  if (error)
    return <p className="text-center text-danger my-5">Error: {error}</p>;

  return (
    <div className="container my-5">
      <h2 className="mb-4" style={{ color: frenchBlue }}>
        Available Trainers
      </h2>
      {trainers.length === 0 ? (
        <p>No trainers available at the moment. Please check back later.</p>
      ) : (
        <div className="row">
          {trainers.map((trainer) => (
            <div key={trainer.id} className="col-md-4 mb-4">
              <div className="card h-100 shadow-sm">
                <img
                  src={trainer.profileImage || "https://via.placeholder.com/150"}
                  className="card-img-top"
                  alt={trainer.username}
                  style={{ height: "200px", objectFit: "cover" }}
                />
                <div className="card-body">
                  <h5 className="card-title">{trainer.username}</h5>
                  <p className="card-text">{trainer.email}</p>
                  <button
                    className="btn btn-primary"
                    style={{
                      backgroundColor: frenchBlue,
                      borderColor: frenchBlue,
                    }}
                    onClick={() => handleBookNow(trainer)}
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4">
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          Back to Services
        </button>
      </div>
      {showModal && selectedTrainer && (
        <BookingModal
          trainer={selectedTrainer}
          existingBooking={activeBooking}
          onClose={() => {
            setShowModal(false);
            setSelectedTrainer(null);
          }}
          onBookingUpdate={() => {
            // Optionally refresh booking data here
          }}
        />
      )}
    </div>
  );
};

export default VideoCallSession;
