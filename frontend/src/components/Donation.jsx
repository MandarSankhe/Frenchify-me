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
      error: "",
      inputDisabled: false,
      donationAnimation: {
        visible: false,
        type: "", // "success" or "error"
        message: "",
        invoiceUrl: ""
      }
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

          this.setState({ error: "", inputDisabled: true }); // Clear error if valid and disable the donation input

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
            // alert(`Donation successful! Thank you, ${details.payer.name.given_name}.`);

            // Extract donor information from PayPal details
            const donationAmount = parseFloat(this.state.amount).toFixed(2);
            const payerName = details.payer.name;
            const fullName = payerName.given_name + (payerName.surname ? " " + payerName.surname : "");
            const email = details.payer.email_address || "";

            // Define backend URL for GraphQL and invoice view
            const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:4000";

            // Call backend GraphQL mutation to save the donation record
            fetch(process.env.REACT_APP_GRAPHQL_ENDPOINT || "http://localhost:4000/graphql", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                query: `
                  mutation CreateDonation($input: DonationInput!) {
                    createDonation(input: $input) {
                      id
                      invoiceNumber
                    }
                  }
                `,
                variables: {
                  input: {
                    fullName,
                    email,
                    amount: parseFloat(donationAmount),
                    message: "Thank you for your donation!"
                  }
                }
              })
            })
              .then(response => response.json())
              .then(result => {
                if (result.errors) {
                    console.error("GraphQL errors:", result.errors);
                    this.setState({
                        donationAnimation: {
                        visible: true,
                        type: "error",
                        message: "Donation successful, but failed to save donation record.",
                        invoiceUrl: ""
                        }
                    });
                } else {
                    const donationId = result.data.createDonation.id;
                    // Construct invoice URL using your backend endpoint
                    const invoiceUrl = `${backendUrl}/api/invoice/${donationId}`;
                    
                    // Show success overlay with invoice info
                    this.setState({
                        donationAnimation: {
                          visible: true,
                          type: "success",
                          message: `Donation successful! Thank you, ${fullName}. Invoice Number: ${result.data.createDonation.invoiceNumber}`,
                          invoiceUrl
                        }
                    });
                }
              })
              .catch(error => {
                console.error("Error saving donation:", error);
                this.setState({
                    donationAnimation: {
                      visible: true,
                      type: "error",
                      message: "Donation successful, but an error occurred while saving your donation record.",
                      invoiceUrl: ""
                    }
                });
              });
          });
        },
        // onCancel callback to re-enable the input when the PayPal form is closed
        onCancel: (data, actions) => {
            console.log("Payment cancelled, re-enabling input.");
            this.setState({ inputDisabled: false });
        },
        onError: (err) => {
          console.error(err);
        }
      }).render("#paypal-button-container");
    }
  };

  render() {
    // Inline styles for the overlay and content with a fadeIn animation
    const overlayStyle = {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        animation: "fadeIn 0.5s"
    };
  
    const overlayContentStyle = {
        backgroundColor: "#fff",
        padding: "2rem",
        borderRadius: "8px",
        textAlign: "center",
        maxWidth: "90%",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
    };

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
              disabled={this.state.inputDisabled}
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

        {/* Animation overlay: Displayed on success or error */}
        {this.state.donationAnimation.visible && (
          <div style={overlayStyle}>
            <div style={overlayContentStyle}>
              <h2 style={{ color: this.state.donationAnimation.type === "success" ? frenchBlue : "red" }} className="mb-3">
                {this.state.donationAnimation.type === "success" ? "Thank You! 🤝💙" : "Oops!"}
              </h2>
              <p>{this.state.donationAnimation.message}</p>

              <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "1rem" }}>
                {/* View Invoice button appears only on success */}
                {this.state.donationAnimation.type === "success" && this.state.donationAnimation.invoiceUrl && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => window.open(this.state.donationAnimation.invoiceUrl, '_blank')}
                  >
                    View Invoice
                  </button>
                )}
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        console.log("#rpClose button clicked");
                        this.setState({
                            donationAnimation: { ...this.state.donationAnimation, visible: false },
                            inputDisabled: false
                        }, () => console.log("#rpClose clicked, inputDisabled:", this.state.inputDisabled))
                    }
                  }
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    );
  }
}

export default Donation;
