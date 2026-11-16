/**
 * 点击不可选中的 UI 时，不落文本插入符。
 *
 * `user-select: none` 只保证不产生**选区**，不保证不画**插入符**：实测首页的
 * 状态胶囊和签名左上点一下都会落下一根白竖线 —— 那是 h1 行盒上的插入符
 * （高度等于 h1 的字号，32px），浏览器把它当成「可点击的文本边界」。
 * 开着 F7 光标浏览时更是到处都能点出一根。
 *
 * 做法：mousedown 的默认动作里包含「移动插入符 / 开始选择」，在不可选中的
 * 内容上直接拦掉。**交互控件不拦** —— preventDefault 会把按钮、链接、输入框
 * 自己的 focus 一起吃掉，键盘用户就丢了落点。
 *
 * 拦不拦只看计算出来的 user-select，不在这里维护第二份名单：allowlist 在
 * src/style.css 的「文本选中」那一段，改那边这边自动跟着走。
 *
 * 全站共用（编进 ui.js），和 selection-policy 那条 CSS 是同一条策略的两半：
 * CSS 负责「看不见」（caret-color: transparent），这里负责「不产生」。 */
(() => {
  document.addEventListener(
    'mousedown',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      // 控件要自己拿焦点，不能拦
      if (
        target.closest('a, button, input, textarea, select, summary, [tabindex], [contenteditable]')
      ) {
        return;
      }
      // 读者要读的正文（user-select: text）照常可点出插入符
      if (getComputedStyle(target).userSelect !== 'none') return;
      event.preventDefault();
    },
    // 捕获阶段：比组件自己的 mousedown 监听更早，谁都不会先落下插入符
    true
  );
})();

export {};
