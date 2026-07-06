import { ensureValidStatuses, handleError, loadState, readBody, responseJson, saveStatuses } from '../_shared/storage.js';

export const onRequestPut = async ({ request, env }) => {
  try {
    const body = await readBody(request);
    const { store, students } = await loadState(env);
    const result = ensureValidStatuses(body.statuses, students);

    if (result.error) {
      return responseJson({ message: result.error }, 400);
    }

    await saveStatuses(store, result.value);
    return responseJson({ statuses: result.value });
  } catch (error) {
    return handleError(error);
  }
};