import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { FALLBACK_QUOTES } from './useDailyQuote';

const originalFetch = global.fetch;

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  global.fetch = originalFetch;
});

const quotableResponse = (content, author) => ({
  ok: true,
  json: async () => [{ content, author }],
});

test('shows the daily quote from Quotable and caches it', async () => {
  global.fetch = jest.fn().mockResolvedValue(quotableResponse('Do it now.', 'Ada Lovelace'));
  render(<App />);

  expect(await screen.findByText('“Do it now.”')).toBeInTheDocument();
  expect(screen.getByText('— Ada Lovelace')).toBeInTheDocument();
  expect(JSON.parse(window.localStorage.getItem('daymark:quote'))).toMatchObject({
    source: 'quotable',
    text: 'Do it now.',
  });
});

test('reuses today’s cached quote without calling the API again', async () => {
  global.fetch = jest.fn().mockResolvedValue(quotableResponse('Do it now.', 'Ada Lovelace'));
  const first = render(<App />);
  await screen.findByText('“Do it now.”');
  first.unmount();

  global.fetch.mockClear();
  render(<App />);
  expect(screen.getByText('“Do it now.”')).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('falls back to a built-in quote when Quotable fails', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('SSL certificate expired'));
  render(<App />);

  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  const shown = FALLBACK_QUOTES.find(q => screen.queryByText(`“${q.text}”`));
  expect(shown).toBeDefined();
  expect(screen.getByText(`— ${shown.author}`)).toBeInTheDocument();
});

test('rejects malformed Quotable responses', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  render(<App />);

  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  expect(FALLBACK_QUOTES.some(q => screen.queryByText(`“${q.text}”`))).toBe(true);
});
