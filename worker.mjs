import {
  ensureValidStatuses,
  ensureValidStudent,
  handleError,
  loadState,
  readBody,
  responseJson,
  saveStatuses,
  saveStudents,
} from './functions/_shared/storage.js';

const notFound = () => responseJson({ message: '接口不存在' }, 404);

const listStudents = async (env) => {
  const { students, statuses } = await loadState(env);
  return responseJson({ students, statuses });
};

const createStudent = async (request, env) => {
  const body = await readBody(request);
  const { store, students, statuses } = await loadState(env);
  const result = ensureValidStudent(body, statuses);

  if (result.error) {
    return responseJson({ message: result.error }, 400);
  }

  const student = {
    id: crypto.randomUUID(),
    ...result.value,
    createdAt: new Date().toISOString(),
  };

  await saveStudents(store, [student, ...students]);
  return responseJson({ student }, 201);
};

const updateStudent = async (request, env, id) => {
  const body = await readBody(request);
  const { store, students, statuses } = await loadState(env);
  const existing = students.find((student) => student.id === id);

  if (!existing) {
    return responseJson({ message: '学员不存在' }, 404);
  }

  const result = ensureValidStudent({ ...existing, ...body }, statuses);

  if (result.error) {
    return responseJson({ message: result.error }, 400);
  }

  const nextStudents = students.map((student) =>
    student.id === id ? { ...student, ...result.value, updatedAt: new Date().toISOString() } : student,
  );

  await saveStudents(store, nextStudents);
  return responseJson({ student: nextStudents.find((student) => student.id === id) });
};

const removeStudent = async (env, id) => {
  const { store, students } = await loadState(env);
  const nextStudents = students.filter((student) => student.id !== id);

  if (nextStudents.length === students.length) {
    return responseJson({ message: '学员不存在' }, 404);
  }

  await saveStudents(store, nextStudents);
  return responseJson({ ok: true });
};

const updateStatuses = async (request, env) => {
  const body = await readBody(request);
  const { store, students } = await loadState(env);
  const result = ensureValidStatuses(body.statuses, students);

  if (result.error) {
    return responseJson({ message: result.error }, 400);
  }

  await saveStatuses(store, result.value);
  return responseJson({ statuses: result.value });
};

const routeApi = async (request, env) => {
  const url = new URL(request.url);
  const [, scope, resource, id] = url.pathname.split('/');

  if (scope !== 'api') return null;
  if (resource === 'students' && !id && request.method === 'GET') return listStudents(env);
  if (resource === 'students' && !id && request.method === 'POST') return createStudent(request, env);
  if (resource === 'students' && id && request.method === 'PUT') return updateStudent(request, env, id);
  if (resource === 'students' && id && request.method === 'DELETE') return removeStudent(env, id);
  if (resource === 'statuses' && !id && request.method === 'PUT') return updateStatuses(request, env);

  return notFound();
};

export default {
  async fetch(request, env) {
    try {
      const apiResponse = await routeApi(request, env);
      if (apiResponse) return apiResponse;

      return env.ASSETS.fetch(request);
    } catch (error) {
      return handleError(error);
    }
  },
};