import { defineAgent, JobContext } from '@livekit/agents';
import * as livekit from '@livekit/rtc-node';
import WebSocket from 'ws';
import 'dotenv/config';

export default defineAgent({
    entry: async (ctx: JobContext) => {
        await ctx.connect();
        console.log('Agent connected to room:', ctx.room.name);

        const geminiApiKey = process.env.GEMINI_API_KEY;
        const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.MultimodalConnect?key=${geminiApiKey}`;

        const ws = new WebSocket(geminiUrl);

        let userIsMovingMouth = false;

        let audioSource = new livekit.AudioSource(16000, 1);
        let audioTrack = livekit.LocalAudioTrack.createAudioTrack('agent-audio', audioSource);
        await ctx.room.localParticipant!.publishTrack(audioTrack, new livekit.TrackPublishOptions());

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

        // Gunakan penanganan tipe data Track baru yang aman untuk TypeScript
        ctx.room.on('trackSubscribed', (
            track: livekit.RemoteTrack,
            publication: livekit.RemoteTrackPublication,
            participant: livekit.RemoteParticipant
        ) => {
            // Memeriksa tipe jenis menggunakan enum TrackKind bawaan LiveKit secara aman
            if (track.kind === livekit.TrackKind.KIND_AUDIO) {

                // Melakukan type-cast dari RemoteTrack umum menjadi RemoteAudioTrack spesifik
                const audioTrack = track as livekit.RemoteAudioTrack;

                // Gunakan AudioStream untuk menerima frame audio (16kHz, mono)
                const audioStream = new livekit.AudioStream(audioTrack, 16000, 1);

                (async () => {
                    try {
                        for await (const frame of audioStream) {
                            if (ws.readyState === WebSocket.OPEN && userIsMovingMouth) {
                                ws.send(JSON.stringify({
                                    realtime_input: {
                                        media_chunks: [{
                                            data: Buffer.from(frame.data.buffer, frame.data.byteOffset, frame.data.byteLength).toString('base64'),
                                            mime_type: 'audio/pcm;rate=16000'
                                        }]
                                    }
                                }));
                            }
                        }
                    } catch (err) {
                        console.error('Error reading from audio stream:', err);
                    }
                })();
            }
        });

        ws.on('message', async (data) => {
            const response = JSON.parse(data.toString());

            if (response.server_content?.model_turn?.parts?.[0]?.inline_data) {
                const audioBuffer = Buffer.from(response.server_content.model_turn.parts[0].inline_data.data, 'base64');

                const int16Samples = new Int16Array(
                    audioBuffer.buffer,
                    audioBuffer.byteOffset,
                    audioBuffer.byteLength / 2
                );

                const frame = new livekit.AudioFrame(int16Samples, 16000, 1, int16Samples.length);
                audioSource.captureFrame(frame);
            }

            if (response.server_content?.interrupted) {
                console.log('Gemini interrupted, dropping playback buffer');
                await ctx.room.localParticipant!.unpublishTrack(audioTrack.sid!);

                audioSource = new livekit.AudioSource(16000, 1);
                audioTrack = livekit.LocalAudioTrack.createAudioTrack('agent-audio', audioSource);
                await ctx.room.localParticipant!.publishTrack(audioTrack, new livekit.TrackPublishOptions());
            }
        });

        ctx.room.on('dataReceived', async (
            payload: Uint8Array,
            participant?: livekit.RemoteParticipant
        ) => {
            const data = JSON.parse(new TextDecoder().decode(payload));
            if (data.type === 'lip_tracking') {
                userIsMovingMouth = data.isMoving;

                if (userIsMovingMouth && ws.readyState === WebSocket.OPEN) {
                    await ctx.room.localParticipant!.unpublishTrack(audioTrack.sid!);
                    audioSource = new livekit.AudioSource(16000, 1);
                    audioTrack = livekit.LocalAudioTrack.createAudioTrack('agent-audio', audioSource);
                    await ctx.room.localParticipant!.publishTrack(audioTrack, new livekit.TrackPublishOptions());
                }
            } else if (data.action === 'MUTE') {
                console.log('Muting AI audio track');
                await ctx.room.localParticipant!.unpublishTrack(audioTrack.sid!);
            } else if (data.action === 'BLOCK') {
                console.log('Blocking session');
                await ctx.room.disconnect();
            }
        });

        ctx.room.on('disconnected', () => {
            ws.close();
        });
    },
});
