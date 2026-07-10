require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const pool = require('./config/db');
const { setupSocket } = require('./socket/handler');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');
const { scheduleStatusCleanup } = require('./workers/statusCleanup');

// Routes
const authRoutes = require('./routes/auth');
const friendRoutes = require('./routes/friends');
const messageRoutes = require('./routes/messages');
const groupRoutes = require('./routes/groups');
const statusRoutes = require('./routes/status');
const pushRoutes = require('./routes/push');

const app = express();
const server = http.createServer(app);

// ─── PROXY TRUST (Required for Render/Proxies) ──────────
app.set('trust proxy', 1);

// ─── HEALTH CHECK (above all middleware) ─────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ─── REQUEST LOGGER ─────────────────────────────────────
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
    });
    next();
});

// ─── MIDDLEWARE ──────────────────────────────────────────
const cookieParser = require('cookie-parser');
const compression = require('compression');

app.use(compression());
app.use(cookieParser());
// HTTP Security Headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
            connectSrc: ["'self'", "ws:", "wss:"],
            mediaSrc: ["'self'", "https://res.cloudinary.com"],
            fontSrc: ["'self'", "data:"],
        },
    },
}));

// Rate Limiting (Protects from DDoS and brute force)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 500, // Limit each IP to 500 requests per window
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// ─── CORS Policy ────────────────────────────────────────
const allowedOrigins = [
    'http://localhost:5173', 
    'http://localhost:3000',
    process.env.FRONTEND_URL 
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, health checks)
        if (!origin) return callback(null, true);
        
        // Allow all origins in development
        if (process.env.NODE_ENV !== 'production') return callback(null, true);
        
        // Normalize: lowercase + strip trailing slash
        const cleanOrigin = origin.replace(/\/$/, '').toLowerCase();
        const cleanAllowed = allowedOrigins.map(o => o.trim().replace(/\/$/, '').toLowerCase());
        
        // Check exact match OR any supported deployment wildcard
        if (cleanAllowed.includes(cleanOrigin) || 
            cleanOrigin.endsWith('.vercel.app') || 
            cleanOrigin.endsWith('.up.railway.app')) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// CORS middleware handles preflight requests automatically
// app.options('*', cors()); 

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── API ROUTES ─────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/push', pushRoutes);

// ─── 404 Handler (Only for unmatched API routes) ────────
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API Route not found', path: req.url });
});

// ─── Global Error Handler ───────────────────────────────
app.use((err, req, res, next) => {
    // Only log the stack trace in development
    if (process.env.NODE_ENV !== 'production') {
        console.error(`🔴 ERROR [${req.method} ${req.url}]:`, err.stack);
    } else {
        console.error(`🔴 ERROR [${req.method} ${req.url}]:`, err.message);
    }

    const statusCode = err.status || 500;
    
    // Do not leak error messages for 500s in production
    const responseMessage = statusCode === 500 && process.env.NODE_ENV === 'production' 
        ? 'Internal server error.' 
        : (err.message || 'Internal server error.');

    res.status(statusCode).json({ 
        error: responseMessage,
        success: false 
    });
});

const io = new Server(server, {
    cors: {
        origin: function (origin, callback) {
            if (!origin) return callback(null, true);
            if (process.env.NODE_ENV !== 'production') return callback(null, true);
            
            const cleanOrigin = origin.replace(/\/$/, '').toLowerCase();
            const cleanAllowed = allowedOrigins.map(o => o.trim().replace(/\/$/, '').toLowerCase());
            
            if (cleanAllowed.includes(cleanOrigin) || 
                cleanOrigin.endsWith('.vercel.app') || 
                cleanOrigin.endsWith('.up.railway.app')) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

if (process.env.NODE_ENV !== 'test') {
    try {
        const pubClient = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
        const subClient = pubClient.duplicate();
        io.adapter(createAdapter(pubClient, subClient));
        console.log('✅ Redis Adapter initialized for Socket.IO');
    } catch (error) {
        console.warn('⚠️  Could not connect to Redis for Socket.IO adapter. Running in memory mode.');
    }
}

app.set('io', io);

setupSocket(io);

// ─── INITIALIZE DATABASE ────────────────────────────────
async function initDB() {
    try {
        const schemaPath = path.join(__dirname, 'db', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        await pool.query(schema);
        console.log('✅ Database schema initialized.');
    } catch (error) {
        console.error('❌ Database initialization error:', error.message);
    }
}

// ─── START SERVER ───────────────────────────────────────
const PORT = process.env.PORT || 5000;

if (require.main === module) {
    server.listen(PORT, '0.0.0.0', async () => {
        await initDB();
        console.log(`\n🚀 Server running on http://0.0.0.0:${PORT}`);
        console.log(`📡 Socket.io ready for connections`);
        console.log(`💾 Database: Connected to Neon PostgreSQL`);
        console.log(`☁️  Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME}\n`);
        
        // Start automated status cleanup routine via BullMQ
        try {
            await scheduleStatusCleanup();
        } catch (error) {
            console.warn('⚠️  Could not schedule status cleanup. Ensure Redis is running.');
        }
    });
}

// ─── GRACEFUL SHUTDOWN ──────────────────────────────────
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        pool.end();
        process.exit(0);
    });
});

// Worker handles the cleanup job externally via BullMQ

module.exports = app;
