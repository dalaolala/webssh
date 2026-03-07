const path = require('path');
const fs = require('fs');

// 修改 server.js,支持 Electron 环境
const serverPath = path.join(__dirname, 'server.js');
let serverContent = fs.readFileSync(serverPath, 'utf8');

// 替换 cors 配置,支持 Electron 加载
serverContent = serverContent.replace(
  'origin: "http://localhost:5173"',
  'origin: "*"'
);

// 替换静态文件路径
serverContent = serverContent.replace(
  "app.use(express.static(path.join(__dirname, '../frontend/dist')));",
  "app.use(express.static(path.join(__dirname, '../../frontend/dist')));"
);

serverContent = serverContent.replace(
  "app.use(express.static(path.join(__dirname, '../frontend/dist')));",
  "app.use(express.static(path.join(__dirname, '../../frontend/dist')));"
);

serverContent = serverContent.replace(
  "res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));",
  "res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));"
);

fs.writeFileSync(serverPath, serverContent);
console.log('server.js 已更新以支持 Electron');
