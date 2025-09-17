const multer = require("multer")
const path = require("path")
const cloudinary = require("../config/cloudinary")

// Configure multer for memory storage
const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  // Allow images, documents, and audio files
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|mp3|wav|ogg/
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype = allowedTypes.test(file.mimetype)

  if (mimetype && extname) {
    return cb(null, true)
  } else {
    cb(new Error("Invalid file type. Only images, documents, and audio files are allowed."))
  }
}

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter,
})

// Upload to Cloudinary
const uploadToCloudinary = (buffer, originalname, mimetype) => {
  return new Promise((resolve, reject) => {
    const resourceType = mimetype.startsWith("image/") ? "image" : mimetype.startsWith("audio/") ? "video" : "raw"

    cloudinary.uploader
      .upload_stream(
        {
          resource_type: resourceType,
          public_id: `college-chat/${Date.now()}-${originalname}`,
          use_filename: true,
          unique_filename: false,
        },
        (error, result) => {
          if (error) {
            reject(error)
          } else {
            resolve(result)
          }
        },
      )
      .end(buffer)
  })
}

module.exports = {
  upload,
  uploadToCloudinary,
}
