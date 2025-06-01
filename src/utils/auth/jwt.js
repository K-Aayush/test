// utils/jwt.js
const jwt = require('jsonwebtoken');

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'your-default-secret'; // Use env variable in production

const checkJwt = (token) => {
    return new Promise((resolve, reject) => {
        jwt.verify(token, JWT_SECRET_KEY, (err, decoded) => {
            if (err) {
                console.log(err)
                reject(new Error('Token verification failed'));
            } else {
                resolve(decoded);
            }
        });
    });
};

module.exports = {
    checkJwt
};
