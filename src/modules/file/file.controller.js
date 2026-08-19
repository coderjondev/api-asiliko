const { upload } = require("../../config/s3");
const File = require("../../models/File");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client } = require("../../config/s3");
const logger = require("../../utils/logger");

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = await File.create({
      userId: req.userId,
      originalName: req.file.originalname,
      fileName: req.file.key,
      fileUrl: req.file.location,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      bucket: req.file.bucket,
      key: req.file.key,
      metadata: req.file.metadata,
    });

    logger.info(`User ${req.userId} uploaded file ${file._id}`);
    res.status(201).json(file);
  } catch (error) {
    logger.error("File upload error:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
};

exports.getFiles = async (req, res) => {
  try {
    const { page = 1, limit = 20, mimeType } = req.query;

    const filter = { userId: req.userId };
    if (mimeType) filter.mimeType = new RegExp(mimeType, "i");

    const files = await File.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await File.countDocuments(filter);

    res.json({
      files,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    logger.error("Get files error:", error);
    res.status(500).json({ error: "Failed to fetch files" });
  }
};

exports.getFile = async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.fileId,
      userId: req.userId,
    });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    res.json(file);
  } catch (error) {
    logger.error("Get file error:", error);
    res.status(500).json({ error: "Failed to fetch file" });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.fileId,
      userId: req.userId,
    });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Delete from S3
    const deleteCommand = new DeleteObjectCommand({
      Bucket: file.bucket,
      Key: file.key,
    });

    await s3Client.send(deleteCommand);

    // Delete from database
    await File.deleteOne({ _id: file._id });

    logger.info(`User ${req.userId} deleted file ${file._id}`);
    res.json({ message: "File deleted successfully" });
  } catch (error) {
    logger.error("Delete file error:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
};

exports.getFileStats = async (req, res) => {
  try {
    const stats = await File.aggregate([
      { $match: { userId: req.userId } },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: "$fileSize" },
        },
      },
    ]);

    const byType = await File.aggregate([
      { $match: { userId: req.userId } },
      {
        $group: {
          _id: "$mimeType",
          count: { $sum: 1 },
          totalSize: { $sum: "$fileSize" },
        },
      },
    ]);

    res.json({
      overall: stats[0] || { totalFiles: 0, totalSize: 0 },
      byType,
    });
  } catch (error) {
    logger.error("Get file stats error:", error);
    res.status(500).json({ error: "Failed to fetch file stats" });
  }
};
