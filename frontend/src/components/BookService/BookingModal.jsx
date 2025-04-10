import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";

const frenchBlue = "#0055A4";
const frenchRed = "#EF4135";
const frenchWhite = "#FFFFFF";

const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  zIndex: 1000,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const modalContentStyle = {
  backgroundColor: frenchWhite,
  borderRadius: "8px",
  padding: "2rem",
  width: "90%",
  maxWidth: "500px",
  boxShadow: "0 0 10px rgba(0,0,0,0.3)",
};

const BookingModal = ({ trainer, existingBooking, onClose, onBookingUpdate }) => {
  const { user } = useAuth();
  // If an active booking is passed in, we use that in the modal;
  // otherwise, we’re in scheduling mode.
  const [scheduledTime, setScheduledTime] = useState("");
  const [booking, setBooking] = useState(existingBooking);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // GraphQL endpoint (adjust as needed)
  const GRAPHQL_URI =
    process.env.REACT_APP_API_URL
      ? `${process.env.REACT_APP_API_URL}/graphql`
      : "http://localhost:4000/graphql";

  // Mutation: Schedule a new booking.
  const scheduleBooking = async () => {
    if (!scheduledTime) {
      setError("Please select a date and time.");
      return;
    }
    setLoading(true);
    setError(null);

    const query = `
      mutation ScheduleBooking($input: BookingInput!) {
        scheduleBooking(input: $input) {
          id
          scheduledTime
          traineeRSVP
          trainerRSVP
          status
        }
      }
    `;
    const variables = {
      input: {
        traineeId: user.id,
        trainerId: trainer.id,
        scheduledTime,
      },
    };

    try {
      const res = await fetch(GRAPHQL_URI, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
      });
      const result = await res.json();
      if (result.errors) {
        setError(result.errors[0].message);
      } else {
        setBooking(result.data.scheduleBooking);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      onBookingUpdate && onBookingUpdate();
    }
  };

  // Mutation: Trainee confirms (RSVP) the booking.
  const traineeRSVP = async () => {
    if (!booking) return;
    setLoading(true);
    const query = `
      mutation TraineeRSVP($bookingId: ID!) {
        traineeRSVPBooking(bookingId: $bookingId) {
          id
          traineeRSVP
          trainerRSVP
          status
        }
      }
    `;
    const variables = { bookingId: booking.id };

    try {
      const res = await fetch(GRAPHQL_URI, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
      });
      const result = await res.json();
      if (result.errors) {
        setError(result.errors[0].message);
      } else {
        setBooking(result.data.traineeRSVPBooking);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <h3 style={{ color: frenchBlue }}>Booking with {trainer.username}</h3>
        {/* If no booking exists, show the scheduling form */}
        {!booking && (
          <>
            <div className="form-group">
              <label>Select Date &amp; Time:</label>
              <input
                type="datetime-local"
                className="form-control"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
            {error && <p className="text-danger">{error}</p>}
            <button
              className="btn btn-primary mt-3"
              style={{ backgroundColor: frenchBlue, borderColor: frenchBlue }}
              onClick={scheduleBooking}
              disabled={loading}
            >
              {loading ? "Scheduling..." : "Schedule Booking"}
            </button>
          </>
        )}

        {/* Once the booking exists, show the RSVP workflow */}
        {booking && (
          <>
            <p>
              <strong>Scheduled Time:</strong>{" "}
              {new Date(booking.scheduledTime).toLocaleString()}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </p>
            <div className="d-flex flex-column mt-3">
              {!booking.traineeRSVP && (
                <button
                  className="btn btn-outline-primary mb-2"
                  style={{ borderColor: frenchBlue, color: frenchBlue }}
                  onClick={traineeRSVP}
                  disabled={loading}
                >
                  {loading ? "Processing RSVP..." : "RSVP Now"}
                </button>
              )}
              {booking.traineeRSVP && !booking.trainerRSVP && (
                <button className="btn btn-secondary mb-2" disabled>
                  Awaiting Trainer RSVP
                </button>
              )}
              {booking.traineeRSVP && booking.trainerRSVP && (
                <button
                  className="btn btn-success mb-2"
                  style={{ backgroundColor: frenchBlue, borderColor: frenchBlue }}
                  onClick={() =>
                    // Redirect to meeting room with room equal to booking.id
                    (window.location.href = `/meeting?room=${booking.id}`)
                  }
                >
                  Go to Meeting
                </button>
              )}
            </div>
          </>
        )}
        <button
          className="btn btn-link mt-3"
          onClick={onClose}
          style={{ color: frenchRed }}
        >
          Close
        </button>
        {error && <p className="text-danger mt-2">{error}</p>}
      </div>
    </div>
  );
};

export default BookingModal;
