import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Todo, ReorderRequest } from '../types';

const router = Router();
const DATA_DIR  = process.env.DATA_DIR ?? path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'todos.json');

function readTodos(): Todo[] {
  if (!fs.existsSync(DATA_FILE)) {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
    return [];
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as Todo[];
}

function writeTodos(todos: Todo[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(todos, null, 2), 'utf-8');
}

// GET /api/todos
router.get('/', (_req: Request, res: Response) => {
  const todos = readTodos().sort((a, b) => a.order - b.order);
  res.json(todos);
});

// PUT /api/todos/reorder  — must come before /:id
router.put('/reorder', (req: Request, res: Response) => {
  const { orderedIds } = req.body as ReorderRequest;
  if (!Array.isArray(orderedIds)) {
    res.status(400).json({ error: 'orderedIds must be an array' });
    return;
  }
  const todos = readTodos();
  orderedIds.forEach((id, index) => {
    const todo = todos.find(t => t.id === id);
    if (todo) todo.order = index;
  });
  writeTodos(todos);
  res.json({ success: true });
});

// POST /api/todos
router.post('/', (req: Request, res: Response) => {
  const { title, dueDate, reminderTime, notes, listId } = req.body as Partial<Todo>;
  if (!title || typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  const todos = readTodos();
  const maxOrder = todos.length > 0 ? Math.max(...todos.map(t => t.order)) : -1;
  const newTodo: Todo = {
    id: uuidv4(),
    title: title.trim(),
    completed: false,
    dueDate: dueDate || undefined,
    reminderTime: reminderTime || undefined,
    notes: notes?.trim() || undefined,
    listId: listId || undefined,
    order: maxOrder + 1,
    createdAt: new Date().toISOString(),
  };
  todos.push(newTodo);
  writeTodos(todos);
  res.status(201).json(newTodo);
});

// PUT /api/todos/:id
router.put('/:id', (req: Request, res: Response) => {
  const todos = readTodos();
  const index = todos.findIndex(t => t.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Todo not found' });
    return;
  }
  const updated: Todo = { ...todos[index], ...req.body, id: req.params.id };
  todos[index] = updated;
  writeTodos(todos);
  res.json(updated);
});

// DELETE /api/todos/:id
router.delete('/:id', (req: Request, res: Response) => {
  let todos = readTodos();
  const exists = todos.some(t => t.id === req.params.id);
  if (!exists) {
    res.status(404).json({ error: 'Todo not found' });
    return;
  }
  todos = todos.filter(t => t.id !== req.params.id);
  writeTodos(todos);
  res.json({ success: true });
});

export default router;
