


import cv2
import os
from inference_sdk import InferenceHTTPClient
from inference_sdk.webrtc import WebcamSource, StreamConfig, VideoMetadata

# Initialize client
client = InferenceHTTPClient.init(
    api_url="https://serverless.roboflow.com",
    api_key="krW0HycM52SgCW595Otk"
)

# Configure video source (webcam)
source = WebcamSource(resolution=(1280, 720))

# Configure streaming options
config = StreamConfig(
    stream_output=["visualization"],      # Get video back with annotations
    data_output=["predictions"],          # Get prediction data via datachannel
    processing_timeout=3600,              # 60 minutes
    requested_plan="webrtc-gpu-medium",   # GPU acceleration
    requested_region="us"                 # Use closest region
)

# Create streaming session
session = client.webrtc.stream(
    source=source,
    workflow="custom-workflow",
    workspace="marias-workspace-w3vq3",
    image_input="image",
    config=config
)

# Handle incoming video frames
@session.on_frame
def show_frame(frame, metadata):
    cv2.imshow("Sign Language Detection", frame)
    if cv2.waitKey(1) & 0xFF == ord("q"):
        session.close()

# Handle prediction data via datachannel
@session.on_data()
def on_data(data: dict, metadata: VideoMetadata):
    # This will print the detected ASL letters found in the frame
    if "predictions" in data:
        print(f"Frame {metadata.frame_id} Predictions: {data['predictions']}")

# Run the session (blocks until 'q' is pressed in the window)
session.run()



