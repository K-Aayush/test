const admin = require("../config/firebase");
const GenRes = require("../utils/routers/GenRes");
const { tokenGen } = require("../utils/auth/tokenHandler");
const User = require("../modules/user/user.model");

const firebaseMiddleware = async (req, res, next) => {
  req.user = null;
  try {
    const token = req?.headers?.authorization;
    if (!token) {
      throw new Error("Token not found!");
    }

    // Decode Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    if (!decodedToken) {
      throw new Error("Firebase failed to parse!");
    }

    // Find or create user
    const user = await User.findOne({ email: decodedToken.email });
    if (!user) {
      throw new Error("User not registered!");
    }

    // Generate JWT tokens
    const tokenData = {
      _id: user._id.toString(),
      email: user.email,
      phone: user.phone,
      date: new Date(),
    };

    const { accessToken, refreshToken } = tokenGen(tokenData);

    // Update user's refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // Add tokens to response headers
    res.set("X-Access-Token", accessToken);
    res.set("X-Refresh-Token", refreshToken);

    req.user = decodedToken;
    return next();
  } catch (error) {
    const response = GenRes(500, null, error, error?.message);
    return res.status(500).json(response);
  }
};

const registerMiddleware = async (req, _, next) => {
  req.user = null;
  try {
    const token = req?.headers?.authorization;
    if (!token) {
      throw new Error("Token not found!");
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    if (!decodedToken) {
      throw new Error("Firebase failed to parse!");
    }
    req.user = decodedToken;
    return next();
  } catch (error) {
    req.user = null;
    return next();
  }
};

module.exports = { firebaseMiddleware, registerMiddleware };
