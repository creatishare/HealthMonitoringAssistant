import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import logger from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { getCorsOptions, securityHeaders } from './middleware/security.middleware';

// 路由导入
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import healthRecordRoutes from './routes/health-record.routes';
import drugConcentrationRoutes from './routes/drug-concentration.routes';
import medicationRoutes from './routes/medication.routes';
import alertRoutes from './routes/alert.routes';
import ocrRoutes from './routes/ocr.routes';
import dashboardRoutes from './routes/dashboard.routes';
import reportRoutes from './routes/report.routes';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.set('trust proxy', 1);
app.use(securityHeaders);
app.use(cors(getCorsOptions()));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 请求日志
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API路由
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/health-records', healthRecordRoutes);
app.use('/drug-concentrations', drugConcentrationRoutes);
app.use('/medications', medicationRoutes);
app.use('/alerts', alertRoutes);
app.use('/ocr', ocrRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/reports', reportRoutes);

// 404处理
app.use(notFoundHandler);

// 错误处理
app.use(errorHandler);

// 启动服务器
app.listen(PORT, () => {
  logger.info(`服务器启动成功，端口: ${PORT}`);
  logger.info(`环境: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
