const { randomUUID } = require('node:crypto');
const {
  allowMethods,
  ensureValidStudent,
  loadState,
  readBody,
  saveStudents,
  sendError,
  sendJson,
} = require('./_shared/vercelBlobStorage');

module.exports = async (request, response) => {
  if (!allowMethods(request, response, ['GET', 'POST'])) return;

  try {
    if (request.method === 'GET') {
      const state = await loadState();
      sendJson(response, 200, state);
      return;
    }

    const body = await readBody(request);
    const { students, statuses } = await loadState();
    const result = ensureValidStudent(body, statuses);

    if (result.error) {
      sendJson(response, 400, { message: result.error });
      return;
    }

    const student = {
      id: randomUUID(),
      ...result.value,
      createdAt: new Date().toISOString(),
    };

    await saveStudents([student, ...students]);
    sendJson(response, 201, { student });
  } catch (error) {
    sendError(response, error);
  }
};