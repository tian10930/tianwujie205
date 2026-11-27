// 分析记录路由：历史记录查询、单条删除，数据写入 MySQL
const express = require('express');
const router = express.Router();
const { twj_query } = require('../twj_db');

// 查询分析记录列表（最新优先，默认 50 条）
router.get('/records', async (twj_req, twj_res) => {
  try {
    const twj_limit = Math.min(Number(twj_req.query.limit) || 50, 200);
    const twj_rows = await twj_query(
      'SELECT r.id, r.content, r.created_at, s.sentiment, s.confidence, s.aspects, s.entities, s.summary, s.need_review ' +
      'FROM twj_reviews r JOIN twj_analysis_results s ON s.review_id = r.id ' +
      'ORDER BY r.id DESC LIMIT ?', [twj_limit]);
    const twj_data = twj_rows.map(twj_row => ({
      id: twj_row.id,
      content: twj_row.content,
      created_at: twj_row.created_at,
      sentiment: twj_row.sentiment,
      confidence: Number(twj_row.confidence),
      // mysql2 会将 JSON 列自动解析为对象，字符串时才需要手动解析
      aspects: typeof twj_row.aspects === 'string' ? JSON.parse(twj_row.aspects || '[]') : (twj_row.aspects || []),
      entities: typeof twj_row.entities === 'string' ? JSON.parse(twj_row.entities || '[]') : (twj_row.entities || []),
      summary: twj_row.summary,
      need_review: Boolean(twj_row.need_review)
    }));
    twj_res.json({ code: 0, msg: 'ok', data: twj_data });
  } catch (twj_e) {
    console.error('查询记录失败：', twj_e.message);
    twj_res.json({ code: 6001, msg: '数据库查询失败：' + twj_e.message, data: null });
  }
});

// 新增分析记录：保存评论原文与结构化结果（分析成功后由前端调用）
router.post('/records', async (twj_req, twj_res) => {
  const { content, result } = twj_req.body || {};
  if (!content || !result) {
    return twj_res.json({ code: 1004, msg: 'content 与 result 不能为空', data: null });
  }
  try {
    const twj_r1 = await twj_query(
      'INSERT INTO twj_reviews (content) VALUES (?)', [content]);
    const twj_reviewId = twj_r1.insertId;
    await twj_query(
      'INSERT INTO twj_analysis_results (review_id, sentiment, confidence, aspects, entities, summary, need_review) VALUES (?,?,?,?,?,?,?)',
      [twj_reviewId, result.sentiment, result.confidence,
        JSON.stringify(result.aspects || []), JSON.stringify(result.entities || []),
        result.summary || '', result.need_review ? 1 : 0]);
    twj_res.json({ code: 0, msg: '已保存', data: { review_id: twj_reviewId } });
  } catch (twj_e) {
    console.error('保存记录失败：', twj_e.message);
    twj_res.json({ code: 6002, msg: '数据库写入失败：' + twj_e.message, data: null });
  }
});

// 删除单条分析记录（级联删除结果）
router.delete('/records/:id', async (twj_req, twj_res) => {
  try {
    const twj_id = Number(twj_req.params.id);
    await twj_query('DELETE FROM twj_analysis_results WHERE review_id = ?', [twj_id]);
    const twj_r = await twj_query('DELETE FROM twj_reviews WHERE id = ?', [twj_id]);
    if (twj_r.affectedRows === 0) {
      return twj_res.json({ code: 6003, msg: '记录不存在', data: null });
    }
    twj_res.json({ code: 0, msg: '已删除', data: { id: twj_id } });
  } catch (twj_e) {
    console.error('删除记录失败：', twj_e.message);
    twj_res.json({ code: 6002, msg: '数据库删除失败：' + twj_e.message, data: null });
  }
});

module.exports = router;
