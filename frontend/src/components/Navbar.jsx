// components/Navbar.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// French flag color palette
const frenchBlue = "#0055A4";
const frenchRed = "#EF4135";
const frenchWhite = "#FFFFFF";

const Navbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // Set authentication state to false
    navigate("/login"); // Redirect to login page
  };

  // Common style for NavLink
  const navLinkStyle = ({ isActive }) => ({
    color: isActive ? frenchRed : frenchBlue,
    fontWeight: isActive ? "600" : "400",
    textDecoration: "none",
    padding: "0.5rem 1rem",
    borderBottom: isActive ? `2px solid ${frenchRed}` : "none",
    transition: "color 0.2s ease-in-out",
  });

  return (
    <nav
      className="navbar navbar-expand-lg navbar-light bg-white border-bottom"
      style={{ boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)" }}
    >
      <div className="container-fluid">
        {/* Logo / Brand */}
        <NavLink className="navbar-brand" to="/" style={{ paddingLeft: "1rem" }}>
          <img
            src="../Logo.png"
            width={100}
            alt="Company Logo"
            className="custom-logo"
          />
        </NavLink>

        {/* Mobile Toggle */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
          style={{ borderColor: frenchBlue }}
        >
          <span className="navbar-toggler-icon" />
        </button>

        {/* Collapsible Nav Items */}
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto me-4">
            {isAuthenticated ? (
              <>
                <li className="nav-item">
                  <NavLink style={navLinkStyle} to="/dashboard">
                    Dashboard
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink style={navLinkStyle} to="/speakingmock">
                    Speaking
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink style={navLinkStyle} to="/listeningmock">
                    Listening
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink style={navLinkStyle} to="/readingmock">
                    Reading
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink style={navLinkStyle} to="/writingmock">
                    Writing
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink style={navLinkStyle} to="/headtoheadmatch">
                    Head2Head
                  </NavLink>
                </li>
                <li className="nav-item">
                  <button
                    onClick={handleLogout}
                    className="btn btn-link nav-link"
                    style={{
                      color: frenchBlue,
                      textDecoration: "none",
                      padding: "0.5rem 1rem",
                    }}
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <NavLink style={navLinkStyle} to="/">
                    Home
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink style={navLinkStyle} to="/register">
                    Register
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink style={navLinkStyle} to="/login">
                    Login
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
