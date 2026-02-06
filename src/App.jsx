import { TodoProvider } from './context/TodoContext'
import TodoList from './components/TodoList'

function App() {
  return (
    <TodoProvider>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <TodoList />
      </div>
    </TodoProvider>
  )
}

export default App
