# StudentManage 部署说明

这个项目现在支持两种部署方式：

- 本地/VPS Node 服务：继续使用 `server.js` 和 JSON 文件存储。
- Cloudflare Pages：使用 `public/` 静态资源、`functions/` API 和 Cloudflare KV 存储。

## 方式一：Cloudflare Pages 部署

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

Cloudflare Pages 不能持久写入仓库内 JSON 文件，所以完整功能依赖 KV。

进入 Pages 项目：

```text
Settings → Functions → KV namespace bindings
```

添加绑定：

```text
Variable name: STUDENT_MANAGER_KV
KV namespace: 新建或选择一个 KV 命名空间
```

生产环境和预览环境建议都绑定同名变量。

### 4. 数据初始化

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

## 方式二：本地/VPS Node 部署

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