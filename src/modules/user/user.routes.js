const express = require('express');
const RegisterUser = require('./user.register');
const {LoginUser, LoginWithGoogle} = require('./user.login');
const { changePassword, updateUser, getUserDetailByUser } = require('./user.methods');
const authMiddleware = require('../../middlewares/authMiddleware');
const { forgetPass, verifyCode } = require('../../utils/auth/changePass');
// const handleValidationErrors = require('../../middlewares/handleValidationErrors');
// const {
//     registerValidation,
//     loginValidation,
//     forgetPassValidation,
//     verifyCodeValidation
// } = require('./user.validate');

const SetPassword = require('./user.methods');
const router = express.Router();

// Placeholder route for user API
router.get('/', (req, res) => {
    res.send("helo");
});
router.post('/register', RegisterUser);
router.post('/login', LoginUser);
router.post('/login/google', LoginWithGoogle);
router.post("/forget-password", forgetPass);
router.post("/verify-code", verifyCode);
router.post('/change-password', authMiddleware, changePassword);
router.post('/update-user', authMiddleware, updateUser);
router.get('/users/me', authMiddleware, getUserDetailByUser);

module.exports = router;