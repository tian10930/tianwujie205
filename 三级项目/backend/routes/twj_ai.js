// LLM 调用路由：/api/ai/chat 基础代理，/api/ai/analyze 结构化情感分类（Harness Engineering）
const router = require('express').Router();

// 调用大模型 chat/completions 接口，返回 choices[0].message.content
async function twj_callLLM(twj_messages, twj_temperature) {
  const twj_resp = await fetch(process.env.LLM_BASE_URL + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + process.env.LLM_API_KEY
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL,
      messages: twj_messages,
      temperature: typeof twj_temperature === 'number' ? twj_temperature : 0.7,
      stream: false
    })
  });
  if (!twj_resp.ok) {
    const twj_errText = await twj_resp.text();
    throw new Error('HTTP ' + twj_resp.status + '：' + twj_errText.slice(0, 300));
  }
  const twj_data = await twj_resp.json();
  console.log('模型返回：', twj_data.choices[0].message.content);
  return twj_data.choices[0].message.content;
}

// 基础对话接口：前端只传消息数组，密钥保存在服务端
router.post('/chat', async (twj_req, twj_res) => {
  const { messages } = twj_req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return twj_res.json({ code: 1001, msg: 'messages 不能为空', data: null });
  }
  try {
    const twj_content = await twj_callLLM(messages);
    twj_res.json({ code: 0, msg: 'ok', data: twj_content });
  } catch (twj_e) {
    console.error('调用失败：', twj_e.message);
    twj_res.json({ code: 5001, msg: '大模型调用失败：' + twj_e.message, data: null });
  }
});

// 校验并规范化情感分类结果：字段缺失或类型错误时返回 null
function twj_validateResult(twj_obj) {
  if (!twj_obj || typeof twj_obj !== 'object') return null;
  const twj_sentiment = twj_obj.sentiment;
  if (!['positive', 'neutral', 'negative'].includes(twj_sentiment)) return null;
  const twj_confidence = Number(twj_obj.confidence);
  if (Number.isNaN(twj_confidence) || twj_confidence < 0 || twj_confidence > 1) return null;
  if (!Array.isArray(twj_obj.aspects)) return null;
  if (!Array.isArray(twj_obj.entities)) return null;
  if (typeof twj_obj.summary !== 'string') return null;
  return {
    sentiment: twj_sentiment,
    confidence: Math.round(twj_confidence * 100) / 100,
    aspects: twj_obj.aspects.map(String).slice(0, 8),
    entities: twj_obj.entities
      .filter(twj_it => twj_it && typeof twj_it.name === 'string')
      .map(twj_it => ({ name: twj_it.name, type: String(twj_it.type || 'unknown') })),
    summary: twj_obj.summary,
    need_review: Boolean(twj_obj.need_review) || twj_confidence < 0.6
  };
}

// 从模型输出中提取 JSON（兼容 markdown 代码块包裹的情况）
function twj_extractJSON(twj_text) {
  const twj_m = twj_text.match(/\{[\s\S]*\}/);
  if (!twj_m) return null;
  try {
    return JSON.parse(twj_m[0]);
  } catch (twj_e) {
    return null;
  }
}

// 结构化兜底结果：模型多次输出不合规时返回，标记人工复核
function twj_fallbackResult(twj_text) {
  return {
    sentiment: 'neutral',
    confidence: 0,
    aspects: [],
    entities: [],
    summary: '模型输出未能解析为约定 JSON，已返回兜底结果，请人工复核。',
    need_review: true,
    raw: String(twj_text || '').slice(0, 500)
  };
}

// 系统提示词：角色 + 任务 + 输出格式 + 少样本示例，约束模型稳定输出 JSON
function twj_buildSystemPrompt() {
  return [
    '你是一名电商商业评论分析专家，负责对用户提交的商品评论做情感分类与信息抽取。',
    '你必须只输出一个 JSON 对象，不要输出任何解释、开场白或 markdown 以外的文字。',
    'JSON 字段约定：',
    '{',
    '  "sentiment": "positive|neutral|negative 三选一",',
    '  "confidence": 0到1的小数，表示置信度,',
    '  "aspects": ["涉及的评论维度，如物流、包装、口味、价格、质量"],',
    '  "entities": [{"name": "实体名", "type": "brand|product|person|store"}],',
    '  "summary": "一句话中文摘要",',
    '  "need_review": 置信度低于0.6或语义矛盾时为true',
    '}',
    '示例1：',
    '输入：这家店的酸奶特别好喝，包装也很结实，就是快递慢了两天。',
    '输出：{"sentiment":"positive","confidence":0.9,"aspects":["口味","包装","物流"],"entities":[{"name":"某某酸奶","type":"product"}],"summary":"整体满意，物流较慢。","need_review":false}',
    '示例2：',
    '输入：买了个寂寞，质量差得离谱，客服还爱搭不理。',
    '输出：{"sentiment":"negative","confidence":0.95,"aspects":["质量","服务"],"entities":[],"summary":"质量差且客服态度不佳。","need_review":false}',
    '再次强调：只输出 JSON 对象本身。'
  ].join('\n');
}

// 情感分析接口：组装提示词调用模型，解析校验失败自动重试，最终兜底
router.post('/analyze', async (twj_req, twj_res) => {
  const twj_text = (twj_req.body && twj_req.body.text || '').trim();
  if (!twj_text) {
    return twj_res.json({ code: 1002, msg: '评论内容不能为空', data: null });
  }
  if (twj_text.length > 2000) {
    return twj_res.json({ code: 1003, msg: '评论长度不能超过 2000 字', data: null });
  }
  const twj_messages = [
    { role: 'system', content: twj_buildSystemPrompt() },
    { role: 'user', content: '请分析以下商业评论：\n' + twj_text }
  ];

  let twj_lastText = '';
  try {
    for (let twj_i = 1; twj_i <= 3; twj_i++) {
      twj_lastText = await twj_callLLM(twj_messages, 0.2);
      const twj_parsed = twj_extractJSON(twj_lastText);
      const twj_valid = twj_validateResult(twj_parsed);
      if (twj_valid) {
        return twj_res.json({ code: 0, msg: 'ok', data: { ...twj_valid, attempts: twj_i } });
      }
      console.warn(`第 ${twj_i} 次输出不符合 JSON 约定，准备重试`);
    }
    // 三次均失败，返回兜底结果（HTTP 仍为 200，业务层标记 need_review）
    return twj_res.json({
      code: 0,
      msg: '模型输出多次不合规，已返回兜底结果',
      data: { ...twj_fallbackResult(twj_lastText), attempts: 3 }
    });
  } catch (twj_e) {
    console.error('调用失败：', twj_e.message);
    return twj_res.json({ code: 5001, msg: '大模型调用失败：' + twj_e.message, data: null });
  }
});

module.exports = router;
