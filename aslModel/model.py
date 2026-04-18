import cv2
import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


def ensure_project_venv() -> None:
    # Avoid confusing import errors when model.py is started with a global or conda python.
    if os.getenv("CHAT_ASL_ALLOW_NON_VENV") == "1":
        return

    prefix = sys.prefix
    if ".venv" in prefix:
        return

    print("ChatASL error: model.py must run from the local .venv interpreter.")
    print("Use: .venv/bin/python model.py")
    print(f"Current interpreter: {sys.executable}")
    raise SystemExit(1)


ensure_project_venv()

from inference_sdk import InferenceHTTPClient
from inference_sdk.webrtc import WebcamSource, StreamConfig, VideoMetadata


STREAM_HOST = os.getenv("CHAT_ASL_STREAM_HOST", "127.0.0.1")
STREAM_PORT = int(os.getenv("CHAT_ASL_STREAM_PORT", "8000"))
SHOW_LOCAL_WINDOW = os.getenv("CHAT_ASL_SHOW_LOCAL_WINDOW", "1") == "1"

latest_jpeg_frame = None
latest_jpeg_lock = threading.Lock()


class StreamHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(b'{"status":"ok"}')
            return

        if self.path != "/video_feed":
            self.send_response(404)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            return

        self.send_response(200)
        self.send_header("Cache-Control", "no-cache, private")
        self.send_header("Pragma", "no-cache")
        self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        try:
            while True:
                with latest_jpeg_lock:
                    frame_bytes = latest_jpeg_frame

                if frame_bytes is None:
                    time.sleep(0.03)
                    continue

                self.wfile.write(b"--frame\r\n")
                self.wfile.write(b"Content-Type: image/jpeg\r\n")
                self.wfile.write(f"Content-Length: {len(frame_bytes)}\r\n\r\n".encode("ascii"))
                self.wfile.write(frame_bytes)
                self.wfile.write(b"\r\n")
                time.sleep(0.03)
        except (BrokenPipeError, ConnectionResetError):
            return

    def log_message(self, format, *args):
        return


def start_stream_server(host: str, port: int) -> ThreadingHTTPServer:
    server = ThreadingHTTPServer((host, port), StreamHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    print(f"Browser stream ready at http://{host}:{port}/video_feed")
    return server

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
    global latest_jpeg_frame

    ok, encoded = cv2.imencode(".jpg", frame)
    if ok:
        with latest_jpeg_lock:
            latest_jpeg_frame = encoded.tobytes()

    if SHOW_LOCAL_WINDOW:
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
stream_server = start_stream_server(STREAM_HOST, STREAM_PORT)

try:
    session.run()
finally:
    stream_server.shutdown()
    stream_server.server_close()
    if SHOW_LOCAL_WINDOW:
        cv2.destroyAllWindows()



