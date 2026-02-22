import { registerAs } from '@nestjs/config';

export default registerAs('ollama', () => ({
  url: process.env.OLLAMA_URL || 'http://localhost:11434',
  defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'llama3.1:8b',
  embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
}));
