import { useTodo } from '../hooks/useTodo'
import { REMOVE_TASK, TOGGLE_TASK } from '../constants/actionTypes'

function TodoItem({ task }) {
  const { dispatch } = useTodo()

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100">
      <label className="flex items-center gap-3 min-w-0 cursor-pointer">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => dispatch({ type: TOGGLE_TASK, payload: task.id })}
          className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-400 shrink-0"
        />
        <span className={`break-all ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
          {task.text}
        </span>
      </label>
      <button
        onClick={() => dispatch({ type: REMOVE_TASK, payload: task.id })}
        className="text-gray-400 hover:text-red-500 transition cursor-pointer shrink-0"
        aria-label="Delete task"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </li>
  )
}

export default TodoItem
