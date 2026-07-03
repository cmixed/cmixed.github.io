---
title: C++23 新特性概览
date: 2026-06-15
tags: [C++, C++23, Modern C++]
description: 梳理 C++23 中值得关注的新特性，包括 std::expected、std::print、if consteval 等。
---

## 引言

C++23 是 C++ 标准的最新修订，带来了许多实用的新特性。本文梳理几个最值得关注的改动。

## std::expected

`std::expected` 是 C++23 中最重要的新增类型之一，用于替代异常处理的错误返回模式：

```cpp
#include <expected>
#include <string>

std::expected<int, std::string> divide(int a, int b) {
    if (b == 0) return std::unexpected("division by zero");
    return a / b;
}

auto result = divide(10, 3);
if (result) {
    // 使用 *result
}
```

## std::print

终于有了官方的格式化输出：

```cpp
#include <print>

std::println("Hello, {}!", "world");
std::println("The answer is {}", 42);
```

## if consteval

用于在编译期和运行期执行不同逻辑：

```cpp
constexpr int f(int x) {
    if consteval {
        return x + 1;  // 编译期路径
    } else {
        return x + 2;  // 运行期路径
    }
}
```

## 总结

C++23 让现代 C++ 开发更加舒适，`std::expected` 和 `std::print` 尤其值得在新项目中采用。
