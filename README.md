# 足球赛况系统 (Match Status) - 本地运行与体验指引

本项目包含三端架构：轻量后端服务 (`server`)、现场记分操控台 (`admin`) 和赛况展示端 (`client`)。

---

## 🚀 本地启动指南

若要在本机启动三端进行双屏实操体验，请在 **3 个独立的终端窗口** 中分别执行对应命令：

### 1. 启动轻量后端 (Server)

打开第 1 个终端：
```bash
cd c:\Users\Hoklam\Desktop\match_status\server
npm run start:dev
```
- **接口服务**: [http://localhost:3002/api/v1](http://localhost:3002/api/v1)
- **Swagger 在线文档**: [http://localhost:3002/api/docs](http://localhost:3002/api/docs)

---

### 2. 启动现场记分操控台 (Admin)

打开第 2 个终端：
```bash
cd c:\Users\Hoklam\Desktop\match_status\admin
npm run dev
```
- **操作台地址**: [http://localhost:5174](http://localhost:5174)

---

### 3. 启动赛况展示端 (Client)

打开第 3 个终端：
```bash
cd c:\Users\Hoklam\Desktop\match_status\client
npm run dev
```
- **展示端官网**: [http://localhost:5173](http://localhost:5173)

---

## 🖥️ 双屏实操体验说明

1. **分屏排列**：
   - 建议在浏览器中左右分屏（或双显示器）：
     - **左侧窗口**：打开现场记分操控台 [http://localhost:5174](http://localhost:5174)
     - **右侧窗口**：打开赛况展示端 [http://localhost:5173](http://localhost:5173)

2. **操作体验**：
   - 在左侧操作台录入 **进球**、**出牌**、**射门** 等事件。
   - 支持快捷键 **`Ctrl + Z`** 进行撤销。
   - 右侧展示页弹窗与数据将在 **0ms 内即刻同步渲染**，实时反映最新战况！

---

## 📌 常用服务端口汇总

| 模块 | 说明 | 本地访问地址 |
| :--- | :--- | :--- |
| **Server** | 后端 API 服务 | [http://localhost:3002/api/v1](http://localhost:3002/api/v1) |
| **Server Docs** | Swagger 接口文档 | [http://localhost:3002/api/docs](http://localhost:3002/api/docs) |
| **Admin** | 现场记分操控台 | [http://localhost:5174](http://localhost:5174) |
| **Client** | 赛况前台展示端 | [http://localhost:5173](http://localhost:5173) |
