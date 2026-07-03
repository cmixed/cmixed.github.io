---
title: 设计一个 Header-Only C++ 库
date: 2026-06-10
tags: [C++, C++23, Library Design, 开源]
description: 分享设计 zcol 单头文件终端颜色库的经验，探讨 Header-Only 库的设计原则。
---

## 什么是 Header-Only 库

Header-Only 库只需要包含一个头文件即可使用，无需链接额外的 `.lib` 或 `.so` 文件。

## zcol 的设计目标

设计 `zcol` 时我遵循了几个原则：

1. **零依赖** — 不依赖任何第三方库
2. **C++23 最低标准** — 使用最新语言特性
3. **即插即用** — 一个 `#include` 搞定

## 核心 API

```cpp
#include <zcol.hpp>
using namespace zcol::literals;

// 彩色输出
zcol::println(zcol::Color::Red, "error message");

// RAII 颜色守卫
{
    zcol::ScopedColor guard(zcol::Color::Blue);
    // 蓝色输出区域
}

// UDL 语法糖
"hello"_col;  // 黄色输出
```

## 集成方式

### CMake FetchContent

```cmake
FetchContent_Declare(
    zcol
    GIT_REPOSITORY https://github.com/cmixed/zcol.git
    GIT_TAG main
)
FetchContent_MakeAvailable(zcol)
target_link_libraries(your_target PRIVATE zcol::zcol)
```

### 直接拷贝

把 `zcol.hpp` 拖进项目即可。

## 经验总结

设计好的 API 比实现更重要。先想清楚用户怎么用，再动手写代码。
