import { ensureValidStudent, handleError, loadState, readBody, responseJson, saveStudents } from '../_shared/storage.js';

export const onRequestGet = async ({ env }) => {
  try {
    const { students, statuses } = await loadState(env);
    return responseJson({ students, statuses });
  } catch (error) {
    return handleError(error);
  }
};

export const onRequestPost = async ({ request, env }) => {
  try {
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
  } catch (error) {
    return handleError(error);
  }
};