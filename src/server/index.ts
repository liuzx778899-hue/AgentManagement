import { createApp } from './app';

const PORT = 3001;

async function main() {
  const app = await createApp();

  app.listen(PORT, () => {
    console.log(`Local API server running on http://localhost:${PORT}`);
  });
}

main().catch(console.error);
