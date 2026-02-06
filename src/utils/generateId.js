let counter = 0

export function generateId() {
  return `${Date.now()}-${counter++}`
}
