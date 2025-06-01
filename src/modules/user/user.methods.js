const GenRes = require("../../utils/router/GenRes");
const User = require("./user.model");
const { passwordHashFunction } = require("../../utils/auth/hash");
const changePassword = async (req, res) => {
    try {

        const { newPassword } = req.body;
        const requestedUser = req.user;
        if (!requestedUser || !requestedUser.email || !newPassword) {
            return res.status(400).json(GenRes(400, null, null, "Email and new password are required"), req.url);
        }

        const user = await User.findOne({ email: requestedUser.email.toLowerCase() });

        if (!user) {
            return res.status(404).json(GenRes(404, null, null, "User not found"), req.url);
        }

        user.passwordHash = await passwordHashFunction(newPassword);

        await user.save();

        return res.status(200).json(GenRes(200, null, null, "Password changed successfully"), req.url);
    } catch (err) {
        return res.status(500).json(GenRes(500, null, err, err.message), req.url);
    }
}

const getUserDetailByUser = async (req, res) => {
    try {
        const requestedUser = req.user;
        if (!requestedUser || !requestedUser.email) {
            return res.status(400).json(GenRes(400, null, null, "Email is required"), req.url);
        }

        let user = await User.findOne({ email: requestedUser.email.toLowerCase() });

        if (user) {
            user = user.toObject();
            delete user.passwordHash;
            delete user.code;
            delete user.expiry;
            delete user.codeAttemptCount;
            delete user._id;
            delete user.__v;
        }
        if (!user) {
            return res.status(404).json(GenRes(404, null, null, "User not found"), req.url);
        }

        return res.status(200).json(GenRes(200, user, null, "User details retrieved successfully"), req.url);
    } catch (err) {
        return res.status(500).json(GenRes(500, null, err, err.message), req.url);
    }
}

const updateUser = async (req, res) => {
    try {
        const { email, name, phone } = req.body;
        const requestedUser = req.user;
        var emailExists, phoneExists;
        if (!email && !name && !phone) {
            return res.status(400).json(GenRes(400, null, null, "Email, name and phone or required"), req.url);
        }

        const user = await User.findOne({ email: requestedUser.email.toLowerCase() });

        if (!user) {
            return res.status(404).json(GenRes(404, null, null, "User not found"), req.url);
        }

        //check if email or number is already in use
        if (email) {
            emailExists = await User.findOne({ email: email.toLowerCase() });
        }
        if (phone) {
            phoneExists = await User.findOne({ phone });
        }
        if (emailExists && emailExists.userId !== user.userId) {
            return res.status(409).json(GenRes(409, null, null, "Email already in use"), req.url);
        }
        if (phoneExists && phoneExists.userId !== user.userId) {
            return res.status(409).json(GenRes(409, null, null, "Phone number already in use"), req.url);
        }

        //update user details
        user.email = email ? email.toLowerCase() : user.email;
        user.name = name;
        user.phone = phone;
        console.log(user);
        await user.save();

        return res.status(200).json(GenRes(200, null, null, "User updated successfully"), req.url);
    } catch (err) {
        return res.status(500).json(GenRes(500, null, err, err.message), req.url);
    }
}

module.exports = {
    changePassword,
    updateUser,
    getUserDetailByUser
    // other methods...
}