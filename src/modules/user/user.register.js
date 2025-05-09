const User = require("./user.model");
const path = require("path");
const fs = require("fs");
const GenRes = require("../../utils/routers/GenRes");
// register user
const RegisterUser = async (req, res) => {
  try {
    const email = req?.body?.email?.toLowerCase() || req?.user?.email;
    const userExist = await User.findOne({ email });

    if (userExist) {
      const err = GenRes(
        409,
        null,
        { message: "Duplicate Error. CODE = 11000" },
        "This email exists"
      );
      return res.status(err?.status).json(err);
    }

    const newData = {
      ...(req?.user || req?.body),
      level: "bronze",
      role: "user",
    };

    const newUser = new User(newData);
    await newUser.save();
    try {
      const joinedPath = path.join(process.cwd(), "uploads", email);
      fs.mkdirSync(joinedPath, { recursive: true });
    } catch (err) {
      console.error.bind("Error :", err);
    }

    const response = GenRes(
      200,
      { message: "Data saved!" },
      null,
      "User Created"
    );

    return res.status(200).json(response);
  } catch (error) {
    const response = GenRes(500, null, error, error?.message);
    return res.status(500).json(response);
  }
};

module.exports = RegisterUser;
