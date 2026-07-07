const {
  allowMethods,
  ensureValidStudent,
  loadState,
  readBody,
  saveStudents,
  sendError,
  sendJson,
} = require('../_shared/vercelBlobStorage');

module.exports = async (request, response) => {
  if (!allowMethods(request, response, ['PUT', 'DELETE'])) return;

  try {
    const { id } = request.query;
    const studentId = Array.isArray(id) ? id[0] : id;
    const { students, statuses } = await loadState();

    if (request.method === 'DELETE') {
      const nextStudents = students.filter((student) => student.id !== studentId);

      if (nextStudents.length === students.length) {
        sendJson(response, 404, { message: '学员不存在' });
        return;
      }

      await saveStudents(nextStudents);
      sendJson(response, 200, { ok: true });
      return;
    }

    const existing = students.find((student) => student.id === studentId);

    if (!existing) {
      sendJson(response, 404, { message: '学员不存在' });
      return;
    }

    const body = await readBody(request);
    const result = ensureValidStudent({ ...existing, ...body }, statuses);

    if (result.error) {
      sendJson(response, 400, { message: result.error });
      return;
    }

    const nextStudents = students.map((student) =>
      student.id === studentId ? { ...student, ...result.value, updatedAt: new Date().toISOString() } : student,
    );

    await saveStudents(nextStudents);
    sendJson(response, 200, { student: nextStudents.find((student) => student.id === studentId) });
  } catch (error) {
    sendError(response, error);
  }
};