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

// Routes
const authRoutes = require('./routes/auth');
const friendRoutes = require('./routes/friends');
const messageRoutes = require('./routes/messages');
const groupRoutes = require('./routes/groups');
const statusRoutes = require('./routes/status');
const aiRoutes = require('./routes/ai');

const app = express();
const server = http.createServer(app);

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
// HTTP Security Headers (Adjusted for SPA inline scripts)
app.use(helmet({
    contentSecurityPolicy: false, // Disable strict CSP for initial deployment stability
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
        
        // Check exact match OR any *.vercel.app deployment
        if (cleanAllowed.includes(cleanOrigin) || cleanOrigin.endsWith('.vercel.app')) {
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
app.use('/api/ai', aiRoutes);

// ─── SERVE STATIC FILES (React) ──────────────────────────
const distPath = path.join(__dirname, '..', '..', 'client', 'dist');

if (fs.existsSync(distPath)) {
    console.log(`📂 Static serving active: ${distPath}`);
    app.use(express.static(distPath));
    
    // SPA catch-all: Serve index.html for any non-API, non-file route
    app.get(/^(?!\/api).*/, (req, res, next) => {
        // If it looks like a file (has an extension), let it fall through
        if (path.extname(req.url)) return next();
        
        res.sendFile(path.join(distPath, 'index.html'), (err) => {
            if (err) {
                console.error('Error sending index.html:', err.message);
                next();
            }
        });
    });
} else {
    console.warn(`⚠️ Warning: Static dist folder not found at ${distPath}`);
    console.log('Current directory:', __dirname);
}

// ─── 404 Handler (Only for unmatched API routes) ────────
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API Route not found', path: req.url });
});

// ─── Global Error Handler ───────────────────────────────
app.use((err, req, res, next) => {
    console.error(`🔴 ERROR [${req.method} ${req.url}]:`, err.stack || err.message);
    const statusCode = err.status || 500;
    res.status(statusCode).json({ 
        error: statusCode === 500 ? 'Internal server error.' : err.message,
        success: false 
    });
});

// ─── SOCKET.IO SETUP ────────────────────────────────────
const io = new Server(server, {
    cors: {
        origin: true,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

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

server.listen(PORT, '0.0.0.0', async () => {
    await initDB();
    console.log(`\n🚀 Server running on http://0.0.0.0:${PORT}`);
    console.log(`📡 Socket.io ready for connections`);
    console.log(`💾 Database: Connected to Neon PostgreSQL`);
    console.log(`☁️  Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME}\n`);
    
    // Start automated status cleanup routine
    startStatusCleanupRoutine();
});

// ─── GRACEFUL SHUTDOWN ──────────────────────────────────
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        pool.end();
        process.exit(0);
    });
});

// ─── STATUS CLEANUP ROUTINE ─────────────────────────────
const cloudinary = require('./config/cloudinary');

function startStatusCleanupRoutine() {
    // Run every 10 minutes to clean up 24h expired statuses
    setInterval(async () => {
        try {
            const expired = await pool.query('SELECT id, media_url FROM statuses WHERE expires_at <= NOW()');
            if (expired.rows.length > 0) {
                for (const row of expired.rows) {
                    const match = row.media_url.match(/\/upload\/(?:v\d+\/)?(.+?)\.[a-z0-9]+$/i);
                    if (match && match[1]) {
                        const resourceType = row.media_url.includes('/video/') ? 'video' : 'image';
                        await cloudinary.uploader.destroy(match[1], { resource_type: resourceType }).catch(err => {
                            console.error(`Failed to destroy Cloudinary asset ${match[1]}:`, err.message);
                        });
                    }
                }
                const ids = expired.rows.map(r => r.id);
                await pool.query('DELETE FROM statuses WHERE id = ANY($1)', [ids]);
                console.log(`🧹 Cleaned up ${ids.length} expired statuses.`);
            }
        } catch (err) {
            console.error('Status cleanup routine error:', err.message);
        }
    }, 10 * 60 * 1000); 
}
