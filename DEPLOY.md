# StudentManage 部署说明

这个项目现在支持四种部署方式：

- Vercel：使用 Vercel Serverless API 和 Vercel Blob。
- Cloudflare Workers：推荐用于当前只能选择 Worker 的 Cloudflare 部署入口，使用 Worker Static Assets 和 KV。
- Cloudflare Pages：如果账号可以使用 Pages，可使用 Pages Functions 和 KV。
- 本地/VPS Node 服务：继续使用 `server.js` 和 JSON 文件存储。

## 方式一：Vercel 部署

Vercel 不能把仓库里的 `data/students.json` 和 `config/statuses.json` 当作可写数据库。当前 Vercel 入口已独立改为：

- 静态页面：`public/`
- API：`api/`
- 持久化：Vercel Blob

Cloudflare Worker 不会读取 `api/` 目录，因此这套改造不会影响 Cloudflare KV 部署。

### 1. 连接 GitHub

在 Vercel 中导入当前仓库：

```text
https://github.com/bsdai1990/StudentManage.git
```

一般保持默认配置即可：

```text
Framework Preset: Other
Build Command: 留空
Output Directory: 留空
Install Command: npm install
```

### 2. 启用 Blob Store

进入 Vercel 项目，创建并绑定 Blob Store。绑定后，Vercel 通常会自动注入：

```text
BLOB_READ_WRITE_TOKEN
```

如果页面能打开但新增、修改、删除返回 500，优先检查这个环境变量是否存在。

### 3. 数据存储位置

Vercel Blob 中使用两个对象路径：

```text
student-manager/students.json
student-manager/statuses.json
```

首次访问时如果 Blob 里还没有数据，接口会使用内置默认数据；后续页面里的新增、修改、删除会写入 Blob。

## 方式二：Cloudflare Workers 部署

当前线上地址是 `workers.dev`，应使用此方式。

### 1. 连接 GitHub

在 Cloudflare Workers 中导入当前仓库：

```text
https://github.com/bsdai1990/StudentManage.git
```

仓库根目录已有 `wrangler.toml`：

```text
main = "worker.mjs"
assets.directory = "./public"
assets.binding = "ASSETS"
```

部署后，Worker 会同时提供：

- `/`、`/app.js`、`/styles.css` 等静态文件
- `/api/students`、`/api/statuses` 等接口

### 2. 配置 KV 绑定

完整功能必须绑定 KV，否则 `/api/students` 会返回服务错误。

进入 Worker 项目设置，添加 KV namespace binding：

```text
Variable name: STUDENT_MANAGER_KV
KV namespace: 新建或选择一个 KV 命名空间
```

变量名必须完全一致。

### 3. 数据初始化

如果 KV 里还没有数据，应用会自动使用内置默认数据启动：

- 状态：`新学员`、`学习中`、`暂停`、`已结课`
- 示例学员：`张三`、`李四`

后续在页面里新增、删除、修改的数据会写入 KV。

如果要迁移本地数据，可在 Cloudflare KV 中手动写入两个键：

```text
students
statuses
```

值分别使用本地文件内容：

- `data/students.json`
- `config/statuses.json`

## 方式三：Cloudflare Pages 部署

如果你的账号可以选择 Pages，也可以使用此方式。

### 1. 连接 GitHub

在 Cloudflare Pages 中选择当前仓库：

```text
https://github.com/bsdai1990/StudentManage.git
```

### 2. 构建配置

推荐配置：

```text
框架预设：None
构建命令：留空
构建输出目录：public
根目录：/
```

如果 Cloudflare 不允许构建命令留空：

```text
构建命令：echo "no build"
构建输出目录：public
根目录：/
```

### 3. 配置 KV 绑定

进入 Pages 项目：

```text
Settings → Functions → KV namespace bindings
```

添加绑定：

```text
Variable name: STUDENT_MANAGER_KV
KV namespace: 新建或选择一个 KV 命名空间
```

## 方式四：本地/VPS Node 部署

### 环境要求

- Node.js 18 或更高版本
- 不需要数据库
- 默认端口：3000

### 部署步骤

1. 解压部署包到服务器目录。
2. 进入解压后的目录。
3. 启动服务：

```bash
npm start
```

4. 浏览器访问：

```text
http://服务器IP:3000
```

### 修改端口

Linux/macOS：

```bash
PORT=8080 npm start
```

Windows PowerShell：

```powershell
$env:PORT=8080; npm start
```

### 数据文件

- 学员数据：`data/students.json`
- 状态配置：`config/statuses.json`

### 生产运行建议

如果服务器使用 Linux，建议用 `pm2` 或系统服务托管 Node 进程，例如：

```bash
npm install -g pm2
pm2 start server.js --name student-manage
pm2 save
```