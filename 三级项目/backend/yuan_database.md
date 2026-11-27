# 数据库设计（yuan_database.md）

数据库名：`twj_llm_project`，字符集 `utf8mb4`。建库建表与测试数据脚本见 `backend/sql/twj_init.sql`，仅凭本文件与该脚本即可重建数据库。

执行方式：

```bash
mysql -u root -p < backend/sql/twj_init.sql
```

## 表 1：twj_reviews（评论原文表）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | INT AUTO_INCREMENT PK | 主键 |
| content | TEXT NOT NULL | 评论原文 |
| created_at | DATETIME | 提交时间，默认当前时间 |

## 表 2：twj_analysis_results（分析结果表）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | INT AUTO_INCREMENT PK | 主键 |
| review_id | INT NOT NULL FK | 关联 twj_reviews.id，级联删除 |
| sentiment | VARCHAR(10) NOT NULL | positive / neutral / negative |
| confidence | DECIMAL(4,2) | 置信度 0~1 |
| aspects | JSON | 评论维度数组，如 ["物流","包装"] |
| entities | JSON | 实体数组，如 [{"name":"某品牌","type":"brand"}] |
| summary | VARCHAR(255) | 一句话摘要 |
| need_review | TINYINT(1) | 置信度 < 0.6 时置 1 |
| created_at | DATETIME | 分析时间 |

## 测试数据（8 条）

随 `twj_init.sql` 写入 8 条评论及对应示例分析结果（1 正面、2 负面、4 中性、1 正面等混合），保证未调用模型时历史页也可演示。示例：

```sql
INSERT INTO twj_reviews (content) VALUES ('这家店的酸奶特别好喝，包装也很结实，就是快递慢了两天。');
INSERT INTO twj_analysis_results (review_id, sentiment, confidence, aspects, entities, summary, need_review)
VALUES (1, 'positive', 0.90, '["口味","包装","物流"]', '[{"name":"某品牌酸奶","type":"product"}]', '整体满意，物流较慢。', 0);
```

## 变更记录

- 2026-11-27：建立 twj_reviews、twj_analysis_results 两表并写入 8 条测试数据。
