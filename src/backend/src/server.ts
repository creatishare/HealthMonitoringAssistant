import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import logger from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

// 路由导入
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import healthRecordRoutes from './routes/health-record.routes';
import drugConcentrationRoutes from './routes/drug-concentration.routes';
import medicationRoutes from './routes/medication.routes';
import alertRoutes from './routes/alert.routes';
import ocrRoutes from './routes/ocr.routes';
import dashboardRoutes from './routes/dashboard.routes';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
