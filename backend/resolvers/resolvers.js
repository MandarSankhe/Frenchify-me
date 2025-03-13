// resolvers.js
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const History = require("../models/History");
const TCFReading = require("../models/TCFReading");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const { Together } = require("together-ai");
const WritingMatch = require("../models/WritingMatch");
const mongoose = require("mongoose");
const TCFWriting = require("../models/TCFWriting"); //#20Feb2024
const TCFSpeaking = require("../models/TCFSpeaking");
const TCFListening = require("../models/TCFListening");

require("dotenv").config();
const together = new Together();

const Redis = require("ioredis");
const redis = new Redis();

const PW_MUT_SECRET_KEY = process.env.PW_MUT_SECRET_KEY;

// Helper to generate AI feedback (similar to your /generate-feedback route)
async function generateFeedback(question, answer) {
  const prompt = `
    Evaluate the following TCF French Writing Test answer based on the question:
    Question: ${question}
    Answer: ${answer}
    
    Provide detailed feedback on the answer including strengths, weaknesses, and language/grammar assessment.
    Conclude with a score out of 10.
  `;
  let feedback = "";
  const response = await together.chat.completions.create({
    messages: [{ role: "system", content: prompt }],
    model: "meta-llama/Llama-Vision-Free",
    max_tokens: 2000,
    temperature: 0.7,
    top_p: 0.7,
    top_k: 50,
    repetition_penalty: 1,
    stop: ["<|eot_id|>", "<|eom_id|>"],
    stream: true,
  });
  
  for await (const token of response) {
    feedback += token.choices[0]?.delta?.content;
  }
  return feedback.replace(/\n/g, "<br>");
}


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

    // Fetch all speaking topics
    tcfSpeakings: async () => {
      try {
        return await TCFSpeaking.find();
      } catch (error) {
        console.error("Error fetching speaking topics:", error);
        throw new Error("Failed to fetch speaking topics");
      }
    },

    tcfListenings: async () => {
      try {
        return await TCFListening.find();
      } catch (error) {
        console.error("Error fetching TCF listenings:", error);
        throw new Error("Failed to fetch TCF listenings");
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

  
    pendingMatches: async (_, { userId }) => {
      try {
        console.log("Fetching pending matches for userId:", userId);
        const pending = await WritingMatch.find({
          $or: [
            { initiator: new mongoose.Types.ObjectId(userId) },
            { opponent: new mongoose.Types.ObjectId(userId) }
          ],
          status: { $in: ["pending", "active"] } // Include active matches as well
        })
          .populate("initiator", "username")
          .populate("opponent", "username");
        
        console.log("Pending matches found:", pending);
        
        // Normalize each match so that the IDs are plain strings and the user objects include username.
        return pending.map(match => ({
          id: match._id.toString(),
          examId: match.examId.toString(),
          examTitle: match.examTitle,
          examQuestion: match.examQuestion,
          initiator: {
            id: match.initiator._id.toString(),
            username: match.initiator.username
          },
          opponent: {
            id: match.opponent._id.toString(),
            username: match.opponent.username
          },
          status: match.status,
          createdAt: match.createdAt
        }));
      } catch (error) {
        console.error("Error fetching pending matches:", error);
        throw new Error("Failed to fetch pending matches");
      }
    },
    
    
    match: async (_, { matchId }) => {
      // Find the match by its ID and populate the user fields
      const match = await WritingMatch.findById(matchId)
        .populate("initiator", "username")
        .populate("opponent", "username");
      if (!match) {
        throw new Error("Match not found");
      }
      
      // Convert Mongoose document to plain object and normalize IDs
      const matchObj = match.toObject();
      matchObj.id = matchObj._id.toString();
      matchObj.examId = matchObj.examId.toString();
      matchObj.initiator = {
        id: matchObj.initiator._id.toString(),
        username: matchObj.initiator.username,
      };
      matchObj.opponent = {
        id: matchObj.opponent._id.toString(),
        username: matchObj.opponent.username,
      };
      delete matchObj._id;
      delete matchObj.__v;
      
      return matchObj;
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
        console.error("Error sending email:", error.message);
        throw new Error(error.message);
      }
    },    

    resetPassword: async (_, { token, newPassword }) => {
      try {
        // Check if token is already blacklisted
        const isBlacklisted = await redis.get(`blacklisted:${token}`);
        if (isBlacklisted) {
          throw new Error("Token has already been used.");
        }
        // Verify token
        const decoded = jwt.verify(token, PW_MUT_SECRET_KEY);
        const user = await User.findOne({ email: decoded.email });

        if (!user) {
          throw new Error("Invalid token or user not found");
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        // Blacklist the token in Redis - to prevent a 2nd password change
        await redis.set(`blacklisted:${token}`, "true", "EX", 3600); // Expires after 1 hour

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

    // Create a new match request
    createWritingMatch: async (_, { input }) => {
      const { initiatorId, opponentUsername, examId, examTitle, examQuestion } = input;
      const opponent = await User.findOne({ username: opponentUsername });
      if (!opponent) {
        throw new Error("Opponent not found");
      }
      
      // Create and save the new match document.
      const newMatch = new WritingMatch({
        examId: examId, // Mongoose will cast this to an ObjectId as needed.
        examTitle,
        examQuestion,
        initiator: initiatorId,
        opponent: opponent._id,
        status: "pending",
      });
      await newMatch.save();
      
      // Populate the initiator and opponent fields (fetching at least the id and username)
      const populatedMatch = await WritingMatch.findById(newMatch._id)
        .populate("initiator", "id username")
        .populate("opponent", "id username");
      
      // Convert the document to a plain JS object.
      const matchObj = populatedMatch.toObject();
      
      // Ensure all ObjectId fields are returned as strings.
      matchObj.id = matchObj._id.toString();
      matchObj.examId = matchObj.examId.toString();
      matchObj.initiator.id = matchObj.initiator._id.toString();
      matchObj.opponent.id = matchObj.opponent._id.toString();
      
      // Optionally remove the _id fields if your schema expects only id.
      delete matchObj._id;
      delete matchObj.__v;
      
      return matchObj;
    },
     

    // Opponent accepts the match request
    acceptWritingMatch: async (_, { matchId, opponentId }) => {
      const match = await WritingMatch.findById(matchId);
      if (!match) {
        throw new Error("Match not found");
      }
      if (match.opponent.toString() !== opponentId) {
        throw new Error("Not authorized to accept this match");
      }
      match.status = "active";
      await match.save();
      
      // Populate the initiator and opponent fields so we have access to username and _id
      const populatedMatch = await WritingMatch.findById(matchId)
        .populate("initiator", "username")
        .populate("opponent", "username");
      
      // Convert to plain JS object and normalize ID fields
      const matchObj = populatedMatch.toObject();
      matchObj.id = matchObj._id.toString();
      matchObj.examId = matchObj.examId.toString();
      matchObj.initiator.id = matchObj.initiator._id.toString();
      matchObj.opponent.id = matchObj.opponent._id.toString();
      
      // Optionally remove _id and __v if not needed
      delete matchObj._id;
      delete matchObj.__v;
      
      return matchObj;
    },
    

    // Each user submits their answer
    submitWritingMatchAnswer: async (_, { input }) => {
      const { matchId, userId, answer } = input;
      const match = await WritingMatch.findById(matchId);
      if (!match) {
        throw new Error("Match not found");
      }
      // Update based on whether the user is the initiator or opponent
      if (match.initiator.toString() === userId) {
        match.initiatorAnswer = answer;
      } else if (match.opponent.toString() === userId) {
        match.opponentAnswer = answer;
      } else {
        throw new Error("User is not part of this match");
      }
      await match.save();
      return match;
    },

    // Finalize the match after both users have submitted
    finalizeWritingMatch: async (_, { matchId }) => {
      const match = await WritingMatch.findById(matchId);
      if (!match) {
        throw new Error("Match not found");
      }
      if (!match.initiatorAnswer || !match.opponentAnswer) {
        throw new Error("Both users must submit an answer before finalizing");
      }
      // Generate feedback for each answer
      const [initiatorFeedback, opponentFeedback] = await Promise.all([
        generateFeedback(match.examQuestion, match.initiatorAnswer),
        generateFeedback(match.examQuestion, match.opponentAnswer)
      ]);
      match.initiatorFeedback = initiatorFeedback;
      match.opponentFeedback = opponentFeedback;
      match.status = "completed";
      await match.save();
      
      // Re-query the match with populated user fields
      const populatedMatch = await WritingMatch.findById(matchId)
        .populate("initiator", "username")
        .populate("opponent", "username");
      
      // Normalize the document: convert ObjectIds to strings
      const matchObj = populatedMatch.toObject();
      matchObj.id = matchObj._id.toString();
      matchObj.examId = matchObj.examId.toString();
      matchObj.initiator = {
        id: matchObj.initiator._id.toString(),
        username: matchObj.initiator.username,
      };
      matchObj.opponent = {
        id: matchObj.opponent._id.toString(),
        username: matchObj.opponent.username,
      };
      delete matchObj._id;
      delete matchObj.__v;
      console.log("Finalized match:", matchObj);
      
      return matchObj;
    },
    

  },
};

module.exports = resolvers;
