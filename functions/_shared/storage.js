const STUDENTS_KEY = 'students';
const STATUSES_KEY = 'statuses';

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

export const responseJson = (payload, status = 200) =>
  Response.json(payload, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });

export const responseError = (message, status = 400) => responseJson({ message }, status);

const normalizeStatuses = (statuses) =>
  statuses
    .map((status) => (typeof status === 'string' ? status : status?.label || status?.value || ''))
    .map((status) => String(status).trim());

const requireStore = (env) => {
  if (!env.STUDENT_MANAGER_KV) {
    throw Object.assign(new Error('缺少 KV 绑定 STUDENT_MANAGER_KV'), { statusCode: 500 });
  }

  return env.STUDENT_MANAGER_KV;
};

const readKvJson = async (store, key, fallback) => {
  const value = await store.get(key, { type: 'json' });
  return value ?? fallback;
};

const writeKvJson = async (store, key, payload) => {
  await store.put(key, JSON.stringify(payload));
};

export const readBody = async (request) => {
  if (request.method === 'GET' || request.method === 'HEAD') return {};

  const content = await request.text();
  if (!content.trim()) return {};

  try {
    return JSON.parse(content);
  } catch (error) {
    throw Object.assign(new Error('请求体必须是合法 JSON'), { statusCode: 400 });
  }
};

export const loadState = async (env) => {
  const store = requireStore(env);
  const [studentsData, statusesData] = await Promise.all([
    readKvJson(store, STUDENTS_KEY, { students: defaultStudents }),
    readKvJson(store, STATUSES_KEY, { statuses: defaultStatuses }),
  ]);

  return {
    store,
    students: Array.isArray(studentsData.students) ? studentsData.students : [],
    statuses: Array.isArray(statusesData.statuses) ? normalizeStatuses(statusesData.statuses).filter(Boolean) : [],
  };
};

export const saveStudents = async (store, students) => {
  await writeKvJson(store, STUDENTS_KEY, { students });
};

export const saveStatuses = async (store, statuses) => {
  await writeKvJson(store, STATUSES_KEY, { statuses });
};

export const ensureValidStudent = ({ name, status }, statuses) => {
  const safeName = String(name || '').trim();
  const safeStatus = String(status || statuses[0] || '').trim();

  if (!safeName) {
    return { error: '姓名不能为空' };
  }

  if (!statuses.includes(safeStatus)) {
    return { error: '学员状态不在配置中' };
  }

  return { value: { name: safeName, status: safeStatus } };
};

export const ensureValidStatuses = (statuses, students = []) => {
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

export const handleError = (error) => {
  const statusCode = error.statusCode || 500;
  return responseError(statusCode === 500 ? '服务内部错误' : error.message, statusCode);
};