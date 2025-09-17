const { uploadToCloudinary } = require("../middleware/upload")

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" })
    }

    const { buffer, originalname, mimetype, size } = req.file

    // Upload to Cloudinary
    const result = await uploadToCloudinary(buffer, originalname, mimetype)

    res.json({
      success: true,
      file: {
        url: result.secure_url,
        publicId: result.public_id,
        originalName: originalname,
        size,
        mimetype,
        uploadedAt: new Date(),
      },
    })
  } catch (error) {
    console.error("File upload error:", error)
    res.status(500).json({ message: "File upload failed" })
  }
}

module.exports = {
  uploadFile,
}
