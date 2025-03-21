import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const frenchBlue = "#0055A4";
const frenchRed = "#EF4135";
const frenchWhite = "#FFFFFF";

class Donation extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      amount: "10.00", // default donation amount
      error: ""
    };
  }

  componentDidMount() {
    const existingScript = document.getElementById("paypal-sdk");
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.REACT_APP_PAYPAL_CLIENT_ID}&buyer-country=US&currency=USD&components=buttons&enable-funding=venmo`;
      script.id = "paypal-sdk";
      script.onload = this.renderPayPalButtons;
      document.body.appendChild(script);
    } else {
      this.renderPayPalButtons();
    }
  }

  renderPayPalButtons = () => {
    if (window.paypal) {
      window.paypal.Buttons({
        style: {
          layout: "vertical",
          color: "gold",
          shape: "pill",
          label: "donate"
        },
        createOrder: (data, actions) => {
          const amount = this.state.amount.trim();
          const donationAmount = parseFloat(amount);

          if (!amount || isNaN(donationAmount) || donationAmount <= 0) {
            this.setState({ error: "Please enter a valid donation amount greater than $0." });
            return;
          }

          this.setState({ error: "" }); // Clear error if valid

          return actions.order.create({
            purchase_units: [{
              amount: {
                value: donationAmount.toFixed(2)
              }
            }]
          });
        },
        onApprove: (data, actions) => {
          return actions.order.capture().then(details => {
            alert(`Donation successful! Thank you, ${details.payer.name.given_name}.`);
          });
        },
        onError: (err) => {
          console.error(err);
        }
      }).render("#paypal-button-container");
    }
  };

  render() {
    return (
      <div className="container py-5 text-center">
        <div
          style={{
            maxWidth: "800px",
            margin: "auto",
            padding: "2rem",
            paddingLeft: "5em",
            paddingRight: "5em",
            borderRadius: "8px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            marginTop: "8em",
            marginBottom: "2em"
          }}
        >
          <img
            src="donation-icon.png"
            alt="donation icon"
            style={{ maxWidth: "30%", marginBottom: "0.5em" }}
          />
          <h2 style={{ color: frenchBlue, fontWeight: "bold", marginBottom: "1rem" }}>
            Support Our Mission
          </h2>
          <p>Help us continue providing high-quality French learning resources.</p>

          {/* Donation amount input */}
          <div className="my-4 d-flex flex-column flex-md-row align-items-center justify-content-center gap-3">
            {/* Label on the left */}
            <label
              htmlFor="donationAmount"
              style={{
                fontWeight: "600",
                fontSize: "1.2rem",
                minWidth: "200px",
                textAlign: "right"
              }}
            >
              Donation Amount ($)
            </label>

            {/* Input on the right */}
            <input
              type="number"
              id="donationAmount"
              className="form-control"
              min="1"
              step="0.01"
              value={this.state.amount}
              onChange={(e) => this.setState({ amount: e.target.value, error: "" })}
              style={{
                borderRadius: "6px",
                padding: "0.65rem 1rem",
                fontSize: "1.1rem",
                maxWidth: "200px",
                border: `solid 1px ${this.state.error ? frenchRed : "rgba(0,0,0,0.05)"}`,
                boxShadow: "2px 4px 4px rgba(0,0,0,0.05)",
                color: frenchRed,
                textAlign: "center"
              }}
            />
          </div>

          {/* Inline error message */}
          {this.state.error && (
            <div style={{ color: frenchRed, fontWeight: "500", marginBottom: "1rem" }}>
              {this.state.error}
            </div>
          )}

          {/* PayPal button */}
          <div id="paypal-button-container" className="mt-4"></div>
        </div>
      </div>
    );
  }
}

export default Donation;
