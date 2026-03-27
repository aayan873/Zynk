// Custom error handler
export const wrapError = (err, req, res, next) => {
    let { status = 500, message = "Some random err" } = err;
    console.log("Error caught:", err);
    if (!res.headersSent) {
        res.status(status).json({ error: message });
    }};