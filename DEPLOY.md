# StudentManage 部署说明

## 环境要求

- Node.js 18 或更高版本
- 不需要数据库
- 默认端口：3000

## 部署步骤

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

## 修改端口

Linux/macOS：

```bash
PORT=8080 npm start
```

Windows PowerShell：

```powershell
$env:PORT=8080; npm start
```

## 数据文件

- 学员数据：`data/students.json`
- 状态配置：`config/statuses.json`

## 生产运行建议

如果服务器使用 Linux，建议用 `pm2` 或系统服务托管 Node 进程，例如：

```bash
npm install -g pm2
pm2 start server.js --name student-manage
pm2 save
```