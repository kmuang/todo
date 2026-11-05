import { useEffect, useState } from 'react';

const CACHE_KEY = 'daymark:quote';
const QUOTABLE_URL = 'https://api.quotable.io/quotes/random?maxLength=110&tags=inspirational|wisdom|success';
const TIMEOUT_MS = 5000;

export const FALLBACK_QUOTES = [
  { text: 'A little progress each day adds up to big results.', author: 'Satya Nani' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'Well begun is half done.', author: 'Aristotle' },
  { text: 'It always seems impossible until it’s done.', author: 'Nelson Mandela' },
  { text: 'Focus on being productive instead of busy.', author: 'Tim Ferriss' },
  { text: 'You don’t have to see the whole staircase, just take the first step.', author: 'Martin Luther King Jr.' },
  { text: 'Action is the foundational key to all success.', author: 'Pablo Picasso' },
];

const todayKey = () => {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const fallbackFor = key => {
  const seed = [...key].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return FALLBACK_QUOTES[seed % FALLBACK_QUOTES.length];
};

const readCache = key => {
  try {
    const cached = JSON.parse(window.localStorage.getItem(CACHE_KEY));
    if (cached?.date === key && cached.text && cached.author) return cached;
  } catch {
    // Ignore unreadable cache and fetch again.
  }
  return null;
};

const writeCache = (key, quote, source) => {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ date: key, source, ...quote }));
  } catch {
    // Caching is best-effort.
  }
};

// Returns one quote per calendar day: cached, then Quotable, then a built-in fallback.
export default function useDailyQuote() {
  const key = todayKey();
  const [quote, setQuote] = useState(() => readCache(key) || fallbackFor(key));

  useEffect(() => {
    const cached = readCache(key);
    if (cached?.source === 'quotable' || typeof fetch !== 'function') {
      if (cached) setQuote(cached);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    fetch(QUOTABLE_URL, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`Quotable responded ${res.status}`);
        return res.json();
      })
      .then(data => {
        const item = Array.isArray(data) ? data[0] : data;
        if (!item?.content || !item?.author) throw new Error('Unexpected Quotable response');
        const next = { text: item.content, author: item.author };
        writeCache(key, next, 'quotable');
        setQuote(next);
      })
      .catch(() => {
        // Keep the fallback quote and remember it so the day's quote doesn't change.
        if (!cached) writeCache(key, fallbackFor(key), 'fallback');
      })
      .finally(() => clearTimeout(timer));

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key]);

  return quote;
}
