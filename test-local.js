#!/usr/bin/env node
/**
 * 本地测试脚本 - 验证应用基本功能
 * 无需 PostgreSQL/Redis，仅验证编译和基本逻辑
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 开始本地测试...\n');

const tests = [];

// 测试 1: 检查文件结构
tests.push({
  name: '文件结构检查',
  run: () => {
    const requiredFiles = [
      'src/backend/package.json',
      'src/frontend/package.json',
      'src/backend/prisma/schema.prisma',
      'infrastructure/docker/docker-compose.yml',
    ];

    for (const file of requiredFiles) {
      const fullPath = path.join(__dirname, file);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`缺少文件: ${file}`);
      }
    }
    return '所有必要文件存在';
  }
});

// 测试 2: 后端 TypeScript 编译
tests.push({
  name: '后端 TypeScript 编译',
  run: () => {
    try {
      execSync('cd src/backend && npx tsc --noEmit', {
        cwd: __dirname,
        stdio: 'pipe'
      });
      return '编译成功，无类型错误';
    } catch (e) {
      throw new Error(`编译失败: ${e.message}`);
    }
  }
});

// 测试 3: 前端 TypeScript 编译
tests.push({
  name: '前端 TypeScript 编译',
  run: () => {
    try {
      execSync('cd src/frontend && npx tsc --noEmit', {
        cwd: __dirname,
        stdio: 'pipe'
      });
      return '编译成功，无类型错误';
    } catch (e) {
      throw new Error(`编译失败: ${e.message}`);
    }
  }
});

// 测试 4: 前端生产构建
tests.push({
  name: '前端生产构建',
  run: () => {
    try {
      execSync('cd src/frontend && npm run build', {
        cwd: __dirname,
        stdio: 'pipe',
        timeout: 120000
      });
      const distPath = path.join(__dirname, 'src/frontend/dist');
      if (!fs.existsSync(distPath)) {
        throw new Error('构建后 dist 目录不存在');
      }
      return '构建成功';
    } catch (e) {
      throw new Error(`构建失败: ${e.message}`);
    }
  }
});

// 测试 5: 检查 Docker 配置
tests.push({
  name: 'Docker 配置检查',
  run: () => {
    const composePath = path.join(__dirname, 'infrastructure/docker/docker-compose.yml');
    const content = fs.readFileSync(composePath, 'utf-8');

    const requiredServices = ['postgres', 'redis', 'backend', 'worker', 'web'];
    for (const service of requiredServices) {
      if (!content.includes(`${service}:`)) {
        throw new Error(`docker-compose.yml 缺少服务: ${service}`);
      }
    }
    return `包含所有必要服务: ${requiredServices.join(', ')}`;
  }
});

// 运行所有测试
let passed = 0;
let failed = 0;

for (const test of tests) {
  process.stdout.write(`⏳ ${test.name}... `);
  try {
    const result = test.run();
    console.log(`✅ ${result}`);
    passed++;
  } catch (e) {
    console.log(`❌ ${e.message}`);
    failed++;
  }
}

console.log(`\n📊 测试结果: ${passed} 通过, ${failed} 失败`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 所有测试通过！应用已准备就绪。');
  console.log('\n下一步建议:');
  console.log('  1. 部署到阿里云进行完整测试');
  console.log('  2. 或使用 "docker-compose up" 在支持 Docker 的环境运行');
  process.exit(0);
}
