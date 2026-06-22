import cv2
import numpy as np
import mediapipe as mp
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from utils.lip_tracker import calculate_lip_distance, is_mouth_moving
import json
import base64

app = FastAPI()

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=False,
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

@app.websocket("/ws/video-features")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Receive raw image frames (base64 encoded or raw bytes)
            data = await websocket.receive_text()
            message = json.loads(data)

            # Decode image
            img_data = base64.b64decode(message['image'].split(',')[1] if ',' in message['image'] else message['image'])
            nparr = np.frombuffer(img_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if frame is not None:
                # Convert to RGB for MediaPipe
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = face_mesh.process(rgb_frame)

                user_is_moving_mouth = False
                if results.multi_face_landmarks:
                    for face_landmarks in results.multi_face_landmarks:
                        distance = calculate_lip_distance(face_landmarks.landmark)
                        if is_mouth_moving(distance):
                            user_is_moving_mouth = True

                # Stream lightweight JSON control flag back
                await websocket.send_json({"user_is_moving_mouth": user_is_moving_mouth})

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error: {e}")
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
