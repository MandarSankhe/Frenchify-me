import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
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

// Create time options from 10:00 AM to 5:00 PM in half-hour increments.
const generateTimeSlots = () => {
  const slots = [];
  // Start at 10:00 (10 AM) until 17:00 (5 PM).
  let hour = 10;
  let minute = 0;
  while (hour < 17 || (hour === 17 && minute === 0)) {
    // Format display (e.g., 10:00 AM, 10:30 AM, etc.)
    const displayHour = hour > 12 ? hour - 12 : hour;
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayMinute = minute === 0 ? "00" : minute;
    const displayTime = `${displayHour}:${displayMinute} ${ampm}`;
    // Underlying value in 24-hour format HH:mm (e.g., "10:00", "10:30")
    const valueTime = `${hour.toString().padStart(2, "0")}:${displayMinute}`;
    slots.push({ display: displayTime, value: valueTime });
    // Increase by 30 minutes
    if (minute === 0) {
      minute = 30;
    } else {
      minute = 0;
      hour++;
    }
  }
  return slots;
};

const timeSlots = generateTimeSlots();

// Helper to combine selected date and time into a proper ISO-like string "YYYY-MM-DDTHH:mm"
const combineDateAndTime = (date, timeStr) => {
  const [hoursStr, minutesStr] = timeStr.split(":");
  // Clone the date to prevent modifying the original state
  const combined = new Date(date);
  combined.setHours(parseInt(hoursStr, 10));
  combined.setMinutes(parseInt(minutesStr, 10));
  combined.setSeconds(0);
  combined.setMilliseconds(0);

  // Format as YYYY-MM-DDTHH:mm manually
  const year = combined.getFullYear();
  const month = (combined.getMonth() + 1).toString().padStart(2, "0");
  const day = combined.getDate().toString().padStart(2, "0");
  const hours = combined.getHours().toString().padStart(2, "0");
  const minutes = combined.getMinutes().toString().padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const BookingModal = ({ trainer, existingBooking, onClose, onBookingUpdate }) => {
  const { user } = useAuth();
  
  // If an active booking is passed in, we use that in the modal; otherwise, we’re in scheduling mode.
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState("");
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
    // Validate that a date and time have been selected
    if (!selectedDate || !selectedTime) {
      setError("Please select a date and time.");
      return;
    }
    setLoading(true);
    setError(null);

    // Combine the date and time into one string with the proper format.
    const scheduledTime = combineDateAndTime(selectedDate, selectedTime);

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
      if(onBookingUpdate) onBookingUpdate();
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

  // Create a date that represents tomorrow (to disable today and earlier dates)
  const getTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <h3 style={{ color: frenchBlue }}>Booking with {trainer.username}</h3>
        {/* If no booking exists, show the scheduling form */}
        {!booking && (
          <>
            <div className="form-group">
              <label>Select Date:</label>
              <DatePicker
                selected={selectedDate}
                onChange={(date) => setSelectedDate(date)}
                minDate={getTomorrow()}
                dateFormat="yyyy-MM-dd"
                placeholderText="Select a date"
                className="form-control"
              />
            </div>

            <div className="form-group mt-3">
              <label>Select Time:</label>
              <select
                className="form-control"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
              >
                <option value="">Select a time</option>
                {timeSlots.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.display}
                  </option>
                ))}
              </select>
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
