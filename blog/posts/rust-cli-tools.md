---
title: 用 Rust 构建命令行工具
date: 2026-04-20
tags: [Rust, CLI, 工具开发]
description: 分享使用 Rust 开发命令行工具的经验，涵盖 clap、日志解析、CSV 导出等实战技巧。
---

## 为什么选 Rust

Rust 的零成本抽象、内存安全和优秀的工具链，让它成为构建 CLI 工具的理想选择。

## 项目结构

一个典型的 Rust CLI 工具结构：

```
my-tool/
├── Cargo.toml
├── src/
│   └── main.rs
└── README.md
```

## 使用 clap 解析参数

```rust
use clap::Parser;

#[derive(Parser)]
#[command(name = "my-tool")]
#[command(about = "一个示例工具")]
struct Cli {
    /// 输入文件路径
    input: String,

    /// 输出格式
    #[arg(short, long, default_value = "csv")]
    format: String,
}
```

## 实战：日志分析

我最近用 Rust 写了一个反作弊日志分析工具 `fk-deltaforce`，核心流程：

1. 读取日志文件
2. 正则匹配关键字段
3. 统计风险指标
4. 导出 CSV 报告

整个工具编译后只有几 MB，启动速度极快。

## 总结

Rust 非常适合这类 I/O 密集型的 CLI 工具，性能和安全性都能兼顾。
