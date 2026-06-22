# Gemini Live Replica

This repository contains a production-ready codebase for a real-time, low-latency, multimodal AI Agent web application, replicating Gemini Live features.

## Architecture

- **Server (`/server`)**: Node.js (TypeScript) + Fastify + LiveKit Agents. Handles WebRTC orchestration and Gemini Live API integration.
- **Frontend (`/frontend`)**: Next.js (App Router) + Tailwind CSS + LiveKit Components. Provides the user interface for voice/video interaction.
- **Vision Processor (`/vision-processor`)**: Python + FastAPI + MediaPipe. Extracts lip contour matrices to detect user speech via Visual Voice Activity Detection.

## Prerequisites

- Node.js v20+
- Python 3.10+
- LiveKit Cloud or Self-Hosted Server
- Google Gemini API Key

## Setup Instructions

### 1. Vision Processor
```bash
cd vision-processor
pip install -r requirements.txt
python main.py
```

### 2. Server
```bash
cd server
npm install
# Copy .env.example to .env and fill in credentials
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
# Copy .env.example to .env
npm run dev
```

## Key Features
- **Duplex Real-Time Voice Chat**: Low-latency interaction using WebRTC.
- **Barge-in Handling**: AI stops talking when the user interrupts.
- **Visual VAD**: Lip tracking to filter out background noise.
- **Session Control**: Start, Stop, and Block functionality.
