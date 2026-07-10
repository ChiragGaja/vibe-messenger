const { Worker, Queue } = require('bullmq');
const Redis = require('ioredis');
const pool = require('../config/db');
const cloudinary = require('../config/cloudinary');

let connection = null;
let statusCleanupQueue = null;
let worker = null;

if (process.env.NODE_ENV !== 'test') {
    // Use REDIS_URL or fallback to localhost for development
    connection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
        maxRetriesPerRequest: null, // Required by BullMQ
    });
    
    // Create Queue
    statusCleanupQueue = new Queue('status-cleanup', { connection });

    // Create Worker
    worker = new Worker(
        'status-cleanup',
        async (job) => {
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
                    console.log(`🧹 Worker cleaned up ${ids.length} expired statuses.`);
                }
            } catch (err) {
                console.error('Worker status cleanup error:', err.message);
                throw err;
            }
        },
        { connection }
    );

    worker.on('failed', (job, err) => {
        console.error(`Job ${job.id} failed:`, err.message);
    });
}

// Schedule repeating job if it doesn't exist
async function scheduleStatusCleanup() {
    if (!statusCleanupQueue) return;
    await statusCleanupQueue.add(
        'cleanup-job',
        {},
        {
            repeat: {
                every: 10 * 60 * 1000, // Every 10 minutes
            },
        }
    );
    console.log('✅ Status cleanup job scheduled in BullMQ');
}

module.exports = { scheduleStatusCleanup, statusCleanupQueue, worker };
