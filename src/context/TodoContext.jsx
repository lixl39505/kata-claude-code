import { createContext, useReducer, useEffect } from 'react'
import { ADD_TASK, REMOVE_TASK, TOGGLE_TASK } from '../constants/actionTypes'
import { generateId } from '../utils/generateId'

export const TodoContext = createContext(null)

function todoReducer(state, action) {
  switch (action.type) {
    case ADD_TASK:
      return [...state, { id: generateId(), text: action.payload, completed: false }]
    case REMOVE_TASK:
      return state.filter((task) => task.id !== action.payload)
    case TOGGLE_TASK:
      return state.map((task) =>
        task.id === action.payload ? { ...task, completed: !task.completed } : task
      )
    default:
      return state
  }
}

const STORAGE_KEY = 'todo-tasks'

function loadTasks() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function TodoProvider({ children }) {
  const [tasks, dispatch] = useReducer(todoReducer, null, loadTasks)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks])

  return (
    <TodoContext.Provider value={{ tasks, dispatch }}>
      {children}
    </TodoContext.Provider>
  )
}
