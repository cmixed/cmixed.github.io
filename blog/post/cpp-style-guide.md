# 现代C++个人代码风格与工程规范

---
title: 现代C++个人代码风格与工程规范
date: 2026-11-06
pinned: true
tags: [C++, 代码规范, 工程化, clang-format, clang-tidy, Doxygen]
description: 一套现代、清爽、高度自洽的 C++ 开发规范：类型与值分离、左指针、尾随下划线，并由 clang-format / clang-tidy / Doxygen 强制执行。
---

本指南定义一套**现代、清爽、高度自洽**的 C++ 开发规范。整体设计融合 Rust / Python 的命名哲学与现代 C++ 的最佳实践，并通过自动化工具链强制执行，把排版和命名的争论从代码评审里拿走。

> 配套配置包：[现代C++个人代码风格配置包](/nook/cpp-style-config.html)（`.clang-format`、`.clang-tidy`、`Doxyfile`）。

## 1. 核心设计原则

- **类型与值分离**：类型使用大驼峰（`CamelCase`），函数 / 变量使用小写下划线（`snake_case`）。
- **左指针哲学**：强调指针是类型的一部分（`int* p`），而不是变量名的一部分。
- **显式且安全**：通过尾随下划线 `_` 区分成员变量，规避 `this->` 的冗余；全局状态使用 `g_` 前缀作为危险警示。
- **工具即法律**：排版和命名规范由 `clang-format` 和 `clang-tidy` 自动强制执行，拒绝无意义的人工争论。

## 2. 代码排版规范（`.clang-format`）

本配置以 LLVM 风格为基础，针对现代宽屏显示器和高层嵌套做了调整。

### 2.1 核心规则摘要

- **缩进**：4 个空格，绝不使用 Tab。续行缩进为 8 个空格。
- **行宽**：限制在 100 字符以内。
- **指针 / 引用**：强制靠左（`int* p`、`const std::string& str`）。
- **大括号**：K&R 风格，左大括号不换行，与控制语句同行。
- **注释保护**：拦截并保护以 `@` 开头的 Doxygen 命令，防止格式被破坏。

### 2.2 配置文件

```yaml
# ==========================================
# Language and Base Style
# ==========================================
Language: Cpp
BasedOnStyle: LLVM

# ==========================================
# Indentation: 4 Spaces
# ==========================================
IndentWidth: 4
TabWidth: 4
UseTab: Never
ContinuationIndentWidth: 8

# ==========================================
# Column Limit
# ==========================================
ColumnLimit: 100

# ==========================================
# Pointer / Reference Alignment: Left
# ==========================================
DerivePointerAlignment: false
PointerAlignment: Left

# ==========================================
# Access Modifiers
# ==========================================
AccessModifierOffset: -4

# ==========================================
# Brace Style: K&R
# ==========================================
BreakBeforeBraces: Attach

# ==========================================
# Compactness Control
# ==========================================
AllowShortFunctionsOnASingleLine: Empty
AllowShortIfStatementsOnASingleLine: Never
AllowShortLoopsOnASingleLine: false

# ==========================================
# Header Order & Comment Protection
# ==========================================
SortIncludes: Never
# 保护 Doxygen 注释中的 @ 命令不被 clang-format 破坏
CommentPragmas: ' ?[\\@][a-zA-Z].*$'
```

> `SortIncludes: Never` 是默认：clang-format 不重排 include，避免打乱 PCH、平台头或必须第一的配置头。需要自动排序时再改成 `CaseSensitive`，并先确认 include 顺序没有依赖。

## 3. 命名规范（`.clang-tidy`）

强制使用 `readability-identifier-naming` 检查，不使用 `m_` 前缀，也不靠 `this->` 区分成员。

### 3.1 命名规则速查表

| 代码元素 | 命名风格 | 示例 |
| :--- | :--- | :--- |
| **类 / 结构体 / 枚举 / 别名** | `CamelCase` | `class ConnectionManager` |
| **函数 / 方法** | `snake_case` | `void add_connection()` |
| **局部变量 / 函数参数** | `snake_case` | `int local_count` |
| **成员变量（尾随下划线）** | `snake_case` + `_` | `std::string user_name_;` |
| **全局变量（危险警示）** | `g_` + `snake_case` | `int g_system_status;` |
| **常量 / 枚举值** | `UPPER_SNAKE_CASE` | `MAX_BUFFER_SIZE` |
| **命名空间** | `lower_case` | `namespace my_project` |

### 3.2 配置文件

```yaml
# .clang-tidy
Checks: >
  -*,
  readability-identifier-naming

CheckOptions:
  # 1. Types: CamelCase
  - key: readability-identifier-naming.ClassCase
    value: CamelCase
  - key: readability-identifier-naming.StructCase
    value: CamelCase
  - key: readability-identifier-naming.EnumCase
    value: CamelCase
  - key: readability-identifier-naming.TypeAliasCase
    value: CamelCase
  - key: readability-identifier-naming.TypedefCase
    value: CamelCase
  - key: readability-identifier-naming.UnionCase
    value: CamelCase

  # 2. Functions / Methods: snake_case
  - key: readability-identifier-naming.FunctionCase
    value: lower_case
  - key: readability-identifier-naming.MethodCase
    value: lower_case

  # 3. Variables: snake_case
  - key: readability-identifier-naming.LocalVariableCase
    value: lower_case
  - key: readability-identifier-naming.ParameterCase
    value: lower_case

  # Member variables: trailing underscore
  - key: readability-identifier-naming.MemberCase
    value: lower_case
  - key: readability-identifier-naming.MemberSuffix
    value: '_'

  - key: readability-identifier-naming.ClassMemberCase
    value: lower_case
  - key: readability-identifier-naming.ClassMemberSuffix
    value: '_'

  # Global variables: g_ prefix
  - key: readability-identifier-naming.GlobalVariableCase
    value: lower_case
  - key: readability-identifier-naming.GlobalVariablePrefix
    value: 'g_'

  # 4. Constants and Enums: UPPER_SNAKE_CASE
  - key: readability-identifier-naming.ConstantCase
    value: UPPER_CASE
  - key: readability-identifier-naming.GlobalConstantCase
    value: UPPER_CASE
  - key: readability-identifier-naming.ClassConstantCase
    value: UPPER_CASE
  - key: readability-identifier-naming.EnumConstantCase
    value: UPPER_CASE

  # 5. Namespaces: lower_case
  - key: readability-identifier-naming.NamespaceCase
    value: lower_case
```

> `clang-tidy` 的枚举值是 `lower_case`，它对应的就是 `snake_case` 命名；把配置值直接写成 `snake_case` 会被判为 invalid configuration。`Member*` 与 `ClassMember*` 两套都写是冗余的：只约束成员变量时保留 `Member*` 即可，确实需要对 class 成员单独覆盖时再加 `ClassMember*`。两套值保持一致时不会互相冲突。

## 4. 注释规范与文档生成（Doxygen）

统一使用 Doxygen 风格，兼容现代 IDE（如 clangd 悬停提示）和文档生成工具。

### 4.1 核心规则

- **统一定界符**：多行与单行注释统一使用 `///`，不使用 `/** ... */`。
- **命令前缀**：统一使用 `@` + 单词（如 `@param`、`@return`），不使用 `\`。
- **禁用 `@brief`**：首行直接写一句简洁的英文摘要（直到第一个句号），Doxygen 会自动将其识别为 brief。

```cpp
/// Adds a new connection to the pool.
///
/// @param connection_name  The unique name for the connection.
/// @return                 True if successful.
bool add_connection(const std::string& connection_name);
```

### 4.2 极简 Doxyfile

```ini
# 极简版 Doxyfile
INPUT                  = ./src ./include
FILE_PATTERNS          = *.h *.hpp *.cpp *.cc *.cxx *.ipp *.inl
QT_AUTOBRIEF           = YES
RECURSIVE              = YES
GENERATE_LATEX         = NO
```

> `///` 是 Qt 风格注释，所以这里用 `QT_AUTOBRIEF`；`JAVADOC_AUTOBRIEF` 只对 `/** ... */` 生效。`RECURSIVE = YES` 让 `src` / `include` 的子目录也被收录，否则默认只扫顶层文件。

## 5. 工具链集成

### 5.1 放置配置文件

把 `.clang-format`、`.clang-tidy` 和 `Doxyfile` 放到项目**根目录**。

### 5.2 IDE

- **VS Code**：安装 `clangd` 扩展，并在 `settings.json` 中开启保存自动格式化（`"editor.formatOnSave": true`）。
- **CLion**：在 `Settings > C/C++ > Clangd` 和 `Clang-Tidy` 中勾选使用配置文件。

### 5.3 CI / 本地检查

格式检查：

```bash
git ls-files -z '*.cpp' '*.cc' '*.cxx' '*.h' '*.hpp' \
  | xargs -0 clang-format --dry-run --Werror
```

命名与静态分析：

```bash
cmake -B build -DCMAKE_EXPORT_COMPILE_COMMANDS=ON

git ls-files -z '*.cpp' '*.cc' '*.cxx' \
  | xargs -0 clang-tidy -p build --warnings-as-errors='*'
```

> `clang-tidy` 的告警要用 `--warnings-as-errors='*'` 才会变成错误；`-- -Werror` 只是编译器参数，不会让 clang-tidy 的检查失败。用 `-p build` 读取 `compile_commands.json`，头文件路径和宏定义才完整。

### 5.4 Git Hooks

建议配置 Git Hooks（如 `pre-commit`），在 commit 前自动运行格式化和静态检查，避免因为排版不一致产生无意义的 diff。CI 和本地钩子应固定同一个 clang-format / clang-tidy 版本，否则不同版本可能给出不同结果。

## 6. 配套配置包

三个配置文件已打包到资源小窝，下载后解压到项目根目录即可：

- `.clang-format`
- `.clang-tidy`
- `Doxyfile`

> 验证版本：clang-format 23.1.5、clang-tidy 23.1.4、Doxygen 1.18.0。版本不同输出可能略有差异，CI 与本地钩子保持一致即可。

[下载现代C++个人代码风格配置包](/nook/cpp-style-config.html)
