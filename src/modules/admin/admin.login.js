const jwt = require("jsonwebtoken");
const GenRes = require("../../utils/routers/GenRes");
const User = require("../user/user.model");
const bcrypt = require("bcryptjs");

const loginAdmin = async (req, res) => {
  try {
    const email = req?.body?.email?.toLowerCase();
    const password = req?.body?.password;

    if (!email || !password) {
      return res
        .status(400)
        .json(
          GenRes(
            400,
            null,
            { error: "Missing credentials" },
            "Email & Password required"
          )
        );
    }

    const user = await User.findOne({ email, role: "admin" });
    if (!user) {
      return res
        .status(404)
        .json(
          GenRes(
            404,
            null,
            { error: "Admin not found" },
            "Admin not registered"
          )
        );
    }

    if (!user.isVerified) {
      const response = GenRes(
        403,
        null,
        { error: "Admin email not verified." },
        "Account not verified"
      );
      return res.status(403).json(response);
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res
        .status(401)
        .json(
          GenRes(401, null, { error: "Incorrect password" }, "Login failed")
        );
    }

    // Update sign-in history
    user.signedIn.push(new Date());
    await user.save();

    const payload = {
      email: user.email,
      _id: user._id.toString(),
      phone: user.phone,
      role: user.role,
    };

    const token = jwt.sign(payload, process.env.JWT_ADMIN, { expiresIn: "1d" });

    const {
      password: _,
      signedIn,
      ...userWithoutSensitiveData
    } = user.toObject();

    return res.status(200).json({
      ...GenRes(200, userWithoutSensitiveData, null, "Admin login successful"),
      accessToken: token,
    });
  } catch (err) {
    return res.status(500).json(GenRes(500, null, err.message, "Server error"));
  }
};

module.exports = loginAdmin;
