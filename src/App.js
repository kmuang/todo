import { useState, useRef, useEffect } from 'react';
import './App.css';

const FILTERS = ['All', 'Active', 'Completed'];

const PRIORITIES = {
  low: { label: 'Low', color: '#22c55e' },
  medium: { label: 'Medium', color: '#f59e0b' },
  high: { label: 'High', color: '#ef4444' },
};

function App() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState('medium');
  const [filter, setFilter] = useState('All');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const inputRef = useRef(null);
  const editRef = useRef(null);

  useEffect(() => {
    if (editingId !== null && editRef.current) {
      editRef.current.focus();
    }
  }, [editingId]);

  const addTodo = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setTodos(prev => [
      { id: Date.now(), text: trimmed, completed: false, priority },
      ...prev,
    ]);
    setInput('');
    inputRef.current?.focus();
  };

  const toggleTodo = id => {
    setTodos(prev =>
      prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const deleteTodo = id => {
    setTodos(prev => prev.filter(t => t.id !== id));
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

  const clearCompleted = () => {
    setTodos(prev => prev.filter(t => !t.completed));
  };

  const filtered = todos.filter(t => {
    if (filter === 'Active') return !t.completed;
    if (filter === 'Completed') return t.completed;
    return true;
  });

  const activeCount = todos.filter(t => !t.completed).length;
  const completedCount = todos.filter(t => t.completed).length;

  return (
    <div className={`app${darkMode ? ' dark' : ''}`}>
      <div className="container">
        <header className="header">
          <div className="header-top">
            <div className="title-group">
              <span className="title-icon">✓</span>
              <h1 className="title">My Tasks</h1>
            </div>
            <button
              className="theme-toggle"
              onClick={() => setDarkMode(d => !d)}
              title="Toggle theme"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
          <div className="stats">
            <span className="stat"><span className="stat-num">{activeCount}</span> remaining</span>
            <span className="stat-divider" />
            <span className="stat"><span className="stat-num">{completedCount}</span> done</span>
          </div>
        </header>

        <div className="input-row">
          <div className="input-wrapper">
            <span className="input-icon">+</span>
            <input
              ref={inputRef}
              className="todo-input"
              placeholder="Add a new task..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTodo()}
            />
          </div>
          <div className="priority-select-wrapper">
            {Object.entries(PRIORITIES).map(([key, val]) => (
              <button
                key={key}
                className={`priority-btn${priority === key ? ' active' : ''}`}
                style={{ '--color': val.color }}
                onClick={() => setPriority(key)}
                title={val.label}
              >
                <span className="priority-dot" />
                {val.label}
              </button>
            ))}
          </div>
          <button className="add-btn" onClick={addTodo}>
            Add
          </button>
        </div>

        <div className="filter-row">
          {FILTERS.map(f => (
            <button
              key={f}
              className={`filter-btn${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
              <span className="filter-count">
                {f === 'All' ? todos.length : f === 'Active' ? activeCount : completedCount}
              </span>
            </button>
          ))}
        </div>

        <ul className="todo-list">
          {filtered.length === 0 && (
            <li className="empty-state">
              <span className="empty-icon">🎉</span>
              <p>{filter === 'Completed' ? 'No completed tasks yet' : 'Nothing here — add a task!'}</p>
            </li>
          )}
          {filtered.map(todo => (
            <li key={todo.id} className={`todo-item${todo.completed ? ' completed' : ''}`}>
              <button
                className={`check-btn${todo.completed ? ' checked' : ''}`}
                onClick={() => toggleTodo(todo.id)}
                title="Toggle complete"
              >
                {todo.completed && <span className="checkmark">✓</span>}
              </button>

              <span
                className="priority-indicator"
                style={{ background: PRIORITIES[todo.priority].color }}
                title={PRIORITIES[todo.priority].label + ' priority'}
              />

              {editingId === todo.id ? (
                <input
                  ref={editRef}
                  className="edit-input"
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveEdit(todo.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onBlur={() => saveEdit(todo.id)}
                />
              ) : (
                <span className="todo-text" onDoubleClick={() => startEdit(todo)}>
                  {todo.text}
                </span>
              )}

              <div className="todo-actions">
                <button
                  className="action-btn edit"
                  onClick={() => startEdit(todo)}
                  title="Edit"
                >
                  ✎
                </button>
                <button
                  className="action-btn delete"
                  onClick={() => deleteTodo(todo.id)}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>

        {completedCount > 0 && (
          <div className="footer">
            <button className="clear-btn" onClick={clearCompleted}>
              Clear completed ({completedCount})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
