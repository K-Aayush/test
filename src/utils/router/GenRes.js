const GenRes = (status, data = null, error = null, message = null, path = null) => {
    const isError = Boolean(error);
    const timestamp = new Date().toISOString();

    const response = {
        status,
        success: !isError,
        data,
        error: isError ? {
            message: error?.message || "An unexpected error occurred",
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        } : null,
        message: message || (isError ? "Request failed" : "Request successful"),
        timestamp
    };

    if (isError) {
        console.log(error)
        console.error(`[${timestamp}] ERROR at ${path ?? "unknown route"}:`, error);
    }

    return response;
};

module.exports = GenRes;
