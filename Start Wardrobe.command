#!/bin/zsh
cd "$(dirname "$0")" || exit 1
if ! command -v npm >/dev/null 2>&1; then
  echo 'Node.js is required. Install Node.js, then open this launcher again.'
  read -r '?Press Enter to close…'
  exit 1
fi
if [[ ! -d node_modules ]]; then
  npm install || exit 1
fi
npm start
if [[ $? -ne 0 ]]; then
  read -r '?Press Enter to close…'
fi
