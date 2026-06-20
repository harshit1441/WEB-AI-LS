const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const submitButton = document.getElementById('submit-btn');
const cancelEditButton = document.getElementById('cancel-edit-btn');
const clearAllButton = document.getElementById('clear-all-btn');
const taskList = document.getElementById('task-list');
const taskCount = document.getElementById('task-count');
const notice = document.getElementById('notice');
const emptyState = document.getElementById('empty-state');

const storageKey = 'week2-task-manager';

let tasks = loadTasks();
let editingTaskId = null;

function loadTasks() {
    try {
        const storedTasks = JSON.parse(localStorage.getItem(storageKey));
        return Array.isArray(storedTasks) ? storedTasks : [];
    } catch {
        return [];
    }
}

function saveTasks() {
    localStorage.setItem(storageKey, JSON.stringify(tasks));
}

function createTaskId() {
    return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function setNotice(message, type) {
    notice.textContent = message;
    notice.className = `notice ${type}`;

    if (message) {
        window.clearTimeout(setNotice.timer);
        setNotice.timer = window.setTimeout(() => {
            notice.textContent = '';
            notice.className = 'notice';
        }, 2500);
    }
}

function resetForm() {
    taskForm.reset();
    taskInput.focus();
    editingTaskId = null;
    submitButton.textContent = 'Add Task';
    cancelEditButton.hidden = true;
}

function updateStats() {
    const count = tasks.length;
    taskCount.textContent = `${count} task${count === 1 ? '' : 's'}`;
    emptyState.classList.toggle('show', count === 0);
}

function renderTasks() {
    taskList.innerHTML = tasks
        .map((task) => `
            <li class="task-item" data-id="${task.id}">
                <div class="task-copy">
                    <strong>${escapeHtml(task.title)}</strong>
                    <span>Created ${new Date(task.createdAt).toLocaleString()}</span>
                </div>
                <div class="task-buttons">
                    <button type="button" class="task-action edit" data-action="edit" aria-label="Edit ${escapeHtml(task.title)}">Edit</button>
                    <button type="button" class="task-action delete" data-action="delete" aria-label="Delete ${escapeHtml(task.title)}">Delete</button>
                </div>
            </li>
        `)
        .join('');

    updateStats();
}

function normalizeTitle(value) {
    return value.trim().replace(/\s+/g, ' ');
}

function findTask(id) {
    return tasks.find((task) => task.id === id);
}

taskForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const title = normalizeTitle(taskInput.value);

    if (!title) {
        setNotice('Please enter a task before submitting.', 'error');
        taskInput.focus();
        return;
    }

    if (editingTaskId) {
        const task = findTask(editingTaskId);

        if (!task) {
            setNotice('The task you were editing no longer exists.', 'error');
            resetForm();
            return;
        }

        task.title = title;
        task.updatedAt = new Date().toISOString();
        saveTasks();
        renderTasks();
        setNotice('Task updated successfully.', 'success');
        resetForm();
        return;
    }

    tasks.unshift({
        id: createTaskId(),
        title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

    saveTasks();
    renderTasks();
    setNotice('Task added successfully.', 'success');
    resetForm();
});

taskList.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-action]');

    if (!actionButton) {
        return;
    }

    const taskItem = event.target.closest('.task-item');

    if (!taskItem) {
        return;
    }

    const taskId = taskItem.dataset.id;
    const task = findTask(taskId);

    if (!task) {
        return;
    }

    if (actionButton.dataset.action === 'edit') {
        taskInput.value = task.title;
        editingTaskId = task.id;
        submitButton.textContent = 'Update Task';
        cancelEditButton.hidden = false;
        taskInput.focus();
        setNotice('Editing mode enabled. Update the task and save it.', 'success');
        return;
    }

    tasks = tasks.filter((item) => item.id !== taskId);
    saveTasks();
    renderTasks();

    if (editingTaskId === taskId) {
        resetForm();
    }

    setNotice('Task deleted successfully.', 'success');
});

cancelEditButton.addEventListener('click', () => {
    resetForm();
    setNotice('Edit cancelled.', 'success');
});

clearAllButton.addEventListener('click', () => {
    if (!tasks.length) {
        setNotice('There are no tasks to clear.', 'error');
        return;
    }

    tasks = [];
    saveTasks();
    renderTasks();
    resetForm();
    setNotice('All tasks cleared.', 'success');
});

renderTasks();