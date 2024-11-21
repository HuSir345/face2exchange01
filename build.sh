#!/bin/bash
# 安装依赖
npm install
# 安装 sharp 的 linux 版本
npm install --platform=linux --arch=x64 sharp
# 构建项目
npm run build 