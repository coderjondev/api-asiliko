const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../../middlewares/auth");
const { upload } = require("../../config/s3");
const {
  uploadFile,
  getFiles,
  getFile,
  deleteFile,
  getFileStats,
} = require("./file.controller");

router.post("/upload", authenticateToken, upload.single("file"), uploadFile);
router.get("/", authenticateToken, getFiles);
router.get("/stats", authenticateToken, getFileStats);
router.get("/:fileId", authenticateToken, getFile);
router.delete("/:fileId", authenticateToken, deleteFile);

module.exports = router;
