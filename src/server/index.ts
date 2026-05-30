import { createApp } from './app';

const PORT = 3001;

const app = createApp();

app.listen(PORT, () => {
  console.log(`Local API server running on http://localhost:${PORT}`);
});
