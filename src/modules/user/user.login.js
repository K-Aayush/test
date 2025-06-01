const { tokenGen } = require("../../utils/auth/tokenHandler");
const GenRes = require("../../utils/router/GenRes");
const User = require("./user.model");
const bcrypt = require("bcryptjs");

const LoginUser = async (req, res) => {
    try {
        const email = req?.body?.email?.toLowerCase();
        const password = req?.body?.password;

        // 400
        if (!email || !password) {
            const response = GenRes(
                400,
                null,
                { error: "Email and Password is required!" },
                "400 | Email or password not Found",
                req?.url
            );
            return res.status(400).json(response);
        }

        //
        const userData = await User.findOne({ email });
        if (!userData) {
            const response = GenRes(
                404,
                null,
                { error: "User not registerred!" },
                "User not found",
                req?.url
            );
            return res.status(404).json(response);
        }

        // check password
        const isCorrectPassword = await bcrypt.compare(
            password,
            userData?.passwordHash
        );

        //respond after check password
        if (!isCorrectPassword) {
            const response = GenRes(
                401,
                null,
                { error: "Incorrect Credentials [PASSWORD DIDNT MATCH]" },
                "Incorrect Credentaials",
                req?.url
            );
            return res.status(401).json(response);
        }


        const genData = {
            email: userData?.email,
            name: userData?.name,
            role: userData?.role,
            id: userData?.userId?.toString(),
            phone: userData?.phone,
            date: new Date(),
        };

        const { refreshToken, accessToken } = tokenGen(genData);
        userData.refreshToken = refreshToken;
        await userData.save();
        const obj = userData.toObject();
        delete obj.signedIn;
        delete obj.passwordHash;
        delete obj.refreshToken;
        const saveData = GenRes(200, obj, null, "Logged in");
        return res.status(200).json({ ...saveData, accessToken });
    } catch (error) {
        const respones = GenRes(500, null, error, error?.message, req?.url);
        return res.status(500).json(respones);
    }
};

const LoginWithGoogle = async (req, res) => {
    const url = req.url;
    try {
        const { fullName, email, phone, googleId } = req.body;

        // Validate required fields
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

        const normalizedEmail = email.toLowerCase();

        // Check if user already exists
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            // User exists - proceed with login
            const genData = {
                email: existingUser.email,
                role: existingUser.role,
                id: existingUser.userId?.toString(),
                phone: existingUser.phone,
                date: new Date(),
            };

            const { refreshToken, accessToken } = tokenGen(genData);
            existingUser.refreshToken = refreshToken;
            await existingUser.save();

            const obj = existingUser.toObject();
            delete obj.signedIn;
            delete obj.passwordHash;
            delete obj.refreshToken;
            delete obj.code;
            delete obj.expiry;
            delete obj.codeAttemptCount;
            delete obj._id;
            delete obj.__v;

            const saveData = GenRes(200, obj, null, "Logged in with Google");
            return res.status(200).json({ ...saveData, accessToken });
        } else {
            // User doesn't exist - register new user

            // Check if phone number already exists (if phone is provided)
            if (phone) {
                const numberExist = await User.findOne({ phone });
                if (numberExist) {
                    const err = GenRes(
                        409,
                        null,
                        { message: "Duplicate Error. CODE = 11000" },
                        "This phone number already exists",
                        url
                    );
                    return res.status(err.status).json(err);
                }
            }

            // Create new user for Google login (no password required)
            const newUser = new User({
                email: normalizedEmail,
                name: fullName,
                phone: phone || null,
                passwordHash: "GOOGLE_AUTH", // Placeholder since field is required
                role: "user"
            });

            await newUser.save();

            // Generate tokens for the new user
            const genData = {
                email: newUser.email,
                role: newUser.role,
                id: newUser.userId?.toString(),
                phone: newUser.phone,
                date: new Date(),
            };

            const { refreshToken, accessToken } = tokenGen(genData);
            newUser.refreshToken = refreshToken;
            await newUser.save();

            const obj = newUser.toObject();
            delete obj.signedIn;
            delete obj.passwordHash;
            delete obj.refreshToken;

            const saveData = GenRes(201, obj, null, "User registered and logged in with Google");
            return res.status(201).json({ ...saveData, accessToken });
        }

    } catch (error) {
        console.log("Catch block url");
        console.log(url);
        const response = GenRes(500, null, error, error?.message, url);
        return res.status(500).json(response);
    }
};

module.exports = {LoginUser, LoginWithGoogle};