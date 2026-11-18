/*
  作者：田武杰
  建立时间：2026-11-13
  使用大模型：DeepSeek-V4.1-Flash
  功能名称：诗词数据服务器（Express，本地接口 /api/poems，端口 3004）
*/
const express = require('express');
const path = require('path');
const fs = require('fs');

// twj_port：服务端口，若遇到 EADDRINUSE 端口被占用，改成 3005 等，并同步改 poems.html 里的请求地址
const twj_port = 3004;

const app = express();

// twj_dbPath：db.json 的绝对路径，保证从任意目录启动服务都能读到同一份数据
const twj_dbPath = path.join(__dirname, 'db.json');

// twj_poems：服务启动时读取一次 db.json，取出 poems 数组放在内存里，之后都返回这份数据（改数据后需重启服务）
const twj_poems = JSON.parse(fs.readFileSync(twj_dbPath, 'utf8')).poems;

// 放行跨域请求，前端直接用 file:// 或 Live Server 打开时也能取到数据
app.use(function (twjReq, twjRes, twjNext) {
  twjRes.setHeader('Access-Control-Allow-Origin', '*');
  twjNext();
});

// 提供数据接口：GET /api/poems 返回 poems 数组（字段为 pic、title、content、author）
app.get('/api/poems', function (twjReq, twjRes) {
  twjRes.json(twj_poems);
});

// 第二个接口：GET /api/authors 返回作者列表，按诗作数量从多到少排序
app.get('/api/authors', function (twjReq, twjRes) {
  // twj_countMap：统计每位诗人名下有几首诗
  const twj_countMap = {};
  twj_poems.forEach(function (twjPoem) {
    const twjName = twjPoem.author || '佚名';
    twj_countMap[twjName] = (twj_countMap[twjName] || 0) + 1;
  });

  const twjAuthors = Object.keys(twj_countMap).map(function (twjName) {
    return { name: twjName, count: twj_countMap[twjName] };
  });

  twjAuthors.sort(function (twjA, twjB) {
    return twjB.count - twjA.count;
  });

  twjRes.json(twjAuthors);
});

// 启动服务并打印接口地址，方便在浏览器里直接验证
const twjServer = app.listen(twj_port, function () {
  console.log('数据服务器已启动：http://localhost:' + twj_port + '/api/poems');
});

// 端口被占用时给出明确提示，避免只看到一长串报错
twjServer.on('error', function (twjErr) {
  if (twjErr.code === 'EADDRINUSE') {
    console.log('端口 ' + twj_port + ' 已被占用：先关闭上次的 node 进程，或把 twj_port 改成 3005 后重启');
  } else {
    console.log('服务启动失败：' + twjErr.message);
  }
});
