const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting server for screenshot capture...\n');

// Start the server using npx tsx
const server = spawn('npx', ['tsx', 'server/index.ts'], {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, NODE_ENV: 'development', PORT: '5000' },
  stdio: 'pipe',
  shell: true
});

let serverReady = false;

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`[SERVER] ${output.trim()}`);
  
  if (output.includes('serving on port')) {
    serverReady = true;
    console.log('\n✅ Server is ready! Now capturing screenshots...\n');
    
    // Give it a moment to fully start
    setTimeout(() => {
      console.log('📸 Starting screenshot capture...\n');
      const capture = spawn('npx', ['tsx', 'docs/capture-screenshots.ts'], {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
        shell: true
      });
      
      capture.on('close', (code) => {
        console.log('\n📸 Screenshot capture completed');
        console.log('🛑 Stopping server...\n');
        server.kill();
      });
    }, 2000);
  }
});

server.stderr.on('data', (data) => {
  console.error(`[SERVER ERROR] ${data.toString().trim()}`);
});

server.on('close', (code) => {
  if (!serverReady) {
    console.log(`❌ Server exited with code ${code}`);
    console.log('   Please check the server configuration and try again');
  }
});

// Timeout after 30 seconds
setTimeout(() => {
  if (!serverReady) {
    console.log('⏰ Server startup timeout');
    server.kill();
  }
}, 30000);
