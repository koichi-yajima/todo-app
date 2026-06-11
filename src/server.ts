import express from 'express';
import path from 'path';
import os from 'os';
import todosRouter from './routes/todos';
import listsRouter from './routes/lists';

const app = express();
const PORT = process.env.PORT ?? 3000;

function getLanIp(): string | null {
  for (const nets of Object.values(os.networkInterfaces())) {
    for (const net of nets ?? []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return null;
}

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/todos', todosRouter);
app.use('/api/lists', listsRouter);

// QRコード用: アクセス可能なURLを返す
app.get('/api/server-url', (_req, res) => {
  const ip = getLanIp();
  const url = ip ? `http://${ip}:${PORT}` : `http://localhost:${PORT}`;
  res.json({ url });
});

// インストールページ
app.get('/install', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/install.html'));
});

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(Number(PORT), '0.0.0.0', () => {
  const ip = getLanIp();
  console.log(`✅ ToDoアプリ起動中: http://localhost:${PORT}`);
  if (ip) console.log(`📱 iPhone からアクセス: http://${ip}:${PORT}`);
});
