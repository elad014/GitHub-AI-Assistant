#!/bin/sh

MODEL="${OLLAMA_MODEL:-llama3}"

# Start Ollama server in background
ollama serve &
SERVER_PID=$!

# Wait until the server responds â€” use ollama CLI itself, no curl needed
echo "Waiting for Ollama to start..."
until ollama list > /dev/null 2>&1; do
  sleep 2
done
echo "Ollama is up."

# Pull model if not already present
# ollama list output: "llama3:latest   <id>   4.7 GB   ..."
if ollama list 2>/dev/null | grep -q "${MODEL}"; then
  echo "Model '${MODEL}' already present, skipping pull."
else
  echo "Pulling model '${MODEL}'..."
  ollama pull "${MODEL}"
  echo "Model '${MODEL}' ready."
fi

# Hand control back to the server process
wait $SERVER_PID
