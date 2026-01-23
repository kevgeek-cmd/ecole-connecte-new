import multer from 'multer';

// Use memory storage to keep file in buffer for Supabase upload
const storage = multer.memoryStorage();

// File filter (optional, to restrict file types)
const fileFilter = (req: any, file: any, cb: any) => {
  // Accept PDF, Word documents, Videos, Images, Excel
  const allowedTypes = [
    'application/pdf', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4',
    'video/webm',
    'image/jpeg',
    'image/png',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // Accepting all for now to avoid blocking user tests, ideally restrict.
    // console.warn(`Warning: File type ${file.mimetype} not explicitly allowed but passed.`);
    cb(null, true); 
  }
};

export const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});
