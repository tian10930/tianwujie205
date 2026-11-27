# 商业评论情感分析 Supabase 数据库文档

> 作者：田武杰　日期：2026-11-27　数据库：Supabase（PostgreSQL）
> 建表脚本：`supabase/twj_init.sql`（含 RLS 策略与模拟数据）

## 1. 数据表总览

| 表名 | 说明 | 关系 |
| --- | --- | --- |
| `twj_reviews` | 商业评论原文表 | 1 : N → twj_analysis_results |
| `twj_analysis_results` | 情感分析结果表（大模型结构化输出） | N : 1 → twj_reviews；1 : N → twj_analysis_aspects |
| `twj_analysis_aspects` | 评论维度明细表（口味/物流/服务…） | N : 1 → twj_analysis_results |

## 2. 表结构与字段说明

### 2.1 twj_reviews（评论原文表）

| 字段 | 类型 | 约束/默认值 | 说明 |
| --- | --- | --- | --- |
| id | bigint | 主键，自增 identity | 评论 id |
| content | text | NOT NULL | 评论原文（中文，2000 字以内） |
| merchant | varchar(100) | NOT NULL，默认 '未知商家' | 被评价的商家或商品名称 |
| platform | varchar(50) | NOT NULL，默认 'unknown' | 评论来源平台：taobao / jd / pdd / tmall / douyin |
| created_at | timestamptz | NOT NULL，默认 now() | 评论提交时间 |

### 2.2 twj_analysis_results（情感分析结果表）

| 字段 | 类型 | 约束/默认值 | 说明 |
| --- | --- | --- | --- |
| id | bigint | 主键，自增 identity | 分析结果 id |
| review_id | bigint | NOT NULL，外键 → twj_reviews.id，级联删除 | 关联的评论 id |
| sentiment | varchar(10) | NOT NULL，check ∈ positive/neutral/negative | 情感极性 |
| confidence | numeric(4,3) | NOT NULL，check 0~1 | 置信度 |
| entities | jsonb | NOT NULL，默认 [] | 实体数组 `[{"name":"实体名","type":"product"}]` |
| summary | varchar(255) | 可空 | 一句话中文摘要 |
| need_review | boolean | NOT NULL，默认 false | 置信度低于 0.8 时为 true，需人工复核 |
| model_name | varchar(100) | NOT NULL，默认 'glm-5.3-flash' | 产生结果的大模型名称 |
| created_at | timestamptz | NOT NULL，默认 now() | 分析时间 |

### 2.3 twj_analysis_aspects（评论维度明细表）

| 字段 | 类型 | 约束/默认值 | 说明 |
| --- | --- | --- | --- |
| id | bigint | 主键，自增 identity | 维度记录 id |
| result_id | bigint | NOT NULL，外键 → twj_analysis_results.id，级联删除 | 关联的分析结果 id |
| aspect_name | varchar(50) | NOT NULL | 维度名称：口味、物流、服务、质量… |
| aspect_sentiment | varchar(10) | NOT NULL，check ∈ positive/neutral/negative | 该维度的情感极性 |
| created_at | timestamptz | NOT NULL，默认 now() | 创建时间 |

## 3. RLS 策略（行级安全）

三张表均 `ENABLE` + `FORCE` row level security，策略完全一致：

| 策略名 | 作用对象 | 操作 | 角色 | 效果 |
| --- | --- | --- | --- | --- |
| `twj_allow_anon_read_*` | 对应表 | SELECT | `anon` | 匿名用户（前端 anon key）可读 |
| `twj_service_write_*` | 对应表 | ALL | `service_role` | 仅服务端密钥可写（insert/update/delete） |

前端使用 anon key 只能查询；写入、修改、删除会被 RLS 拦截（403），必须用 service_role 在服务端进行。

## 4. REST 接口路径（PostgREST）

- 基地址：`https://uvnnsqacwmqkacfjlocy.supabase.co/rest/v1`
- 必带请求头（前端 anon key，从 Dashboard → Settings → API 获取）：

```text
apikey: <SUPABASE_ANON_KEY>
Authorization: Bearer <SUPABASE_ANON_KEY>
```

### 4.1 查询评论列表（匿名可读）

```text
GET /rest/v1/twj_reviews?select=*&order=created_at.desc&limit=50
```

### 4.2 查询分析结果（匿名可读）

```text
GET /rest/v1/twj_analysis_results?select=*&order=created_at.desc
```

带条件查询（如只看负面且需复核）：

```text
GET /rest/v1/twj_analysis_results?select=*&sentiment=eq.negative&need_review=eq.true
```

### 4.3 查询维度明细（匿名可读）

```text
GET /rest/v1/twj_analysis_aspects?select=*&order=aspect_name.asc
```

### 4.4 外键嵌套查询（一次拿全：结果 + 评论原文 + 维度，前端主接口）

```text
GET /rest/v1/twj_analysis_results?select=id,sentiment,confidence,need_review,summary,entities,model_name,created_at,review:twj_reviews(content,merchant,platform),aspects:twj_analysis_aspects(aspect_name,aspect_sentiment)&order=created_at.desc
```

### 4.5 统计总数（匿名可读，用于情感统计）

```text
HEAD /rest/v1/twj_analysis_results?select=*&sentiment=eq.positive
Prefer: count=exact
→ 响应头 Content-Range: 0-2/3   （3 即正面数量）
```

### 4.6 写入（仅 service_role，前端禁止）

```text
POST /rest/v1/twj_reviews
apikey: <SERVICE_ROLE_KEY>            # 只能放在后端/服务端
Authorization: Bearer <SERVICE_ROLE_KEY>
Content-Type: application/json

{ "content": "快递很快，客服也很耐心。", "merchant": "示例商品", "platform": "taobao" }
```

## 5. 前端对接约定

- 前端只用原生 HTML/CSS/JavaScript，不引入任何第三方库、框架、CDN。
- 目录结构：

```text
frontend/
├── index.html          # 系统首页
├── records.html        # 历史记录页（读 Supabase REST）
├── css/twj_style.css   # 样式
├── js/twj_config.js    # Supabase 地址与 anon key 配置
├── js/twj_records.js   # 数据请求与渲染逻辑
├── fonts/              # iconfont 图标文件（如有）
└── images/             # 图片资源（如有）
```

- Supabase REST 返回 JSON 数组，前端 `fetch` 后直接 `Array.map` 渲染。
- 命名规范：所有 CSS 类名、id 名、JS 变量名以 `twj_` 前缀开始。
