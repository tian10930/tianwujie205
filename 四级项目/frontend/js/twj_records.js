// twj_records.js：历史记录页脚本
// 数据源：Supabase REST（PostgREST），匿名只读（RLS 限制写入）
// 主接口：GET /rest/v1/twj_analysis_results 外键嵌套评论与维度

// 统一请求封装：打印请求与响应到控制台
function twj_api(twj_url, twj_options) {
  console.log('请求地址：', twj_url);
  return fetch(twj_url, twj_options)
    .then(function (twj_resp) {
      if (!twj_resp.ok) {
        return twj_resp.json().then(function (twj_body) {
          throw new Error('HTTP ' + twj_resp.status + '：' + (twj_body.message || '请求失败'));
        });
      }
      return twj_resp.json();
    })
    .then(function (twj_data) {
      console.log('响应数据：', twj_data);
      return twj_data;
    })
    .catch(function (twj_e) {
      console.error('请求异常：', twj_e);
      throw twj_e;
    });
}

// 拼接 Supabase REST 主查询：结果 + 评论原文 + 维度明细，一次请求全部拿到
function twj_buildUrl(twj_sentiment) {
  var twj_base = twj_SUPABASE_URL + '/rest/v1/twj_analysis_results';
  var twj_select = [
    'id', 'sentiment', 'confidence', 'need_review', 'summary', 'entities',
    'model_name', 'created_at',
    'review:twj_reviews(content,merchant,platform)',
    'aspects:twj_analysis_aspects(aspect_name,aspect_sentiment)'
  ].join(',');
  var twj_query = '?select=' + encodeURIComponent(twj_select) + '&order=created_at.desc&limit=50';
  if (twj_sentiment && twj_sentiment !== 'all') {
    twj_query += '&sentiment=eq.' + twj_sentiment;
  }
  return twj_base + twj_query;
}

// 请求头：anon key（见 js/twj_config.js）
function twj_buildHeaders() {
  return {
    'apikey': twj_SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + twj_SUPABASE_ANON_KEY
  };
}

// 情感极性映射为中文文案
function twj_sentimentText(twj_s) {
  var twj_map = { positive: '正面', neutral: '中性', negative: '负面' };
  return twj_map[twj_s] || twj_s;
}

// 实体数组渲染为"实体名"文本
function twj_entitiesText(twj_entities) {
  if (!twj_entities || !twj_entities.length) return '—';
  return twj_entities.map(function (twj_e) { return twj_e.name; }).join('、');
}

// 生成单条记录的 HTML 片段
function twj_buildRecord(twj_item) {
  var twj_div = document.createElement('div');
  twj_div.className = 'twj_record';
  var twj_tags = (twj_item.aspects || []).map(function (twj_a) {
    return '<span class="twj_tag_' + twj_a.aspect_sentiment + '">' +
      twj_a.aspect_name + '·' + twj_sentimentText(twj_a.aspect_sentiment) + '</span>';
  }).join('');
  var twj_review = twj_item.review || {};
  twj_div.innerHTML =
    '<div class="twj_record_top">' +
      '<span class="twj_badge twj_' + twj_item.sentiment + '">' + twj_sentimentText(twj_item.sentiment) + '</span>' +
      '<span class="twj_confidence">置信度 ' + Math.round((twj_item.confidence || 0) * 100) + '%</span>' +
      (twj_item.need_review ? '<span class="twj_flag">需复核</span>' : '') +
      '<span class="twj_merchant">' + (twj_review.merchant || '未知商家') +
        '（' + (twj_review.platform || 'unknown') + '）</span>' +
    '</div>' +
    '<p class="twj_record_content">' + (twj_review.content || '（评论已删除）') + '</p>' +
    '<p class="twj_record_meta">摘要：' + (twj_item.summary || '—') +
      '　|　实体：' + twj_entitiesText(twj_item.entities) +
      '　|　模型：' + (twj_item.model_name || '—') +
      '　|　' + new Date(twj_item.created_at).toLocaleString() + '</p>' +
    '<div class="twj_tags">' + (twj_tags || '<span class="twj_none">无维度</span>') + '</div>';
  return twj_div;
}

// 更新顶部的情感统计数字
function twj_updateStats(twj_list) {
  var twj_count = { positive: 0, neutral: 0, negative: 0, review: 0 };
  twj_list.forEach(function (twj_it) {
    if (twj_count[twj_it.sentiment] !== undefined) twj_count[twj_it.sentiment]++;
    if (twj_it.need_review) twj_count.review++;
  });
  document.getElementById('twj_statPos').textContent = twj_count.positive;
  document.getElementById('twj_statNeu').textContent = twj_count.neutral;
  document.getElementById('twj_statNeg').textContent = twj_count.negative;
  document.getElementById('twj_statReview').textContent = twj_count.review;
  document.getElementById('twj_stats').hidden = false;
}

// 显示错误提示（配置未填、网络不通、RLS 拦截等）
function twj_showError(twj_msg) {
  var twj_tip = document.getElementById('twj_errorTip');
  twj_tip.textContent = twj_msg;
  twj_tip.hidden = false;
}

// 加载记录列表并渲染
function twj_loadRecords(twj_sentiment) {
  var twj_listBox = document.getElementById('twj_recordList');
  var twj_loading = document.getElementById('twj_loading');
  document.getElementById('twj_emptyTip').hidden = true;
  document.getElementById('twj_errorTip').hidden = true;
  twj_listBox.innerHTML = '';
  twj_loading.hidden = false;

  if (twj_SUPABASE_URL.indexOf('YOUR_PROJECT_REF') !== -1 || !twj_SUPABASE_ANON_KEY) {
    twj_loading.hidden = true;
    twj_showError('请先在 js/twj_config.js 中填写 SUPABASE_URL 与 SUPABASE_ANON_KEY。');
    return;
  }

  twj_api(twj_buildUrl(twj_sentiment), { headers: twj_buildHeaders() })
    .then(function (twj_list) {
      twj_loading.hidden = true;
      if (!twj_list.length) {
        document.getElementById('twj_emptyTip').hidden = false;
      }
      twj_list.forEach(function (twj_item) {
        twj_listBox.appendChild(twj_buildRecord(twj_item));
      });
      if (twj_sentiment === 'all') twj_updateStats(twj_list);
    })
    .catch(function (twj_e) {
      twj_loading.hidden = true;
      var twj_hint = twj_e.message.indexOf('Failed to fetch') !== -1
        ? '网络无法访问 Supabase（检查网络/代理），或 twj_config.js 配置有误。'
        : twj_e.message;
      twj_showError('加载失败：' + twj_hint);
    });
}

// 筛选按钮切换
document.querySelectorAll('.twj_filter').forEach(function (twj_btn) {
  twj_btn.addEventListener('click', function () {
    document.querySelectorAll('.twj_filter').forEach(function (twj_b) {
      twj_b.classList.remove('twj_active');
    });
    twj_btn.classList.add('twj_active');
    twj_loadRecords(twj_btn.getAttribute('data-sentiment'));
  });
});

// 刷新按钮
document.getElementById('twj_refreshBtn').addEventListener('click', function () {
  twj_loadRecords('all');
});

// 页面加载即拉取全部记录
twj_loadRecords('all');
