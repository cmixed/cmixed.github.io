---
title: 小鹤双拼注册表
category: code
description: Windows 系统下启用小鹤双拼方案的注册表文件，适用于微软输入法
file: 小鹤双拼.reg
tags: [Windows, 输入法, 双拼]
---

Windows 系统下启用小鹤双拼方案的注册表文件。

## 使用说明

1. 双击导入 `.reg` 文件
2. 重启输入法或注销系统
3. 在微软输入法设置中选择"双拼"方案
4. 选择"小鹤双拼"作为双拼方案

## 包含配置

- 启用双拼模式 (`Enable Double Pinyin`)
- 设置双拼方案为小鹤 (`DoublePinyinScheme = 10`)
- 自定义小鹤双拼键位映射

## 注意事项

- 仅适用于 Windows 系统自带的微软输入法
- 导入前建议备份注册表
- 如需还原，可手动在输入法设置中关闭双拼
