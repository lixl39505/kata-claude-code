# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start Vite dev server with HMR
- `npm run build` — Production build
- `npm run lint` — Run ESLint
- `npm run preview` — Preview production build

No test framework is configured.

## Architecture

React 19 + Vite todo app using Tailwind CSS v4 for styling.

**State management**: React Context API with `useReducer` in `src/context/TodoContext.jsx`. A single reducer handles `ADD_TASK`, `REMOVE_TASK`, and `TOGGLE_TASK` actions (constants in `src/constants/actionTypes.js`). Tasks persist to `localStorage` under key `'todo-tasks'`.

**Component hierarchy**: `App` → `TodoProvider` → `TodoList` → (`TodoInput` + `TodoItem[]`). Components access state via the `useTodo()` custom hook (`src/hooks/useTodo.js`), which returns `{ tasks, dispatch }` from context.

**ID generation**: `src/utils/generateId.js` combines timestamps with an incrementing counter.
