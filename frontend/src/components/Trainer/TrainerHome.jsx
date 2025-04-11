// src/components/Trainer/TrainerHome.jsx
import React from "react";
import PendingBookings from "./PendingBookings";

const TrainerHome = () => {
  return (
    <div className="container mt-5">
      <h2 style={{ color: "#0055A4" }}>Welcome, Tutor!</h2>
      <p>This is your dashboard as a verified tutor.</p>
      <hr />
      <PendingBookings />
      {/* Add further tutor functionalities such as direct video call links, scheduling calendar, etc. */}
    </div>
  );
};

export default TrainerHome;
