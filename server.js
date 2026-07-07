const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const rootDir = __dirname;
const publicDir = path.join(rootDir, 'public');
const studentsFile = path.join(rootDir, 'data', 'students.json');
const statusesFile = path.join(rootDir, 'config', 'statuses.json');
const port = Number(process.env.PORT || 3000);
const blobStorage = process.env.BLOB_READ_WRITE_TOKEN ? require('./api/_shared/vercelBlobStorage') : null;

const json = (response, statusCode, payload) => {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
};

const readJson = async (filePath, fallback) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
};

const writeJson = async (filePath, payload) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
};

const readBody = (request) =>
  new Promise((resolve, reject) => {
    const chunks = [];

    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      if (!chunks.length) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (error) {
        reject(Object.assign(new Error('请求体必须是合法 JSON'), { statusCode: 400 }));
      }
    });
    request.on('error', reject);
  });

const normalizeStatuses = (statuses) =>
  statuses.map((status) => (typeof status === 'string' ? status : status.label || status.value || '')).map((status) => String(status).trim());

const loadState = async () => {
  if (blobStorage) return blobStorage.loadState();

  const [studentsData, statusesData] = await Promise.all([
    readJson(studentsFile, { students: [] }),
    readJson(statusesFile, { statuses: [] }),
  ]);

  return {
    students: Array.isArray(studentsData.students) ? studentsData.students : [],
    statuses: Array.isArray(statusesData.statuses) ? normalizeStatuses(statusesData.statuses).filter(Boolean) : [],
  };
};

const saveStudents = async (students) => {
  if (blobStorage) {
    await blobStorage.saveStudents(students);
    return;
  }

  await writeJson(studentsFile, { students });
};

const saveStatuses = async (statuses) => {
  if (blobStorage) {
    await blobStorage.saveStatuses(statuses);
    return;
  }

  await writeJson(statusesFile, { statuses });
};

const ensureValidStudent = ({ name, status }, statuses) => {
  const safeName = String(name || '').trim();
  const safeStatus = String(status || statuses[0] || '').trim();

  if (!safeName) {
    return { error: '姓名不能为空' };
  }

  if (!statuses.includes(safeStatus)) {
    return { error: '学员状态不在配置文件中' };
  }

  return { value: { name: safeName, status: safeStatus } };
};

const studentHandlers = {
  list: async (_request, response) => {
    const state = await loadState();
    json(response, 200, state);
  },

  create: async (request, response) => {
    const body = await readBody(request);
    const state = await loadState();
    const result = ensureValidStudent(body, state.statuses);

    if (result.error) {
      json(response, 400, { message: result.error });
      return;
    }

    const student = {
      id: crypto.randomUUID(),
      ...result.value,
      createdAt: new Date().toISOString(),
    };

    const students = [student, ...state.students];
    await saveStudents(students);
    json(response, 201, { student });
  },

  update: async (request, response, id) => {
    const body = await readBody(request);
    const state = await loadState();
    const existing = state.students.find((student) => student.id === id);

    if (!existing) {
      json(response, 404, { message: '学员不存在' });
      return;
    }

    const result = ensureValidStudent({ ...existing, ...body }, state.statuses);

    if (result.error) {
      json(response, 400, { message: result.error });
      return;
    }

    const students = state.students.map((student) =>
      student.id === id ? { ...student, ...result.value, updatedAt: new Date().toISOString() } : student,
    );

    await saveStudents(students);
    json(response, 200, { student: students.find((student) => student.id === id) });
  },

  remove: async (_request, response, id) => {
    const state = await loadState();
    const students = state.students.filter((student) => student.id !== id);

    if (students.length === state.students.length) {
      json(response, 404, { message: '学员不存在' });
      return;
    }

    await saveStudents(students);
    json(response, 200, { ok: true });
  },
};

const ensureValidStatuses = (statuses, students = []) => {
  if (!Array.isArray(statuses) || statuses.length === 0) {
    return { error: '状态列表不能为空' };
  }

  const normalized = normalizeStatuses(statuses).filter(Boolean);

  if (normalized.length !== statuses.length) {
    return { error: '状态名称不能为空' };
  }

  const uniqueStatuses = new Set(normalized);

  if (uniqueStatuses.size !== normalized.length) {
    return { error: '状态名称不能重复' };
  }

  const usedStatuses = new Set(students.map((student) => student.status));
  const missingUsedStatuses = [...usedStatuses].filter((status) => !uniqueStatuses.has(status));

  if (missingUsedStatuses.length) {
    return { error: `不能删除正在使用的状态：${missingUsedStatuses.join('、')}` };
  }

  return { value: normalized };
};

const statusHandlers = {
  list: async (_request, response) => {
    const { statuses } = await loadState();
    json(response, 200, { statuses });
  },

  update: async (request, response) => {
    const body = await readBody(request);
    const state = await loadState();
    const result = ensureValidStatuses(body.statuses, state.students);

    if (result.error) {
      json(response, 400, { message: result.error });
      return;
    }

    await saveStatuses(result.value);
    json(response, 200, { statuses: result.value });
  },
};

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const serveStatic = async (request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const relativePath = requestPath === '/' ? 'index.html' : requestPath.slice(1);
  const filePath = path.normalize(path.join(publicDir, relativePath));

  if (!filePath.startsWith(publicDir)) {
    json(response, 403, { message: '非法路径' });
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    response.writeHead(200, { 'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream' });
    response.end(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      json(response, 404, { message: '页面不存在' });
      return;
    }
    throw error;
  }
};

const route = async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const [, scope, resource, id] = url.pathname.split('/');

  if (url.pathname === '/api/students' && request.method === 'GET') return studentHandlers.list(request, response);
  if (url.pathname === '/api/students' && request.method === 'POST') return studentHandlers.create(request, response);
  if (url.pathname === '/api/statuses' && request.method === 'GET') return statusHandlers.list(request, response);
  if (url.pathname === '/api/statuses' && request.method === 'PUT') return statusHandlers.update(request, response);
  if (scope === 'api' && resource === 'students' && id && request.method === 'PUT') {
    return studentHandlers.update(request, response, id);
  }
  if (scope === 'api' && resource === 'students' && id && request.method === 'DELETE') {
    return studentHandlers.remove(request, response, id);
  }

  if (url.pathname.startsWith('/api/')) {
    json(response, 404, { message: '接口不存在' });
    return undefined;
  }

  return serveStatic(request, response);
};

const server = http.createServer((request, response) => {
  route(request, response).catch((error) => {
    const statusCode = error.statusCode || 500;
    if (statusCode === 500) console.error(error);
    json(response, statusCode, { message: statusCode === 500 ? '服务内部错误' : error.message });
  });
});

server.listen(port, () => {
  console.log(`Student manager is running at http://localhost:${port}`);
});