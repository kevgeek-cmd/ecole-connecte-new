// Simple health check without external imports to debug Vercel
export default function handler(req, res) {
  res.status(200).json({
    status: "ok",
    message: "Server is running!",
    timestamp: new Date().toISOString()
  });
}
