import { ensureValidStudent, handleError, loadState, readBody, responseJson, saveStudents } from '../../_shared/storage.js';

export const onRequestPut = async ({ request, env, params }) => {
  try {
    const body = await readBody(request);
    const { store, students, statuses } = await loadState(env);
    const existing = students.find((student) => student.id === params.id);

    if (!existing) {
      return responseJson({ message: '学员不存在' }, 404);
    }

    const result = ensureValidStudent({ ...existing, ...body }, statuses);

    if (result.error) {
      return responseJson({ message: result.error }, 400);
    }

    const nextStudents = students.map((student) =>
      student.id === params.id ? { ...student, ...result.value, updatedAt: new Date().toISOString() } : student,
    );

    await saveStudents(store, nextStudents);
    return responseJson({ student: nextStudents.find((student) => student.id === params.id) });
  } catch (error) {
    return handleError(error);
  }
};

export const onRequestDelete = async ({ env, params }) => {
  try {
    const { store, students } = await loadState(env);
    const nextStudents = students.filter((student) => student.id !== params.id);

    if (nextStudents.length === students.length) {
      return responseJson({ message: '学员不存在' }, 404);
    }

    await saveStudents(store, nextStudents);
    return responseJson({ ok: true });
  } catch (error) {
    return handleError(error);
  }
};