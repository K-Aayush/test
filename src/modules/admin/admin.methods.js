const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../user/user.model");

const SaveAdmin = async (req, res) => {
  try {
    const clientToken = req?.params?.token;
    if (!clientToken) throw new Error("Token not found");
    const data = jwt.verify(clientToken, process.env.JWT_GENERATE);
    if (!data) {
      throw new Error("Request Time Expired");
    }
    delete data.iat;
    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash(data?.password, salt);

    const newAdmin = new User({ ...data, password });
    await newAdmin.save();

    return res
      .status(301)
      .redirect(`${process.env.WEB_HOST}/registration-success`);
  } catch (error) {
    return res
      .status(301)
      .redirect(
        `${process.env.WEB_HOST}/registration-failed?message=${error?.message}`
      );
  }
};

module.exports = { SaveAdmin };
