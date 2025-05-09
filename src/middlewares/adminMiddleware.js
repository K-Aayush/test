const User = require("../modules/user/user.model");
const GenRes = require("../utils/routers/GenRes");
const jwt = require("jsonwebtoken");

const adminKey = process.env.JWT_ADMIN;

const adminMiddleware = async (req, res, next) => {
  try {
    // for user control
    const author = req?.body?.author;
    req.user = author || null;

    const authorization = req?.headers?.authorization;
    if (!authorization) {
      throw new Error("authorization in headers is missing!");
    }

    const token = authorization?.replace("Bearer ", "");
    if (!token) throw new Error("Token not recieved from client!");

    const decoded = jwt.verify(token, adminKey);
    if (!decoded) {
      throw new Error("Token Incorrect or Expired!");
    }

    const { email, _id, phone } = decoded;

    const admin = await User.findOne({
      email,
      _id,
      phone,
      role: "admin",
    })
      .select("email _id phone name")
      .lean();
    if (!admin) {
      throw new Error("You are not admin!");
    }

    req.admin = admin;

    return next();
  } catch (error) {
    const response = GenRes(
      401,
      null,
      "Error:UNAUTHORIZED",
      error?.message || "You are not a admin"
    );
    return res.status(401).json(response);
  }
};

module.exports = { adminMiddleware };
