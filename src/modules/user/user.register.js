const bcrypt = require("bcrypt");
const User = require("./user.model");
const GenRes = require("../../utils/router/GenRes");

const RegisterUser = async (req, res) => {
    const url = req.url;
    try {
        const { fullName, email, password, phone } = req.body;

        if (!fullName) {
            const err = GenRes(
                400,
                null,
                { message: "Missing field: fullName" },
                "Full name is required",
                url
            );
            return res.status(err.status).json(err);
        }

        if (!email) {
            const err = GenRes(
                400,
                null,
                { message: "Missing field: email" },
                "Email is required",
                url
            );
            return res.status(err.status).json(err);
        }

        if (!password) {
            const err = GenRes(
                400,
                null,
                { message: "Missing field: password" },
                "Password is required",
                url
            );
            return res.status(err.status).json(err);
        }

        if (!phone) {
            const err = GenRes(
                400,
                null,
                { message: "Missing field: phone" },
                "Phone number is required",
                url
            );
            return res.status(err.status).json(err);
        }

        const normalizedEmail = email.toLowerCase();
        const userExist = await User.findOne({ email: normalizedEmail });
        const numberExist = await User.findOne({ phone });

        if (numberExist) {
            const err = GenRes(
                409,
                null,
                { message: "Duplicate Error. CODE = 11000" },
                "This phone number already exists",
                req.url
            );
            return res.status(err.status).json(err);
        }

        if (userExist) {
            const err = GenRes(
                409,
                null,
                { message: "Duplicate Error. CODE = 11000" },
                "This email already exists",
                url
            );
            return res.status(err.status).json(err);
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const newUser = new User({
            email: normalizedEmail,
            name: fullName,
            phone,
            passwordHash,
            role: "user",
        });

        await newUser.save();

        const response = GenRes(
            201,
            { message: "User registered successfully!" },
            null,
            "User Created"
        );

        return res.status(201).json(response);
    } catch (error) {
        console.log("Catch block url");
        console.log(url);
        const response = GenRes(500, null, error, error?.message, url);
        return res.status(500).json(response);
    }
};

module.exports = RegisterUser;
