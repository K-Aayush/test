const admin = require("../config/firebase");
const GenRes = require("../utils/routers/GenRes");

const firebaseMiddleware = async (req, res, next) => {
  req.user = null;
  try {
    const token = req?.headers?.authorization;
    // doesnot occur still if reused seperately
    if (!token) {
      throw new Error("Token not found!");
    }

    // decoded token
    const decodedToken = await admin.auth().verifyIdToken(token);
    if (!decodedToken) {
      throw new Error("Firebase failed to parse!");
    }
    req.user = decodedToken;
    return next();
  } catch (error) {
    const response = GenRes(500, null, error, error?.message)
    return res.status(500).json(response);
  }
};

const registerMiddleware = async (req, _, next) => {
  req.user = null;
  try {
    const token = req?.headers?.authorization;
    // doesnot occur still if reused seperately
    if (!token) {
      throw new Error("Token not found!");
    }

    // decoded token
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
