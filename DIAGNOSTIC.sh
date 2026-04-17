#!/bin/bash

echo "=== Bottlecaller Diagnostic Report ==="
echo "Date: $(date)"
echo ""

echo "=== Environment ==="
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"
echo "OS: $(uname -a)"
echo ""

echo "=== Project Structure ==="
cd my-vite-app
echo "Current directory: $(pwd)"
echo "package.json exists: $([ -f package.json ] && echo 'YES' || echo 'NO')"
echo "node_modules exists: $([ -d node_modules ] && echo 'YES' || echo 'NO')"
echo ""

echo "=== Environment Files ==="
echo ".env.local exists: $([ -f .env.local ] && echo 'YES' || echo 'NO')"
echo ".env.example exists: $([ -f .env.example ] && echo 'YES' || echo 'NO')"
echo ".env.production exists: $([ -f .env.production ] && echo 'YES' || echo 'NO')"
echo ""

echo "=== Dependencies ==="
echo "npm list (top-level):"
npm list --depth=0 2>&1 | head -20
echo ""

echo "=== Build Test ==="
echo "Running: npm run build"
npm run build 2>&1 | tail -50
echo ""

echo "=== Vite Config ==="
echo "vite.config.js exists: $([ -f vite.config.js ] && echo 'YES' || echo 'NO')"
echo ""

echo "=== Summary ==="
if [ -d node_modules ] && [ -f package.json ]; then
  echo "✓ Project setup looks complete"
else
  echo "✗ Missing dependencies or package.json - run: npm install"
fi

if [ -f .env.local ] || [ -f .env.production ]; then
  echo "✓ Environment file found"
else
  echo "⚠ No .env file found - check .env.example for required variables"
fi

echo ""
echo "=== End Diagnostic ==="
