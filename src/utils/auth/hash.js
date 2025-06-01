const bcrypt = require("bcrypt");
const saltRounds = 10;

const passwordHashFunction = async (password) => {
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        return hashedPassword;
    } catch (error) {
        throw new Error("Error hashing password: " + error.message);
    }
};

module.exports = {
    passwordHashFunction,
};