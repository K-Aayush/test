const GenRes = require('../utils/router/GenRes');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0]; // Only use the first validation error
        const error = new Error(firstError.msg);

        const errResponse = GenRes(
            400,
            null,
            error,
            'Validation failed',
            req.url
        );

        return res.status(400).json(errResponse);
    }

    next();
};

module.exports = handleValidationErrors;