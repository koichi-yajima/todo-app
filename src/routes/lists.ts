import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { List } from '../types';

const router = Router();
const DATA_DIR  = process.env.DATA_DIR ?? path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'lists.json');

function readLists(): List[] {
  if (!fs.existsSync(DATA_FILE)) {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
    return [];
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as List[];
}

function writeLists(lists: List[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(lists, null, 2), 'utf-8');
}

router.get('/', (_req, res: Response) => {
  res.json(readLists().sort((a, b) => a.order - b.order));
});

router.post('/', (req: Request, res: Response) => {
  const { name } = req.body as Partial<List>;
  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  const lists = readLists();
  const maxOrder = lists.length > 0 ? Math.max(...lists.map(l => l.order)) : -1;
  const newList: List = {
    id: uuidv4(),
    name: name.trim(),
    order: maxOrder + 1,
    createdAt: new Date().toISOString(),
  };
  lists.push(newList);
  writeLists(lists);
  res.status(201).json(newList);
});

router.put('/:id', (req: Request, res: Response) => {
  const lists = readLists();
  const index = lists.findIndex(l => l.id === req.params.id);
  if (index === -1) { res.status(404).json({ error: 'List not found' }); return; }
  lists[index] = { ...lists[index], ...req.body, id: req.params.id };
  writeLists(lists);
  res.json(lists[index]);
});

router.delete('/:id', (req: Request, res: Response) => {
  let lists = readLists();
  if (!lists.some(l => l.id === req.params.id)) {
    res.status(404).json({ error: 'List not found' }); return;
  }
  lists = lists.filter(l => l.id !== req.params.id);
  writeLists(lists);
  res.json({ success: true });
});

export default router;
