import React, { useState, useEffect } from "react";
import { Bar, Line, Doughnut, Pie } from "react-chartjs-2";
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
  ArcElement 
} from "chart.js";
import { useAuth } from "../context/AuthContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement
);

const GRAPHQL_URI = `${process.env.REACT_APP_API_URL || "http://localhost:4000"}/graphql`;

const Dashboard = () => {
  const { user } = useAuth();
  const [testHistories, setTestHistories] = useState([]);
  const [writingMatches, setWritingMatches] = useState([]);
  const [imageMatches, setImageMatches] = useState([]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
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
        const response = await fetch(GRAPHQL_URI, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            query, 
            variables: { userId: user.id } 
          }),
        });
        console.log("Response:", response);
        const result = await response.json();
        console.log("Result:", result);
        
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

  // Process matches separately
  const processWritingMatches = (matches) => {
    return matches.filter(m => m.status === 'completed').map(match => ({
      score: match.initiator.id === user.id ? match.totalScore.initiator : match.totalScore.opponent,
      opponentScore: match.initiator.id === user.id ? match.totalScore.opponent : match.totalScore.initiator,
      date: new Date(match.createdAt)
    }));
  };

  const processImageMatches = (matches) => {
    return matches.filter(m => m.status === 'completed').map(match => ({
      score: match.initiator.id === user.id ? match.totalScore.initiator : match.totalScore.opponent,
      opponentScore: match.initiator.id === user.id ? match.totalScore.opponent : match.totalScore.initiator,
      date: new Date(match.createdAt)
    }));
  };

  const writingResults = processWritingMatches(writingMatches);
  const imageResults = processImageMatches(imageMatches);

  // H2H Performance calculations
  const calculateH2H = (matches) => matches.reduce((acc, match) => {
    if (match.score > match.opponentScore) acc.wins++;
    else if (match.score < match.opponentScore) acc.losses++;
    else acc.draws++;
    return acc;
  }, { wins: 0, losses: 0, draws: 0 });

  const writingH2H = calculateH2H(writingResults);
  const imageH2H = calculateH2H(imageResults);

  // Skill Progress Data
  const skillProgress = testHistories.reduce((acc, history) => {
    const skill = history.testModelName.replace('Tcf', '');
    acc[skill] = history.score;
    return acc;
  }, { Reading: 0, Writing: 0, Listening: 0, Speaking: 0 });

  // Chart Configurations
  const charts = {
    skillProgress: {
      labels: ["Reading", "Writing", "Listening", "Speaking"],
      datasets: [{
        label: "Skill Mastery (%)",
        data: Object.values(skillProgress),
        backgroundColor: ["#4CAF50", "#2196F3", "#FF9800", "#9C27B0"]
      }]
    },
    writingPerformance: {
      labels: ["Wins", "Losses", "Draws"],
      datasets: [{
        label: "Writing H2H",
        data: [writingH2H.wins, writingH2H.losses, writingH2H.draws],
        backgroundColor: ["#4CAF50", "#F44336", "#FFC107"]
      }]
    },
    imagePerformance: {
      labels: ["Wins", "Losses", "Draws"],
      datasets: [{
        label: "Image Puzzle H2H",
        data: [imageH2H.wins, imageH2H.losses, imageH2H.draws],
        backgroundColor: ["#2196F3", "#FF9800", "#9C27B0"]
      }]
    },
    progressTimeline: {
      labels: [...writingResults, ...imageResults].map((_, i) => `Match ${i + 1}`),
      datasets: [
        {
          label: "Writing Scores",
          data: writingResults.map(m => m.score),
          borderColor: "#4CAF50",
          tension: 0.3
        },
        {
          label: "Image Puzzle Scores",
          data: imageResults.map(m => m.score),
          borderColor: "#2196F3",
          tension: 0.3
        }
      ]
    }
  };

  return (
    <div className="container mt-5">
      <h2 className="text-center mb-4">Welcome back, {user?.username}!</h2>
      
      <div className="row">
        {/* Skill Progress */}
        <div className="col-md-6 mb-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">Skill Mastery</h5>
              <Bar
                data={charts.skillProgress}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw}%` } }
                  },
                  scales: { y: { max: 100 } }
                }}
              />
            </div>
          </div>
        </div>

        {/* H2H Performance */}
        <div className="col-md-6 mb-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">Head-to-Head Performance</h5>
              <div className="row">
                <div className="col-6">
                  <h6>Writing H2H</h6>
                  <Pie
                    data={charts.writingPerformance}
                    options={{
                      plugins: {
                        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw}` }}
                      }
                    }}
                  />
                  <div className="text-center mt-2">
                    <span className="text-success">Wins: {writingH2H.wins}</span><br/>
                    <span className="text-danger">Losses: {writingH2H.losses}</span><br/>
                    <span className="text-warning">Draws: {writingH2H.draws}</span>
                  </div>
                </div>
                <div className="col-6">
                  <h6>Image Puzzle H2H</h6>
                  <Pie
                    data={charts.imagePerformance}
                    options={{
                      plugins: {
                        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw}` }}
                      }
                    }}
                  />
                  <div className="text-center mt-2">
                    <span className="text-success">Wins: {imageH2H.wins}</span><br/>
                    <span className="text-danger">Losses: {imageH2H.losses}</span><br/>
                    <span className="text-warning">Draws: {imageH2H.draws}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row mt-4">
        {/* Progress Timeline */}
        <div className="col-12 mb-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">Performance Timeline</h5>
              <Line
                data={charts.progressTimeline}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'bottom' }
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="row mt-4">
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">Writing H2H Summary</h5>
              <p>Total Matches: {writingResults.length}</p>
              <p>Win Rate: {((writingH2H.wins / writingResults.length) * 100 || 0).toFixed(1)}%</p>
              <p>Average Score: {(writingResults.reduce((sum, m) => sum + m.score, 0) / writingResults.length || 0).toFixed(1)}</p>
            </div>
          </div>
        </div>
        
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">Image Puzzle Summary</h5>
              <p>Total Matches: {imageResults.length}</p>
              <p>Win Rate: {((imageH2H.wins / imageResults.length) * 100 || 0).toFixed(1)}%</p>
              <p>Average Score: {(imageResults.reduce((sum, m) => sum + m.score, 0) / imageResults.length || 0).toFixed(1)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;