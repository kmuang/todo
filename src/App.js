import { useState, useRef, useEffect } from 'react';
import './App.css';
import useDailyQuote from './useDailyQuote';

const FILTERS = ['All', 'Active', 'Completed'];
const STORAGE_KEY = 'daymark:v1';
const UNDO_MS = 6000;

const SORTS = {
  newest: 'Newest first',
  priority: 'Priority',
  due: 'Due date',
};

const PRIORITIES = {
  low: { label: 'Low', color: '#628c70' },
  medium: { label: 'Medium', color: '#d49b48' },
  high: { label: 'High', color: '#d36d62' },
};

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

const parseDate = value => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  return match ? new Date(+match[1], +match[2] - 1, +match[3]) : null;
};

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const describeDue = (value, completed) => {
  const date = parseDate(value);
  if (!date) return null;
  const days = Math.round((date - startOfToday()) / 86400000);
  let label;
  if (days === 0) label = 'Today';
  else if (days === 1) label = 'Tomorrow';
  else if (days === -1) label = 'Yesterday';
  else label = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
  return { label, overdue: !completed && days < 0, today: !completed && days === 0 };
};

const loadState = () => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    const todos = Array.isArray(saved?.todos)
      ? saved.todos
          .filter(t => t && typeof t.text === 'string' && PRIORITIES[t.priority])
          .map(t => ({
            id: t.id,
            text: t.text,
            completed: Boolean(t.completed),
            priority: t.priority,
            dueDate: parseDate(t.dueDate) ? t.dueDate : '',
          }))
      : [];
    return {
      todos,
      darkMode: Boolean(saved?.darkMode),
      sortBy: SORTS[saved?.sortBy] ? saved.sortBy : 'newest',
    };
  } catch {
    return { todos: [], darkMode: false, sortBy: 'newest' };
  }
};

function App() {
  const [initial] = useState(loadState);
  const [todos, setTodos] = useState(initial.todos);
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [filter, setFilter] = useState('All');
  const [sortBy, setSortBy] = useState(initial.sortBy);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [darkMode, setDarkMode] = useState(initial.darkMode);
  const [undo, setUndo] = useState(null);
  const quote = useDailyQuote();
  const inputRef = useRef(null);
  const editRef = useRef(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ todos, darkMode, sortBy })
      );
    } catch {
      // Storage can be unavailable (private mode, quota); the app still works in memory.
    }
  }, [todos, darkMode, sortBy]);

  useEffect(() => {
    if (!undo) return undefined;
    const timer = setTimeout(() => setUndo(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [undo]);

  useEffect(() => {
    if (editingId !== null && editRef.current) {
      editRef.current.focus();
    }
  }, [editingId]);

  const addTodo = event => {
    event?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      setInputError('Enter a task to add it to your list.');
      inputRef.current?.focus();
      return;
    }
    setTodos(prev => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text: trimmed,
        completed: false,
        priority,
        dueDate,
      },
      ...prev,
    ]);
    setInput('');
    setDueDate('');
    setInputError('');
    setFilter('All');
    inputRef.current?.focus();
  };

  const toggleTodo = id => {
    setTodos(prev =>
      prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const removeTodos = (shouldRemove, label) => {
    const items = todos
      .map((todo, index) => ({ todo, index }))
      .filter(({ todo }) => shouldRemove(todo));
    if (items.length === 0) return;
    setTodos(prev => prev.filter(t => !shouldRemove(t)));
    setUndo({ items, label });
  };

  const deleteTodo = id => removeTodos(t => t.id === id, 'Task deleted');

  const undoRemove = () => {
    if (!undo) return;
    setTodos(prev => {
      const next = [...prev];
      undo.items.forEach(({ todo, index }) => {
        next.splice(Math.min(index, next.length), 0, todo);
      });
      return next;
    });
    setUndo(null);
  };

  const startEdit = todo => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const saveEdit = id => {
    const trimmed = editText.trim();
    if (trimmed) {
      setTodos(prev =>
        prev.map(t => (t.id === id ? { ...t, text: trimmed } : t))
      );
    }
    setEditingId(null);
  };

  const activeCount = todos.filter(t => !t.completed).length;
  const completedCount = todos.length - activeCount;

  const clearCompleted = () =>
    removeTodos(
      t => t.completed,
      `${completedCount} completed ${completedCount === 1 ? 'task' : 'tasks'} cleared`
    );

  const filtered = todos
    .filter(t => {
      if (filter === 'Active') return !t.completed;
      if (filter === 'Completed') return t.completed;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') {
        return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      }
      if (sortBy === 'due') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      return 0;
    });
  const completion = todos.length ? Math.round((completedCount / todos.length) * 100) : 0;
  const today = new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  return (
    <main className={`app${darkMode ? ' dark' : ''}`}>
      <div className="dashboard">
        <header className="topbar">
          <a className="brand" href="/" aria-label="Daymark home">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="m6.5 12.5 3.5 3.5 7.5-8" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </span>
            <span>daymark</span>
          </a>
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setDarkMode(d => !d)}
            aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
            title={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {darkMode ? '☼' : '☾'}
          </button>
        </header>

        <section className="welcome" aria-labelledby="page-title">
          <p className="eyebrow">{today}</p>
          <h1 id="page-title">Make room for what matters.</h1>
          <figure className="daily-quote">
            <blockquote>“{quote.text}”</blockquote>
            <figcaption>— {quote.author}</figcaption>
          </figure>
        </section>

        <section className="overview" aria-label="Task progress">
          <div className="overview-copy">
            <div className="overview-heading">
              <span className="overview-icon" aria-hidden="true">✳</span>
              <div>
                <p className="overview-label">Your progress</p>
                <p className="overview-detail">
                  {activeCount === 0
                    ? 'You’re all caught up. Enjoy the breathing room.'
                    : `${activeCount} ${activeCount === 1 ? 'task' : 'tasks'} left to go.`}
                </p>
              </div>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="Tasks completed"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={completion}
            >
              <span style={{ width: `${completion}%` }} />
            </div>
          </div>
          <div className="progress-number" aria-label={`${completion}% complete`}>
            <strong>{completion}</strong><span>%</span>
          </div>
          <div className="overview-stats">
            <div className="overview-stat">
              <span className="stat-number">{activeCount}</span>
              <span className="stat-caption">to do</span>
            </div>
            <span className="stat-separator" aria-hidden="true" />
            <div className="overview-stat">
              <span className="stat-number">{completedCount}</span>
              <span className="stat-caption">completed</span>
            </div>
          </div>
        </section>

        <section className="tasks-panel" aria-labelledby="tasks-heading">
          <form className="composer" onSubmit={addTodo}>
            <label className="input-wrapper">
              <span className="composer-plus" aria-hidden="true">+</span>
              <span className="visually-hidden">New task</span>
              <input
                ref={inputRef}
                className="todo-input"
                aria-label="New task"
                aria-invalid={Boolean(inputError)}
                aria-describedby={inputError ? 'task-input-error' : undefined}
                placeholder="What would you like to get done?"
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  if (inputError) setInputError('');
                }}
              />
            </label>
            {inputError && (
              <p className="input-error" id="task-input-error" role="alert">
                {inputError}
              </p>
            )}
            <div className="composer-bottom">
              <div className="priority-select-wrapper" aria-label="Task priority">
                {Object.entries(PRIORITIES).map(([key, val]) => (
                  <button
                    key={key}
                    className={`priority-btn${priority === key ? ' active' : ''}`}
                    style={{ '--color': val.color }}
                    type="button"
                    onClick={() => setPriority(key)}
                    aria-pressed={priority === key}
                  >
                    <span className="priority-dot" aria-hidden="true" />
                    {val.label}
                  </button>
                ))}
              </div>
              <div className="composer-end">
                <input
                  className="due-input"
                  type="date"
                  aria-label="Due date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                />
                <button className="add-btn" type="submit">
                  <span aria-hidden="true">+</span> Add task
                </button>
              </div>
            </div>
          </form>

          <div className="list-heading">
            <div>
              <p className="eyebrow">YOUR SPACE</p>
              <h2 id="tasks-heading">Tasks <span className="total-count">{todos.length}</span></h2>
            </div>
            <div className="list-controls">
              <div className="filter-row" role="group" aria-label="Filter tasks">
                {FILTERS.map(f => {
                  const count = f === 'All'
                    ? todos.length
                    : f === 'Active'
                      ? activeCount
                      : completedCount;
                  return (
                    <button
                      key={f}
                      className={`filter-btn${filter === f ? ' active' : ''}`}
                      type="button"
                      onClick={() => setFilter(f)}
                      aria-pressed={filter === f}
                    >
                      {f}<span className="filter-count">{count}</span>
                    </button>
                  );
                })}
              </div>
              <select
                className="sort-select"
                aria-label="Sort tasks"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                {Object.entries(SORTS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <ul className="todo-list">
            {filtered.length === 0 && (
              <li className="empty-state">
                <span className="empty-illustration" aria-hidden="true">
                  <svg viewBox="0 0 64 64">
                    <rect x="13" y="11" width="38" height="45" rx="8" />
                    <path d="M24 23h16M24 32h16M24 41h8" />
                    <path d="m39 45 3 3 7-8" />
                  </svg>
                </span>
                <p className="empty-title">
                  {filter === 'Completed' ? 'Your wins will show up here' : 'A fresh start'}
                </p>
                <p className="empty-copy">
                  {filter === 'Completed'
                    ? 'Finish a task and it’ll find its way here.'
                    : 'Add your first task above and make today yours.'}
                </p>
              </li>
            )}
            {filtered.map(todo => {
              const due = describeDue(todo.dueDate, todo.completed);
              return (
              <li key={todo.id} className={`todo-item${todo.completed ? ' completed' : ''}`}>
                <button
                  className={`check-btn${todo.completed ? ' checked' : ''}`}
                  type="button"
                  onClick={() => toggleTodo(todo.id)}
                  aria-label={todo.completed ? `Mark ${todo.text} incomplete` : `Complete ${todo.text}`}
                  aria-pressed={todo.completed}
                >
                  {todo.completed && <span className="checkmark" aria-hidden="true">✓</span>}
                </button>
                <span
                  className="priority-indicator"
                  style={{ '--priority-color': PRIORITIES[todo.priority].color }}
                  title={`${PRIORITIES[todo.priority].label} priority`}
                  aria-label={`${PRIORITIES[todo.priority].label} priority`}
                />
                {editingId === todo.id ? (
                  <input
                    ref={editRef}
                    className="edit-input"
                    aria-label="Edit task"
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveEdit(todo.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    onBlur={() => saveEdit(todo.id)}
                  />
                ) : (
                  <div className="todo-body">
                    <span className="todo-text" onDoubleClick={() => startEdit(todo)}>
                      {todo.text}
                    </span>
                    {due && (
                      <span className={`due-chip${due.overdue ? ' overdue' : ''}${due.today ? ' today' : ''}`}>
                        {due.overdue ? 'Overdue · ' : 'Due '}{due.label}
                      </span>
                    )}
                  </div>
                )}
                <div className="todo-actions">
                  <button
                    className="action-btn edit"
                    type="button"
                    onClick={() => startEdit(todo)}
                    aria-label={`Edit ${todo.text}`}
                    title="Edit task"
                  >
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                      <path d="m13.8 3.2 3 3M4 16l3.5-.7L16.5 6.3a2.1 2.1 0 0 0-3-3L4.5 12.3 4 16Z" />
                    </svg>
                  </button>
                  <button
                    className="action-btn delete"
                    type="button"
                    onClick={() => deleteTodo(todo.id)}
                    aria-label={`Delete ${todo.text}`}
                    title="Delete task"
                  >
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                      <path d="m5 5 10 10M15 5 5 15" />
                    </svg>
                  </button>
                </div>
              </li>
              );
            })}
          </ul>

          {completedCount > 0 && (
            <div className="footer">
              <button className="clear-btn" type="button" onClick={clearCompleted}>
                Clear completed ({completedCount})
              </button>
            </div>
          )}
        </section>

        {undo && (
          <div className="toast" role="status">
            <span>{undo.label}</span>
            <button type="button" className="toast-undo" onClick={undoRemove}>
              Undo
            </button>
          </div>
        )}

        <footer className="page-footer">
          <span>Made for a more intentional day.</span>
          <span className="footer-sparkle" aria-hidden="true">✳</span>
        </footer>
      </div>
    </main>
  );
}

export default App;
