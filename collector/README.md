# RSS Collector

用于 GitHub Actions 定时抓取 RSS，输出静态 JSON 文件供客户端下载。

## 本地运行

```bash
cd collector
npm install
npm run collect
```

输出目录：`collector/output/`

## 配置

- 订阅源列表：`collector/feeds.json`
- 单源最大条目数：环境变量 `MAX_ITEMS_PER_FEED`

## GitHub Pages

Actions 会把 `collector/output/` 发布到 Pages。
首次使用需要在仓库设置里启用 Pages，并选择 `GitHub Actions` 作为来源。
