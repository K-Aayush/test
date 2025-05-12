const transporter = require("../../config/Mailer");
const GenRes = require("../../utils/routers/GenRes");
const User = require("../user/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const registerAdmin = async (req, res) => {
  try {
    const { email, password, ...restData } = req.body;
    const normalizedEmail = email?.toLowerCase();

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      const err = GenRes(
        409,
        null,
        { message: "Duplicate Error. CODE = 11000" },
        "This email exists"
      );
      return res.status(err.status).json(err);
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save user in DB
    await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      role: "admin",
      isVerified: false,
      ...restData,
    });

    // Generate confirmation token (if needed)
    const requestToken = jwt.sign(
      {
        email: normalizedEmail,
        role: "admin",
        date: new Date(),
      },
      process.env.JWT_GENERATE,
      { expiresIn: "2d" }
    );

    const confirmationUrl = `${process.env.HOST}/validate-admin-login/${requestToken}`;

    await transporter.sendMail({
      from: `"Your App" <${process.env.MAILING}>`,
      to: normalizedEmail,
      subject: "Confirm Admin Registration",
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Admin Registration</h2>
          <p>You have been registered as an admin.</p>
          <p><strong>Email:</strong> ${normalizedEmail}</p>
          <p><strong>Password:</strong> (hidden for security, set by you)</p>
          <p>To confirm your admin status, click below:</p>
          <a href="${confirmationUrl}" style="background:#4CAF50;color:white;padding:10px 15px;border-radius:5px;text-decoration:none;">Confirm Admin Registration</a>
        </div>
      `,
    });

    const response = GenRes(
      200,
      null,
      null,
      "Admin registered and email sent!"
    );
    return res.status(200).json(response);
  } catch (error) {
    console.error("Admin registration error:", error);
    const response = GenRes(500, null, { error }, error?.message);
    return res.status(500).json(response);
  }
};

module.exports = registerAdmin;
