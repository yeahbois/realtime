import Fastify from 'fastify';
import { cli } from '@livekit/agents';
import { getToken } from './controllers/auth.controller.js';
import { agentOptions } from './livekit-agent.js';
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
    // This will start the worker that listens for jobs from the LiveKit server
    cli.runWorker(agentOptions);

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
