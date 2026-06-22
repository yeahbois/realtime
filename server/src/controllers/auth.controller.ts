import { FastifyRequest, FastifyReply } from 'fastify';
import { AccessToken } from 'livekit-server-sdk';

export const getToken = async (request: FastifyRequest, reply: FastifyReply) => {
  const { userId, roomName } = request.query as { userId: string; roomName: string };

  if (!userId || !roomName) {
    return reply.status(400).send({ error: 'userId and roomName are required' });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return reply.status(500).send({ error: 'LiveKit credentials not configured' });
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: userId,
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  return { token: at.toJwt() };
};
