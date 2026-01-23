import { Request, Response } from 'express';

export default function handler(req: Request, res: Response) {
  res.status(200).json({ 
    message: "Health check passed",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
}
