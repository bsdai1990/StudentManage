# 学员信息管理

一个极简本地 Web 应用，用于维护学员姓名和当前状态。

## 数据结构

- `config/statuses.json`：维护可选状态。
- `data/students.json`：存储学员数据。
- `server.js`：提供静态页面和 API，使用 Node.js 原生模块，无需数据库。
- `public/`：前端页面、样式和交互逻辑。

## 运行

```bash
npm start
```

然后打开：

```text
http://localhost:3000
```

## 常用维护

修改状态选项：编辑 `config/statuses.json`。

新增状态示例：

```json
"试听中"
```