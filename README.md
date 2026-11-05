# Todo List App

A modern, responsive Todo List app built with React. Features a clean UI with dark mode, priority levels, filtering, and smooth animations.

## Features

- **Add tasks** — type and press `Enter` or click Add
- **Priority levels** — Low, Medium, High with color-coded indicators
- **Complete tasks** — click the checkbox to toggle done/undone
- **Edit tasks** — double-click a task or use the pencil icon to edit inline
- **Delete tasks** — remove individual tasks with the × button
- **Filter view** — switch between All, Active, and Completed
- **Clear completed** — bulk-remove all finished tasks
- **Dark mode** — toggle between light and dark themes
- **Responsive** — works on mobile and desktop

## Tech Stack

- [React 19](https://react.dev/)
- CSS custom properties (variables) for theming
- [Inter](https://fonts.google.com/specimen/Inter) font via Google Fonts
- No external UI libraries — fully custom components

## Getting Started

### Prerequisites

- Node.js 16+
- npm

### Install & Run

```bash
# Install dependencies
npm install

# Start development server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
```

Output is in the `build/` folder, ready to deploy.

## Project Structure

```
src/
├── App.js       # Main component — all todo logic and UI
├── App.css      # Styles with CSS variables for light/dark theming
├── index.css    # Global reset and font import
└── index.js     # React entry point
```

## Usage Tips

| Action | How |
|---|---|
| Add a task | Type in the input → `Enter` or click **Add** |
| Set priority | Click **Low / Medium / High** before adding |
| Complete a task | Click the checkbox |
| Edit a task | Double-click the text or click ✎ |
| Delete a task | Hover the item → click ✕ |
| Toggle dark mode | Click 🌙 / ☀️ in the header |

## License

MIT
