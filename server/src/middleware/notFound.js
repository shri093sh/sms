export function notFoundHandler(req, res) {
  res.status(404).json({ message: `No route: ${req.method} ${req.originalUrl}` });
}
