// components/Navbar.jsx
import React, { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { IoMdSettings } from "react-icons/io";
import { FiLogOut } from "react-icons/fi";

// French flag color palette
const frenchBlue = "#0055A4";
const frenchRed = "#EF4135";

const Navbar = () => {
  const { isAuthenticated, logout, user, updateUserdata  } = useAuth(); // assuming your context provides `user`
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setDropdownOpen(false);
    navigate("/login");
  };

  // Determine profile image URL; fallback if not available
  const profileImageUrl =
    user && user.profileImage
      ? user.profileImage
      : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";


  console.log("userdata:", user);

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
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm fixed-top">
      <div className="container-fluid">
        {/* Logo / Brand */}
        <NavLink className="navbar-brand" to="/" style={{ paddingLeft: "1rem" }}>
          <img src="../Logo.png" width={100} alt="Company Logo" className="custom-logo" />
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
                  <NavLink className="nav-link" style={navLinkStyle} to="/dashboard">
                    Dashboard
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className="nav-link" style={navLinkStyle} to="/speakingmock">
                    Speaking
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className="nav-link" style={navLinkStyle} to="/listeningtraining">
                    Listening Training
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className="nav-link" style={navLinkStyle} to="/listeningmock">
                    Listening
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className="nav-link" style={navLinkStyle} to="/readingmock">
                    Reading
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className="nav-link" style={navLinkStyle} to="/writingmock">
                    Writing
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className="nav-link" style={navLinkStyle} to="/headtoheadmatch">
                    Head2Head
                  </NavLink>
                </li>
                <div className="dropdown" ref={dropdownRef}>
                  <button
                    className="btn btn-link dropdown-toggle d-flex align-items-center"
                    type="button"
                    id="dropdownMenuButton"
                    data-bs-toggle="dropdown"
                    aria-expanded={dropdownOpen}
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                  >
                    {/* Display user's profile image */}
                    <img
                      src={profileImageUrl}
                      alt="Profile"
                      key={profileImageUrl} // Force re-render when URL changes
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        marginRight: "8px",
                      }}
                    />
                  </button>

                  {/* Dropdown menu */}
                  <ul
                    className={`dropdown-menu dropdown-menu-end shadow-lg ${dropdownOpen ? "show" : ""}`}
                    aria-labelledby="dropdownMenuButton"
                  >
                    <li>
                      <button
                        onClick={() => {
                          navigate("/user-settings");
                          setDropdownOpen(false);
                        }}
                        className="dropdown-item d-flex align-items-center"
                      >
                        <IoMdSettings style={{ marginRight: "8px" }} />
                        Settings
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          handleLogout();
                          setDropdownOpen(false);
                        }}
                        className="dropdown-item d-flex align-items-center text-danger"
                      >
                        <FiLogOut style={{ marginRight: "8px" }} />
                        Logout
                      </button>
                    </li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <NavLink className="nav-link" style={navLinkStyle} to="/">
                    Home
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className="nav-link" style={navLinkStyle} to="/register">
                    Register
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className="nav-link" style={navLinkStyle} to="/login">
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
