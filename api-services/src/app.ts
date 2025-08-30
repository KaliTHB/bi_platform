// File: api-services/src/app.ts - Add this to your existing app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { pluginRoutes } from './routes/pluginRoutes';

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Plugin routes
app.use('/api/plugins', pluginRoutes);

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: { 
      code: 'INTERNAL_ERROR', 
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
    }
  });
});

export { app };