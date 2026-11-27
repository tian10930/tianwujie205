-- 三级项目数据库初始化脚本：商业评论情感分类（Harness Engineering）
-- 数据库：twj_llm_project  字符集：utf8mb4
-- 执行方式：mysql -u root -p < twj_init.sql

CREATE DATABASE IF NOT EXISTS twj_llm_project DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE twj_llm_project;

-- 评论原文表
CREATE TABLE IF NOT EXISTS twj_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
  content TEXT NOT NULL COMMENT '评论原文',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间'
) ENGINE=InnoDB COMMENT='商业评论原文表';

-- 结构化分析结果表
CREATE TABLE IF NOT EXISTS twj_analysis_results (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
  review_id INT NOT NULL COMMENT '关联评论id',
  sentiment VARCHAR(10) NOT NULL COMMENT '情感极性 positive/neutral/negative',
  confidence DECIMAL(4,2) NOT NULL COMMENT '置信度0~1',
  aspects JSON COMMENT '评论维度数组',
  entities JSON COMMENT '实体数组[{name,type}]',
  summary VARCHAR(255) COMMENT '一句话摘要',
  need_review TINYINT(1) DEFAULT 0 COMMENT '是否需要人工复核',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '分析时间',
  CONSTRAINT fk_result_review FOREIGN KEY (review_id) REFERENCES twj_reviews(id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='情感分析结果表';

-- 测试数据：8 条评论
INSERT INTO twj_reviews (content) VALUES
('这家店的酸奶特别好喝，包装也很结实，就是快递慢了两天。'),
('买了个寂寞，质量差得离谱，客服还爱搭不理。'),
('味道中规中矩，价格便宜，勉强算值这个价。'),
('水杯做工精致，保温效果一流，全家人都说好用！'),
('物流速度飞快，第二天就到了，但东西和图片有色差。'),
('客服态度恶劣，退换货折腾了一周才解决，再也不来了。'),
('充电宝容量足，就是有点重，出门放包里略沉。'),
('收到货发现漏液了，联系客服三天没人回复，太失望了。');

-- 测试数据对应的示例分析结果（便于未调用模型时也能查看历史功能）
INSERT INTO twj_analysis_results (review_id, sentiment, confidence, aspects, entities, summary, need_review) VALUES
(1, 'positive', 0.90, '["口味","包装","物流"]', '[{"name":"某品牌酸奶","type":"product"}]', '整体满意，物流较慢。', 0),
(2, 'negative', 0.95, '["质量","服务"]', '[]', '质量差且客服态度不佳。', 0),
(3, 'neutral', 0.75, '["口味","价格"]', '[]', '中规中矩，性价比尚可。', 0),
(4, 'positive', 0.97, '["做工","保温"]', '[{"name":"某品牌水杯","type":"product"}]', '做工与保温表现出色。', 0),
(5, 'neutral', 0.80, '["物流","外观"]', '[]', '物流快但存在色差问题。', 0),
(6, 'negative', 0.96, '["服务","售后"]', '[]', '客服态度差，售后体验糟糕。', 0),
(7, 'neutral', 0.82, '["容量","便携"]', '[{"name":"某品牌充电宝","type":"product"}]', '容量充足但偏重。', 0),
(8, 'negative', 0.93, '["质量","服务"]', '[]', '商品漏液且客服无响应。', 0);
