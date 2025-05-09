const jwt = require("jsonwebtoken");
const GenRes = require("../../utils/routers/GenRes");
const User = require("../user/user.model");
const bcrypt = require("bcryptjs");

const loginAdmin = async (req, res) => {
  try {
    const email = req?.body?.email?.toLowerCase();
    const password = req?.body?.password;

    // 400
    if (!email || !password) {
      const response = GenRes(
        400,
        null,
        { error: "Email and Password is required!" },
        "400 | Email or password not Found"
      );
      return res.status(400).json(response);
    }

    const userData = await User.findOne({ email, role: "admin" });
    if (!userData) {
      const response = GenRes(
        404,
        null,
        { error: "User not registerred!" },
        "User not found"
      );
      return res.status(404).json(response);
    }

    // check password
    const isCorrectPassword = await bcrypt.compare(
      password,
      userData?.password
    );

    //respond after check password
    if (!isCorrectPassword) {
      const response = GenRes(
        401,
        null,
        { error: "Incorrect Credentials [PASSWORD DIDNT MATCH]" },
        "Incorrect Credentaials"
      );
      return res.status(401).json(response);
    }

    userData.signedIn = [...userData?.signedIn, new Date()?.toDateString()];

    const genData = {
      email: userData?.email,
      _id: userData?._id?.toString(),
      phone: userData?.phone,
      date: new Date(),
    };

    const accessToken = jwt.sign(genData, process.env.JWT_ADMIN);
    const obj = userData.toObject();
    delete obj.signedIn;
    delete obj.password;
    const saveData = GenRes(200, obj, null, "Logged in");
    return res.status(200).json({ ...saveData, accessToken });
  } catch (error) {
    const respones = GenRes(500, null, error, error?.message);
    return res.status(500).json(respones);
  }
};

module.exports = loginAdmin;
