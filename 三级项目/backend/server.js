// 服务入口：加载环境变量，挂载请求日志、路由与前端静态资源
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const twj_aiRoutes = require('./routes/twj_ai');
const twj_recordRoutes = require('./routes/twj_records');

const twj_app = express();
const twj_port = Number(process.env.PORT) || 8325;

// 允许所有来源跨域，便于前端本地调试
twj_app.use(cors());
twj_app.use(express.json({ limit: '1mb' }));

// 请求日志：打印方法、路径与请求体，便于取证与调试
twj_app.use((twj_req, twj_res, twj_next) => {
  console.log(`[${new Date().toLocaleString()}] ${twj_req.method} ${twj_req.url}`);
  if (twj_req.method === 'POST' && twj_req.body) {
    console.log('请求体：', JSON.stringify(twj_req.body).slice(0, 800));
  }
  twj_next();
});

// 托管前端静态页面
twj_app.use(express.static(path.join(__dirname, '../frontend')));

// 业务路由
twj_app.use('/api/ai', twj_aiRoutes);
twj_app.use('/api', twj_recordRoutes);

// 统一 404 兜底
twj_app.use((twj_req, twj_res) => {
  twj_res.json({ code: 4004, msg: '接口不存在：' + twj_req.url, data: null });
});

twj_app.listen(twj_port, () => {
  console.log(`服务已启动：http://localhost:${twj_port}`);
  console.log('配置检查：模型=' + (process.env.LLM_MODEL || '未配置')
    + '，密钥=' + (process.env.LLM_API_KEY ? '已配置' : '未配置！')
    + '，数据库=' + (process.env.DB_NAME || '未配置'));
});
