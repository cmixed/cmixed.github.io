import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * 文章页目录抽屉的关闭路径防线（2026-11-20 修复）。
 *
 * 实测到的缺陷：手机上点目录里的「文章标题」那项（回到顶部的跳转）或点链接内部的
 * 内层元素，抽屉不会收起，于是只能靠再点一次坞里的目录按钮退出 —— 用户感受就是
 * 「跳转完点空白处取消不掉」。
 *
 * 三条约束：
 *   1. 所有关闭路径走同一个 setTocOpen(false)，不要再出现「各写一遍移除逻辑」；
 *   2. 委托判据用 closest('a, .toc-title')，不用 e.target.tagName === 'A'；
 *   3. 手机端不从 localStorage 恢复展开态（全屏抽屉一进来就盖住正文没人想要）。
 */
const ROOT = join(import.meta.dirname, '..', '..');
const post = readFileSync(join(ROOT, 'blog', 'template', 'post.html'), 'utf-8');
const build = readFileSync(join(ROOT, 'blog', 'build.ts'), 'utf-8');

describe('文章页目录抽屉', () => {
  it('关闭只有一条路径：setTocOpen(false)', () => {
    expect(post).toContain('function setTocOpen(open)');
    // 遮罩点击 → 同一个函数
    expect(post).toMatch(
      /tocOverlay\.addEventListener\('click', function \(\) \{\s*setTocOpen\(false\);/
    );
    // 目录内点击 → 同一个函数（不是又抄一遍 classList.remove）
    expect(post).toMatch(/if \(target\.closest\('a, \.toc-title'\)\) setTocOpen\(false\);/);
    // 旧写法必须消失：三处各写一遍，漏掉一处就卡住
    expect(post).not.toContain("if (window.innerWidth < 1024 && e.target.tagName === 'A'");
  });

  it('委托判据能覆盖内层元素与标题项', () => {
    // 链接文字里可能嵌 <strong>/<code>，target 不是 A 本身
    expect(post).toContain("target.closest('a, .toc-title')");
    // 箭头只负责展开子目录，不算跳转
    expect(post).toContain("if (target.closest('.toc-arrow')) return;");
  });

  it('标题项是真链接，不是 onclick 的 div', () => {
    // href="#top" 是规范里的魔法片段：页面没有 id="top" 时滚到文档顶部
    expect(build).toContain('<div class="toc-item toc-title"><a href="#top">');
    expect(build).not.toContain('onclick="window.scrollTo({top:0,behavior:');
    // 配套样式：抹掉链接默认外观，保留 hover / 焦点反馈
    expect(post).toContain('.toc-item.toc-title a {');
    expect(post).toContain('.toc-item.toc-title a:focus-visible');
  });

  it('手机端不恢复展开态，只有桌面记住', () => {
    expect(post).toContain('var desktopToc = window.matchMedia');
    expect(post).toMatch(/if \(desktopToc\.matches && savedToc !== 'false'\) setTocOpen\(true\);/);
    expect(post).toMatch(/else setTocOpen\(false\);/);
    // 记忆只在桌面写，手机顺手把旧值清掉
    expect(post).toMatch(
      /if \(desktopToc\.matches\) \{[\s\S]{0,260}localStorage\.setItem\('toc-open'/
    );
    expect(post).toContain("localStorage.removeItem('toc-open')");
  });

  it('Esc 能退出抽屉（外接键盘 / 折叠屏）', () => {
    expect(post).toMatch(/e\.key === 'Escape'[\s\S]{0,160}setTocOpen\(false\)/);
  });
});
