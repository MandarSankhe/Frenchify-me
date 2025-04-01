import React, { useState, useEffect } from "react";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement } from "chart.js";
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
  const { user } = useAuth(); // Get logged-in user's data from AuthContext
  const [testHistories, setTestHistories] = useState([]);

  // Fetch test histories for the logged-in user via GraphQL.
  useEffect(() => {
    if (!user?.id) return;

    const fetchTestHistories = async () => {
      const query = `
        query GetTestHistories($userId: ID!) {
          testHistories(userId: $userId) {
            id
            testModelName
            score
          }
        }
      `;
      const variables = { userId: user.id };
      try {
        const response = await fetch(GRAPHQL_URI, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables }),
        });
        const result = await response.json();
        if (result.errors) {
          console.error("GraphQL errors:", result.errors);
        } else {
          setTestHistories(result.data.testHistories);
        }
      } catch (error) {
        console.error("Error fetching test histories:", error);
      }
    };

    fetchTestHistories();
  }, [user]);

  // Process testHistories to derive dynamic skill progress.
  // For example, we assume that each test history entry's score represents the progress for a skill.
  // Here we simply take the latest score per test type.
  let readingProgress = 0, writingProgress = 0, listeningProgress = 0, speakingProgress = 0;
  testHistories.forEach((history) => {
    if (history.testModelName === "TcfReading") {
      readingProgress = history.score;
    } else if (history.testModelName === "TcfWriting") {
      writingProgress = history.score;
    } else if (history.testModelName === "TcfListening") {
      listeningProgress = history.score;
    } else if (history.testModelName === "TcfSpeaking") {
      speakingProgress = history.score;
    }
  });

  const skillProgressData = {
    labels: ["Reading", "Writing", "Listening", "Speaking"],
    datasets: [
      {
        label: "Skill Progress (%)",
        data: [
          readingProgress || 0, 
          writingProgress || 0, 
          listeningProgress || 0, 
          speakingProgress || 0
        ],
        backgroundColor: ["#4caf50", "#2196f3", "#ff9800", "#f44336"],
      },
    ],
  };

  // For weekly progress and vocabulary mastery, the data remains static in this example.
  // You can extend this logic to process testHistories for a more dynamic view.
  const weeklyProgressData = {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    datasets: [
      {
        label: "Overall Progress (%)",
        data: [30, 50, 70, 85],
        fill: true,
        backgroundColor: "rgba(66, 133, 244, 0.2)",
        borderColor: "rgba(66, 133, 244, 1)",
      },
    ],
  };

  const vocabularyData = {
    labels: ["Beginner", "Intermediate", "Advanced"],
    datasets: [
      {
        label: "Vocabulary Mastery",
        data: [60, 40, 20],
        backgroundColor: ["#4caf50", "#2196f3", "#ff9800"],
      },
    ],
  };

  return (
    <div className="container mt-5">
      <h2 className="text-center">Welcome, {user?.username}!</h2>
      <p className="text-center text-muted">
        Track your progress and performance in each skill area.
      </p>
      
      <div className="row mt-5">
        <div className="col-md-6 mb-4">
          <h4 className="text-center">Skill Progress</h4>
          <Bar
            data={skillProgressData}
            options={{
              responsive: true,
              plugins: {
                legend: { position: "top" },
                title: { display: true, text: "Skill Progress (%)" },
              },
            }}
          />
        </div>

        <div className="col-md-6 mb-4">
          <h4 className="text-center">Weekly Progress</h4>
          <Line
            data={weeklyProgressData}
            options={{
              responsive: true,
              plugins: {
                legend: { position: "top" },
                title: { display: true, text: "Progress Over Time" },
              },
            }}
          />
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-md-6 mb-4">
          <h4 className="text-center">Vocabulary Mastery</h4>
          <Doughnut
            data={vocabularyData}
            options={{
              responsive: true,
              plugins: {
                legend: { position: "bottom" },
                title: { display: true, text: "Vocabulary Mastery by Level" },
              },
            }}
          />
        </div>

        <div className="col-md-6">
          <h4 className="text-center">Summary</h4>
          <div className="card p-3 shadow-sm">
            <p>
              <strong>Overall Progress:</strong> 75% complete
            </p>
            <p>
              <strong>Highest Score:</strong> Listening - 85%
            </p>
            <p>
              <strong>Focus Area:</strong> Writing - Needs Improvement
            </p>
            <p>
              Keep practicing regularly to achieve your goals! Remember, consistency is key to mastering a new language.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
