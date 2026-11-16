/**
 * 键盘焦点必须完整可见：Tab 到「只露出一部分」的目标时，把它滚进视口。
 *
 * Chrome 只在元素**完全不可见**时才替焦点滚动，半露在外的它原地不动 —— 实测
 * 窄屏（390px）的技能胶囊条最狠的一颗 155px 宽里被切掉 103px，标签和内嵌焦点环
 * 一起没了，键盘用户看不出自己停在哪。scrollIntoView({ block:'nearest',
 * inline:'nearest' }) 就是「按最短距离滚到刚好完整可见」，纵向已经可见时不会动页面。
 *
 * 只在键盘焦点时滚（:focus-visible）：鼠标点一颗半露的胶囊，用户本来就知道点的是
 * 哪颗，跟着滚会显得跳；而且技能胶囊的 click 还要滚到对应项目卡，两段滚动叠在一起
 * 更乱。
 *
 * 不维护滚动容器名单：往上找最近的一个 overflow != visible 的祖先即可，跟着 CSS
 * 的实际状态走（和 caret.ts 只看计算出来的 user-select 是同一套做法 —— 少一份
 * 名单就少一处会落后的真相）。 */
(() => {
  function bringIntoView(el: Element): void {
    let box: Element | null = el.parentElement;
    while (box && box !== document.documentElement) {
      const cs = getComputedStyle(box);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
        const r = el.getBoundingClientRect();
        const s = box.getBoundingClientRect();
        const outside =
          r.left < s.left || r.right > s.right || r.top < s.top || r.bottom > s.bottom;
        if (outside) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        return;
      }
      box = box.parentElement;
    }
  }

  document.addEventListener('focusin', (event) => {
    const el = event.target;
    if (!(el instanceof Element)) return;
    if (!el.matches(':focus-visible')) return;
    bringIntoView(el);
  });
})();

export {};
