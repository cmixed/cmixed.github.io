import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * 首页的垂直节奏：区块间距 + 导语 + 站点速览。
 *
 * 原来每个 section 上下各 5rem，两个区块内容之间整整 160px 什么都没有
 * （全页 5 处共 800px，占页面高度 18%）。现在收到 4rem（128px），并把其中
 * 一段空白换成一行实信息：「关于」和「项目」之间的站点速览（项目 / 文章 /
 * 资源三个数），其余区块在标题下各加一行导语。提交信息归更新日志。
 */
const ROOT = join(import.meta.dirname, '..', '..');
const html = readFileSync(join(ROOT, 'index.html'), 'utf-8');
const css = readFileSync(join(ROOT, 'src', 'style.css'), 'utf-8');
const main = readFileSync(join(ROOT, 'src', 'main.ts'), 'utf-8');
const siteMeta = readFileSync(join(ROOT, 'scripts', 'site-meta.ts'), 'utf-8');

describe('首页节奏：间距 / 导语 / 站点速览', () => {
  it('区块上下 padding 收到 4rem，窄屏与大屏同步收紧', () => {
    expect(css).toContain('section {\n    padding: 4rem 2rem;');
    // 两处断点也各降一档，别只有桌面变
    expect(css).toContain('padding: 2.5rem 1.5rem;');
    expect(css).toContain('padding: 5rem 3rem;');
    // 旧的 5rem / 6rem 不该再出现（6rem 只可能是别的用途）
    expect(css).not.toContain('padding: 5rem 2rem;');
    expect(css).not.toContain('padding: 6rem 3rem;');
  });

  it('项目 / 博客 / 资源各有一行导语，标题与导语之间只留一线', () => {
    const ledes = html.match(/class="section-lede"/g) ?? [];
    expect(ledes.length, '导语数量不对').toBe(3);
    for (const text of [
      'C++ 库、小工具与实验项目',
      '学习笔记、工程规范与上手指南',
      '常用工具、配置包与资料',
    ]) {
      expect(html, `缺少导语「${text}」`).toContain(text);
    }
    expect(css).toContain('.section-header:has(+ .section-lede)');
    expect(css).toContain('.section-lede');
  });

  it('站点速览卡在关于与项目之间，只报项目 / 文章 / 资源三个数', () => {
    expect(html).toContain('id="siteStats"');
    // 位置：紧跟在 #about 的 </section> 之后、#projects 之前
    expect(html.indexOf('id="siteStats"')).toBeLessThan(html.indexOf('id="projects"'));
    expect(html.indexOf('id="siteStats"')).toBeGreaterThan(html.indexOf('id="about"'));

    // 项目数来自打包进来的 projects.json；文章 / 资源跟着预览数据到货
    expect(main).toContain('statsView.posts = data.posts.length');
    expect(main).toContain('statsView.resources = data.resources.length');
    expect(main).toContain('renderSiteStats()');

    // 提交信息归更新日志：速览条的渲染段不显示次数，也不显示最近一条
    const render = main.slice(
      main.indexOf('function renderSiteStats'),
      main.indexOf('renderSiteStats();')
    );
    expect(render).not.toContain('次提交');
    expect(render).not.toContain('最近提交');
    expect(render).not.toContain('latest');
    expect(css).not.toContain('.site-stats-recent');
    // site-stats.json 整条产物链已撤掉，不为一行字多留一个构建产物
    expect(siteMeta).not.toContain('STATS_FILE');
    expect(siteMeta).not.toContain('buildSiteStats');
    expect(main).not.toContain('site-stats.json');
  });
});
