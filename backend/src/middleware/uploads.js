const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadsRootPath = path.join(
  __dirname,
  "../../uploads"
);

const documentsUploadsPath = uploadsRootPath;

const investigationUploadsPath = path.join(
  uploadsRootPath,
  "investigations"
);

fs.mkdirSync(documentsUploadsPath, {
  recursive: true,
});

fs.mkdirSync(investigationUploadsPath, {
  recursive: true,
});

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function sanitizeFileName(originalName) {
  const extension = path
    .extname(originalName)
    .toLowerCase();

  const baseName = path
    .basename(originalName, extension)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 100);

  return `${Date.now()}-${Math.round(
    Math.random() * 1e9
  )}-${baseName || "archivo"}${extension}`;
}

function fileFilter(req, file, callback) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return callback(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        "Solo se permiten archivos PDF, JPG, PNG o WEBP"
      )
    );
  }

  callback(null, true);
}

function removeFileIfExists(filePath) {
  if (!filePath) {
    return;
  }

  fs.unlink(filePath, () => {});
}

function removeUploadedFiles(files) {
  if (!files) {
    return;
  }

  if (Array.isArray(files)) {
    files.forEach((file) => {
      removeFileIfExists(file.path);
    });

    return;
  }

  Object.values(files)
    .flat()
    .forEach((file) => {
      removeFileIfExists(file.path);
    });
}

const documentStorage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, documentsUploadsPath);
  },

  filename: (req, file, callback) => {
    try {
      callback(
        null,
        sanitizeFileName(file.originalname)
      );
    } catch (error) {
      callback(error);
    }
  },
});

const documentUpload = multer({
  storage: documentStorage,

  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 4,
  },

  fileFilter,
});

const artifactStorage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, investigationUploadsPath);
  },

  filename: (req, file, callback) => {
    try {
      callback(
        null,
        sanitizeFileName(file.originalname)
      );
    } catch (error) {
      callback(error);
    }
  },
});

const artifactUpload = multer({
  storage: artifactStorage,

  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 1,
  },

  fileFilter,
});

module.exports = {
  documentUpload,
  artifactUpload,
  removeFileIfExists,
  removeUploadedFiles,
};