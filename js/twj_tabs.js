/* ============================================
   作者：田武杰
   建立时间：2026-11-04
   使用大模型：GLM-5.3-Flash
   功能名称：可复用 Tab 选项卡组件
   说明：任何带 data-twj-tabs 属性的容器都会被自动
   初始化为选项卡组件，页面可放置多个互不影响。
   ============================================ */

/**
 * 初始化一个选项卡容器（可复用核心函数）
 * 约定：容器内按钮用 .twj_tab-btn，内容面板用 .twj_tab-panel，
 *       按钮通过 data-twj-target 属性指向对应面板的 id，
 *       选中状态统一用 .twj_active 类表示。
 * @param {HTMLElement} container 选项卡容器元素
 */
function twj_initTabs(container) {
  var twj_btns = container.querySelectorAll('.twj_tab-btn');
  var twj_panels = container.querySelectorAll('.twj_tab-panel');

  // 为每个选项卡按钮绑定点击监听事件
  twj_btns.forEach(function (twj_btn) {
    twj_btn.addEventListener('click', function () {
      // 第一步：先清除所有选项卡按钮的选中状态
      twj_btns.forEach(function (twj_b) {
        twj_b.classList.remove('twj_active');
      });

      // 第二步：再清除所有内容面板的显示状态
      twj_panels.forEach(function (twj_p) {
        twj_p.classList.remove('twj_active');
      });

      // 第三步：设置当前点击的按钮为选中状态
      twj_btn.classList.add('twj_active');

      // 第四步：根据 data-twj-target 找到对应面板并显示
      var twj_target = container.querySelector('#' + twj_btn.getAttribute('data-twj-target'));
      if (twj_target) {
        twj_target.classList.add('twj_active');
      }
    });
  });
}

/**
 * 页面初始化：扫描页面中所有带 data-twj-tabs 属性的容器，
 * 逐个调用 twj_initTabs，实现组件可复用、支持多处同时使用。
 */
document.querySelectorAll('[data-twj-tabs]').forEach(function (twj_container) {
  twj_initTabs(twj_container);
});
