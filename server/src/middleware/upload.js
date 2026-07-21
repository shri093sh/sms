import multer from "multer";
import { ValidationError } from "../utils/errors.js";

// Memory storage — files are small (student/staff rosters, not media) and
// we only need the buffer briefly to parse CSV text, so there's no
// benefit to touching disk.
const storage = multer.memoryStorage();

function csvFileFilter(req, file, cb) {
  const isCsv = file.mimetype === "text/csv" || file.originalname.toLowerCase().endsWith(".csv");
  if (!isCsv) return cb(new ValidationError("Only .csv files are accepted"));
  cb(null, true);
}

export const uploadCsv = multer({
  storage,
  fileFilter: csvFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB — generous for a text roster file
});
