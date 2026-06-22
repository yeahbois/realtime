import { MultimodalAgent, WorkerOptions, WorkerContext, cli } from '@livekit/agents';
import * as livekit from '@livekit/rtc-node';
import WebSocket from 'ws';
import 'dotenv/config';

export const agentOptions: WorkerOptions = {
  agent: async (ctx: WorkerContext) => {
    await ctx.connect();
    console.log('Agent connected to room:', ctx.room.name);

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.MultimodalConnect?key=${geminiApiKey}`;

    const ws = new WebSocket(geminiUrl);

    let userIsMovingMouth = false;
    let audioSource = new livekit.AudioSource(16000, 1);
    let audioTrack = livekit.createAudioTrack('agent-audio', audioSource);
    await ctx.room.localParticipant.publishTrack(audioTrack);

    ws.on('open', () => {
        const setupMessage = {
            setup: {
                model: "models/gemini-2.0-flash-exp",
                generation_config: {
                    response_modalities: ["audio"],
                }
            }
        };
        ws.send(JSON.stringify(setupMessage));
    });

    ctx.room.on(livekit.RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (track.kind === livekit.Track.Kind.Audio) {
        track.on(livekit.AudioTrackEvent.AudioFrameReceived, (frame: livekit.AudioFrame) => {
            if (ws.readyState === WebSocket.OPEN && userIsMovingMouth) {
                ws.send(JSON.stringify({
                    realtime_input: {
                        media_chunks: [{
                            data: Buffer.from(frame.data).toString('base64'),
                            mime_type: 'audio/pcm;rate=16000'
                        }]
                    }
                }));
            }
        });
      }
    });

    ws.on('message', async (data) => {
        const response = JSON.parse(data.toString());

        if (response.server_content?.model_turn?.parts?.[0]?.inline_data) {
            const audioBuffer = Buffer.from(response.server_content.model_turn.parts[0].inline_data.data, 'base64');
            const frame = new livekit.AudioFrame(audioBuffer, 16000, 1, audioBuffer.length / 2);
            await audioSource.captureFrame(frame);
        }

        if (response.server_content?.interrupted) {
            console.log('Gemini interrupted, dropping playback buffer');
            await ctx.room.localParticipant.unpublishTrack(audioTrack);
            audioSource = new livekit.AudioSource(16000, 1);
            audioTrack = livekit.createAudioTrack('agent-audio', audioSource);
            await ctx.room.localParticipant.publishTrack(audioTrack);
        }
    });

    ctx.room.on(livekit.RoomEvent.DataReceived, async (payload, participant) => {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.type === 'lip_tracking') {
            userIsMovingMouth = data.isMoving;
            // Proactive Barge-in: if user starts speaking, tell Gemini to interrupt
            if (userIsMovingMouth && ws.readyState === WebSocket.OPEN) {
                // In a real Gemini Multimodal API, you might send a clear or interrupt signal
                // For now we stop piping and reset local buffer
                await ctx.room.localParticipant.unpublishTrack(audioTrack);
                audioSource = new livekit.AudioSource(16000, 1);
                audioTrack = livekit.createAudioTrack('agent-audio', audioSource);
                await ctx.room.localParticipant.publishTrack(audioTrack);
            }
        } else if (data.action === 'MUTE') {
            console.log('Muting AI audio track');
            await ctx.room.localParticipant.unpublishTrack(audioTrack);
        } else if (data.action === 'BLOCK') {
            console.log('Blocking session');
            ctx.room.disconnect();
        }
    });

    ctx.room.on(livekit.RoomEvent.Disconnected, () => {
        ws.close();
    });
  },
};
