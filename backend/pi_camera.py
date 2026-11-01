"""
Raspberry Pi Camera service for KINETIC.
Uses Picamera2 for Raspberry Pi camera control with MJPEG streaming.
"""

import os
import time
import threading
import io
from typing import Optional

try:
    from picamera2 import Picamera2
    from picamera2.encoders import JpegEncoder
    from picamera2.outputs import FileOutput
    _PICAMERA2_AVAILABLE = True
except Exception as e:
    print(f"Warning: Picamera2 not available: {e}")
    Picamera2 = None
    JpegEncoder = None
    FileOutput = None
    _PICAMERA2_AVAILABLE = False


class PiCameraService:
    def __init__(self, width: int = None, height: int = None, fps: int = None):
        self.width = width if width is not None else int(os.environ.get('KINETIC_CAMERA_WIDTH', 640))
        self.height = height if height is not None else int(os.environ.get('KINETIC_CAMERA_HEIGHT', 480))
        self.fps = fps if fps is not None else int(os.environ.get('KINETIC_CAMERA_FPS', 15))
        self.camera = None
        self.running = False
        self.lock = threading.Lock()
        self.latest_frame = None
        self.frame_lock = threading.Lock()
        self.thread = None
        
    def start(self):
        if self.running:
            return True
        if not _PICAMERA2_AVAILABLE:
            print("Picamera2 not available - cannot start Pi camera")
            return False
        try:
            self.camera = Picamera2()
            # Configure camera
            config = self.camera.create_video_configuration(
                main={"size": (self.width, self.height), "format": "RGB888"}
            )
            self.camera.configure(config)
            self.camera.start()
            self.running = True
            # Start frame capture thread
            self.thread = threading.Thread(target=self._capture_loop, daemon=True)
            self.thread.start()
            print(f"Pi camera started: {self.width}x{self.height} @ {self.fps}fps")
            return True
        except Exception as e:
            print(f"Failed to start Pi camera: {e}")
            self.running = False
            if self.camera:
                try:
                    self.camera.close()
                except Exception:
                    pass
                self.camera = None
            return False
    
    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=2.0)
            self.thread = None
        if self.camera:
            try:
                self.camera.stop()
                self.camera.close()
            except Exception:
                pass
            self.camera = None
        with self.frame_lock:
            self.latest_frame = None
        print("Pi camera stopped")
    
    def _capture_loop(self):
        while self.running and self.camera:
            try:
                # Capture frame
                array = self.camera.capture_array()
                # Convert to JPEG
                from PIL import Image
                import io
                img = Image.fromarray(array)
                buf = io.BytesIO()
                img.save(buf, format='JPEG', quality=85)
                frame_bytes = buf.getvalue()
                with self.frame_lock:
                    self.latest_frame = frame_bytes
                time.sleep(1.0 / self.fps if self.fps > 0 else 1.0/15)
            except Exception as e:
                print(f"Error capturing frame: {e}")
                time.sleep(0.1)
    
    def get_latest_frame(self):
        with self.frame_lock:
            return self.latest_frame
    
    def is_available(self):
        return _PICAMERA2_AVAILABLE
    
    def get_status(self):
        return {
            'available': self.is_available(),
            'running': self.running,
            'source': 'raspberry_pi_camera',
            'width': self.width,
            'height': self.height,
            'fps': self.fps
        }
    
    def generate_mjpeg(self):
        """Generator for MJPEG stream"""
        boundary = b'--frame\r\n'
        while self.running:
            frame = self.get_latest_frame()
            if frame:
                yield boundary + b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n'
            time.sleep(1.0 / self.fps if self.fps > 0 else 1.0/15)


_pi_camera_service = None


def get_pi_camera_service():
    global _pi_camera_service
    if _pi_camera_service is None:
        _pi_camera_service = PiCameraService()
    return _pi_camera_service


def start_pi_camera():
    service = get_pi_camera_service()
    return service.start()


def stop_pi_camera():
    global _pi_camera_service
    if _pi_camera_service:
        _pi_camera_service.stop()
        _pi_camera_service = None
