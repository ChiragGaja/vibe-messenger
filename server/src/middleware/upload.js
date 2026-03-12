const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        let folder = 'chat_app_uploads';
        let resourceType = 'auto';

        // Determine resource type based on mime
        if (file.mimetype.startsWith('image/')) {
            resourceType = 'image';
            folder = 'chat_app_uploads/images';
        } else if (file.mimetype.startsWith('video/')) {
            resourceType = 'video';
            folder = 'chat_app_uploads/videos';
        } else if (file.mimetype.startsWith('audio/')) {
            resourceType = 'video'; // Cloudinary treats audio under the 'video' resource_type 
            folder = 'chat_app_uploads/audio';
        } else {
            resourceType = 'raw';
            folder = 'chat_app_uploads/documents';
        }

        const cloudinaryParams = {
            folder,
            resource_type: resourceType,
            public_id: `${Date.now()}-${file.originalname.replace(/\.[^.]+$/, '')}`,
        };

        if (resourceType === 'video') {
            if (req.body.startOffset) cloudinaryParams.start_offset = Number(req.body.startOffset);
            if (req.body.duration) cloudinaryParams.duration = Number(req.body.duration);
        }

        return cloudinaryParams;
    },
});

const fileFilter = (req, file, cb) => {
    // Allowed mime types
    const allowedTypes = [
        // Images
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        // Videos
        'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
        // Audio
        'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/x-m4a',
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip',
        'application/x-rar-compressed',
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type ${file.mimetype} is not supported.`), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
    },
});

module.exports = upload;
