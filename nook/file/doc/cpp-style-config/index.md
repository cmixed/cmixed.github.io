---
title: C++ 现代代码风格配置包
category: doc
description: 《C++ 现代代码风格与工程规范》配套的 .clang-format、.clang-tidy 与 Doxyfile。
file: cpp-style-config.zip
pin: false
date: 2026-11-06
tags: [C++, clang-format, clang-tidy, Doxygen]
---

配套文章：[C++ 现代代码风格与工程规范](/blog/cpp-style-guide.html)

## 包含文件

- `.clang-format`：4 空格缩进、100 列、K&R、左指针、Doxygen 命令保护
- `.clang-tidy`：`readability-identifier-naming` 命名检查
- `Doxyfile`：`///` + `QT_AUTOBRIEF`，递归扫描 `src` / `include`

## 使用

1. 解压到项目根目录。
2. 用 clang-format / clang-tidy 验证：CI 与本地钩子固定同一个版本。
3. `clang-tidy` 让告警变成错误要用 `--warnings-as-errors='*'`，并用 `-p build` 读取 `compile_commands.json`。

> 验证版本：clang-format 23.1.5、clang-tidy 23.1.4、Doxygen 1.18.0。

详细规则与取舍见配套文章。
