import React, { useState, useEffect } from "react";
import { useMutation, gql } from "@apollo/client";
import { Link, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable"; // for tables
import Navbar from "./Navbar";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

const UPDATE_USER_MUTATION = gql`
  mutation UpdateUser($id: ID!, $input: UserUpdateInput!, $profileImage: Upload) {
    updateUser(id: $id, input: $input, profileImage: $profileImage) {
      id
      languageLevel
      profileImage
      username
      email
    }
  }
`;

const GRAPHQL_ENDPOINT = `${process.env.REACT_APP_API_URL || "http://localhost:4000"}/graphql`;

// Helper: fetch image and convert to Base64
const fetchImageAsBase64 = async (url) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error fetching image:", error);
    return null;
  }
};

// Helper: get image natural dimensions from base64 data
const getImageDimensions = (base64) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = base64;
  });
};

const UserSettings = () => {
  const { user, updateUserdata } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    languageLevel: "Beginner",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [transcriptUrl, setTranscriptUrl] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [updateUser] = useMutation(UPDATE_USER_MUTATION);

  // Colors for design
  const frenchBlue = "#0055A4";
  const frenchRed = "#EF4135";
  const frenchWhite = "#FFFFFF";

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        email: user.email || "",
        languageLevel: user.languageLevel || "Beginner",
      });
      setPreviewUrl(user.profileImage || "");
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
    }
  };

  // Generate PDF and return a blob URL instead of downloading automatically
  const generateTranscriptPdf = async (transcriptData, images) => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.getPageWidth();
    const pageHeight = doc.getPageHeight();

    // ---------- Header Section ----------
    doc.setFillColor(42, 92, 130);
    doc.rect(0, 0, pageWidth, 30, "F");

    if (images.logoHeader) {
      // Preserve aspect ratio for logo header
      const logoDims = await getImageDimensions(images.logoHeader);
      const desiredLogoWidth = 33;
      const desiredLogoHeight = (desiredLogoWidth * logoDims.height) / logoDims.width;
      doc.addImage(images.logoHeader, "PNG", 5, 5, desiredLogoWidth, desiredLogoHeight);
    }
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text(`${user.username}'s Transcript`, pageWidth - 10, 12, { align: "right" });
    doc.setFontSize(10);
    doc.text("Official Learning Record", pageWidth - 10, 18, { align: "right" });
    doc.setDrawColor(91, 164, 230);
    doc.setLineWidth(0.5);
    doc.line(10, 32, pageWidth - 10, 32);

    // ---------- Skill Mastery Section ----------
    let yPos = 38;
    doc.setTextColor(42, 92, 130);
    doc.setFontSize(14);
    doc.text("Skill Mastery", 10, yPos);
    yPos += 6;
    doc.setFontSize(10);
    Object.entries(transcriptData.skillProgress).forEach(([skill, score]) => {
      const percent = score * 10;
      doc.setTextColor(68, 68, 68);
      doc.text(skill, 10, yPos);
      doc.setFillColor(232, 232, 232);
      doc.rect(70, yPos - 3, 40, 4, "F");
      doc.setFillColor(91, 164, 230);
      doc.rect(70, yPos - 3, (40 * percent) / 100, 4, "F");
      doc.setTextColor(0, 0, 0);
      doc.text(`${percent}%`, 115, yPos);
      yPos += 6;
    });

    // ---------- H2H Performance Section ----------
    yPos += 4;
    const colWidth = (pageWidth - 20) / 2;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Head-to-Head Performance", 10, yPos);
    yPos += 4;

    const drawH2HBox = (title, stats, startY) => {
      const boxWidth = colWidth - 5;
      doc.setFillColor(232, 232, 232);
      doc.rect(10, startY, boxWidth, 16, "F");
      doc.setFontSize(9);
      doc.setTextColor(42, 92, 130);
      doc.text(title, 12, startY + 4);
      doc.setFontSize(12);
      doc.setTextColor(91, 164, 230);
      doc.text(`${stats.wins}-${stats.losses}-${stats.draws}`, 12, startY + 10);
      doc.setFontSize(7);
      doc.setTextColor(102, 102, 102);
      doc.text("Wins • Losses • Draws", 12, startY + 14);
      return startY + 18;
    };

    let leftY = yPos;
    leftY = drawH2HBox("Writing Matches", transcriptData.writingH2H, leftY);
    leftY = drawH2HBox("Image Matches", transcriptData.imageH2H, leftY);

    const rightX = 10 + colWidth + 5;
    const rightY = yPos;
    const radius = 8;
    doc.setFillColor(232, 232, 232);
    doc.circle(rightX + colWidth / 2, rightY + 10, radius, "F");
    doc.setFontSize(12);
    doc.setTextColor(42, 92, 130);
    doc.text(`${transcriptData.overallPercentage}%`, rightX + colWidth / 2, rightY + 12, { align: "center" });
    doc.setFontSize(7);
    doc.setTextColor(102, 102, 102);
    doc.text("Overall Score", rightX + colWidth / 2, rightY + 16, { align: "center" });

    // ---------- Detailed Exam Records Section ----------
    const tableY = Math.max(leftY, rightY + 20) + 6;
    doc.setTextColor(42, 92, 130);
    doc.setFontSize(14);
    doc.text("Detailed Exam Records", 10, tableY);
    const finalTableY = tableY + 4;

    const tableBody = transcriptData.testHistories.map((history) => {
      const exam = history.testModelName.replace("Tcf", "");
      const dateObj = new Date(parseInt(history.createdAt, 10));
      const date = isNaN(dateObj.getTime()) ? "N/A" : dateObj.toLocaleDateString();
      const marks = `${history.score}/10`;
      const percent = `${(history.score * 10).toFixed(1)}%`;
      return [exam, date, marks, percent];
    });

    autoTable(doc, {
      startY: finalTableY,
      head: [["Exam", "Date", "Marks", "% Score"]],
      body: tableBody,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [42, 92, 130], textColor: [255, 255, 255] },
      margin: { left: 10, right: 10 },
      didDrawPage: (data) => {
        doc.setFontSize(7);
        doc.setTextColor(102, 102, 102);
        doc.text("© 2025 VRMX Solutions", 10, pageHeight - 10);
        doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - 20, pageHeight - 10, { align: "right" });
      },
    });

    // ---------- Watermarks ----------
    if (images.logoWatermark) {
      const wmDims = await getImageDimensions(images.logoWatermark);
      const desiredWmWidth = 80;
      const desiredWmHeight = (desiredWmWidth * wmDims.height) / wmDims.width;
      doc.setGState(new doc.GState({ opacity: 0.08 }));
      doc.addImage(images.logoWatermark, "PNG", pageWidth / 2 - desiredWmWidth / 2, pageHeight / 2 - desiredWmHeight / 2, desiredWmWidth, desiredWmHeight);
      doc.setGState(new doc.GState({ opacity: 1 }));
    }
    if (images.stamp) {
      const stampDims = await getImageDimensions(images.stamp);
      const desiredStampWidth = 40; // desired width for stamp
      const desiredStampHeight = (desiredStampWidth * stampDims.height) / stampDims.width;
      // Define desired position; adjust as needed:
      const stampX = pageWidth - 70; // move horizontally
      const stampY = pageHeight / 3 - 70; // move vertically
      doc.setGState(new doc.GState({ opacity: 0.5 }));
      // Pass rotation as last parameter, here -15 degrees
      doc.addImage(images.stamp, "PNG", stampX, stampY, desiredStampWidth, desiredStampHeight, undefined, "FAST", -15);
      doc.setGState(new doc.GState({ opacity: 1 }));
    }

    return doc.output("bloburl");
  };

  // Download transcript: fetch transcript data and images, then generate PDF and show modal
  const downloadTranscript = async () => {
    if (!user?.id) return;
    setLoading(true);

    const query = `
      query GetDashboardData($userId: ID!) {
        testHistories(userId: $userId) {
          id
          testModelName
          score
          createdAt
        }
        writingH2H: userWritingMatches(userId: $userId) {
          id
          initiator { id }
          opponent { id }
          totalScore { initiator opponent }
          status
          createdAt
        }
        imagePuzzleH2H: userImageMatches(userId: $userId) {
          id
          initiator { id }
          opponent { id }
          totalScore { initiator opponent }
          status
          createdAt
        }
      }
    `;

    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { userId: user.id } }),
      });
      const result = await response.json();
      if (result.errors) {
        console.error("GraphQL errors:", result.errors);
        setLoading(false);
        return;
      }

      const { testHistories, writingH2H, imagePuzzleH2H } = result.data;
      const skillProgress = testHistories.reduce((acc, history) => {
        const skill = history.testModelName.replace("Tcf", "");
        acc[skill] = history.score;
        return acc;
      }, {});
      const totalMarks = testHistories.reduce((sum, h) => sum + h.score, 0);
      const overallPercentage = testHistories.length > 0
        ? ((totalMarks / (testHistories.length * 10)) * 100).toFixed(1)
        : 0;

      const calculateH2H = (matches) =>
        matches.reduce((acc, match) => {
          const isInitiator = match.initiator.id === user.id;
          const score = isInitiator ? match.totalScore.initiator : match.totalScore.opponent;
          const opponentScore = isInitiator ? match.totalScore.opponent : match.totalScore.initiator;
          if (score > opponentScore) acc.wins++;
          else if (score < opponentScore) acc.losses++;
          else acc.draws++;
          return acc;
        }, { wins: 0, losses: 0, draws: 0 });
      const writingMatchesCalc = calculateH2H(writingH2H);
      const imageMatchesCalc = calculateH2H(imagePuzzleH2H);

      const transcriptData = {
        testHistories,
        writingH2H: writingMatchesCalc,
        imageH2H: imageMatchesCalc,
        skillProgress,
        overallPercentage,
      };

      const [stamp, logoWatermark, logoHeader] = await Promise.all([
        fetchImageAsBase64("https://i.imgur.com/4MSkH9o.png"),
        fetchImageAsBase64("https://frenchify-me-6yik.vercel.app/Logo.png"),
        fetchImageAsBase64("https://frenchify-me-6yik.vercel.app/Logo.png"),
      ]);
      const images = { stamp, logoWatermark, logoHeader };

      const pdfUrl = await generateTranscriptPdf(transcriptData, images);
      setTranscriptUrl(pdfUrl);
      setShowModal(true);
    } catch (error) {
      console.error("Error downloading transcript:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    if (!user) {
      setErrorMessage("User not logged in.");
      return;
    }
    try {
      const { data } = await updateUser({
        variables: {
          id: user.id,
          input: { languageLevel: formData.languageLevel },
          profileImage: selectedFile,
        },
      });
      if (data?.updateUser) {
        updateUserdata(data.updateUser);
        setSuccessMessage("Profile updated successfully!");
        navigate("/dashboard");
      }
    } catch (error) {
      setErrorMessage("Error updating profile. Please try again.");
      console.error("Update error:", error);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container d-flex justify-content-center align-items-center vh-100">
        <div className="card shadow p-4 w-100" style={{ maxWidth: "400px" }}>
          <h1 className="text-center mb-3">Update Profile</h1>
          {successMessage && <p className="text-success text-center">{successMessage}</p>}
          {errorMessage && <p className="text-danger text-center">{errorMessage}</p>}
          <form onSubmit={handleSubmit}>
            <div className="mb-3 text-center">
              <label className="form-label">Profile Picture</label>
              <div>
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Profile Preview"
                    className="rounded-circle border"
                    style={{ width: "100px", height: "100px", objectFit: "cover" }}
                  />
                ) : (
                  <p>No image selected</p>
                )}
              </div>
              <input type="file" className="form-control mt-2" accept="image/*" onChange={handleFileChange} />
            </div>
            <div className="mb-3">
              <label className="form-label">Username</label>
              <input type="text" className="form-control" value={formData.username} disabled />
            </div>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input type="email" className="form-control" value={formData.email} disabled />
            </div>
            <div className="mb-3">
              <label className="form-label">Language Level</label>
              <select name="languageLevel" className="form-select" value={formData.languageLevel} onChange={handleInputChange}>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
            <div className="d-grid">
              <button type="submit" className="btn text-white" style={{ backgroundColor: frenchBlue }}>
                Update Profile
              </button>
            </div>
            <div className="container mt-4">
              <button className="btn" type="button" onClick={downloadTranscript} style={{ backgroundColor: frenchBlue, color: frenchWhite }}>
                Generate Transcript
              </button>
            </div>
          </form>
          <p className="d-grid text-center mt-3">
            <Link to="/dashboard" className="btn text-white text-decoration-none" style={{ backgroundColor: frenchRed }}>
              Go back to Dashboard
            </Link>
          </p>
        </div>
      </div>
      {loading && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1050 }}>
          <LoadingSpinner />
        </div>
      )}
      {showModal && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0, 0, 0, 0.5)" }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: "1rem" }}>
              <div className="modal-header" style={{ backgroundColor: frenchBlue }}>
                <h5 className="modal-title" style={{ color: frenchWhite }}>Transcript Ready 🎓</h5>
                <button type="button" className="btn-close" style={{ filter: "invert(1)" }} onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <p>Your transcript has been generated successfully.</p>
              </div>
              <div className="modal-footer">
                <button className="btn" style={{ backgroundColor: frenchRed, color: frenchWhite }} onClick={() => setShowModal(false)}>
                  Close
                </button>
                <button
                  className="btn"
                  style={{ backgroundColor: frenchBlue, color: frenchWhite }}
                  onClick={() => {
                    window.open(transcriptUrl, "_blank");
                    setShowModal(false);
                  }}
                >
                  View Transcript
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserSettings;
