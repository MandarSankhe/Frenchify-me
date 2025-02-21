import React from "react";
import "../OverlaySpinner.css"; // We'll add some CSS here

const LoadingSpinner = () => {
  return (
    <div className="overlay-spinner">
      {/* <div className="spinner-border text-light" role="status">
        <span className="visually-hidden">Loading...</span>
      </div> */}
      <img src="../Frenchify-loading.gif" alt="loading"/>
    </div>
  );
};

export default LoadingSpinner;
