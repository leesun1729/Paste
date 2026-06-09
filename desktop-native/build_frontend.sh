#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/../frontend"
OUTPUT_DIR="$SCRIPT_DIR/Sources/Paste/Resources/web"

# Support nvm/volta
if [ -f "$HOME/.nvm/nvm.sh" ]; then source "$HOME/.nvm/nvm.sh" 2>/dev/null; fi
if [ -d "$HOME/.volta/bin" ]; then export PATH="$HOME/.volta/bin:$PATH"; fi
export PATH="$PATH:/usr/local/bin:/opt/homebrew/bin"

NODE=$(command -v node)
if [ -z "$NODE" ]; then
  echo "Error: node not found. Please install Node.js." >&2
  exit 1
fi
echo "Using node: $NODE ($(node -v))"

echo "→ Building Next.js frontend..."
cd "$FRONTEND_DIR"
npm install
npm run build

echo "→ Copying build output..."
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"
cp -r out/. "$OUTPUT_DIR/"

echo "✓ Frontend build complete: $OUTPUT_DIR"
du -sh "$OUTPUT_DIR"
