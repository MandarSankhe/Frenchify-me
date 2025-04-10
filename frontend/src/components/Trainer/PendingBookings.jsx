import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";

const frenchBlue = "#0055A4";
const frenchRed = "#EF4135";
const frenchWhite = "#FFFFFF";

const GRAPHQL_URI = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/graphql`
  : "http://localhost:4000/graphql";

const PendingBookings = () => {
  const { user } = useAuth(); // assumed current trainer
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch pending/active bookings for the logged in trainer
  useEffect(() => {
    const fetchBookings = async () => {
      const query = `
        query GetPendingBookings($trainerId: ID!) {
          bookingsByTrainer(trainerId: $trainerId) {
            id
            scheduledTime
            trainee {
              username
              email
            }
            traineeRSVP
            trainerRSVP
            status
          }
        }
      `;
      try {
        const res = await fetch(GRAPHQL_URI, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables: { trainerId: user.id } }),
        });
        const result = await res.json();
        if (result.errors) {
          setError(result.errors[0].message);
        } else {
          setBookings(result.data.bookingsByTrainer);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user && user.userType === "trainer") {
      fetchBookings();
    }
  }, [user]);

  // Mutation: Trainer RSVPs for a booking.
  const trainerRSVP = async (bookingId) => {
    const query = `
      mutation TrainerRSVP($bookingId: ID!) {
        trainerRSVPBooking(bookingId: $bookingId) {
          id
          trainerRSVP
          traineeRSVP
          status
        }
      }
    `;
    try {
      const res = await fetch(GRAPHQL_URI, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { bookingId } }),
      });
      const result = await res.json();
      if (result.errors) {
        setError(result.errors[0].message);
      } else {
        // Update the specific booking with the new state
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId
              ? { ...b, trainerRSVP: true, status: b.traineeRSVP ? "confirmed" : b.status }
              : b
          )
        );
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  // When booking is confirmed, the trainer can join the meeting:
  const joinMeeting = (bookingId) => {
    window.location.href = `/meeting?room=${bookingId}`;
  };

  if (loading) return <p>Loading pending bookings...</p>;
  if (error) return <p className="text-danger">Error: {error}</p>;

  return (
    <div>
      <h4 style={{ color: frenchBlue }}>Pending Bookings</h4>
      {bookings.length === 0 ? (
        <p>No pending bookings.</p>
      ) : (
        <table className="table table-hover">
          <thead style={{ backgroundColor: frenchBlue, color: frenchWhite }}>
            <tr>
              <th>Trainee</th>
              <th>Scheduled Time</th>
              <th>Your RSVP</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td>{booking.trainee.username}</td>
                <td>{new Date(booking.scheduledTime).toLocaleString()}</td>
                <td>{booking.trainerRSVP ? "Yes" : "No"}</td>
                <td>
                  {booking.status === "confirmed" ? (
                    <button
                      className="btn btn-success btn-sm"
                      style={{ backgroundColor: frenchBlue, borderColor: frenchBlue }}
                      onClick={() => joinMeeting(booking.id)}
                    >
                      Join Meeting
                    </button>
                  ) : (
                    !booking.trainerRSVP ? (
                      <button
                        className="btn btn-outline-primary btn-sm"
                        style={{ borderColor: frenchBlue, color: frenchBlue }}
                        onClick={() => trainerRSVP(booking.id)}
                      >
                        RSVP
                      </button>
                    ) : (
                      <span className="text-success">RSVP'd</span>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default PendingBookings;
