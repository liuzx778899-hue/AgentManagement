/**
 * Script to fix test files that are missing notification actions in mock WorkbenchState
 */

const fs = require('fs');
const path = require('path');

const testFiles = [
  'src/__tests__/ai-assistant.test.tsx',
  'src/__tests__/git-sync.test.tsx',
  'src/__tests__/integration.test.tsx',
  'src/__tests__/memory-manager.test.tsx',
  'src/__tests__/model-config.test.tsx',
  'src/__tests__/project-workspace.test.tsx',
  'src/__tests__/workflow-canvas.test.tsx',
];

const notificationActions = `
    addNotification: vi.fn(),
    markNotificationRead: vi.fn(),
    clearNotifications: vi.fn(),`;

testFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Find the mockState object and add notification actions
    // Pattern: look for setTasks: vi.fn() or setTasks: () => void
    const pattern1 = /(setTasks:\s*(?:vi\.fn\(\)|\(\)\s*=>\s*void),)/;
    if (pattern1.test(content) && !content.includes('addNotification:')) {
      content = content.replace(pattern1, `$1${notificationActions}
    `);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Fixed ${file}`);
    } else {
      console.log(`- Skipping ${file} (already has notification actions or pattern not found)`);
    }
  } else {
    console.log(`✗ File not found: ${file}`);
  }
});

console.log('\nDone!');
