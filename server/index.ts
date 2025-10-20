import type {NextFunction, Request, Response} from 'express';
import express from 'express';
import {SERVER_CONFIG} from './config';
import {optionalAuth, requireAdmin} from './middleware/auth-middleware';
import {closeDatabase, initDatabase} from './db/database';
import recordingsRouter from './routes/recordings';
import recordingsListRouter from './routes/recordings-list';
import recordingsStreamRouter from './routes/recordings-stream';
import adminUsersRouter from './routes/admin-users';
import adminRecordingsRouter from './routes/admin-recordings';

// initialize database
initDatabase();

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

// apply optional auth middleware to stream and list routes
app.use('/api/stream', optionalAuth);
app.use('/api/recordings-list', recordingsListRouter);

// register streaming routes
app.use('/api/stream', recordingsStreamRouter);

// register admin routes (require admin auth)
app.use('/api/admin/users', adminUsersRouter);
app.use('/api/admin/recordings', adminRecordingsRouter);

// register scheduling routes (require admin auth)
app.use('/api', requireAdmin, recordingsRouter);

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
    closeDatabase();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
    closeDatabase();
  process.exit(0);
});
