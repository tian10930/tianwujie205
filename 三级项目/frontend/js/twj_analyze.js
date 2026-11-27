// 评论分析页脚本：调用 /api/ai/analyze，渲染结构化结果并保存到数据库

// 统一请求封装：打印请求与响应到控制台，返回统一响应对象
async function twj_api(twj_url, twj_options) {
  console.log('请求地址：', twj_url, '参数：', twj_options);
  try {
    const twj_resp = await fetch(twj_url, twj_options);
    const twj_data = await twj_resp.json();
    console.log('响应数据：', twj_data);
    return twj_data;
  } catch (twj_e) {
    console.error('请求异常：', twj_e);
    return { code: 5000, msg: '网络异常：' + twj_e.message, data: null };
  }
}

// 校验输入：非空且不超过 2000 字，不合法时返回错误提示
function twj_checkInput(twj_text) {
  if (!twj_text) return '评论内容不能为空';
  if (twj_text.length > 2000) return '评论长度不能超过 2000 字';
  return '';
}

// 情感极性映射为中文文案与对应颜色类名
function twj_sentimentInfo(twj_s) {
  const twj_map = {
    positive: { text: '正面', cls: 'twj_positive' },
    neutral: { text: '中性', cls: 'twj_neutral' },
    negative: { text: '负面', cls: 'twj_negative' }
  };
  return twj_map[twj_s] || { text: '未知', cls: 'twj_neutral' };
}

// 渲染结构化分析结果卡片
function twj_renderResult(twj_result) {
  const twj_info = twj_sentimentInfo(twj_result.sentiment);
  const twj_badge = document.getElementById('twj_sentimentBadge');
  twj_badge.textContent = twj_info.text;
  twj_badge.className = 'twj_badge ' + twj_info.cls;

  const twj_pct = Math.round((twj_result.confidence || 0) * 100);
  document.getElementById('twj_confidence').textContent = '置信度：' + twj_pct + '%';
  document.getElementById('twj_bar').style.width = twj_pct + '%';
  document.getElementById('twj_reviewFlag').hidden = !twj_result.need_review;
  document.getElementById('twj_summary').textContent = '摘要：' + (twj_result.summary || '—');

  // 渲染评论维度标签
  const twj_aspectsBox = document.getElementById('twj_aspects');
  twj_aspectsBox.innerHTML = '';
  (twj_result.aspects && twj_result.aspects.length ? twj_result.aspects : ['无']).forEach(function (twj_a) {
    const twj_span = document.createElement('span');
    twj_span.textContent = twj_a;
    if (!(twj_result.aspects && twj_result.aspects.length)) twj_span.className = 'twj_none';
    twj_aspectsBox.appendChild(twj_span);
  });

  // 渲染识别实体标签
  const twj_entitiesBox = document.getElementById('twj_entities');
  twj_entitiesBox.innerHTML = '';
  (twj_result.entities && twj_result.entities.length ? twj_result.entities : []).forEach(function (twj_e) {
    const twj_span = document.createElement('span');
    twj_span.className = 'twj_entity';
    twj_span.textContent = twj_e.name + '（' + twj_e.type + '）';
    twj_entitiesBox.appendChild(twj_span);
  });
  if (!twj_result.entities || !twj_result.entities.length) {
    const twj_span = document.createElement('span');
    twj_span.className = 'twj_none';
    twj_span.textContent = '未识别到实体';
    twj_entitiesBox.appendChild(twj_span);
  }

  document.getElementById('twj_rawJson').textContent = JSON.stringify(twj_result, null, 2);
  document.getElementById('twj_result').hidden = false;
}

// 保存分析结果到数据库（失败不影响展示）
async function twj_saveRecord(twj_content, twj_result) {
  const twj_resp = await twj_api('/api/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: twj_content, result: twj_result })
  });
  if (twj_resp.code !== 0) {
    console.warn('保存记录失败：', twj_resp.msg);
  }
}

// 主流程：点击分析按钮后校验输入、调用接口、渲染结果并落库
async function twj_startAnalyze() {
  const twj_text = document.getElementById('twj_reviewInput').value.trim();
  const twj_err = twj_checkInput(twj_text);
  const twj_errorTip = document.getElementById('twj_errorTip');
  if (twj_err) {
    twj_errorTip.textContent = twj_err;
    twj_errorTip.hidden = false;
    return;
  }
  twj_errorTip.hidden = true;

  const twj_btn = document.getElementById('twj_analyzeBtn');
  twj_btn.disabled = true;
  document.getElementById('twj_loading').hidden = false;
  document.getElementById('twj_result').hidden = true;

  const twj_resp = await twj_api('/api/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: twj_text })
  });

  document.getElementById('twj_loading').hidden = true;
  twj_btn.disabled = false;

  if (twj_resp.code !== 0 || !twj_resp.data) {
    twj_errorTip.textContent = twj_resp.msg || '分析失败，请稍后重试';
    twj_errorTip.hidden = false;
    return;
  }
  twj_renderResult(twj_resp.data);
  twj_saveRecord(twj_text, twj_resp.data);
}

// 清空输入与结果区域
function twj_clearAll() {
  document.getElementById('twj_reviewInput').value = '';
  document.getElementById('twj_result').hidden = true;
  document.getElementById('twj_errorTip').hidden = true;
}

document.getElementById('twj_analyzeBtn').addEventListener('click', twj_startAnalyze);
document.getElementById('twj_clearBtn').addEventListener('click', twj_clearAll);
