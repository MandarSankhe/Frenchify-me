import React from "react";
import {
  createBrowserRouter,
  RouterProvider,
  // Route,
  Navigate,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import Register from "./components/Register";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ReadingMock from "./components/ReadingMock";
import WritingMock from "./components/WritingMock";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import ErrorPage from "./components/ErrorPage";
import SpeakingMock from "./components/SpeakingMock";
import HeadToHeadMatch from "./components/HeadToHeadMatch";
import HeadToHeadWritingMatch from "./components/HeadToHead/HeadToHeadWritingMatch";
import ListeningTraining from "./components/ListeningTraining";
import ListeningMock from "./components/ListeningMock";
import UserSettings from "./components/UserSettings";
import Donation from "./components/Donation";
import Footer from "./components/Footer";

// Protected route component to restrict access if not authenticated
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const App = () => {
  const router = createBrowserRouter([
    {
      path: "/",
      errorElement: <ErrorPage />,
      element: (
        <>
          <Navbar />
          <Home />
          <Footer />
        </>
      ),
    },
    {
      path: "/register",
      element: (
        <>
          <Navbar />
          <Register />
        </>
      ),
    },
    {
      path: "/login",
      element: (
        <>
          <Navbar />
          <Login />
        </>
      ),
    },
    {
      path: "/dashboard",
      element: (
        <>
          <Navbar />
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </>
      ),
    },
    {
      path: "/readingmock",
      element: (
        <>
          <Navbar />
          <ProtectedRoute>
            <ReadingMock />
          </ProtectedRoute>
        </>
      ),
    },
    {
      path: "/writingmock",
      element: (
        <>
          <Navbar />
          <ProtectedRoute>
            <WritingMock />
          </ProtectedRoute>
        </>
      ),
    },
    {
      path: "/speakingmock",
      element: (
        <>
          <Navbar />
          <ProtectedRoute>
            <SpeakingMock />
          </ProtectedRoute>
        </>
      ),
    },
    {
      path: "/headtoheadmatch",
      element: (
        <>
          <Navbar />
          <ProtectedRoute>
            <HeadToHeadMatch />
          </ProtectedRoute>
        </>
      ),
    },
    {
      path: "/writing-match",
      element: (
        <>
          <Navbar />
          <ProtectedRoute>
            <HeadToHeadWritingMatch />
          </ProtectedRoute>
        </>
      ),
    },
    {
      path: "/listeningtraining",
      element: (
        <>
          <Navbar />
          <ProtectedRoute>
            <ListeningTraining />
          </ProtectedRoute>
        </>
      ),
    },
    {
      path: "/listeningmock",
      element: (
        <>
          <Navbar />
          <ProtectedRoute>
            <ListeningMock />
          </ProtectedRoute>
        </>
      ),
    },
    {
      path: "/forgot-password",
      element: (
        <>
          <Navbar />
          <ForgotPassword />
        </>
      ),
    },
    {
      path: "/user-settings",
      element: (
        <>
          <Navbar />
          <UserSettings />
        </>
      ),
    },
    {
      path: "/reset-password/:token",
      element: (
        <>
          <Navbar />
          <ResetPassword />
        </>
      ),
    },
    {
      path: "/donate",
      element: (
        <>
          <Navbar />
          <Donation />
          <Footer />
        </>
      ),
    },
  ]);

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
};

export default App;
