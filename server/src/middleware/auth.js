const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    try {
        let token = req.cookies.accessToken;
        
        // Fallback to header if cookie is not present (useful for mobile apps or specific clients)
        if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.userId = decoded.userId;
        req.username = decoded.username;

        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

module.exports = auth;
