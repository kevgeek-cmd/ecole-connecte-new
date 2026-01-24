import app from "./app.js";

const PORT = process.env.PORT || 3000;

// Only listen if not running in Vercel/Serverless environment
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

export default app;
