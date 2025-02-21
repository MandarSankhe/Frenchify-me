// resolvers.js
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const History = require("../models/History");
const TCFReading = require("../models/TCFReading");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");


const TCFWriting = require("../models/TCFWriting"); //#20Feb2024

require("dotenv").config();

const PW_MUT_SECRET_KEY = process.env.PW_MUT_SECRET_KEY;

const resolvers = {
  Query: {
    // Fetch all users
    users: async () => {
      try {
        return await User.find();
      } catch (error) {
        console.error("Error fetching users:", error);
        throw new Error("Failed to fetch users");
      }
    },

    // Fetch all TCF readings (all exams)
    tcfReadings: async () => {
      try {
        return await TCFReading.find();
      } catch (error) {
        console.error("Error fetching all TCF readings:", error);
        throw new Error("Failed to fetch TCF readings");
      }
    },

    // New: Fetch test history (scores) for a given user
    testHistories: async (_, { userId }) => {
      try {
        return await History.find({ userId });
      } catch (error) {
        console.error("Error fetching test histories:", error);
        throw new Error("Failed to fetch test histories");
      }
    },

    // Fetch all writing tests #20Feb2024
    tcfWritings: async () => {
      try {
        return await TCFWriting.find();
      } catch (error) {
        console.error("Error fetching TCF writings:", error);
        throw new Error("Failed to fetch TCF writings");
      }
    },
    // #20Feb2024
  },

  Mutation: {
    // Login
    login: async (_, { email, password }) => {
      const user = await User.findOne({ email });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        throw new Error("Invalid email or password");
      }
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        languageLevel: user.languageLevel,
      };
    },

    // Create user
    createUser: async (_, { input }) => {
      try {
        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(input.password, 10);
        const newUser = new User({
          ...input,
          password: hashedPassword,
        });
        await newUser.save();
        return newUser;
      } catch (error) {
        console.error("Detailed error creating user:", error.message);
        throw new Error("Failed to create user");
      }
    },

    forgotPassword: async (_, { email }) => {
      try {
        const user = await User.findOne({ email });
        if (!user) {
          throw new Error("User not found");
        }
    
        // Generate token
        const token = jwt.sign({ email: user.email }, PW_MUT_SECRET_KEY, { expiresIn: "1h" });
    
        // Configure Nodemailer
        const transporter = nodemailer.createTransport({
          service: "Gmail",
          auth: {
            user: process.env.SMTP_AUTH_USER,
            pass: process.env.SMTP_AUTH_PASS,
          },
        });
    
        // Email content
        const mailOptions = {
          from: process.env.SMTP_AUTH_USER,
          to: user.email,
          subject: "Password Reset Request - Frenchify",
          html: `
            <p>We received a request to reset your password for your <strong>Frenchify</strong> account.</p>
            <p>If you requested this password reset, please click the button below to create a new password:</p>

            <div style="margin: 20px 0;">
              <a href="http://localhost:3000/reset-password/${token}" 
                style="background-color: #0055A4; color: white; text-decoration: none; padding: 12px 20px; border-radius: 5px; display: inline-block;">
                Reset Your Password
              </a>
            </div>

            <p>If you did not request a password reset, please ignore this email.</p>

            <p><strong>— The Frenchify Team</strong></p>

            <div style="margin-top: 15px;">
              <img src="https://i.imgur.com/ZFCFkcC.png"
                  alt="Frenchify Logo" 
                  style="width: 100px; height: auto;">
            </div>
          `
        };
    
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent:", info.response);
    
        return "Password reset link sent to your email.";
      } catch (error) {
        console.error("Error sending email:", error.message); // Log the actual error
        throw new Error(error.message);
      }
    },    

    resetPassword: async (_, { token, newPassword }) => {
      try {
        const decoded = jwt.verify(token, PW_MUT_SECRET_KEY);
        const user = await User.findOne({ email: decoded.email });

        if (!user) {
          throw new Error("Invalid token or user not found");
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        return "Password successfully reset.";
      } catch (error) {
        throw new Error("Invalid or expired token");
      }
    },

    // New: Mutation to save a test score
    submitTestScore: async (_, { input }) => {
      const { userId, testModelName, testId, score } = input;
      try {
        const newHistory = new History({ userId, testModelName, testId, score });
        await newHistory.save();
        return newHistory;
      } catch (error) {
        console.error("Error saving test score:", error);
        throw new Error("Failed to save test score");
      }
    },

  },
};

module.exports = resolvers;
