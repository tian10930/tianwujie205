// 历史记录页脚本：加载 /api/records 数据，渲染列表与统计，支持删除

// 统一请求封装：打印请求与响应到控制台
async function twj_api(twj_url, twj_options) {
  console.log('请求地址：', twj_url, '参数：', twj_options || '');
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

// 情感极性映射为中文文案
function twj_sentimentText(twj_s) {
  const twj_map = { positive: '正面', neutral: '中性', negative: '负面' };
  return twj_map[twj_s] || twj_s;
}

// 生成单条记录的 HTML 片段
function twj_buildRecord(twj_item) {
  const twj_div = document.createElement('div');
  twj_div.className = 'twj_record';
  const twj_tags = (twj_item.aspects || []).map(function (twj_a) {
    return '<span>' + twj_a + '</span>';
  }).join('');
  twj_div.innerHTML =
    '<div class="twj_record_top">' +
      '<span class="twj_badge twj_' + twj_item.sentiment + '">' + twj_sentimentText(twj_item.sentiment) + '</span>' +
      '<span class="twj_confidence">置信度 ' + Math.round((twj_item.confidence || 0) * 100) + '%</span>' +
      (twj_item.need_review ? '<span class="twj_flag">需复核</span>' : '') +
      '<button class="twj_record_del" data-id="' + twj_item.id + '">删除</button>' +
    '</div>' +
    '<p class="twj_record_content">' + twj_item.content + '</p>' +
    '<p class="twj_record_meta">摘要：' + (twj_item.summary || '—') +
      '　|　' + new Date(twj_item.created_at).toLocaleString() + '</p>' +
    '<div class="twj_tags">' + (twj_tags || '<span class="twj_none">无维度</span>') + '</div>';
  return twj_div;
}

// 更新顶部的情感统计数字
function twj_updateStats(twj_list) {
  const twj_count = { positive: 0, neutral: 0, negative: 0, review: 0 };
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

// 加载记录列表并渲染
async function twj_loadRecords() {
  const twj_listBox = document.getElementById('twj_recordList');
  twj_listBox.innerHTML = '';
  const twj_resp = await twj_api('/api/records?limit=100');
  const twj_emptyTip = document.getElementById('twj_emptyTip');
  if (twj_resp.code !== 0 || !Array.isArray(twj_resp.data)) {
    twj_emptyTip.textContent = twj_resp.msg || '加载失败，请检查后端与数据库';
    twj_emptyTip.hidden = false;
    return;
  }
  twj_updateStats(twj_resp.data);
  if (twj_resp.data.length === 0) {
    twj_emptyTip.hidden = false;
    return;
  }
  twj_emptyTip.hidden = true;
  twj_resp.data.forEach(function (twj_item) {
    twj_listBox.appendChild(twj_buildRecord(twj_item));
  });
}

// 删除一条记录后重新加载列表
async function twj_deleteRecord(twj_id) {
  if (!confirm('确定删除这条记录吗？')) return;
  const twj_resp = await twj_api('/api/records/' + twj_id, { method: 'DELETE' });
  if (twj_resp.code !== 0) {
    alert('删除失败：' + twj_resp.msg);
    return;
  }
  twj_loadRecords();
}

// 事件绑定：刷新按钮与列表上的删除按钮（事件委托）
document.getElementById('twj_refreshBtn').addEventListener('click', twj_loadRecords);
document.getElementById('twj_recordList').addEventListener('click', function (twj_e) {
  if (twj_e.target.classList.contains('twj_record_del')) {
    twj_deleteRecord(Number(twj_e.target.dataset.id));
  }
});

twj_loadRecords();
