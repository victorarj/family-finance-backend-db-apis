export default function internalApiAuth(req, res, next) {
  const internalSecret = process.env.INTERNAL_API_SECRET;
  const providedSecret = req.header("x-internal-api-secret");

  if (!internalSecret || providedSecret !== internalSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}
