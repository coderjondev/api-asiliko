const { S3Client } = require("@aws-sdk/client-s3");
const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const logger = require("../utils/logger");

const isS3Configured = Boolean(
  process.env.S3_BUCKET &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
);

let s3Client = null;
let upload = null;

if (isS3Configured) {
  s3Client = new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true, // Required for MinIO and some S3-compatible services
  });

  upload = multer({
    storage: multerS3({
      s3: s3Client,
      bucket: process.env.S3_BUCKET,
      metadata: (req, file, cb) => {
        cb(null, {
          fieldName: file.fieldname,
          uploadedBy: req.userId || "anonymous",
          uploadedAt: new Date().toISOString(),
        });
      },
      key: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const fileName = `${req.userId || "anonymous"}/${uniqueSuffix}${ext}`;
        cb(null, fileName);
      },
    }),
    limits: {
      fileSize: (process.env.MAX_FILE_SIZE_MB || 25) * 1024 * 1024, // Default 25MB
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
        "text/plain",
        "text/csv",
        "application/json",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type. Only images, PDFs, and documents are allowed."));
      }
    },
  });

  logger.info("✅ S3 fayl yuklash sozlandi");
} else {
  logger.warn("⚠️ S3 konfiguratsiyasi topilmadi (S3_BUCKET/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY) — fayl yuklash o'chirilgan");
}

// Middleware sifatida ishlatilganda S3 sozlanmagan bo'lsa aniq xato qaytaradi,
// shunda multer o'rniga "undefined is not a function" kabi chalkash xato chiqmaydi.
const uploadOrDisabled = isS3Configured
  ? upload
  : {
      single: () => (req, res) => {
        res.status(503).json({ error: "Fayl yuklash xizmati sozlanmagan (S3 konfiguratsiyasi yo'q)" });
      },
    };

module.exports = {
  s3Client,
  upload: uploadOrDisabled,
  isS3Configured,
};
