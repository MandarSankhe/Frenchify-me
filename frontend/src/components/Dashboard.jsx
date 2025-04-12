import React, { useState, useEffect } from "react";
import { Bar, Line, Pie, Doughnut } from "react-chartjs-2";
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  PointElement, 
  LineElement, 
  ArcElement, 
  plugins
} from "chart.js";
import { useAuth } from "../context/AuthContext";
import { color } from "three/src/nodes/TSL.js";
import 'chartjs-adapter-moment';
import { TimeScale } from 'chart.js';
import { Filler } from 'chart.js';
import gradientPlugin from 'chartjs-plugin-gradient';
import { useNavigate } from 'react-router-dom';
import { downloadTranscript } from "../context/transcriptUtils";
import LoadingSpinner from "./LoadingSpinner";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
  TimeScale,
  gradientPlugin,
  Filler
);

const GRAPHQL_URI = `${process.env.REACT_APP_API_URL || "http://localhost:4000"}/graphql`;

const frenchBlue = "#0055A4";
const frenchRed = "#EF4135";
const frenchWhite = "#FFFFFF";

const chartPurple = "rgb(148, 83, 255)";
const chartPurpleFade = "rgb(148, 83, 255, 0.1)";
const chartOrange = "rgb(255, 152, 0)";
const chartOrangeFade = "rgb(255, 152, 0, 0.1)";
const chartGreen = "rgb(119, 227, 138)";
const chartGreenFade = "rgb(119, 227, 138, 0.1)";
const chartPink = "rgb(230, 132, 255)";
const chartPinkFade = "rgb(230, 132, 255, 0.1)";
const chartYellow = "rgb(254, 194, 39)";
const chartYellowFade = "rgb(254, 194, 39, 0.1)";

const styles = {
  cardBody: {
    border: "none",
  },
  // Profile Section Styles
  profileContainer: {
    display: "flex",
    flexDirection: "column",  // Stack items vertically
    alignItems: "center",     // Center them horizontally
    backgroundColor: "transparent",
    borderRadius: "0",
    padding: "0.5rem",
  },
  profileImage: {
    width: "80px",
    height: "80px",
    borderRadius: "10px",
    objectFit: "cover",
    marginBottom: "0.5rem",
  },
  profileName: {
    margin: 0,
    fontWeight: 600,
    fontSize: "1rem",
    marginBottom: "0.25rem",
  },
  profileLocation: {
    margin: 0,
    marginTop: "0.5em",
    fontSize: "0.875rem",
    color: "#555",
  },
  locationIcon: {
    width: "1.2em",
    marginRight: "0.4em",
    marginBottom: "0.3em",
  },
  welcomeMessage: {
    fontSize: "0.9rem",
    color: "#555",
    maxWidth: "320px",
    lineHeight: "1.3",
    marginTop: "1em",
    textAlign: "left",
  },
  todaysPlanContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "stretch",
    marginBottom: "1.5rem",
  },
  planLeft: {
    flex: 1,
    paddingRight: "1rem",
  },
  planRight: {
    flex: 1,
    paddingLeft: "1rem",
    textAlign: "center",
  },
  pNormal: {
    fontSize: "0.9rem",
    lineHeight: 0.9,
    marginBottom: "0.3em"
  },
  cardBodyHighlight: {
    border: "none",
    backgroundColor: "rgb(234, 255, 250, 0.8)", // "#d2edfe",
    marginBottom: "1.5em"
  },
  mainCardTitle: {
    marginBottom: "1em",
  },
  cardSubtitle: {
    fontSize: "1.15rem",
    marginBottom: "1em",
    color: "#0580fd",
    textAlign: "center"
  },
  cardSubtitleSkill: {
    fontSize: "1.2rem",
    marginBottom: "1em",
    color: "#0580fd",
  },
  ratioHeading: {
    fontSize: "1.15rem",
    paddingTop: "0.9em",
    width: 100,
    height: 60,
    textAlign: "center",
    fontWeight: "bold"
  },
  nextAction: {
    marginLeft: "1em",
  },
  nextActionElement: {
    textAlign: "center",
  }
};

const centerImagePlugin = {
  id: 'centerImagePlugin',
  beforeDraw: function(chart, args, options) {
    if (options && options.imageSrc) {
      const ctx = chart.ctx;
      const { left, right, top, bottom, width, height } = chart.chartArea;
      const centerX = left + width / 2;
      const centerY = top + height / 2;
      const imageSize = options.imageSize || 40;
      
      // Create an image object
      const image = new Image();
      image.src = options.imageSrc;
      
      // Draw the image once loaded
      image.onload = () => {
        ctx.save();
        ctx.drawImage(image, centerX - imageSize / 2, centerY - imageSize / 2, imageSize, imageSize);
        ctx.restore();
      };
      
      // In case the image is already cached/complete
      if (image.complete) {
        ctx.save();
        ctx.drawImage(image, centerX - imageSize / 2, centerY - imageSize / 2, imageSize, imageSize);
        ctx.restore();
      }
    }
  }
};
ChartJS.register(centerImagePlugin);

const centerTextPlugin = {
  id: 'centerTextPlugin',
  beforeDraw: function(chart, args, options) {
    if (options && options.center) {
      const ctx = chart.ctx;
      const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
      const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;
      const paddingTop = options.center.paddingTop || 0;
      
      // Draw first line (percentage)
      if(options.center.text) {
        ctx.save();
        ctx.font = `${options.center.fontStyle || 'bold'} ${options.center.fontSize || 24}px ${options.center.fontFamily || 'Arial'}`;
        ctx.fillStyle = "#000";
        ctx.textAlign = options.center.textAlign || "center";
        ctx.textBaseline = options.center.textBaseline || "middle";
        // Adjust vertical position (e.g., move up by lineSpacing pixels)
        ctx.fillText(options.center.text, centerX, centerY - (options.center.lineSpacing || 10) + paddingTop);
        ctx.restore();
      }
      
      // Draw second line ("win")
      if(options.center.subText) {
        ctx.save();
        ctx.font = `${options.center.subFontStyle || 'normal'} ${options.center.subFontSize || 14}px ${options.center.fontFamily || 'Arial'}`;
        ctx.fillStyle = "#000";
        ctx.textAlign = options.center.textAlign || "center";
        ctx.textBaseline = options.center.textBaseline || "middle";
        // Adjust vertical position (e.g., move down by lineSpacing pixels)
        ctx.fillText(options.center.subText, centerX, centerY + (options.center.lineSpacing || 10) + paddingTop);
        ctx.restore();
      }
    }
  }
};
ChartJS.register(centerTextPlugin);

const Dashboard = () => {
  const { user } = useAuth();
  const [testHistories, setTestHistories] = useState([]);
  const [writingMatches, setWritingMatches] = useState([]);
  const [imageMatches, setImageMatches] = useState([]);
  const [transcriptUrl, setTranscriptUrl] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleViewCertificate = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const pdfUrl = await downloadTranscript(user, GRAPHQL_URI);
      setTranscriptUrl(pdfUrl);
      setShowModal(true);
    } catch (error) {
      console.error("Error generating transcript:", error);
    } finally {
      setLoading(false);
    }
  };
  

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      const query = `
        query GetDashboardData($userId: ID!) {
          testHistories(userId: $userId) {
            id
            testModelName
            score
            testId
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
        const response = await fetch(GRAPHQL_URI, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables: { userId: user.id } }),
        });
        const result = await response.json();
        console.log("rizult: ", result);
        if (result.errors) {
          console.error("GraphQL errors:", result.errors);
          return;
        }
        setTestHistories(result.data.testHistories);
        setWritingMatches(result.data.writingH2H);
        setImageMatches(result.data.imagePuzzleH2H);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchData();
  }, [user]);

  // Process head-to-head matches
  const processMatches = (matches) => {
    return matches
      .filter(m => m.status === 'completed')
      .map(match => ({
        score: match.initiator.id === user.id ? match.totalScore.initiator : match.totalScore.opponent,
        opponentScore: match.initiator.id === user.id ? match.totalScore.opponent : match.totalScore.initiator,
        date: new Date(match.createdAt)
      }));
  };

  const writingResults = processMatches(writingMatches);
  const imageResults = processMatches(imageMatches);

  // Calculate H2H statistics
  const calculateH2H = (matches) => {
    return matches.reduce((acc, match) => {
      if (match.score > match.opponentScore) acc.wins++;
      else if (match.score < match.opponentScore) acc.losses++;
      else acc.draws++;
      return acc;
    }, { wins: 0, losses: 0, draws: 0 });
  };

  const writingH2H = calculateH2H(writingResults);
  const imageH2H = calculateH2H(imageResults);

  // Skill Progress Data from test histories
  const skillProgress = testHistories.reduce((acc, history) => {
    const skill = history.testModelName.replace('Tcf', '');
    acc[skill] = history.score;
    return acc;
  }, { Reading: 0, Writing: 0, Listening: 0, Speaking: 0 });

  // Calculate Test Completion Percentage (assuming a user should complete 4 tests)
  const completedTestsCount = Object.values(skillProgress).filter(score => score > 0).length;
  const testCompletionPercentage = (completedTestsCount / 8) * 100;
  const testIncompletePercentage = 100 - testCompletionPercentage;

  // For H2H matches
  const totalH2H = writingMatches.length + imageMatches.length;
  const completedH2H = writingResults.length + imageResults.length;
  const h2hCompletionPercentage = totalH2H > 0 ? (completedH2H / 50) * 100 : 0;
  const h2hIncompletePercentage = 100 - h2hCompletionPercentage;

  // Today's Plan calculations:
  // Get unique test IDs to avoid counting duplicates
  const uniqueTestIds = [
    ...new Set(testHistories.filter(h => h.testId).map(h => h.testId.toString()))
  ];
  const totalUniqueTestsTaken = uniqueTestIds.length;
  const totalPossibleTests = 10;
  const planCompletion = (totalUniqueTestsTaken / totalPossibleTests) * 100;

  // Create timeline data arrays
  const { readingData, writingData, listeningData, speakingData } = getSkillTimeline(testHistories);

  function getSkillTimeline(testHistories) {
    // Map each history to an object with dateObj, normalized skill, and score.
    const rawData = testHistories.map(history => {
      const exam = history.testModelName.replace("Tcf", "");
      // Convert createdAt (a timestamp string) to a Date object.
      const dateObj = new Date(parseInt(history.createdAt, 10));
      return { 
        skill: exam, 
        score: history.score, 
        dateObj 
      };
    });
  
    console.log("Raw timeline data:", rawData);
  
    // Sort by date ascending.
    rawData.sort((a, b) => a.dateObj - b.dateObj);
  
    // Determine overall earliest and latest dates.
    const overallEarliest = rawData.length > 0 ? rawData[0].dateObj : null;
    const overallLatest = rawData.length > 0 ? rawData[rawData.length - 1].dateObj : null;
  
    // Separate data by skill.
    const readingData = [];
    const writingData = [];
    const listeningData = [];
    const speakingData = [];
  
    rawData.forEach(entry => {
      const point = { x: entry.dateObj, y: entry.score };
      switch (entry.skill) {
        case "Reading":
          readingData.push(point);
          break;
        case "Writing":
          writingData.push(point);
          break;
        case "Listening":
          listeningData.push(point);
          break;
        case "Speaking":
          speakingData.push(point);
          break;
        case "ListeningTraining":
          listeningData.push(point);
          break;
        default:
          console.warn("Unexpected skill:", entry.skill);
          break;
      }
    });
  
    // Helper to adjust the start and end points of a dataset.
    function adjustDataset(dataset) {
      if (!overallEarliest || !overallLatest) return;
  
      // Adjust start: If the first point's date is after overallEarliest,
      // insert a starting point with (first score - 1.5).
      if (dataset.length === 0 || dataset[0].x > overallEarliest) {
        const startScore = dataset.length > 0 ? dataset[0].y : 0;
        dataset.unshift({ x: overallEarliest, y: startScore - 1.5 });
      }
  
      // Adjust end: If the last point's date is before overallLatest,
      // append a point with (last score + 1.5)
      if (dataset.length > 0 && dataset[dataset.length - 1].x < overallLatest) {
        const endScore = dataset[dataset.length - 1].y;
        dataset.push({ x: overallLatest, y: endScore + 0.8 });
      }
    }
  
    // Adjust each dataset.
    adjustDataset(readingData);
    adjustDataset(writingData);
    adjustDataset(listeningData);
    adjustDataset(speakingData);
  
    return { readingData, writingData, listeningData, speakingData };
  }
  
  
  
  

  // Chart configurations
  const charts = {
    skillProgress: {
      labels: ["Reading", "Writing", "Listening", "Speaking"],
      datasets: [{
        label: "Skill Mastery (%)",
        data: Object.values(skillProgress),
        backgroundColor: ["#0582fd", chartGreen, chartOrange, chartPurple],
        barPercentage: 0.755,       // Adjusts the width of each bar relative to the category width rpp
        categoryPercentage: 0.75, 
      }]
    },
    writingPerformance: {
      labels: ["Wins", "Losses", "Draws"],
      datasets: [
        {
          label: "Writing H2H",
          data: [writingH2H.wins, writingH2H.losses, writingH2H.draws],
          backgroundColor: ["#77e38a", frenchRed, "#9453ff"],
          borderWidth: 2,
          cutout: "80%", // Creates the doughnut ring
        },
      ],
    },
    imagePerformance: {
      labels: ["Wins", "Losses", "Draws"],
      datasets: [
        {
          label: "Image Puzzle H2H",
          data: [imageH2H.wins, imageH2H.losses, imageH2H.draws],
          backgroundColor: ["#0582fd", "#e684ff", "#fec227"],
          borderWidth: 2,
          cutout: "80%", // Creates the doughnut ring
        },
      ],
    },
    progressTimeline: {
      labels: [...writingResults, ...imageResults].map((_, i) => `Match ${i + 1}`),
      datasets: [
        {
          label: "Writing Scores",
          data: writingResults.map(m => m.score),
          borderColor: "#4CAF50",
          tension: 0.3,
          fill: false,
        },
        {
          label: "Image Puzzle Scores",
          data: imageResults.map(m => m.score),
          borderColor: "#2196F3",
          tension: 0.3,
          fill: false,
        }
      ]
    },
    
    performanceTimeline: {
      datasets: [
        {
          label: "Reading",
          data: readingData,
          borderColor: "rgb(148, 83, 255, 0.25)",
          borderWidth: 1,
          pointRadius: 2,
          pointHoverRadius: 4,
          pointBorderWidth: 0,
          pointBackgroundColor: "rgb(148, 83, 255, 0.25)",

          backgroundColor: (context) => {
            const chartArea = context.chart.chartArea;
            console.log("chartArea:", chartArea);
            if (!chartArea) return chartPurple;
            const gradient = context.chart.ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, chartPurple);  // Strong at the top
            gradient.addColorStop(1, chartPurpleFade);    // Fully transparent at the bottom
            return gradient;
          },
          tension: 0.35,
          fill: true
        },
        {
          label: "Writing",
          data: writingData,
          borderColor: "rgb(230, 132, 255, 0.25)",
          borderWidth: 1,
          pointRadius: 2,
          pointHoverRadius: 4,
          pointBorderWidth: 0,
          pointBackgroundColor: "rgb(230, 132, 255, 0.25)",
          backgroundColor: (context) => {
            const chartArea = context.chart.chartArea;
            if (!chartArea) return chartPink;
            const gradient = context.chart.ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, chartPink);
            gradient.addColorStop(1, chartPinkFade);
            return gradient;
          },
          tension: 0.35,
          fill: true
        },
        {
          label: "Listening",
          data: listeningData,
          borderColor: "rgb(119, 227, 138, 0.25)",
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 3,
          pointBorderWidth: 0,
          pointBackgroundColor: "rgb(119, 227, 138, 0.25)",
          backgroundColor: (context) => {
            const chartArea = context.chart.chartArea;
            if (!chartArea) return chartGreen;
            const gradient = context.chart.ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, chartGreen);
            gradient.addColorStop(1, chartGreenFade);
            return gradient;
          },
          tension: 0.35,
          fill: true
        },
        {
          label: "Speaking",
          data: speakingData,
          borderColor: "rgb(255, 152, 0, 0.25)",
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 3,
          pointBorderWidth: 0,
          pointBackgroundColor: "rgb(255, 152, 0, 0.25)",
          backgroundColor: (context) => {
            const chartArea = context.chart.chartArea;
            if (!chartArea) return chartYellow;
            const gradient = context.chart.ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, chartYellow);
            gradient.addColorStop(1, chartYellowFade);
            return gradient;
          },
          tension: 0.35,
          fill: true
        }
      ]
    }
    
    
    
    ,    
    testCompletionChart: {
      labels: ["Completed", "Remaining"],
      datasets: [
        {
          data: [totalUniqueTestsTaken, totalPossibleTests - totalUniqueTestsTaken],
          backgroundColor: ["#7eee91", "#fec227"],
          borderWidth: 2,
          cutout: "80%" // creates  thin ring effect
        },
      ],
    },
    h2hCompletionChart: {
      labels: ['Completed', 'Remaining'],
      datasets: [{
        data: [h2hCompletionPercentage, h2hIncompletePercentage],
        backgroundColor: ["#7eee91", "#fec227"],
        borderWidth: 2,
        cutout: "80%" // creates  thin ring effect
      }]
    }
  };

  return (
    // Main container with a grey background and padding
    <div style={{ backgroundColor: "#F5F6FA", minHeight: "100vh", padding: "2rem" }}>
      <div className="container">
        <div className="row">
          <div className="col-md-3">
            <div className="card shadow-sm" style={styles.cardBody}>
              <div className="card-body">
                <h4>Hello, {user?.username || "Guest"} 👋</h4>
                <p style={styles.welcomeMessage}>
                  Nice to have you back! Get ready and continue your lesson today.
                </p>
                {/* Profile Section */}
                <div className="row mb-4">
                  <div className="col-md-12 d-flex justify-content-center">
                    <div style={styles.profileContainer}>
                      <img 
                        src={user?.profileImage || "https://via.placeholder.com/60?text=Avatar"} 
                        alt="Profile" 
                        style={styles.profileImage} 
                      />
                      <p style={styles.profileLocation}>
                        <img 
                          src={"./locationicon.png"} 
                          alt="Address Icon" 
                          style={styles.locationIcon} 
                        />
                        Waterloo, ON
                      </p>
                    </div>
                  </div>
                </div>
                <h5 className="card-title" style={styles.mainCardTitle}>Today's Plan</h5>
                {/* Today's Plan Section */}
                <div className="row">
                  <div className="col-md-12">
                    <div className="card shadow-sm" style={styles.cardBodyHighlight} >
                      <div className="card-body">
                        <div className="d-flex align-items-center">
                          {/* Left: Doughnut Chart with Center Image (Layered) */}
                          <div style={{ width: "100px", height: "100px", position: "relative" }}>
                            {/* Center image positioned behind the doughnut ring */}
                            <img 
                              src="./images/mocktraining.png" 
                              alt="Center Image" 
                              style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                width: "70px", 
                                height: "70px", 
                                transform: "translate(-50%, -50%)",
                                zIndex: 1,
                                borderRadius: "50%",
                                pointerEvents: "none",
                              }}
                            />
                            {/* Doughnut chart layered on top */}
                            <div style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                zIndex: 2,
                            }}>
                              <Doughnut
                                data={charts.testCompletionChart}
                                options={{
                                  plugins: {
                                    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw}` } },
                                    legend: { display: false },
                                  },
                                  maintainAspectRatio: false,
                                }}
                              />
                            </div>
                          </div>
                          {/* Right: Tests Taken & Last Test Date */}
                          <div style={{ marginLeft: "1rem" }}>
                            <h6 className="card-title" style={styles.cardSubtitle}>Mock Training</h6>
                            <p style={styles.pNormal}>
                              <img 
                                src={"./editicon.png"} 
                                alt="Edit Icon" 
                                style={styles.locationIcon} 
                              />
                              <strong>
                                {totalUniqueTestsTaken} completed
                              </strong>
                            </p>
                            <p style={styles.pNormal}>
                              <img 
                                src={"./clockicon.png"} 
                                alt="Edit Icon" 
                                style={styles.locationIcon} 
                              />
                              <strong>
                                60 min
                              </strong>
                            </p>
                          </div>
                        </div>
                        <div className="d-flex align-items-center">
                          <div style={styles.ratioHeading}>
                            {testCompletionPercentage.toFixed(1)}%
                          </div>
                          <div style={styles.nextAction}>
                            <button 
                              className="btn btn-primary" 
                              onClick={() => navigate("/readingmock")}
                            >
                              Next Exam
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="card shadow-sm" style={styles.cardBodyHighlight} >
                      <div className="card-body">
                        <div className="d-flex align-items-center">
                          {/* Left: Doughnut Chart with Center Image (Layered) */}
                          <div style={{ width: "100px", height: "100px", position: "relative" }}>
                            {/* Center image positioned behind the doughnut ring */}
                            <img 
                              src="./images/h2hDashboard.png" 
                              alt="Center Image" 
                              style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                width: "70px",
                                height: "70px",
                                transform: "translate(-50%, -50%)",
                                zIndex: 1,
                                borderRadius: "50%",
                                pointerEvents: "none",
                              }}
                            />
                            {/* Doughnut chart layered on top */}
                            <div style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                zIndex: 2,
                            }}>
                              <Doughnut
                                data={charts.h2hCompletionChart}
                                options={{
                                  plugins: {
                                    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw}` } },
                                    legend: { display: false },
                                  },
                                  maintainAspectRatio: false,
                                }}
                              />
                            </div>
                          </div>
                          {/* Right: Tests Taken & Last Test Date */}
                          <div style={{ marginLeft: "1rem" }}>
                            <h6 className="card-title" style={styles.cardSubtitle}>Head to Head</h6>
                            <p style={styles.pNormal}>
                              <img 
                                src={"./multiplayericon.png"} 
                                alt="Edit Icon" 
                                style={styles.locationIcon} 
                              />
                              <strong>
                                {completedH2H} completed
                              </strong>
                            </p>
                            <p style={styles.pNormal}>
                              <img 
                                src={"./clockicon.png"} 
                                alt="Edit Icon" 
                                style={styles.locationIcon} 
                              />
                              <strong>
                                50 min
                              </strong>
                            </p>
                          </div>
                        </div>
                        <div className="d-flex align-items-center">
                          <div style={styles.ratioHeading}>
                            {h2hCompletionPercentage.toFixed(1)}%
                          </div>
                          <div style={styles.nextAction}>
                            <button 
                              className="btn btn-primary" 
                              onClick={() => navigate("/headtoheadmatch")}
                            >
                              Next Match
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shortcuts Section */}
                <h5 className="card-title" style={styles.mainCardTitle}>Shortcuts</h5>
                <div className="d-grid gap-2">
                  <button 
                    className="btn btn-primary" 
                    onClick={() => navigate("/listeningtraining")}
                  >
                    ✍️ Training
                  </button>
                  <button 
                    className="btn btn-outline-primary" 
                    onClick={() => navigate("/speakingmock")}
                  >
                    Live Speaking 🗣️
                  </button>
                  <button 
                    className="btn btn-outline-secondary" 
                    onClick={() => navigate("/user-settings")}
                  >
                    Manage Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Main Content */}
          <div className="col-md-9">
            <div className="row">
              {/* Skill Mastery Chart */}
              <div className="col-md-6 mb-4">
                <div className="card shadow-sm h-100" style={styles.cardBody}>
                  <div className="card-body">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h5 className="card-title" style={styles.mainCardTitle}>Skill Mastery</h5>
                      <div style={styles.cardSubtitleSkill}>
                        Average &nbsp;
                        <strong style={{ letterSpacing: 1 }}>
                          {(
                            Object.values(skillProgress).reduce((sum, score) => sum + score, 0) /
                            Object.values(skillProgress).length
                          ).toFixed(1)*10}%
                        </strong>
                      </div>
                    </div>
                    <div style={{ position: "relative", width: "100%", height: "290px", paddingLeft: "1.2em", paddingRight: "1.2em", paddingBottom: "0.7em", paddingTop: "0.5em" }}>
                      <Bar
                        data={charts.skillProgress}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}` }
                            }
                          },
                          scales: {
                            y: {
                              min: 0,
                              max: 10,
                              ticks: {
                                stepSize: 2,
                                color: "#666",
                              },
                              grid: {
                                color: "rgba(0, 0, 0, 0.1)"
                              }
                            },
                            x: {
                              grid: { display: false },
                              ticks: { color: "#666" }
                            }
                          },
                          elements: {
                            bar: {
                              borderRadius: 8,
                              borderSkipped: false,
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              {/* Head-to-Head Detailed Performance */}
              <div className="col-md-6 mb-4">
                <div className="card shadow-sm h-100" style={styles.cardBody}>
                  <div className="card-body">
                    <h5 className="card-title" style={ styles.mainCardTitle }>Head to Head Performance</h5>
                    <div className="row" style={{ display: "flex", justifyContent: "space-evenly", flexWrap: "wrap" }}>
                      {/* Writing H2H Card */}
                      <div
                        className="col-5"
                        style={{
                          backgroundColor: "rgba(234, 255, 250, 0.6)", // light pastel background
                          borderRadius: "1em",
                          padding: "0.9em",
                          boxShadow: "2px 4px 4px rgba(204, 204, 204, 0.3)",
                          fontFamily: "Arial, sans-serif",
                          marginBottom: "1em"
                        }}
                      >
                        <h6
                          style={{
                            ...styles.cardSubtitle,
                            fontSize: "1rem",
                            fontWeight: "600",
                            marginBottom: "1.1rem",
                            color: "#333",
                            textAlign: "center"
                          }}
                        >
                          Writing H2H
                        </h6>
                        <div style={{ height: "150px", position: "relative" }}>
                          <Doughnut
                            data={charts.writingPerformance}
                            options={{
                              plugins: {
                                tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw}` } },
                                legend: { display: false },
                                centerTextPlugin: {
                                  center: {
                                    text: (() => {
                                      const total = writingH2H.wins + writingH2H.losses;
                                      return total > 0 ? `${Math.round((writingH2H.wins / total) * 100)}%` : "0%";
                                    })(),
                                    fontStyle: "bold",
                                    fontSize: 24,
                                    fontFamily: "Arial, sans-serif",
                                    fontColor: "#333",
                                    textAlign: "center",
                                    textBaseline: "middle",
                                    subText: "win",
                                    subFontStyle: "normal",
                                    subFontSize: 14,
                                    subFontColor: "#666",
                                    lineSpacing: 10,
                                    paddingTop: 10
                                  }
                                }
                              },
                              maintainAspectRatio: false
                            }}
                          />
                        </div>
                        <div 
                          style={{
                            display: "flex",
                            justifyContent: "space-evenly",
                            marginTop: "1.2em"
                          }}
                        >
                          {/* Wins */}
                          <div style={{ textAlign: "center" }}>
                            <span 
                              style={{
                                display: "inline-block",
                                backgroundColor: "#77e38a",
                                color: "#fff",
                                borderRadius: "0.25em",
                                padding: "0.15em 0.5em",
                                marginRight: "0.25em",
                                fontSize: "0.8rem"
                              }}
                            >
                              Wins
                            </span>
                            <span style={{ fontSize: "0.9rem", color: "#333" }}>
                              {writingH2H.wins}
                            </span>
                          </div>

                          {/* Losses */}
                          <div style={{ textAlign: "center" }}>
                            <span 
                              style={{
                                display: "inline-block",
                                backgroundColor: frenchRed,
                                color: "#fff",
                                borderRadius: "0.25em",
                                padding: "0.15em 0.5em",
                                marginRight: "0.25em",
                                fontSize: "0.8rem"
                              }}
                            >
                              Losses
                            </span>
                            <span style={{ fontSize: "0.9rem", color: "#333" }}>
                              {writingH2H.losses}
                            </span>
                          </div>

                          {/* Draws */}
                          <div style={{ textAlign: "center" }}>
                            <span 
                              style={{
                                display: "inline-block",
                                backgroundColor: "#9453ff",
                                color: "#fff",
                                borderRadius: "0.25em",
                                padding: "0.15em 0.5em",
                                marginRight: "0.25em",
                                fontSize: "0.8rem"
                              }}
                            >
                              Draws
                            </span>
                            <span style={{ fontSize: "0.9rem", color: "#333" }}>
                              {writingH2H.draws}
                            </span>
                          </div>
                        </div>

                      </div>

                      {/* Image Puzzle H2H Card */}
                      <div
                        className="col-5"
                        style={{
                          backgroundColor: "rgba(249, 248, 230, 0.6)",
                          borderRadius: "1em",
                          padding: "0.9em",
                          boxShadow: "2px 4px 4px rgba(204, 204, 204, 0.3)",
                          fontFamily: "Arial, sans-serif",
                          marginBottom: "1em"
                        }}
                      >
                        <h6
                          style={{
                            fontSize: "1rem",
                            fontWeight: "600",
                            marginBottom: "0.8rem",
                            color: "#333",
                            textAlign: "center"
                          }}
                        >
                          Image Puzzle H2H
                        </h6>
                        <div style={{ height: "150px", position: "relative" }}>
                          <Doughnut
                            data={charts.imagePerformance}
                            options={{
                              plugins: {
                                tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw}` } },
                                legend: { display: false },
                                centerTextPlugin: {
                                  center: {
                                    text: (() => {
                                      const total = imageH2H.wins + imageH2H.losses;
                                      return total > 0 ? `${Math.round((imageH2H.wins / total) * 100)}%` : "0%";
                                    })(),
                                    fontStyle: "bold",
                                    fontSize: 24,
                                    fontFamily: "Arial, sans-serif",
                                    fontColor: "#333",
                                    textAlign: "center",
                                    textBaseline: "middle",
                                    subText: "win",
                                    subFontStyle: "normal",
                                    subFontSize: 14,
                                    subFontColor: "#666",
                                    lineSpacing: 10,
                                    paddingTop: 10
                                  }
                                }
                              },
                              maintainAspectRatio: false
                            }}
                          />
                        </div>
                        <div 
                          style={{
                            display: "flex",
                            justifyContent: "space-evenly",
                            marginTop: "1.2em"
                          }}
                        >
                          {/* Wins */}
                          <div style={{ textAlign: "center" }}>
                            <span 
                              style={{
                                display: "inline-block",
                                backgroundColor: "#0582fd",
                                color: "#fff",
                                borderRadius: "0.25em",
                                padding: "0.15em 0.5em",
                                marginRight: "0.25em",
                                fontSize: "0.8rem"
                              }}
                            >
                              Wins
                            </span>
                            <span style={{ fontSize: "0.9rem", color: "#333" }}>
                              {imageH2H.wins}
                            </span>
                          </div>

                          {/* Losses */}
                          <div style={{ textAlign: "center" }}>
                            <span 
                              style={{
                                display: "inline-block",
                                backgroundColor: chartPink,
                                color: "#fff",
                                borderRadius: "0.25em",
                                padding: "0.15em 0.5em",
                                marginRight: "0.25em",
                                fontSize: "0.8rem"
                              }}
                            >
                              Losses
                            </span>
                            <span style={{ fontSize: "0.9rem", color: "#333" }}>
                              {imageH2H.losses}
                            </span>
                          </div>

                          {/* Draws */}
                          <div style={{ textAlign: "center" }}>
                            <span 
                              style={{
                                display: "inline-block",
                                backgroundColor: chartOrange,
                                color: "#fff",
                                borderRadius: "0.25em",
                                padding: "0.15em 0.5em",
                                marginRight: "0.25em",
                                fontSize: "0.8rem"
                              }}
                            >
                              Draws
                            </span>
                            <span style={{ fontSize: "0.9rem", color: "#333" }}>
                              {imageH2H.draws}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>



                  </div>
                </div>
              </div>
            </div>
            {/* Performance Timeline */}
            <div className="row">
              <div className="col-12 mb-4">
                <div className="card shadow-sm h-100" style={styles.cardBody}>
                  <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5 className="card-title mb-4" style={styles.mainCardTitle}>Performance Timeline</h5>
                    <button className="btn btn-sm" 
                    onClick={handleViewCertificate}
                      style={{
                        ...styles.cardSubtitle,
                        color: frenchWhite,
                        backgroundColor: "#0582fd",
                        fontSize: "0.9em",
                        // letterSpacing: 1,
                        marginRight: "0.5em",
                        paddingTop: "0.5em",
                        paddingBottom: "0.5em",
                        paddingLeft: "1em",
                        paddingRight: "1em",
                        borderRadius: "0.5em"
                      }}>
                      View Certificate 🎓 
                    </button>
                  </div>

                    {/* 2 columns inside same card */}
                    <div className="row">
                      {/* Left: Comprehension Timeline */}
                      <div className="col-md-6 mb-4">
                        <h6 className="card-subtitle mb-3 text-muted text-center">Comprehension Timeline</h6>
                        <div style={{ height: "310px" }}>
                          <Line
                            data={{
                              datasets: [
                                {
                                  ...charts.performanceTimeline.datasets.find(d => d.label === "Reading"),
                                  label: "Reading"
                                },
                                {
                                  ...charts.performanceTimeline.datasets.find(d => d.label === "Listening"),
                                  label: "Listening"
                                }
                              ]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              scales: {
                                x: {
                                  type: "time",
                                  time: { unit: "day", stepSize: 7 },
                                  ticks: { maxTicksLimit: 8 },
                                  grid: {
                                    color: "rgba(0, 0, 0, 0.03)",
                                  }
                                },
                                y: { 
                                  min: 0, 
                                  max: 10,
                                  ticks: {
                                    callback: function(value) {
                                      return value % 2 === 0 ? value : "";
                                    },
                                    stepSize: 1
                                  },
                                  grid: {
                                    color: "rgba(0, 0, 0, 0.03)",
                                    drawTicks: true
                                  } 
                                }
                              },
                              plugins: {
                                legend: { position: "bottom" }
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Right: Expression Timeline */}
                      <div className="col-md-6 mb-4">
                        <h6 className="card-subtitle mb-3 text-muted text-center">Expression Timeline</h6>
                        <div style={{ height: "310px" }}>
                          <Line
                            data={{
                              datasets: [
                                {
                                  ...charts.performanceTimeline.datasets.find(d => d.label === "Writing"),
                                  label: "Writing"
                                },
                                {
                                  ...charts.performanceTimeline.datasets.find(d => d.label === "Speaking"),
                                  label: "Speaking"
                                }
                              ]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              scales: {
                                x: {
                                  type: "time",
                                  time: { unit: "day", stepSize: 7 },
                                  ticks: { maxTicksLimit: 8 },
                                  grid: {
                                    color: "rgba(0, 0, 0, 0.03)",
                                  }
                                },
                                y: { 
                                  min: 0, 
                                  max: 10,
                                  ticks: {
                                    callback: function(value) {
                                      return value % 2 === 0 ? value : "";
                                    },
                                    stepSize: 1
                                  },
                                  grid: {
                                    color: "rgba(0, 0, 0, 0.03)",
                                    drawTicks: true
                                  } 
                                }
                              },
                              plugins: {
                                legend: { position: "bottom" }
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {showModal && ( <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
    <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content overflow-hidden" style={{ borderRadius: '1rem' }}>
            <div className="modal-header" style={{ background: frenchBlue, color: frenchWhite }}>
                <h5 className="modal-title">
                    <i className="bi bi-file-earmark-pdf-fill me-2"></i> Transcript Ready!
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={()=> setShowModal(false)} ></button>
            </div>
            <div className="modal-body text-center py-4">
                <i className="bi bi-file-earmark-check-fill display-4" style={{ color: frenchBlue, marginBottom: '1rem' }}></i>
                <p className="lead mb-4"> Your learning transcript is ready to view or download. </p>
                <div className="d-flex justify-content-center gap-3">
                    <button className="btn btn-outline-secondary px-4 rounded-pill" onClick={()=> setShowModal(false)} > Close </button>
                    <button className="btn btn-primary px-4 rounded-pill" onClick={()=> { window.open(transcriptUrl, "_blank"); setShowModal(false); }} > <i className="bi bi-download me-2"></i>Open PDF </button>
                </div>
            </div>
        </div>
    </div>
</div> )} {loading && ( <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1050 }}>
    <LoadingSpinner />
</div> )}


          </div>
          {/* End Main Content */}
        </div>
      </div>      
    </div>
  );
};

export default Dashboard;