import { useState } from 'react'
import { useTodo } from '../hooks/useTodo'
import { ADD_TASK } from '../constants/actionTypes'

function TodoInput() {
  const { dispatch } = useTodo()
  const [input, setInput] = useState('')

  const addTask = () => {
    const text = input.trim()
    if (!text) return
    dispatch({ type: ADD_TASK, payload: text })
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addTask()
  }

  return (
    <div className="flex gap-2 mb-6">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a new task..."
        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
      />
      <button
        onClick={addTask}
        className="px-5 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 transition cursor-pointer shrink-0"
      >
        Add
      </button>
    </div>
  )
}

export default TodoInput
