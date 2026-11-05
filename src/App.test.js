import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

const addTask = (text, { priority, due } = {}) => {
  fireEvent.change(screen.getByLabelText('New task'), { target: { value: text } });
  if (priority) fireEvent.click(screen.getByRole('button', { name: priority }));
  if (due) fireEvent.change(screen.getByLabelText('Due date'), { target: { value: due } });
  fireEvent.click(screen.getByRole('button', { name: /add task/i }));
};

beforeEach(() => window.localStorage.clear());

test('keeps tasks and theme after a reload', () => {
  const { unmount } = render(<App />);
  addTask('Book flights');
  fireEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
  unmount();

  const { container } = render(<App />);
  expect(screen.getByText('Book flights')).toBeInTheDocument();
  expect(container.querySelector('.app')).toHaveClass('dark');
});

test('ignores corrupted saved data', () => {
  window.localStorage.setItem('daymark:v1', '{not json');
  render(<App />);
  expect(screen.getByText('A fresh start')).toBeInTheDocument();
});

test('undoes a deleted task in its original position', () => {
  render(<App />);
  addTask('First');
  addTask('Second');
  fireEvent.click(screen.getByRole('button', { name: 'Delete Second' }));
  expect(screen.queryByText('Second')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  const items = screen.getAllByRole('listitem');
  expect(items[0]).toHaveTextContent('Second');
  expect(items[1]).toHaveTextContent('First');
});

test('undoes clearing completed tasks', () => {
  render(<App />);
  addTask('Done one');
  fireEvent.click(screen.getByRole('button', { name: 'Complete Done one' }));
  fireEvent.click(screen.getByRole('button', { name: /clear completed/i }));
  expect(screen.queryByText('Done one')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(screen.getByText('Done one')).toBeInTheDocument();
});

test('sorts by priority and by due date', () => {
  render(<App />);
  addTask('Later task', { priority: 'Low', due: '2099-12-31' });
  addTask('Urgent task', { priority: 'High', due: '2099-01-01' });
  addTask('Someday task', { priority: 'Medium' });

  fireEvent.change(screen.getByLabelText('Sort tasks'), { target: { value: 'priority' } });
  let items = screen.getAllByRole('listitem');
  expect(items[0]).toHaveTextContent('Urgent task');
  expect(items[2]).toHaveTextContent('Later task');

  fireEvent.change(screen.getByLabelText('Sort tasks'), { target: { value: 'due' } });
  items = screen.getAllByRole('listitem');
  expect(items[0]).toHaveTextContent('Urgent task');
  expect(items[1]).toHaveTextContent('Later task');
  expect(items[2]).toHaveTextContent('Someday task');
});

test('flags overdue tasks until they are completed', () => {
  render(<App />);
  addTask('Pay invoice', { due: '2000-01-01' });
  expect(screen.getByText(/Overdue/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Complete Pay invoice' }));
  expect(screen.queryByText(/Overdue/)).not.toBeInTheDocument();
});

test('adds a task and updates the progress summary', () => {
  render(<App />);

  fireEvent.change(screen.getByLabelText('New task'), {
    target: { value: 'Plan the week' },
  });
  fireEvent.click(screen.getByRole('button', { name: /add task/i }));

  expect(screen.getByText('Plan the week')).toBeInTheDocument();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  expect(screen.getByText('1', { selector: '.stat-number' })).toBeInTheDocument();
});

test('completes, filters, and clears a task', () => {
  render(<App />);

  fireEvent.change(screen.getByLabelText('New task'), {
    target: { value: 'Send the proposal' },
  });
  fireEvent.click(screen.getByRole('button', { name: /add task/i }));
  fireEvent.click(screen.getByRole('button', { name: 'Complete Send the proposal' }));

  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  fireEvent.click(screen.getByRole('button', { name: /^Active/ }));
  expect(screen.getByText('A fresh start')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /^Completed/ }));
  expect(screen.getByText('Send the proposal')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /clear completed/i }));
  expect(screen.queryByText('Send the proposal')).not.toBeInTheDocument();
});

test('shows a new task immediately when adding from the completed filter', () => {
  render(<App />);

  fireEvent.change(screen.getByLabelText('New task'), {
    target: { value: 'First task' },
  });
  fireEvent.click(screen.getByRole('button', { name: /add task/i }));
  fireEvent.click(screen.getByRole('button', { name: 'Complete First task' }));
  fireEvent.click(screen.getByRole('button', { name: /^Completed/ }));

  fireEvent.change(screen.getByLabelText('New task'), {
    target: { value: 'A new task' },
  });
  fireEvent.click(screen.getByRole('button', { name: /add task/i }));

  expect(screen.getByText('A new task')).toBeInTheDocument();
  expect(screen.getByText('First task')).toBeInTheDocument();
});

test('explains when the task field is empty', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /add task/i }));

  expect(screen.getByRole('alert')).toHaveTextContent('Enter a task to add it to your list.');
});
