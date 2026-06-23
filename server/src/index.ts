import Fastify from 'fastify';
import { Worker, WorkerOptions } from '@livekit/agents';
import { getToken } from './controllers/auth.controller.js';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const fastify = Fastify({
  logger: true
});

// Implement Token Generation endpoint
fastify.get('/api/token', getToken);

const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server listening on port ${port}`);

    // Start LiveKit Agent Worker
    const agentPath = fileURLToPath(import.meta.resolve('./livekit-agent.js'));
    const agentOptions = new WorkerOptions({
      agent: agentPath,
    });
    const worker = new Worker(agentOptions);
    await worker.run();
    console.log('LiveKit Agent Worker started successfully');

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

