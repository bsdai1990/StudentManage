const elements = {
  studentDialog: document.querySelector('#studentDialog'),
  statusDialog: document.querySelector('#statusDialog'),
  studentForm: document.querySelector('#studentForm'),
  statusForm: document.querySelector('#statusForm'),
  name: document.querySelector('#studentName'),
  status: document.querySelector('#studentStatus'),
  filter: document.querySelector('#statusFilter'),
  search: document.querySelector('#studentSearch'),
  list: document.querySelector('#studentList'),
  stats: document.querySelector('#statusStats'),
  message: document.querySelector('#message'),
  refresh: document.querySelector('#refreshButton'),
  openStudentModal: document.querySelector('#openStudentModal'),
  openStatusModal: document.querySelector('#openStatusModal'),
  addStatusRow: document.querySelector('#addStatusRow'),
  statusEditor: document.querySelector('#statusEditor'),
  studentTemplate: document.querySelector('#studentTemplate'),
  statTemplate: document.querySelector('#statTemplate'),
  statusRowTemplate: document.querySelector('#statusRowTemplate'),
};

let model = {
  students: [],
  statuses: [],
};

const api = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || '请求失败');
  }

  return payload;
};

const statusLabel = (value) => value;

const setMessage = (message, isError = false) => {
  elements.message.textContent = message;
  elements.message.style.color = isError ? '#dc2626' : '#2563eb';
};

const showDialog = (dialog) => {
  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
    return;
  }

  dialog.setAttribute('open', '');
};

const closeDialog = (dialog) => {
  if (typeof dialog.close === 'function') {
    dialog.close();
    return;
  }

  dialog.removeAttribute('open');
};

const fillStatusOptions = (select, selectedValue, withAllOption = false) => {
  select.replaceChildren();

  if (withAllOption) {
    select.append(new Option('全部状态', 'all'));
  }

  model.statuses.forEach((status) => {
    select.append(new Option(status, status));
  });

  select.value = selectedValue || (withAllOption ? 'all' : model.statuses[0] || '');
};

const statusCounts = () => {
  const counts = new Map(model.statuses.map((status) => [status, 0]));

  model.students.forEach((student) => {
    counts.set(student.status, (counts.get(student.status) || 0) + 1);
  });

  return counts;
};

const visibleStudents = () => {
  const keyword = elements.search.value.trim().toLowerCase();
  const filter = elements.filter.value;

  return model.students.filter((student) => {
    const matchesStatus = filter === 'all' || student.status === filter;
    const matchesKeyword = !keyword || student.name.toLowerCase().includes(keyword);
    return matchesStatus && matchesKeyword;
  });
};

const renderStats = () => {
  const counts = statusCounts();
  const nodes = model.statuses.map((status) => {
    const node = elements.statTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector('[data-role="count"]').textContent = counts.get(status) || 0;
    node.querySelector('[data-role="label"]').textContent = status;
    return node;
  });

  elements.stats.replaceChildren(...nodes);
};

const renderStudent = (student) => {
  const node = elements.studentTemplate.content.firstElementChild.cloneNode(true);
  const name = node.querySelector('[data-role="name"]');
  const meta = node.querySelector('[data-role="meta"]');
  const status = node.querySelector('[data-role="status"]');
  const remove = node.querySelector('[data-role="delete"]');

  name.textContent = student.name;
  meta.textContent = `当前状态：${statusLabel(student.status)}`;
  fillStatusOptions(status, student.status);

  status.addEventListener('change', async () => {
    try {
      await api(`/api/students/${student.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: status.value }),
      });
      await load();
      setMessage('状态已更新');
    } catch (error) {
      status.value = student.status;
      setMessage(error.message, true);
    }
  });

  remove.addEventListener('click', async () => {
    if (!confirm(`确认删除学员「${student.name}」？`)) return;

    try {
      await api(`/api/students/${student.id}`, { method: 'DELETE' });
      await load();
      setMessage('学员已删除');
    } catch (error) {
      setMessage(error.message, true);
    }
  });

  return node;
};

const renderStudents = () => {
  const students = visibleStudents();

  if (!students.length) {
    elements.list.innerHTML = '<div class="empty">暂无匹配学员</div>';
    return;
  }

  elements.list.replaceChildren(...students.map(renderStudent));
};

const render = () => {
  renderStats();
  renderStudents();
};

const addStatusEditorRow = (status = '') => {
  const row = elements.statusRowTemplate.content.firstElementChild.cloneNode(true);
  const name = row.querySelector('[data-role="name"]');
  const remove = row.querySelector('[data-role="remove"]');

  name.value = status;
  remove.addEventListener('click', () => row.remove());

  elements.statusEditor.append(row);
};

const openStatusEditor = () => {
  elements.statusEditor.replaceChildren();
  model.statuses.forEach(addStatusEditorRow);
  showDialog(elements.statusDialog);
};

const readStatusEditor = () =>
  [...elements.statusEditor.querySelectorAll('.status-row')].map((row) => row.querySelector('[data-role="name"]').value);

const load = async () => {
  model = await api('/api/students');
  fillStatusOptions(elements.status, elements.status.value);
  fillStatusOptions(elements.filter, elements.filter.value || 'all', true);
  render();
};

elements.openStudentModal.addEventListener('click', () => {
  elements.studentForm.reset();
  fillStatusOptions(elements.status, model.statuses[0]);
  showDialog(elements.studentDialog);
  elements.name.focus();
});

elements.openStatusModal.addEventListener('click', openStatusEditor);

elements.addStatusRow.addEventListener('click', () => addStatusEditorRow());

document.querySelectorAll('[data-close]').forEach((button) => {
  button.addEventListener('click', () => closeDialog(document.querySelector(`#${button.dataset.close}`)));
});

elements.studentForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    await api('/api/students', {
      method: 'POST',
      body: JSON.stringify({
        name: elements.name.value,
        status: elements.status.value,
      }),
    });

    closeDialog(elements.studentDialog);
    await load();
    setMessage('学员已添加');
  } catch (error) {
    setMessage(error.message, true);
  }
});

elements.statusForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const payload = { statuses: readStatusEditor() };
    const result = await api('/api/statuses', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    model.statuses = result.statuses;
    closeDialog(elements.statusDialog);
    await load();
    setMessage('状态配置已保存');
  } catch (error) {
    setMessage(error.message, true);
  }
});

elements.filter.addEventListener('change', renderStudents);
elements.search.addEventListener('input', renderStudents);
elements.refresh.addEventListener('click', () => load().then(() => setMessage('数据已刷新')).catch((error) => setMessage(error.message, true)));

load().catch((error) => setMessage(error.message, true));