import express from 'express';
import type {Request, Response, NextFunction} from 'express';
import {SERVER_CONFIG} from './config';
import {authMiddleware} from './middleware/auth-middleware';
import recordingsRouter from './routes/recordings';

const app = express();

// request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// body parser
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// health check endpoint (no auth required)
app.get('/api/health', (req: Request, res: Response) => {
  res.json({status: 'ok', timestamp: new Date().toISOString()});
});

// apply authentication middleware to all /api routes except health check
app.use('/api', authMiddleware);

// register routes
app.use('/api', recordingsRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({error: 'not found'});
});

// error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('unhandled error:', err);
  res.status(500).json({error: 'internal server error'});
});

// start server
const port = SERVER_CONFIG.port;
app.listen(port, () => {
  console.log(`recordings API server running on port ${port}`);
  console.log(`environment: ${process.env.NODE_ENV || 'development'}`);
});

// graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
