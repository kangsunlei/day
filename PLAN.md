# RSS 文章推荐 APP 实现计划

## 架构设计

采用分层架构，便于后续适配移动端和 Kindle：

```
┌─────────────────┐
│  展示层（React） │  ← 可替换为移动端/Kindle版本
└────────┬────────┘
         │ HTTP API
┌────────▼────────────────────────┐
│        后端服务层                 │
│  ┌──────────┐  ┌──────────────┐ │
│  │ RSS服务  │  │  AI摘要服务   │ │
│  └──────────┘  └──────────────┘ │
│  ┌──────────┐  ┌──────────────┐ │
│  │推荐算法   │  │  数据存储     │ │
│  └──────────┘  └──────────────┘ │
└─────────────────────────────────┘
```

## 技术栈

- **后端**: Node.js + Express + TypeScript
- **前端**: React + TypeScript + Vite
- **数据库**: SQLite + TypeORM
- **RSS 解析**: `rss-parser` 或 `feedparser`
- **AI 服务**: 抽象层设计，支持 OpenAI/Claude/本地模型切换

## 核心功能模块

### 1. 数据模型设计

**数据库表结构**:

- `feeds`: RSS 订阅源（id, url, title, description, last_fetch_at）
- `articles`: 文章（id, feed_id, title, link, content, summary, published_at, fetched_at）
- `user_preferences`: 用户偏好（article_id, is_interested, feedback_at）
- `article_topics`: 文章主题标签（article_id, topic, weight）

### 2. 后端服务 (`backend/`)

#### 2.1 RSS 抓取服务 (`services/rssService.ts`)

- 定时抓取订阅源（使用 node-cron）
- 解析 RSS/Atom feed
- 去重处理（基于文章 link）
- 存储到数据库

#### 2.2 AI 摘要服务 (`services/aiService.ts`)

- 抽象接口：`generateSummary(content: string): Promise<Summary>`
- 实现类：
  - `OpenAIService`: 使用 OpenAI API
  - `ClaudeService`: 使用 Claude API
  - `LocalAIService`: 使用本地模型（Ollama）
- 配置驱动切换实现

#### 2.3 推荐算法 (`services/recommendationService.ts`)

- 每日推荐逻辑：
  - 从未推荐的文章中选择
  - 基于用户历史偏好计算相似度
  - 使用主题标签匹配
  - 随机性与相关性平衡
- 反馈学习：
  - 记录用户"感兴趣"的文章主题
  - 计算文章主题向量
  - 提升相关主题的推荐权重

#### 2.4 API 路由 (`routes/`)

- `GET /api/feeds` - 获取订阅源列表
- `POST /api/feeds` - 添加订阅源
- `DELETE /api/feeds/:id` - 删除订阅源
- `GET /api/articles/today` - 获取今日推荐文章
- `POST /api/articles/:id/feedback` - 提交反馈（interested/not_interested）
- `GET /api/articles/history` - 获取历史文章

### 3. 前端应用 (`frontend/`)

#### 3.1 订阅源管理页面

- 订阅源列表展示
- 添加订阅源表单（URL 输入）
- 删除订阅源操作
- 显示最后抓取时间

#### 3.2 今日推荐页面（主页面）

- 展示今日推荐文章
- 显示文章标题、摘要、要点
- "感兴趣"和"不感兴趣"按钮
- 文章来源和发布时间

#### 3.3 历史记录页面

- 已推荐文章列表
- 按时间倒序
- 显示用户反馈状态

## 渐进式实现方案

采用 MVP（最小可行产品）方式，每个阶段都是可用的完整版本，逐步增强功能。

### MVP1: 最简版本（核心功能）

**目标**: 能手动添加 RSS 源，手动抓取文章，简单推荐，记录反馈

**技术栈简化**:

- 后端: Node.js + Express（JavaScript，不用 TypeScript）
- 数据库: JSON 文件存储（不用 SQLite）
- 前端: 简单 HTML 页面（不用 React）

**功能**:

1. 手动添加 RSS 订阅源（配置文件或简单表单）
2. 手动触发 RSS 抓取（API 接口）
3. 简单推荐：从未推荐文章中随机选一篇
4. 记录用户反馈（感兴趣/不感兴趣）
5. 显示今日推荐文章和历史记录

**数据存储**:

- `data/feeds.json` - 订阅源列表
- `data/articles.json` - 文章列表
- `data/preferences.json` - 用户偏好

**文件结构**:

```
day/
├── backend/
│   ├── server.js           # Express服务器
│   ├── services/
│   │   └── rssService.js   # RSS抓取（使用rss-parser）
│   ├── routes/
│   │   ├── feeds.js        # 订阅源API
│   │   └── articles.js     # 文章API
│   └── data/               # JSON数据文件
├── frontend/
│   └── index.html          # 单页面应用（原生JS）
└── package.json
```

---

### MVP2: 添加 AI 摘要

**在 MVP1 基础上增加**:

1. 集成 AI 服务（先只支持 OpenAI，硬编码）
2. 抓取文章后自动生成摘要
3. 前端显示文章摘要和要点

**新增文件**:

- `backend/services/aiService.js` - AI 摘要服务

---

### MVP3: 引入数据库和 TypeScript

**在 MVP2 基础上重构**:

1. 迁移到 TypeScript
2. 使用 SQLite 替代 JSON 文件
3. 使用 TypeORM 管理数据模型
4. 改进代码结构

**新增**:

- TypeScript 配置
- TypeORM 实体定义
- 数据库迁移

---

### MVP4: 自动化抓取

**在 MVP3 基础上增加**:

1. 定时任务（每天自动抓取 RSS）
2. 后台服务运行
3. 错误重试机制

**新增**:

- `backend/services/scheduler.js` - 定时任务服务

---

### MVP5: 智能推荐算法

**在 MVP4 基础上增加**:

1. 基于用户反馈的推荐权重
2. 主题标签提取（简单关键词匹配）
3. 推荐算法优化

**新增**:

- `backend/services/recommendationService.ts` - 推荐算法
- 主题提取逻辑

---

### MVP6: React 前端

**在 MVP5 基础上重构前端**:

1. 使用 React + Vite 重构前端
2. 更好的 UI/UX
3. 响应式设计（适配移动端）

**新增**:

- React 项目结构
- 组件化开发
- 路由管理

---

### MVP7: AI 服务抽象层

**在 MVP6 基础上增强**:

1. AI 服务抽象接口
2. 支持多 AI 提供商（OpenAI/Claude/本地）
3. 配置驱动切换

**新增**:

- `backend/services/ai/` - AI 服务抽象层
- 多 AI 提供商实现

---

### MVP8: 高级推荐算法

**在 MVP7 基础上增强**:

1. 向量化主题匹配
2. 更智能的推荐权重计算
3. 推荐效果分析

## 第一阶段实现清单（MVP1）

### 后端开发

1. ✅ 初始化 Node.js 项目
2. ✅ 安装依赖（express, rss-parser, cors）
3. ✅ 创建基础 Express 服务器
4. ✅ 实现 RSS 抓取服务（手动触发）
5. ✅ 实现 JSON 数据存储（feeds, articles, preferences）
6. ✅ 实现订阅源管理 API（GET/POST/DELETE /api/feeds）
7. ✅ 实现文章 API（GET /api/articles/today, POST /api/articles/:id/feedback）
8. ✅ 实现简单推荐逻辑（随机选择未推荐文章）

### 前端开发

1. ✅ 创建简单 HTML 页面
2. ✅ 实现订阅源管理界面
3. ✅ 实现今日推荐展示
4. ✅ 实现反馈按钮
5. ✅ 实现历史记录展示

### 测试验证

1. ✅ 手动添加 RSS 源
2. ✅ 手动触发抓取
3. ✅ 查看推荐文章
4. ✅ 提交反馈
5. ✅ 验证推荐逻辑

## 关键文件结构

```
day/
├── backend/
│   ├── src/
│   │   ├── entities/          # 数据模型
│   │   ├── services/          # 业务逻辑
│   │   │   ├── rssService.ts
│   │   │   ├── aiService.ts
│   │   │   └── recommendationService.ts
│   │   ├── routes/            # API路由
│   │   ├── config/            # 配置
│   │   └── index.ts           # 入口文件
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── pages/             # 页面组件
│   │   ├── components/        # 通用组件
│   │   ├── services/          # API调用
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── .env.example               # 环境变量模板
└── README.md
```

## 配置说明

- AI 服务配置通过环境变量切换（`AI_PROVIDER=openai|claude|local`）
- RSS 抓取时间可配置（默认每天凌晨 2 点）
- 数据库文件存储在 `backend/data/app.db`

## 开发原则

- **每个 MVP 都是完整可用的版本**，可以独立运行和测试
- **逐步增强**，不一次性引入复杂技术
- **先跑通流程**，再优化体验
- **数据可迁移**，从 JSON 到 SQLite 的迁移路径清晰
