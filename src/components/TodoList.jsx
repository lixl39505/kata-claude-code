import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { useTodo } from '../hooks/useTodo'
import { REORDER_TASK } from '../constants/actionTypes'
import TodoInput from './TodoInput'
import TodoItem from './TodoItem'

function TodoList() {
  const { tasks, dispatch } = useTodo()

  const handleDragEnd = (result) => {
    if (!result.destination) {
      return
    }

    if (result.source.index === result.destination.index) {
      return
    }

    dispatch({
      type: REORDER_TASK,
      payload: {
        sourceIndex: result.source.index,
        destinationIndex: result.destination.index,
      },
    })
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Todo List</h1>
      <TodoInput />
      {tasks.length === 0 ? (
        <p className="text-center text-gray-400 py-8">No tasks yet. Add one above!</p>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="todo-list">
            {(provided) => (
              <ul
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {tasks.map((task, index) => (
                  <Draggable key={task.id} draggableId={task.id} index={index}>
                    {(provided, snapshot) => (
                      <TodoItem
                        task={task}
                        provided={provided}
                        isDragging={snapshot.isDragging}
                      />
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  )
}

export default TodoList
