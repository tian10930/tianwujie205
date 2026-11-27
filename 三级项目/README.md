﻿﻿﻿# 商业评论情感分析系统（LLM 应用设计 三级项目）

选题方向：**Harness Engineering** —— 将商业评论自然语言转化为结构化 JSON（情感分类 + 维度抽取 + 实体抽取）。

## 系统架构

```
浏览器页面（frontend/ 原生 HTML/CSS/JS）
    ↓ fetch /api/ai/analyze
Express 中间层（backend/，端口 8205（学号后三位），保管 API Key、校验重试、统一响应）
    ↓ chat/completions
大模型服务（硅基流动 SiliconFlow）
    ↓ 结构化 JSON
MySQL 8.0（twj_reviews / twj_analysis_results）
```

## 功能清单

- 评论情感分类：positive / neutral / negative + 置信度
- 评论维度抽取（aspects）与实体识别（entities）
- 一句话摘要 + 低置信度自动标记人工复核
- JSON 解析、字段与类型校验，不合规自动重试（最多 3 次），兜底结果
- 历史记录：MySQL 持久化、列表、情感统计、删除
- 前端所有请求/响应输出到浏览器控制台；服务端打印请求体与模型返回

## 环境要求

- Node.js 24 及以上
- MySQL 8.0
- 硅基流动（SiliconFlow）API Key

## 启动步骤

1. 导入数据库：`mysql -u root -p < backend/sql/twj_init.sql`
2. 配置密钥：编辑 `backend/.env`，填入 `LLM_API_KEY` 与 `DB_PASSWORD`
3. 安装依赖并启动：

```bash
cd backend
npm install
npm start
```

4. 浏览器访问 `http://localhost:8205`

## 配置项（backend/.env）

| 变量 | 说明 |
| --- | --- |
| PORT | 后端端口，默认 8205 |
| LLM_API_KEY | 硅基流动 API Key（勿提交 git） |
| LLM_BASE_URL | 大模型接口基础地址 |
| LLM_MODEL | 模型名，默认 deepseek-ai/DeepSeek-V3 |
| DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME | MySQL 连接信息 |

## 目录结构

```
三级项目/
├── AGENTS.md            项目规范
├── README.md            本文件
├── yuanlei_prompt.md    开发提示词记录
├── frontend/            原生前端（index / analyze / records）
└── backend/
    ├── server.js        入口（日志、静态托管、路由）
    ├── routes/twj_ai.js       /api/ai/chat、/api/ai/analyze
    ├── routes/twj_records.js  /api/records 增删查
    ├── twj_db.js        MySQL 连接池
    ├── sql/twj_init.sql 建库建表 + 8 条测试数据
    ├── yuan_interface.md 接口清单
    └── yuan_database.md  数据库设计
```

## 相关文档

- 接口清单：`backend/yuan_interface.md`
- 数据库设计：`backend/yuan_database.md`
- 提示词记录：`yuanlei_prompt.md`
