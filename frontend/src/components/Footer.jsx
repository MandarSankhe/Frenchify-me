import { FaFacebook, FaTwitter, FaInstagram } from "react-icons/fa";
import { NavLink } from "react-router-dom";
import 'bootstrap/dist/css/bootstrap.min.css';

const Footer = () => {
  return (
    <footer
      className="py-5"
      style={{
        background: 'linear-gradient(to right, #d3d3d3, #f0f0f0)', // Light gray gradient background
        color: 'black' // Black font color
      }}
    >
      <div className="container text-center text-md-start">
        <div className="row">
          {/* Column 1: Logo and Brand Name */}
          <div className="col-md-3 mb-4 mb-md-0">
            <img src="/logo.png" alt="Brand Logo" className="mb-2" style={{ height: '50px' }} />
            <h2 className="fw-bold" style={{ color: '#0055A4' }}>Frenchify</h2>
          </div>

          {/* Column 2: Privacy Policy Links */}
          <div className="col-md-3 mb-4 mb-md-0">
            <h3 className="fw-bold text-danger">Privacy Policy</h3>
            <ul className="list-unstyled">
              <li><NavLink to="/terms" className="text-dark text-decoration-none">Terms & Conditions</NavLink></li>
              <li><NavLink to="/privacy" className="text-dark text-decoration-none">Privacy Policy</NavLink></li>
              <li><NavLink to="/cookies" className="text-dark text-decoration-none">Cookie Policy</NavLink></li>
            </ul>
          </div>

          {/* Column 3: Quick Links */}
          <div className="col-md-3 mb-4 mb-md-0">
            <h3 className="fw-bold text-danger">Quick Links</h3>
            <ul className="list-unstyled">
              <li><NavLink to="/about" className="text-dark text-decoration-none">About Us</NavLink></li>
              <li><NavLink to="/" className="text-dark text-decoration-none">Services</NavLink></li>
              <li><NavLink to="/" className="text-dark text-decoration-none">Contact Us</NavLink></li>
            </ul>
          </div>

          {/* Column 4: Social Media Links */}
          <div className="col-md-3">
            <h3 className="fw-bold text-danger">Follow Us</h3>
            <div className="d-flex justify-content-start gap-3">
              <NavLink to="https://www.facebook.com" className="text-dark" target="_blank">
                <FaFacebook size={24} />
              </NavLink>
              <NavLink to="https://www.twitter.com" className="text-dark" target="_blank">
                <FaTwitter size={24} />
              </NavLink>
              <NavLink to="https://www.instagram.com" className="text-dark" target="_blank">
                <FaInstagram size={24} />
              </NavLink>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
