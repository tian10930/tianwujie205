# 三级项目 AGENTS.md（LLM 应用设计）

## 项目说明
- 选题：Harness Engineering —— 商业评论情感分类，将自然语言评论转化为结构化 JSON。
- 架构：前后端分离。`frontend/` 仅使用原生 HTML/CSS/JavaScript，不引入第三方框架与 CDN；`backend/` 使用 Node.js + Express。
- 后端端口固定为 8205（学号后三位），由 `backend/.env` 的 `PORT` 配置。
- 大模型服务：硅基流动 SiliconFlow，密钥仅保存在 `backend/.env`，不得出现在代码、前端与提交记录中。

## 命名规范
- 所有 CSS 类名、id 名、JS 变量名必须以 `twj_` 前缀开始。

## 约定
- 所有接口以 `/api/` 为前缀，统一响应格式 `{ "code": 0, "msg": "提示信息", "data": {} }`，code 为 0 表示成功。
- 数据库名 `twj_llm_project`，建表 SQL 与测试数据见 `backend/yuan_database.md` 与 `backend/sql/twj_init.sql`。
- 接口变更追加到 `backend/yuan_interface.md`，数据库变更追加到 `backend/yuan_database.md`，开发提示词追加到根目录 `yuanlei_prompt.md`。
- 提交前确认 `.env`、`node_modules` 未被纳入 git。
