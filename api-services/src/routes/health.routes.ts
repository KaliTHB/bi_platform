// api-services/src/routes/health.routes.ts
import { Router } from 'express';
import { HealthController } from '../controllers/HealthController';

const router = Router();
const healthController = new HealthController();

router.get('/', healthController.checkHealth);

export default router;