# AGENTS.md

## Project
- Static classroom site at `D:\24002120205-田武杰`: hand-written HTML/CSS/JS, no package manager, build, lint, or test suite.
- Root `index.html` is the canonical portal. `高级网页设计课堂实践-1/` is an older standalone snapshot with stale links and old "王垚" branding; edit root pages unless the task targets that folder.
- `starter-level1-0205twj.html` is the student-score dashboard; `data.js` exposes `window.STUDENTS` / `window.SUBJECTS`. It is not linked from the portal yet.

## Assets and conventions
- New work uses local assets only: Font Awesome in `cdn/css` + `cdn/webfonts`, Lucide in `cdn/lucide.min.js`, iconfont in `font/`.
- Do not copy `svg.html` or generated `font/demo_index.html` as examples: both still load remote Alibaba CDN scripts.
- Keep the native-code style: inline `<style>`/`<script>` for one-off pages, existing shared CSS only where already established; no frameworks.
- Preserve UTF-8 / `zh-CN` and mobile layouts. Paths contain Chinese; quote them and prefer file tools because PowerShell 5.1 garbles Chinese in console output.
- No automated verification: open changed pages in a browser and check desktop/mobile widths plus the console.

## Code comments
- Every newly created HTML file must carry a header comment right after `<!DOCTYPE html>`, containing: author 田武杰, creation time (YYYY-MM-DD), the LLM used (e.g. GLM-5.3-Flash), and the page's feature name. Template:

```html
<!DOCTYPE html>
<!--
  作者：田武杰
  建立时间：2026-11-04
  使用大模型：GLM-5.3-Flash
  功能名称：<页面功能说明>
-->
```

- In the JS part, every function must have a brief comment above it stating what the function mainly does. Example:

```js
// 渲染学生成绩表格，按科目列展示每名学生的分数
function twj_renderTable() { ... }
```

- Function comments are written in Chinese and describe purpose/behavior, not implementation line-by-line.

## Git and security
- Default branch: `master`, tracking `origin/master` on Gitee. Use `--no-pager` for git commands.
- Never commit or force-add `.trae/` or `24002120205-田武杰.md`; both are intentionally ignored. The prompt log contains sensitive credentials, and `.trae/skills/commit-project/SKILL.md` embeds a push token. Never copy that token into code, logs, commits, or replies.
- When asked to submit/push, follow `.trae/skills/commit-project/SKILL.md`; do not invent a workflow or force-push.
- Read `skills/frontend-design/SKILL.md` before visual redesigns.
- PowerShell 5.1 has no `&&`; chain with `; if ($?) { ... }`.
