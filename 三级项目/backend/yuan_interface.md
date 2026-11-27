﻿﻿﻿# 接口清单（yuan_interface.md）

统一响应格式：`{ "code": 0, "msg": "提示信息", "data": {} }`，`code` 为 0 表示成功，非 0 表示失败。
所有接口以 `/api/` 为前缀，后端端口 `8205`（学号后三位）。凭据保存在 `backend/.env`，前端不接触密钥。

## 1. POST /api/ai/chat —— 基础对话代理

| 项目 | 说明 |
| --- | --- |
| 方法 | POST |
| 请求体 | `{ "messages": [{ "role": "system", "content": "..." }, { "role": "user", "content": "你好" }] }` |
| 成功响应 | `{ "code": 0, "msg": "ok", "data": "模型回复文本" }` |
| 失败响应 | `{ "code": 5001, "msg": "大模型调用失败：<原因>", "data": null }` |

curl 示例：

```bash
curl -X POST http://localhost:8205/api/ai/chat -H "Content-Type: application/json" -d "{\"messages\":[{\"role\":\"user\",\"content\":\"你好\"}]}"
```

## 2. POST /api/ai/analyze —— 商业评论情感分类（核心）

| 项目 | 说明 |
| --- | --- |
| 方法 | POST |
| 请求体 | `{ "text": "这家店的酸奶特别好喝，就是快递慢了两天。" }` |
| 约束 | text 非空且 ≤ 2000 字；后端 temperature=0.2，最多重试 3 次，失败返回兜底结果 |

成功响应示例：

```json
{
  "code": 0,
  "msg": "ok",
  "data": {
    "sentiment": "positive",
    "confidence": 0.9,
    "aspects": ["口味", "包装", "物流"],
    "entities": [{ "name": "某品牌酸奶", "type": "product" }],
    "summary": "整体满意，物流较慢。",
    "need_review": false,
    "attempts": 1
  }
}
```

错误码：`1002` 文本为空；`1003` 超长；`5001` 大模型调用失败。

## 3. GET /api/records?limit=50 —— 查询历史记录

| 项目 | 说明 |
| --- | --- |
| 方法 | GET |
| 查询参数 | limit（默认 50，最大 200） |
| 成功响应 | `{ "code": 0, "msg": "ok", "data": [{ "id": 1, "content": "...", "created_at": "...", "sentiment": "positive", "confidence": 0.9, "aspects": [...], "entities": [...], "summary": "...", "need_review": false }] }` |
| 失败响应 | `{ "code": 6001, "msg": "数据库查询失败：<原因>", "data": null }` |

## 4. POST /api/records —— 保存分析记录

| 项目 | 说明 |
| --- | --- |
| 方法 | POST |
| 请求体 | `{ "content": "评论原文", "result": { sentiment, confidence, aspects, entities, summary, need_review } }` |
| 成功响应 | `{ "code": 0, "msg": "已保存", "data": { "review_id": 9 } }` |
| 失败响应 | `{ "code": 6002, "msg": "数据库写入失败：<原因>", "data": null }` |

## 5. DELETE /api/records/:id —— 删除记录（级联删除结果）

| 项目 | 说明 |
| --- | --- |
| 方法 | DELETE |
| 成功响应 | `{ "code": 0, "msg": "已删除", "data": { "id": 9 } }` |
| 失败响应 | `{ "code": 6003, "msg": "记录不存在", "data": null }` |

## 变更记录

- 2026-11-27：建立 5 个接口，覆盖基础代理、结构化分析（Harness Engineering）与历史记录增删查。
