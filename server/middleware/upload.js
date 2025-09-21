// server/middleware/upload.js (UPDATED)

const multer = require("multer");
const path = require("path");
const cloudinary = require("../config/cloudinary");

// Configure multer for memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allow images, documents, and audio files
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|mp3|wav|ogg|mp4|mov|avi/; // Video types bhi add kar do
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images, documents, audio and video files are allowed."));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // Limit 25MB kar dete hain
  },
  fileFilter,
});

// Upload to Cloudinary
const uploadToCloudinary = (buffer, originalname, mimetype) => {
  return new Promise((resolve, reject) => {
    // <<< --- YEH HAI SABSE ZAROORI BADLAAV --- >>>
    // Hum `resource_type` ko 'auto' set kar denge.
    // Isse Cloudinary file ko dekh kar khud decide karega ki yeh image hai, video hai, ya raw file hai.
    // Yeh sabhi types ko by default publically accessible bana dega.
    const resourceType = "auto";

    cloudinary.uploader
      .upload_stream(
        {
          resource_type: resourceType,
          public_id: `college-chat/${Date.now()}-${originalname}`,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        },
      )
      .end(buffer);
  });
};

module.exports = {
  upload,
  uploadToCloudinary,
};