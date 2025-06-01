const { checkJwt } = require('../utils/auth/jwt');
const GenRes = require('../utils/router/GenRes');

const adminMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    // console.log(token)
    if (!token) {
        return res.status(401).json(GenRes(401, false, new Error('No token provided'), 'Unauthorized', req.url));
    }

    try {
        const decoded = await checkJwt(token);

        if (decoded.role !== 'admin') {
            return res
                .status(403)
                .json(GenRes(403, null, new Error('Forbidden'), 'Forbidden', req.url));
        }

        req.user = decoded;
        next();
    } catch (err) {
        return res
            .status(401)
            .json(GenRes(401, null, err, 'Invalid token', req.url));
    }
};

module.exports = adminMiddleware;
