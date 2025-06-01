const { check, validationResult } = require('express-validator');
const GenRes = require('../../utils/router/GenRes');

const validateLogin = [
    check('email', 'A valid email is required').isEmail(),
    check('password', 'Password is required').notEmpty(),
];

const validateRegister = [
    check('email', 'A valid email is required').isEmail(),
    check('password', 'Password is required').notEmpty(),
];


const validateForgotPassword = [
    check('email', 'Email is required').isEmail(),
];

const validateVerifyCode = [
    check('email', 'Valid email is required').isEmail(),
    check('code', 'Verification code is required').notEmpty(),
    check('newPassword', 'New password is required').notEmpty(),
];

module.exports = {
    validateRegister,
    validateLogin,
    validateForgotPassword,
    validateVerifyCode,
};
