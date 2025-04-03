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
const TCFWriting = require("../models/TCFWriting");
const TCFSpeaking = require("../models/TCFSpeaking");
const TCFListeningTraining = require("../models/TCFListeningTraining");
const TCFListening = require("../models/TCFListening");
const Donation = require("../models/Donation");
const ImageExam = require("../models/ImageExam");
const ImageMatch = require("../models/ImageMatch");
const { ImgurClient } = require('imgur');

require("dotenv").config();
const together = new Together();

// const Redis = require("ioredis");

// const isElastiCacheRedis = process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
// const redis = isElastiCacheRedis
//   ? new Redis({
//       host: process.env.AWS_ELASTICACHE_REDIS,
//       port: 6379,
//       tls: {} // Required - encryption in transit is enabled in ElastiCache
//     })
//   : new Redis();

const PW_MUT_SECRET_KEY = process.env.PW_MUT_SECRET_KEY;


// Create an instance of the Imgur client.
const imgurClient = new ImgurClient({
  clientId: process.env.IMGUR_CLIENT_ID
});

// Convert a stream into a buffer.
const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });

// Upload a single file to Imgur and return the image URL

const uploadFileToImgur = async (file) => {
  try {
    // Properly handle Apollo Upload object structure
    const { promise } = file;
    const resolvedFile = await promise;
    console.log("Resolved file content:", resolvedFile);

    // Destructure from the resolved file object
    const { createReadStream, filename, mimetype } = resolvedFile;
    console.log("Processing file:", filename, mimetype);

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(mimetype)) {
      throw new Error('Invalid file type. Only JPEG/PNG/GIF allowed');
    }

    // Create read stream and convert to buffer
    const stream = createReadStream();
    const buffer = await streamToBuffer(stream);
    
    // Validate file size (10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      throw new Error('File size exceeds 10MB limit');
    }

    // Convert to base64 and upload
    const base64Image = buffer.toString("base64");
    const response = await imgurClient.upload({
      image: base64Image,
      type: 'base64',
    });

    console.log("Imgur upload successful:", response.data.link);
    return response.data.link;
  } catch (error) {
    console.error("Upload error:", error);
    throw new Error(`File upload failed: ${error.message}`);
  }
};

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

    tcfListeningtrainings: async () => {
      try {
        return await TCFListeningTraining.find();
      } catch (error) {
        console.error("Error fetching TCF listenings:", error);
        throw new Error("Failed to fetch TCF listenings");
      }
    },

    tcfListenings: async () => {
      try {
        return await TCFListening.find();
      } catch (error) {
        console.error("Error fetching TCF Listenings:", error);
        throw new Error("Failed to fetch TCF Listenings");
      }
    },
    
    // New: Fetch test history (scores) for a given user
    testHistories: async (_, { userId }) => {
      console.log("Fetching test histories for userId:", userId);
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

    imageExams: async () => await ImageExam.find(),
    pendingImageMatches: async (_, { userId }) => {
      return await ImageMatch.find({
        $or: [{ initiator: userId }, { opponent: userId }],
        status: { $in: ["pending", "active"] }
      }).populate("initiator", "username")
      .populate("opponent", "username");;
    },
    imageMatch: async (_, { matchId }) => {
      return await ImageMatch.findById(matchId).populate("initiator", "username")
      .populate("opponent", "username");;
    },
    userImageMatches: async (_, { userId }) => {
      console.log("Fetching completed image matches for userId:", userId);
      return await ImageMatch.find({
        $or: [{ initiator: userId }, { opponent: userId }],
        status: "completed"
      })
      .sort({ createdAt: -1 })
      .populate("initiator", "username")
      .populate("opponent", "username");
    },
    userWritingMatches: async (_, { userId }) => {
      console.log("Fetching completed writing matches for userId:", userId);
      return await WritingMatch.find({
        $or: [{ initiator: userId }, { opponent: userId }],
        status: 'completed'
      }).populate('initiator opponent');
    },
  },

  Mutation: {
    // Login
    login: async (_, { email, password }) => {
      try {
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
          throw new Error("Invalid email or password");
        }
        return {
          id: user.id,
          username: user.username,
          email: user.email,
          languageLevel: user.languageLevel,
          profileImage: user.profileImage,
        };
      } catch (error) {
        console.error("Detailed error logging in user:", error.message);
        throw new Error("Failed to login.");
      }
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
        }; // TODO rp: change localhost:3000 for prod (use .env for prod+local)
    
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
        // const isBlacklisted = await redis.get(`blacklisted:${token}`);
        // if (isBlacklisted) {
        //   throw new Error("Token has already been used.");
        // }
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
        // await redis.set(`blacklisted:${token}`, "true", "EX", 3600); // Expires after 1 hour

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
      const extractScoreFromFeedback = (feedback) => {
        const scoreMatch = feedback.match(/(?:Score:|score:)\s*([0-9.]+)\/10/i);
        return scoreMatch ? parseFloat(scoreMatch[1]) : 0;
      };
    
      const match = await WritingMatch.findById(matchId);
      if (!match) throw new Error("Match not found");
      if (!match.initiatorAnswer || !match.opponentAnswer) {
        throw new Error("Both users must submit answers before finalizing");
      }
    
      // Generate feedback and extract scores
      const [initiatorFeedback, opponentFeedback] = await Promise.all([
        generateFeedback(match.examQuestion, match.initiatorAnswer),
        generateFeedback(match.examQuestion, match.opponentAnswer),
      ]);
    
      // Extract scores from feedback
      const initiatorScore = extractScoreFromFeedback(initiatorFeedback);
      const opponentScore = extractScoreFromFeedback(opponentFeedback);
    
      // Update match with feedback and scores
      match.initiatorFeedback = initiatorFeedback;
      match.opponentFeedback = opponentFeedback;
      match.totalScore = {
        initiator: initiatorScore,
        opponent: opponentScore
      };
      match.status = "completed";
      await match.save();
    
      // Return populated match
      const populatedMatch = await WritingMatch.findById(matchId)
        .populate("initiator", "username")
        .populate("opponent", "username");
    
      return populatedMatch.toObject({ virtuals: true });
    },

    createImageMatch: async (_, { input }) => {
      console.log("Creating image match with input:", input);
      const exam = await ImageExam.findById(input.examId);
      if (!exam) throw new Error("Exam not found");
      const opponent = await User.findOne({ username: input.opponentUsername });
      if (!opponent) throw new Error("Opponent not found");
      console.log("Creating image match with opponent:", opponent.username);
    
      const newMatch = new ImageMatch({
        initiator: input.initiatorId,
        examId: input.examId,
        examTitle: exam.title,
        //currentQuestion: 0,
        initiatorCurrent: 0,
        opponentCurrent: 0,
        questions: exam.questions.map(q => ({
          imageUrl: q.imageUrl,
          correctWord: q.correctWord,
          revealedLetters: q.revealedLetters,
        })),
        opponent: opponent._id,
        status: "pending", 
        totalScore: { initiator: 0, opponent: 0 }
      });
      
      await newMatch.save();
      return ImageMatch.findById(newMatch._id)
        .populate("initiator", "username")
        .populate("opponent", "username");
    },

    acceptImageMatch: async (_, { matchId, opponentId }) => {
      const match = await ImageMatch.findById(matchId);
      if (!match) throw new Error("Match not found");
      if (match.opponent.toString() !== opponentId) {
        throw new Error("Not authorized to accept this match");
      }
      match.status = "active";
      await match.save();
      await match.populate("initiator", "username");
      await match.populate("opponent", "username");
      return match;
    },

    submitImageAnswer: async (_, { input }) => {
      const match = await ImageMatch.findById(input.matchId)
        .populate("initiator", "username")
        .populate("opponent", "username");
    
      if (!match) throw new Error("Match not found");
    
      // Check if the 5-minute time limit has been exceeded.
      const timeElapsed = Date.now() - new Date(match.createdAt).getTime();
      if (timeElapsed >= 5 * 60 * 1000 && match.status !== "completed") {
        match.status = "completed";
        await match.save();
        return match;
      }
    
      const isInitiator = match.initiator._id.equals(input.userId);
      const currentUserField = isInitiator ? 'initiatorCurrent' : 'opponentCurrent';
      const currentQuestionIndex = match[currentUserField];
    
      if (input.questionIndex !== currentQuestionIndex) {
        throw new Error("Invalid question submission");
      }
    
      const question = match.questions[currentQuestionIndex];
      const correct = question.correctWord.toLowerCase() === input.answer.toLowerCase();
      const score = input.isPass ? 0 : (correct ? 10 : 0);
    
      if (isInitiator) {
        question.initiatorAnswer = input.answer;
        question.initiatorScore = score;
        match.totalScore.initiator += score;
      } else {
        question.opponentAnswer = input.answer;
        question.opponentScore = score;
        match.totalScore.opponent += score;
      }
    
      match[currentUserField] += 1;
    
      const bothCompleted =
        match.initiatorCurrent >= match.questions.length &&
        match.opponentCurrent >= match.questions.length;
    
      if (bothCompleted) {
        match.status = "completed";
      }
    
      await match.save();
      return match;
    },

    finishImageMatch: async (_, { matchId }) => {
      const match = await ImageMatch.findById(matchId)
        .populate("initiator", "username")
        .populate("opponent", "username");
      if (!match) throw new Error("Match not found");
      
      // Force complete any unanswered questions
      const questions = match.questions.map(q => {
        if (!q.initiatorAnswer) {
          q.initiatorAnswer = "";
          q.initiatorScore = 0;
        }
        if (!q.opponentAnswer) {
          q.opponentAnswer = "";
          q.opponentScore = 0;
        }
        return q;
      });
    
      match.questions = questions;
      match.status = "completed";
      await match.save();
      return match;
    },
    
    
    updateUser: async (_, { id, input, profileImage }) => {
      try {
        const user = await User.findById(id);
        if (!user) throw new Error("User not found");
    
        // Update language level
        if (input.languageLevel) user.languageLevel = input.languageLevel;
    
        // Handle file upload
        if (profileImage) {
          console.log("Raw profileImage input:", profileImage);
          user.profileImage = await uploadFileToImgur(profileImage);
        }
    
        await user.save();
        return user;
      } catch (error) {
        console.error("Update error:", error);
        throw new Error(`Profile update failed: ${error.message}`);
      }
    },

    // Save donation details + generate invoice number
    createDonation: async (_, { input }) => {
      try {
        // Generate an invoice number using a timestamp and random value
        const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const donation = new Donation({
          ...input,
          invoiceNumber,
        });
        await donation.save();
        return donation;
      } catch (err) {
        console.error("Error creating donation:", err);
        throw new Error("Failed to create donation");
      }
    },

    
  
  },
};

module.exports = resolvers;
