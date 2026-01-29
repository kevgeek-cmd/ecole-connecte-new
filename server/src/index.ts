import http from 'http';
import { Server } from 'socket.io';
import app from "./app.js";
import { setupSocket } from "./socket/index.js";

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

setupSocket(io);

// Only listen if not running in Vercel/Serverless environment
if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

export default app;
