const transporter  = require("../../config/Mailer");
const GenRes = require("../../utils/routers/GenRes");
const User = require("../user/user.model");
const jwt = require("jsonwebtoken");

const registerAdmin = async (req, res) => {
  try {
    const { email, ...restData } = req.body;
    const normalizedEmail = email?.toLowerCase();

    // Check for duplicate email
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

    // Generate JWT token
    const requestToken = jwt.sign(
      {
        email: normalizedEmail,
        role: "admin",
        metadata: restData,
        date: new Date(),
      },
      process.env.JWT_GENERATE,
      { expiresIn: "2d" }
    );

    const confirmationUrl = `${process.env.HOST}/validate-admin-login/${requestToken}`;

    // Send beautiful HTML email
    await transporter.sendMail({
      from: process.env.MAILING,
      to: `${process.env.MAILING},${process.env.EMAIL}`, // Internal notification
      subject: "Confirm Admin Registration?",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0; background-color: #f9f9f9;">
          <h2 style="color: #333; text-align: center;">Admin Registration Confirmation</h2>
          <p style="font-size: 16px; color: #555;">
            Hello Admin,
          </p>
          <p style="font-size: 16px; color: #555;">
            A request has been made to register a new admin account. If this was intended, please confirm the registration by clicking the button below.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmationUrl}" 
               style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Confirm Admin Registration
            </a>
          </div>
          <p style="font-size: 14px; color: #888;">
            If you did not make this request, you can safely ignore this email.
          </p>
          <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; color: #aaa; text-align: center;">
            This message was sent by your system at ${new Date().toLocaleString()}.
          </p>
        </div>
      `,
    });

    const response = GenRes(200, null, null, "Admin registration requested!");
    return res.status(response.status).json(response);
  } catch (error) {
    console.error("Admin registration error:", error);
    const response = GenRes(500, null, { error }, error?.message);
    return res.status(response.status).json(response);
  }
};

module.exports = registerAdmin;
