#!/usr/bin/env node

/**
 * 前端应用 HTTP 服务器
 * 用于托管编译后的 Vue 应用静态资源
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5173;
const HOST = process.env.HOST || '0.0.0.0';

// 托管静态文件（dist 目录）
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// SPA 路由回落：所有未匹配的路由返回 index.html
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).send('Internal Server Error');
});

// 启动服务器
app.listen(PORT, HOST, () => {
  console.log(`[Online Movie House] 前端应用已启动`);
  console.log(`📺 访问地址: http://${HOST}:${PORT}`);
  console.log(`🔗 后端接口: http://localhost:3000/api`);
  console.log(`🔌 WebSocket: ws://localhost:3000/sync`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('[Server] 收到 SIGTERM 信号，正在关闭...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Server] 收到 SIGINT 信号，正在关闭...');
  process.exit(0);
});
