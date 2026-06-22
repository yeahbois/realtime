import numpy as np

def calculate_lip_distance(landmarks):
    """
    Calculate the Euclidean distance between the upper inner lip (Landmark 13)
    and lower inner lip (Landmark 14).
    """
    # Landmark 13: Upper inner lip
    # Landmark 14: Lower inner lip
    p13 = np.array([landmarks[13].x, landmarks[13].y])
    p14 = np.array([landmarks[14].x, landmarks[14].y])

    distance = np.linalg.norm(p13 - p14)
    return distance

def is_mouth_moving(distance, threshold=0.01):
    """
    Check if the mouth is moving based on the lip distance and a threshold.
    """
    return distance > threshold
