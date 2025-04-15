// transcriptUtils.js
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Helper: Fetch an image and convert it to a Base64 data URL
export const fetchImageAsBase64 = async (url) => {
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

// Helper: Get natural dimensions of an image from Base64 data
export const getImageDimensions = (base64) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = base64;
  });
};

// Function: Generate a transcript PDF and return its blob URL
export const generateTranscriptPdf = async (transcriptData, images, username) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.getPageWidth();
  const pageHeight = doc.getPageHeight();

  // ---------- Header Section ----------
  doc.setFillColor(42, 92, 130);
  doc.rect(0, 0, pageWidth, 30, "F");

  if (images.logoHeader) {
    const logoDims = await getImageDimensions(images.logoHeader);
    const desiredLogoWidth = 33;
    const desiredLogoHeight = (desiredLogoWidth * logoDims.height) / logoDims.width;
    doc.addImage(images.logoHeader, "PNG", 5, 5, desiredLogoWidth, desiredLogoHeight);
  }
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(`${username}'s Transcript`, pageWidth - 10, 12, { align: "right" });
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

  // ---------- Head-to-Head (H2H) Performance Section ----------
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
    didDrawPage: () => {
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
    doc.addImage(
      images.logoWatermark,
      "PNG",
      pageWidth / 2 - desiredWmWidth / 2,
      pageHeight / 2 - desiredWmHeight / 2,
      desiredWmWidth,
      desiredWmHeight
    );
    doc.setGState(new doc.GState({ opacity: 1 }));
  }
  if (images.stamp) {
    const stampDims = await getImageDimensions(images.stamp);
    const desiredStampWidth = 40;
    const desiredStampHeight = (desiredStampWidth * stampDims.height) / stampDims.width;
    const stampX = pageWidth - 70;
    const stampY = pageHeight / 3 - 70;
    doc.setGState(new doc.GState({ opacity: 0.5 }));
    doc.addImage(images.stamp, "PNG", stampX, stampY, desiredStampWidth, desiredStampHeight, undefined, "FAST", -15);
    doc.setGState(new doc.GState({ opacity: 1 }));
  }

  return doc.output("bloburl");
};

// Function: Fetch transcript data via GraphQL, process it, and generate the transcript PDF
export const downloadTranscript = async (user, graphqlEndpoint) => {
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

  const response = await fetch(graphqlEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { userId: user.id } }),
  });
  const result = await response.json();
  if (result.errors) {
    throw new Error("Error fetching transcript data");
  }

  const { testHistories, writingH2H, imagePuzzleH2H } = result.data;

  // Process test histories to calculate skill progress and overall percentage
  const skillProgress = testHistories.reduce((acc, history) => {
    const skill = history.testModelName.replace("Tcf", "");
    acc[skill] = history.score;
    return acc;
  }, {});
  const totalMarks = testHistories.reduce((sum, h) => sum + h.score, 0);
  const overallPercentage = testHistories.length > 0
    ? ((totalMarks / (testHistories.length * 10)) * 100).toFixed(1)
    : 0;

  // Helper to calculate head-to-head match statistics
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

  // Fetch necessary images (update URLs as needed)
  const [stamp, logoWatermark, logoHeader] = await Promise.all([
    fetchImageAsBase64("https://i.imgur.com/4MSkH9o.png"),
    fetchImageAsBase64("https://frenchify-me-6yik.vercel.app/Logo.png"),
    fetchImageAsBase64("https://frenchify-me-6yik.vercel.app/Logo.png"),
  ]);
  const images = { stamp, logoWatermark, logoHeader };

  return generateTranscriptPdf(transcriptData, images, user.username);
};
