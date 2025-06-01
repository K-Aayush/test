const transporter = require("../../config/mailer");
const bcrypt = require("bcrypt");
const User = require("../../modules/user/user.model");
const GenRes = require("../../utils/router/GenRes");
const { v4: uuidv4 } = require("uuid");
const { passwordHashFunction } = require("../../utils/auth/hash");

const forgetPass = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json(GenRes(400, null, null, "Email is required"), req.url);
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiryTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        const hashedOtp = await passwordHashFunction(otp);

        const user = await User.findOneAndUpdate(
            { email: email.toLowerCase() },
            {
                code: hashedOtp,
                expiry: expiryTime,
                codeAttemptCount: 0,
            },
            { new: true }
        );

        if (!user) {
            return res.status(404).json(GenRes(404, null, { message: "User not found" }, "No account associated with this email", req.url));
        }

        await transporter.sendMail({
            from: process.env.EMAIL,
            to: email,
            subject: "Your OTP Code",
            html: `<p>Your OTP code is <strong>${otp}</strong>. It will expire in 5 minutes.</p><p>Do not share this with anyone.</p>`,
        });
        // const URL = process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : process.env.DEV_FRONTEND_URL + "/reset-password/code=" + otp;
        // await transporter.sendMail({
        //     from: process.env.EMAIL,
        //     to: email,
        //     subject: "Change Password Link",
        //     html: `Click <a href=""><strong>HERE</strong></a> to change your password. <p>Do not share this with anyone.</p>`,
        // });

        return res.status(200).json(GenRes(200, null, null, "Email sent!"));
    } catch (err) {
        return res.status(500).json(GenRes(500, null, err, err?.message), req.url);
    }
};

const verifyCode = async (req, res) => {
    try {
        const { email, enteredCode, newPassword } = req.body;

        if (!email || !enteredCode || !newPassword) {
            return res.status(400).json(GenRes(400, null, null, "All fields are required"), req.url);
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user || !user.code || !user.expiry) {
            return res.status(404).json(GenRes(404, null, { error: "Token Not Found." }, "Token may be expired!"), req.url);
        }

        if (user.expiry < new Date()) {
            return res.status(410).json(GenRes(410, null, { error: "Expired" }, "OTP expired. Please request again."), req.url);
        }

        const isMatch = await bcrypt.compare(enteredCode.toString(), user.code);

        if (!isMatch) {
            const updatedCount = (user.codeAttemptCount || 0) + 1;

            if (updatedCount >= 5) {
                await User.updateOne(
                    { email },
                    { $unset: { code: 1, expiry: 1 }, codeAttemptCount: 0 }
                );

                return res.status(403).json(GenRes(403, null, { error: "Too many incorrect attempts" }, "OTP blocked"), req.url);
            }

            await User.updateOne(
                { email },
                { codeAttemptCount: updatedCount }
            );

            return res.status(401).json(
                GenRes(401, null, { error: "Incorrect code" }, `Incorrect OTP! Attempts left: ${5 - updatedCount}`)
            );
        }

        // Successful verification: clear OTP data
        const passwordHash = await bcrypt.hash(newPassword, 10);

        await User.updateOne(
            { email },
            {
                $set: { passwordHash },
                $unset: { code: 1, expiry: 1, codeAttemptCount: 1 }
            }
        );

        return res.status(200).json(GenRes(200, null, null, "Password reset successful"));
    } catch (err) {
        return res.status(500).json(GenRes(500, null, err, err?.message), req.url);
    }
};


module.exports = { forgetPass, verifyCode };