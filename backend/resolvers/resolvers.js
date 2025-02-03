// resolvers.js
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const TCFReading = require("../models/TCFReading");

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

  },
};

module.exports = resolvers;
