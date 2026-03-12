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

// ─── MIDDLEWARE ──────────────────────────────────────────
// HTTP Security Headers
app.use(helmet());

// Rate Limiting (Protects from DDoS and brute force)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 500, // Limit each IP to 500 requests per window
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// Strict CORS Policy
const allowedOrigins = [
    'http://localhost:5173', 
    'http://localhost:3000',
    process.env.FRONTEND_URL 
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl) or allowed origins
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── API ROUTES ─────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/ai', aiRoutes);

// ─── HEALTH CHECK ───────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
    console.error('GLOBAL ERROR:', err);
    res.status(500).json({ error: err.message, details: err });
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
