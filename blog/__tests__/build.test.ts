import { describe, it, expect } from 'vitest';
import { parseFrontmatter, estimateReadTime, escapeXml, renderTemplate } from '../build';

describe('parseFrontmatter', () => {
  it('should parse YAML frontmatter', () => {
    const content = `---
title: Test Post
date: 2024-01-15
tags: [TypeScript, Testing]
description: A test post
---
Body content here`;
    const result = parseFrontmatter(content);
    expect(result.meta.title).toBe('Test Post');
    expect(result.meta.date).toBe('2024-01-15');
    expect(result.meta.tags).toEqual(['TypeScript', 'Testing']);
    expect(result.meta.description).toBe('A test post');
    expect(result.body).toBe('Body content here');
  });

  it('should handle content without frontmatter', () => {
    const content = 'Just plain content';
    const result = parseFrontmatter(content);
    expect(result.meta).toEqual({});
    expect(result.body).toBe('Just plain content');
  });
});

describe('estimateReadTime', () => {
  it('should calculate read time for short content', () => {
    expect(estimateReadTime('a'.repeat(100))).toBe(1);
  });

  it('should calculate read time for medium content', () => {
    expect(estimateReadTime('a'.repeat(400))).toBe(1);
    expect(estimateReadTime('a'.repeat(800))).toBe(2);
  });

  it('should return minimum 1 minute', () => {
    expect(estimateReadTime('')).toBe(1);
    expect(estimateReadTime('short')).toBe(1);
  });
});

describe('escapeXml', () => {
  it('should escape ampersand', () => {
    expect(escapeXml('a & b')).toBe('a &amp; b');
  });

  it('should escape angle brackets', () => {
    expect(escapeXml('<script>')).toBe('&lt;script&gt;');
  });

  it('should escape quotes', () => {
    expect(escapeXml('"test"')).toBe('&quot;test&quot;');
    expect(escapeXml("'test'")).toBe('&apos;test&apos;');
  });

  it('should handle multiple special characters', () => {
    expect(escapeXml('<div class="test">&</div>')).toBe(
      '&lt;div class=&quot;test&quot;&gt;&amp;&lt;/div&gt;'
    );
  });
});

describe('renderTemplate', () => {
  it('should replace placeholders', () => {
    const template = 'Hello {{name}}, welcome to {{place}}!';
    const result = renderTemplate(template, { name: 'World', place: 'TypeScript' });
    expect(result).toBe('Hello World, welcome to TypeScript!');
  });

  it('should handle multiple occurrences of same placeholder', () => {
    const template = '{{x}} and {{x}} again';
    const result = renderTemplate(template, { x: 'test' });
    expect(result).toBe('test and test again');
  });

  it('should leave unmatched placeholders as-is', () => {
    const template = 'Hello {{name}} and {{unknown}}!';
    const result = renderTemplate(template, { name: 'World' });
    expect(result).toBe('Hello World and {{unknown}}!');
  });
});
