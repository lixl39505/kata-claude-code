import { useTodo } from '../hooks/useTodo'
import TodoInput from './TodoInput'
import TodoItem from './TodoItem'

function TodoList() {
  const { tasks } = useTodo()

  return (
    <div className="w-full max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Todo List</h1>
      <TodoInput />
      {tasks.length === 0 ? (
        <p className="text-center text-gray-400 py-8">No tasks yet. Add one above!</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <TodoItem key={task.id} task={task} />
          ))}
        </ul>
      )}
    </div>
  )
}

export default TodoList
