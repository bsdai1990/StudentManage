# 学员信息管理

一个极简 Web 应用，用于维护学员姓名和当前状态。

## 两种运行模式

### 本地 Node 版本

- `server.js`：提供静态页面和 API。
- `config/statuses.json`：维护可选状态。
- `data/students.json`：存储学员数据。
- 不需要数据库，也不需要外部依赖。

运行：

```bash
npm start
```

然后打开：

```text
http://localhost:3000
```

### Cloudflare Pages 版本

- `public/`：静态页面。
- `functions/api/`：Cloudflare Pages Functions API。
- `STUDENT_MANAGER_KV`：Cloudflare KV 绑定，用于持久化学员和状态数据。

Cloudflare Pages 连接 GitHub 后，配置：

```text
构建命令：留空
构建输出目录：public
根目录：/
```

如果页面要求必须填写构建命令：

```text
构建命令：echo "no build"
构建输出目录：public
```

然后在 Cloudflare Pages 项目的 Settings → Functions → KV namespace bindings 中添加绑定：

```text
Variable name: STUDENT_MANAGER_KV
KV namespace: 选择或新建一个 KV 命名空间
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
