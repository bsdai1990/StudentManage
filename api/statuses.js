const {
  allowMethods,
  ensureValidStatuses,
  loadState,
  readBody,
  saveStatuses,
  sendError,
  sendJson,
} = require('./_shared/vercelBlobStorage');

module.exports = async (request, response) => {
  if (!allowMethods(request, response, ['GET', 'PUT'])) return;

  try {
    if (request.method === 'GET') {
      const { statuses } = await loadState();
      sendJson(response, 200, { statuses });
      return;
    }

    const body = await readBody(request);
    const { students } = await loadState();
    const result = ensureValidStatuses(body.statuses, students);

    if (result.error) {
      sendJson(response, 400, { message: result.error });
      return;
    }

    await saveStatuses(result.value);
    sendJson(response, 200, { statuses: result.value });
  } catch (error) {
    sendError(response, error);
  }
};