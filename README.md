# 学员信息管理

一个极简 Web 应用，用于维护学员姓名和当前状态。

## 三种运行模式

### Vercel 版本

适合部署到 Vercel，使用 Vercel Blob 做持久化，不写入仓库里的 JSON 文件。

- `api/`：Vercel Serverless API，处理 `/api/*` 接口。
- `api/_shared/vercelBlobStorage.js`：Vercel Blob 数据层。
- `public/`：静态页面、样式和前端交互。
- `BLOB_READ_WRITE_TOKEN`：Vercel Blob 写入凭据，通常在项目绑定 Blob Store 后自动注入。

Vercel 连接 GitHub 后，需要在项目中启用 Blob Store。启用后，新增、修改、删除学员和状态都会写入 Blob。

### Cloudflare Workers 版本

这是 Cloudflare 部署方式，适合只能选择 Worker 的 Cloudflare 后台。

- `worker.mjs`：统一处理静态资源和 `/api/*` 接口。
- `public/`：静态页面、样式和前端交互。
- `wrangler.toml`：Worker 入口、静态资产目录和运行配置。
- `STUDENT_MANAGER_KV`：Cloudflare KV 绑定，用于持久化学员和状态数据。

Cloudflare Workers 连接 GitHub 后，使用仓库内的 `wrangler.toml` 部署。

必须在 Worker 项目里绑定 KV：

```text
Variable name: STUDENT_MANAGER_KV
```

### 本地 Node 版本

- `server.js`：提供静态页面和 API。
- `config/statuses.json`：维护可选状态。
- `data/students.json`：存储学员数据。
- 本地/VPS 运行不需要数据库，首次部署执行 `npm install` 安装运行依赖。

运行：

```bash
npm start
```

然后打开：

```text
http://localhost:3000
```

### Cloudflare Pages 版本

如果你的账号可以使用 Pages，也可以继续使用：

- `public/`：静态页面。
- `functions/api/`：Cloudflare Pages Functions API。
- `STUDENT_MANAGER_KV`：Cloudflare KV 绑定，用于持久化学员和状态数据。

Cloudflare Pages 连接 GitHub 后，配置：

```text
构建命令：留空
构建输出目录：public
根目录：/
```

## 数据结构

状态配置：

```json
{
  "statuses": ["新学员", "学习中", "暂停", "已结课"]
}
```

学员数据：

```json
{
  "students": [
    {
      "id": "sample-1",
      "name": "张三",
      "status": "学习中",
      "createdAt": "2026-07-04T00:00:00.000Z"
    }
  ]
}
```

Cloudflare KV 中使用两个键：

- `statuses`
- `students`

Vercel Blob 中使用两个对象路径：

- `student-manager/statuses.json`
- `student-manager/students.json`
