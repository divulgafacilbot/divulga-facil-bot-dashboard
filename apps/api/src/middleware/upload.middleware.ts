import multer from 'multer';

const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  }
});

/**
 * Middleware for single image upload
 */
export const uploadSingleImage = uploadMiddleware.single('image');

/**
 * Error handler for multer errors
 */
export function handleUploadError(err: any, req: any, res: any, next: any) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large. Maximum size is 5MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files. Only 1 file allowed.'
      });
    }
    return res.status(400).json({
      error: `Upload error: ${err.message}`
    });
  }

  if (err) {
    return res.status(400).json({
      error: err.message || 'Upload failed'
    });
  }

  next();
}
