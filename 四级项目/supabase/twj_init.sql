-- ============================================================
-- 商业评论情感分析 Supabase 数据库初始化脚本（Harness Engineering）
-- 作者：田武杰   日期：2026-11-27
-- 执行方式（二选一）：
--   1. Supabase Dashboard -> SQL Editor -> 粘贴本文件全部内容 -> Run
--   2. 通过 Supabase MCP 的 SQL 执行工具执行本文件
-- 说明：PostgreSQL 语法；表结构与三级项目 MySQL 版对齐，并为前端
--       直连 Supabase REST 做了 RLS 设计（匿名只读，写入仅 service_role）。
-- ============================================================

-- ------------------------------------------------------------
-- 1. 建表（3 张）
-- ------------------------------------------------------------

-- 表1：评论原文表
create table if not exists public.twj_reviews (
  id         bigint generated always as identity primary key,
  content    text        not null,
  merchant   varchar(100) not null default '未知商家',
  platform   varchar(50)  not null default 'unknown',
  created_at timestamptz  not null default now()
);
comment on table public.twj_reviews is '商业评论原文表';
comment on column public.twj_reviews.content    is '评论原文（中文，2000 字以内）';
comment on column public.twj_reviews.merchant   is '被评价的商家或商品名称';
comment on column public.twj_reviews.platform   is '评论来源平台：taobao/jd/pdd/tmall/douyin 等';
comment on column public.twj_reviews.created_at is '评论提交时间';

-- 表2：情感分析结果表
create table if not exists public.twj_analysis_results (
  id          bigint generated always as identity primary key,
  review_id   bigint       not null references public.twj_reviews(id) on delete cascade,
  sentiment   varchar(10)  not null check (sentiment in ('positive','neutral','negative')),
  confidence  numeric(4,3) not null check (confidence between 0 and 1),
  entities    jsonb        not null default '[]'::jsonb,
  summary     varchar(255),
  need_review boolean      not null default false,
  model_name  varchar(100) not null default 'glm-5.3-flash',
  created_at  timestamptz  not null default now()
);
comment on table  public.twj_analysis_results               is '情感分析结果表（大模型结构化输出）';
comment on column public.twj_analysis_results.review_id     is '关联评论 id（外键，级联删除）';
comment on column public.twj_analysis_results.sentiment     is '情感极性：positive/neutral/negative';
comment on column public.twj_analysis_results.confidence    is '置信度 0~1，保留三位小数';
comment on column public.twj_analysis_results.entities      is '实体数组，格式 [{"name":"实体名","type":"product"}]';
comment on column public.twj_analysis_results.summary       is '一句话中文摘要';
comment on column public.twj_analysis_results.need_review   is '置信度低于阈值（0.8）时为 true，需人工复核';
comment on column public.twj_analysis_results.model_name    is '产生该结果的大模型名称';
comment on column public.twj_analysis_results.created_at    is '分析时间';

-- 表3：评论维度明细表（把 MySQL 版的 aspects JSON 拆成独立表）
create table if not exists public.twj_analysis_aspects (
  id               bigint generated always as identity primary key,
  result_id        bigint      not null references public.twj_analysis_results(id) on delete cascade,
  aspect_name      varchar(50) not null,
  aspect_sentiment varchar(10) not null check (aspect_sentiment in ('positive','neutral','negative')),
  created_at       timestamptz not null default now()
);
comment on table  public.twj_analysis_aspects                is '评论维度明细表（口味/物流/服务等维度的情感）';
comment on column public.twj_analysis_aspects.result_id        is '关联分析结果 id（外键，级联删除）';
comment on column public.twj_analysis_aspects.aspect_name      is '维度名称，如：口味、物流、服务';
comment on column public.twj_analysis_aspects.aspect_sentiment is '该维度的情感极性：positive/neutral/negative';
comment on column public.twj_analysis_aspects.created_at       is '创建时间';

-- ------------------------------------------------------------
-- 2. 开启 RLS（3 张表全部开启）
-- ------------------------------------------------------------
alter table public.twj_reviews            enable row level security;
alter table public.twj_analysis_results   enable row level security;
alter table public.twj_analysis_aspects   enable row level security;
alter table public.twj_reviews            force row level security;
alter table public.twj_analysis_results   force row level security;
alter table public.twj_analysis_aspects   force row level security;

-- ------------------------------------------------------------
-- 3. 策略：匿名（anon）只读；写入仅 service_role
--    注：service_role 默认绕过 RLS，这里仍显式建策略便于作业答辩说明
-- ------------------------------------------------------------
drop policy if exists "twj_allow_anon_read_reviews"  on public.twj_reviews;
drop policy if exists "twj_service_write_reviews"    on public.twj_reviews;
create policy "twj_allow_anon_read_reviews" on public.twj_reviews
  for select to anon using (true);
create policy "twj_service_write_reviews" on public.twj_reviews
  for all to service_role using (true) with check (true);

drop policy if exists "twj_allow_anon_read_results" on public.twj_analysis_results;
drop policy if exists "twj_service_write_results"   on public.twj_analysis_results;
create policy "twj_allow_anon_read_results" on public.twj_analysis_results
  for select to anon using (true);
create policy "twj_service_write_results" on public.twj_analysis_results
  for all to service_role using (true) with check (true);

drop policy if exists "twj_allow_anon_read_aspects" on public.twj_analysis_aspects;
drop policy if exists "twj_service_write_aspects"   on public.twj_analysis_aspects;
create policy "twj_allow_anon_read_aspects" on public.twj_analysis_aspects
  for select to anon using (true);
create policy "twj_service_write_aspects" on public.twj_analysis_aspects
  for all to service_role using (true) with check (true);

-- ------------------------------------------------------------
-- 4. 模拟数据：每张表 8 条中文数据（贴合作业主题：商业评论情感分析）
-- ------------------------------------------------------------

-- 4.1 评论原文 8 条
insert into public.twj_reviews (content, merchant, platform) values
  ('这家店的酸奶特别好喝，包装也很结实，就是快递慢了两天。', '牧场鲜语酸奶',     'taobao'),
  ('买了个寂寞，质量差得离谱，客服还爱搭不理。',             '简约保温杯',       'jd'),
  ('味道中规中矩，价格便宜，勉强算值这个价。',               '手工蛋黄酥',       'pdd'),
  ('水杯做工精致，保温效果一流，全家人都说好用！',           '316不锈钢保温杯',  'jd'),
  ('物流速度飞快，第二天就到了，但东西和图片有色差。',       '亚麻床品四件套',   'taobao'),
  ('客服态度恶劣，退换货折腾了一周才解决，再也不来了。',     '轻便折叠晴雨伞',   'pdd'),
  ('充电宝容量足，就是有点重，出门放包里略沉。',             '20000毫安充电宝',  'tmall'),
  ('收到货发现漏液了，联系客服三天没人回复，太失望了。',     '便携手持小风扇',   'douyin');

-- 4.2 分析结果 8 条（与上面 8 条评论一一对应）
insert into public.twj_analysis_results
  (review_id, sentiment, confidence, entities, summary, need_review, model_name)
values
  (1, 'positive', 0.900,
     '[{"name":"牧场鲜语酸奶","type":"product"}]'::jsonb,
     '整体满意，物流稍慢。', false, 'glm-5.3-flash'),
  (2, 'negative', 0.950,
     '[{"name":"简约保温杯","type":"product"}]'::jsonb,
     '质量差且客服态度冷淡。', false, 'glm-5.3-flash'),
  (3, 'neutral', 0.740,
     '[{"name":"手工蛋黄酥","type":"product"}]'::jsonb,
     '口味普通，但性价比尚可。', true, 'glm-5.3-flash'),
  (4, 'positive', 0.970,
     '[{"name":"316不锈钢保温杯","type":"product"}]'::jsonb,
     '做工与保温表现优异。', false, 'glm-5.3-flash'),
  (5, 'neutral', 0.810,
     '[{"name":"亚麻床品四件套","type":"product"}]'::jsonb,
     '物流快捷，但实物存在色差。', false, 'glm-5.3-flash'),
  (6, 'negative', 0.960,
     '[{"name":"轻便折叠晴雨伞","type":"product"}]'::jsonb,
     '客服态度恶劣，售后体验糟糕。', false, 'glm-5.3-flash'),
  (7, 'neutral', 0.780,
     '[{"name":"20000毫安充电宝","type":"product"}]'::jsonb,
     '容量充足，但便携性一般。', true, 'glm-5.3-flash'),
  (8, 'negative', 0.930,
     '[{"name":"便携手持小风扇","type":"product"}]'::jsonb,
     '商品漏液且客服长时间无响应。', false, 'glm-5.3-flash');

-- 4.3 维度明细 8 条（每条结果取一个代表性维度）
insert into public.twj_analysis_aspects (result_id, aspect_name, aspect_sentiment) values
  (1, '口味', 'positive'),
  (2, '质量', 'negative'),
  (3, '价格', 'neutral'),
  (4, '保温', 'positive'),
  (5, '物流', 'positive'),
  (6, '服务', 'negative'),
  (7, '便携', 'negative'),
  (8, '售后', 'negative');

-- ------------------------------------------------------------
-- 5. 验证（可选）：统计三张表行数，应各为 8
-- ------------------------------------------------------------
-- select 'twj_reviews' as tbl, count(*) from public.twj_reviews
-- union all select 'twj_analysis_results', count(*) from public.twj_analysis_results
-- union all select 'twj_analysis_aspects', count(*) from public.twj_analysis_aspects;
