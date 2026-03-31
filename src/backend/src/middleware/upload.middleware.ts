import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import logger from '../utils/logger';

// 确保上传目录存在
const uploadDir = path.join(process.cwd(), 'uploads', 'ocr');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  logger.info(`创建上传目录: ${uploadDir}`);
}

// 配置存储
const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, uploadDir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // 生成唯一文件名: timestamp-random.ext
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `ocr-${uniqueSuffix}${ext}`);
  },
});

// 文件过滤 - 只接受图片
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件 (JPG, PNG, WebP)'));
  }
};

// 配置 multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 限制
    files: 1, // 每次只允许上传1个文件
  },
});

// 错误处理中间件
export function handleUploadError(error: Error, _req: Request, _res: any, next: any) {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(new Error('文件大小超过限制 (最大10MB)'));
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new Error('字段名错误，请使用 "image" 作为文件字段名'));
    }
    return next(new Error(`上传错误: ${error.message}`));
  }
  next(error);
}
