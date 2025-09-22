const multer = require("multer");
const path = require("path");
const cloudinary = require("../config/cloudinary");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|mp3|wav|ogg|mp4|mov|avi/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Invalid file type."));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter,
});

const uploadToCloudinary = (buffer, originalname, mimetype) => {
  return new Promise((resolve, reject) => {
    
    let options = {
        resource_type: "auto",
        public_id: `college-chat/${Date.now()}-${path.parse(originalname).name}`,
        folder: "college-chat",
    };

    if (mimetype.startsWith("image/")) {
        options.quality = "auto:good";
        options.fetch_format = "auto";
    }
    
    if (mimetype === 'application/pdf') {
        options.quality = "auto:good";
    }

    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
        if (error) {
            return reject(error);
        }
        resolve(result);
    });

    stream.end(buffer);
  });
};

module.exports = {
  upload,
  uploadToCloudinary,
};