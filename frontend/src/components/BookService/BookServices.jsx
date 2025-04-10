// src/components/BookService.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const BookServices = () => {
  const navigate = useNavigate();

  // Currently only one service is available. You can add more items as needed.
  const services = [
    {
      id: 1,
      title: "Video Call with Tutor Session",
      description: "Book a one-on-one video session with a certified tutor for personalized guidance.",
      // Replace the image URL with your actual asset (local or hosted)
      imageUrl: "/images/video-call-service.png"
    }
  ];

  return (
    <div className="container my-5">
      <h2 className="mb-4">Book a Service</h2>
      <div className="row">
        {services.map((service) => (
          <div key={service.id} className="col-md-4 mb-4">
            <div
              className="card h-100 shadow-sm"
              style={{ cursor: "pointer" }}
              onClick={() => navigate("/video-call-session")}
            >
              <img src={service.imageUrl} className="card-img-top" alt={service.title} />
              <div className="card-body">
                <h5 className="card-title">{service.title}</h5>
                <p className="card-text">{service.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookServices;
