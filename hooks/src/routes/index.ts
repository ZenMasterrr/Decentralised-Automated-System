import { Router } from 'express';
import authRouter from './auth.routes';
import zapRouter from './zap.routes';
import testZapRouter from './test-zap.routes';
import webhookRouter from './webhook.routes';

const router = Router();


router.use('/auth', authRouter);
router.use('/zaps', zapRouter);
router.use('/test-zap', testZapRouter);
router.use('/webhook', webhookRouter);

export default router;
