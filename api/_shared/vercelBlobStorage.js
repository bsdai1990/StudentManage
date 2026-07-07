const STUDENTS_KEY = 'student-manager/students.json';
const STATUSES_KEY = 'student-manager/statuses.json';

const defaultStudents = [
  {
    id: 'sample-1',
    name: '张三',
    status: '学习中',
    createdAt: '2026-07-04T00:00:00.000Z',
  },
  {
    id: 'sample-2',
    name: '李四',
    status: '新学员',
    createdAt: '2026-07-04T00:00:00.000Z',
  },
];

const defaultStatuses = ['新学员', '学习中', '暂停', '已结课'];

const blobApi = async () => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw Object.assign(new Error('缺少 Vercel Blob 配置 BLOB_READ_WRITE_TOKEN'), { statusCode: 500 });
  }

  return import('@vercel/blob');
};

const normalizeStatuses = (statuses) =>
  statuses
    .map((status) => (typeof status === 'string' ? status : status?.label || status?.value || ''))
    .map((status) => String(status).trim());

const readBlobJson = async (key, fallback) => {
  const { head } = await blobApi();

  try {
    const blob = await head(key);
    const response = await fetch(blob.url, { cache: 'no-store' });

    if (!response.ok) {
      throw Object.assign(new Error('读取 Blob 数据失败'), { statusCode: 500 });
    }

    return response.json();
  } catch (error) {
    const message = String(error.message || '').toLowerCase();
    if (error.statusCode === 404 || error.name === 'BlobNotFoundError') return fallback;
    if (message.includes('not found') || message.includes('does not exist')) return fallback;
    throw error;
  }
};

const writeBlobJson = async (key, payload) => {
  const { put } = await blobApi();
  await put(key, JSON.stringify(payload, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json; charset=utf-8',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
};

const parseBody = (body) => {
  if (!body) return {};
  if (typeof body === 'object') return body;

  try {
    return JSON.parse(body);
  } catch (error) {
    throw Object.assign(new Error('请求体必须是合法 JSON'), { statusCode: 400 });
  }
};

const readBody = async (request) => {
  if (request.body !== undefined) return parseBody(request.body);

  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};

  return parseBody(Buffer.concat(chunks).toString('utf8'));
};

const loadState = async () => {
  const [studentsData, statusesData] = await Promise.all([
    readBlobJson(STUDENTS_KEY, { students: defaultStudents }),
    readBlobJson(STATUSES_KEY, { statuses: defaultStatuses }),
  ]);

  return {
    students: Array.isArray(studentsData.students) ? studentsData.students : [],
    statuses: Array.isArray(statusesData.statuses) ? normalizeStatuses(statusesData.statuses).filter(Boolean) : [],
  };
};

const saveStudents = async (students) => {
  await writeBlobJson(STUDENTS_KEY, { students });
};

const saveStatuses = async (statuses) => {
  await writeBlobJson(STATUSES_KEY, { statuses });
};

const ensureValidStudent = ({ name, status }, statuses) => {
  const safeName = String(name || '').trim();
  const safeStatus = String(status || statuses[0] || '').trim();

  if (!safeName) return { error: '姓名不能为空' };
  if (!statuses.includes(safeStatus)) return { error: '学员状态不在配置中' };

  return { value: { name: safeName, status: safeStatus } };
};

const ensureValidStatuses = (statuses, students = []) => {
  if (!Array.isArray(statuses) || statuses.length === 0) {
    return { error: '状态列表不能为空' };
  }

  const normalized = normalizeStatuses(statuses).filter(Boolean);

  if (normalized.length !== statuses.length) return { error: '状态名称不能为空' };

  const uniqueStatuses = new Set(normalized);
  if (uniqueStatuses.size !== normalized.length) return { error: '状态名称不能重复' };

  const usedStatuses = new Set(students.map((student) => student.status));
  const missingUsedStatuses = [...usedStatuses].filter((status) => !uniqueStatuses.has(status));

  if (missingUsedStatuses.length) {
    return { error: `不能删除正在使用的状态：${missingUsedStatuses.join('、')}` };
  }

  return { value: normalized };
};

const sendJson = (response, statusCode, payload) => {
  response.status(statusCode).setHeader('Cache-Control', 'no-store');
  response.json(payload);
};

const errorPayload = (statusCode, error) => {
  if (statusCode !== 500) return { message: error.message };

  return {
    message: '服务内部错误',
    detail: process.env.VERCEL ? `${error.name || 'Error'}: ${error.message || '未知错误'}` : undefined,
  };
};

const sendError = (response, error) => {
  const statusCode = error.statusCode || 500;
  if (statusCode === 500) console.error(error);
  sendJson(response, statusCode, errorPayload(statusCode, error));
};

const allowMethods = (request, response, methods) => {
  if (methods.includes(request.method)) return true;

  response.setHeader('Allow', methods.join(', '));
  sendJson(response, 405, { message: '请求方法不支持' });
  return false;
};

module.exports = {
  allowMethods,
  ensureValidStatuses,
  ensureValidStudent,
  loadState,
  readBody,
  saveStatuses,
  saveStudents,
  sendError,
  sendJson,
};