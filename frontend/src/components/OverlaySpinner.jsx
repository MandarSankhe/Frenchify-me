import React from "react";
import "../OverlaySpinner.css"; // We'll add some CSS here

const OverlaySpinner = () => {
  return (
    <div className="overlay-spinner">
      {/* <div className="spinner-border text-light" role="status">
        <span className="visually-hidden">Loading...</span>
      </div> */}
      <img src="../loading.gif" alt="loading" className="minion-gif"/>
    </div>
  );
};

export default OverlaySpinner;
