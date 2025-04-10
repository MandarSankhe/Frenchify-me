import React from "react";
import {
    createBrowserRouter,
    RouterProvider,
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
import HeadToHeadImagePuzzleMatch from "./components/HeadToHead/HeadToHeadImagePuzzleMatch";
import ListeningTraining from "./components/ListeningTraining";
import ListeningMock from "./components/ListeningMock";
import UserSettings from "./components/UserSettings";
import Donation from "./components/Donation";
import About from "./components/About";
import Footer from "./components/Footer";
import PendingTutorHome from "./components/Trainer/PendingTutorHome";
import TrainerHome from "./components/Trainer/TrainerHome";
import AdminHome from "./components/Admin/AdminHome";
import BookServices from "./components/BookService/BookServices";
import VideoCallSession from "./components/BookService/VideoCallSession";
import MeetingRoom from "./components/BookService/MeetingRoom";

// Protected route component to restrict access if not authenticated
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? children : <Navigate to="/login" />;
};

const App = () => {
    // Adjust this value to match your Navbar's height
    const containerStyle = { paddingTop: "80px" };

    const router = createBrowserRouter([
        {
            path: "/",
            errorElement: <ErrorPage />,
            element: (
                <>
                    <Navbar />
                    <div style={containerStyle}>
                        <Home />
                        <Footer />
                    </div>
                </>
            ),
        },
        {
            path: "/register",
            element: (
                <>
                    <Navbar />
                    <div style={containerStyle}>
                        <Register />
                    </div>
                </>
            ),
        },
        {
            path: "/login",
            element: (
                <>
                    <Navbar />
                    <div style={containerStyle}>
                        <Login />
                    </div>
                </>
            ),
        },
        {
            path: "/dashboard",
            element: (
                <>
                    <Navbar />
                    <div style={containerStyle}>
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    </div>
                </>
            ),
        },
        {
            path: "/readingmock",
            element: (
                <>
                    <Navbar />
                    <div style={containerStyle}>
                        <ProtectedRoute>
                            <ReadingMock />
                        </ProtectedRoute>
                    </div>
                </>
            ),
        },
        {
            path: "/writingmock",
            element: (
                <>
                    <Navbar />
                    <div style={containerStyle}>
                        <ProtectedRoute>
                            <WritingMock />
                        </ProtectedRoute>
                    </div>
                </>
            ),
        },
        {
            path: "/speakingmock",
            element: (
                <>
                    <Navbar />
                    <div style={containerStyle}>
                        <ProtectedRoute>
                            <SpeakingMock />
                        </ProtectedRoute>
                    </div>
                </>
            ),
        },
        {
            path: "/headtoheadmatch",
            element: (
                <>
                    <Navbar />
                    <div style={containerStyle}>
                        <ProtectedRoute>
                            <HeadToHeadMatch />
                        </ProtectedRoute>
                    </div>
                </>
            ),
        },
        {
            path: "/image-match",
            element: (
                <>
                    <Navbar />
                    <div style={containerStyle}>
                        <ProtectedRoute>
                            <HeadToHeadImagePuzzleMatch />
                        </ProtectedRoute>
                    </div>
                </>
            ),
        },
        {
            path: "/writing-match",
            element: (
                <>
                    <Navbar />
                    <div style={containerStyle}>
                        <ProtectedRoute>
                            <HeadToHeadWritingMatch />
                        </ProtectedRoute>
                    </div>
                </>
            ),
        },
        {
            path: "/listeningtraining",
            element: (
                <>
                    <Navbar />
                    <div style={containerStyle}>
                        <ProtectedRoute>
                            <ListeningTraining />
                        </ProtectedRoute>
                    </div>
                </>
            ),
        },
        {
            path: "/listeningmock",
            element: (
                <>
                    <Navbar />
                    <div style={containerStyle}>
                        <ProtectedRoute>
                            <ListeningMock />
                        </ProtectedRoute>
                    </div>
                </>
            ),
        },
        {
            path: "/forgot-password",
            element: (
                <>
                    <Navbar />
                    <div style={containerStyle}>
                        <ForgotPassword />
                    </div>
                </>
            ),
        },
        {
            path: "/user-settings",
            element: (
                <>
                    <Navbar />
                    <div style={containerStyle}>
                        <UserSettings />
                    </div>
                </>
            ),
        },
        {
            path: "/reset-password/:token",
            element: (
                <>
                    <Navbar />
                    <div style={containerStyle}>
                        <ResetPassword />
                    </div>
                </>
            ),
        },
        {
            path: "/donate",
            element: (
                <>
                    <Navbar />
                    <div style={containerStyle}>
                        <Donation />
                        <Footer />
                    </div>
                </>
            ),
        },
        {
            path: "/about",
            element: (
                <>
                    <Navbar />
                    <div style={containerStyle}>
                        <About />
                        <Footer />
                    </div>
                </>
            ),
        },
        {
            path: "/pending-tutor",
            element: (
              <>
                <Navbar />
                <div style={containerStyle}>
                  <ProtectedRoute>
                    <PendingTutorHome />
                  </ProtectedRoute>
                </div>
              </>
            ),
        },
        {
            path: "/trainer-home",
            element: (
              <>
                <Navbar />
                <div style={containerStyle}>
                  <ProtectedRoute>
                    <TrainerHome />
                  </ProtectedRoute>
                </div>
              </>
            ),
        },
        {
            path: "/admin-home",
            element: (
              <>
                <Navbar />
                <div style={containerStyle}>
                  <ProtectedRoute>
                    <AdminHome />
                  </ProtectedRoute>
                </div>
              </>
            ),
        },
        {
            path: "/book-service",
            element: (
              <>
                <Navbar />
                <div style={containerStyle}>
                  <ProtectedRoute>
                    <BookServices />
                  </ProtectedRoute>
                </div>
              </>
            ),
        },
        {
            path: "/video-call-session",
            element: (
              <>
                <Navbar />
                <div style={containerStyle}>
                  <ProtectedRoute>
                    <VideoCallSession />
                  </ProtectedRoute>
                </div>
              </>
            ),
        },
        {
            path: "/meeting",
            element: (
              <>
                <Navbar />
                <div style={containerStyle}>
                  <ProtectedRoute>
                    <MeetingRoom />
                  </ProtectedRoute>
                </div>
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