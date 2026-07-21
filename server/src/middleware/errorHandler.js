import { AppError } from "../utils/errors.js";

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    const body = { message: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }

  // multer (CSV import uploads) — file-too-large, too-many-files, etc.
  if (err.name === "MulterError") {
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }

  // Prisma known-request errors (e.g. unique constraint violations) get a
  // friendlier 409 instead of leaking a 500 with raw Prisma internals.
  if (err.code === "P2002") {
    return res.status(409).json({ message: "A record with this value already exists." });
  }
  if (err.code === "P2025") {
    return res.status(404).json({ message: "Record not found." });
  }

  console.error(err);
  res.status(500).json({ message: "Internal server error" });
}
