const { checkJwt } = require('../utils/auth/jwt');
const GenRes = require('../utils/router/GenRes');
const User = require('../modules/user/user.model');
const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // "Bearer <token>"
    if (!token) {
        const errRes = GenRes(401, null, new Error('No token provided'), 'Unauthorized', req.url);
        return res.status(401).json(errRes);
    }

    try {
        let decoded = await checkJwt(token);
        const user = await User.findOne({ email: decoded.email.toLowerCase() });
        // console.log(decoded);
        decoded = { ...decoded, userId: user.userId }
        req.user = decoded;
        next();
    } catch (err) {
        const errRes = GenRes(401, null, err, 'Invalid token', req.url);
        return res.status(401).json(errRes);
    }
};

module.exports = authMiddleware;
