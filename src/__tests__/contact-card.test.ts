import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * 联系卡的三条不变量。
 *
 * 这块以前是「一行说明 + 纯文本邮箱 + 两颗无标签图标」，看着空、而且邮箱既不能
 * 点也不能复制（想联系得手动拖选），语义还反了 —— mailto 挂在图标上而不是邮箱上。
 * 现在是双栏名片：左栏定位与合作方向，右栏渠道行，底部一条元信息。
 */
const ROOT = join(import.meta.dirname, '..', '..');
const html = readFileSync(join(ROOT, 'index.html'), 'utf-8');
const css = readFileSync(join(ROOT, 'src', 'style.css'), 'utf-8');
const main = readFileSync(join(ROOT, 'src', 'main.ts'), 'utf-8');

const section = html.slice(
  html.indexOf('<section id="contact">'),
  html.indexOf('</section>', html.indexOf('<section id="contact">'))
);

describe('联系卡', () => {
  it('邮箱是 mailto 链接，且有一键复制按钮', () => {
    expect(section).toMatch(/<a class="contact-row-value" href="mailto:cmixed@foxmail\.com">/);
    // 「复制」把 data-copy 里的值写进剪贴板；没有 data-copy 的按钮不该存在
    expect(section).toMatch(/data-copy="cmixed@foxmail\.com"/);
    expect(main).toContain('clipboard.writeText');
    // 剪贴板被拒时的兜底：值本身仍可手动选中（allowlist 里有 .contact-row-value）
    expect(css).toContain('.contact-row-value');
    expect(main).toContain('execCommand');
  });

  it('每条渠道都有标签与动作，不再是两颗无字图标', () => {
    for (const label of ['邮箱', 'GitHub']) {
      expect(section, `缺少渠道标签 ${label}`).toContain(`>${label}</span>`);
    }
    expect(section).toContain('>复制</button>');
    expect(section).toContain('>打开</a>');
    // 旧的纯文本邮箱与无标签图标按钮都已退役
    expect(section).not.toContain('email-display');
    expect(section).not.toContain('social-link');
  });

  it('没有内联样式，元信息一行把「何时找、找得到吗」说清', () => {
    expect(section).not.toContain('style="');
    for (const item of ['UTC+8', '邮件为主', '开放机会']) {
      expect(section, `元信息缺少 ${item}`).toContain(item);
    }
  });
});
