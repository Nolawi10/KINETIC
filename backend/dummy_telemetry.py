"""
Dummy (ESP8266) telemetry receiver for KINETIC.
Receives UDP JSON packets from ESP8266 nodes with piezo sensors (HEAD/CHEST/LEFT_WAIST/RIGHT_WAIST)
and MPU6050 IMU, validates them, stores latest readings and events.
"""

import json
import socket
import threading
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import os


DEFAULT_UDP_PORT = 5005
MAX_PACKET_SIZE = 4096
STALE_TIMEOUT_SEC = 10.0


class DummyTelemetryReceiver:
    def __init__(self, host: str = "0.0.0.0", port: int = None, app=None):
        self.host = host
        self.port = port if port is not None else int(os.environ.get("DUMMY_TELEMETRY_PORT", DEFAULT_UDP_PORT))
        self.app = app
        self.sock = None
        self.thread = None
        self.running = False
        self.lock = threading.Lock()
        
        # State
        self.devices: Dict[str, Dict[str, Any]] = {}
        self.node_configs: Dict[str, Dict[str, Any]] = {}
        self.latest_readings: Dict[str, Dict[str, Any]] = {}
        self.events: List[Dict[str, Any]] = []
        self.max_events = 1000
        
    def start(self):
        if self.running:
            return
        try:
            self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.sock.bind((self.host, self.port))
            self.sock.settimeout(1.0)
            self.running = True
            self.thread = threading.Thread(target=self._receive_loop, daemon=True)
            self.thread.start()
            print(f"Dummy telemetry UDP receiver started on {self.host}:{self.port}")
        except Exception as e:
            print(f"Failed to start dummy telemetry receiver: {e}")
            self.running = False
    
    def stop(self):
        self.running = False
        if self.sock:
            try:
                self.sock.close()
            except Exception:
                pass
            self.sock = None
        if self.thread:
            self.thread.join(timeout=2.0)
            self.thread = None
    
    def _receive_loop(self):
        while self.running:
            try:
                data, addr = self.sock.recvfrom(MAX_PACKET_SIZE)
                self._process_packet(data, addr)
            except socket.timeout:
                continue
            except OSError:
                if self.running:
                    continue
                break
            except Exception as e:
                print(f"Error in UDP receive loop: {e}")
                continue
    
    def _process_packet(self, data: bytes, addr):
        try:
            text = data.decode('utf-8')
            if len(text) > MAX_PACKET_SIZE:
                return
            packet = json.loads(text)
        except (UnicodeError, json.JSONDecodeError):
            return
        
        if not isinstance(packet, dict):
            return
        
        node_id = packet.get('node_id') or packet.get('device_id') or packet.get('id') or f'node_{addr[0]}'
        receive_ts = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
        receive_epoch = time.time()
        device_type = packet.get('device_type') or packet.get('type')
        protocol = packet.get('protocol') or 'udp'
        
        with self.lock:
            if node_id not in self.devices:
                self.devices[node_id] = {}
            self.devices[node_id].update({
                'node_id': node_id,
                'last_seen': receive_ts,
                'last_seen_epoch': receive_epoch,
                'addr': addr[0],
                'esp_ip': addr[0],
                'ip': addr[0],
                'status': 'online',
                'device_type': device_type,
                'protocol': protocol
            })
            
            seq = packet.get('seq') or packet.get('sequence')
            if seq is not None:
                try:
                    seq_int = int(seq)
                    prev_seq = self.devices[node_id].get('last_seq')
                    self.devices[node_id]['last_seq'] = seq_int
                    if prev_seq is not None:
                        if seq_int == prev_seq:
                            self.devices[node_id]['duplicates'] = self.devices[node_id].get('duplicates', 0) + 1
                        elif seq_int < prev_seq:
                            self.devices[node_id]['out_of_order'] = self.devices[node_id].get('out_of_order', 0) + 1
                        elif seq_int > prev_seq + 1:
                            self.devices[node_id]['missing'] = self.devices[node_id].get('missing', 0) + (seq_int - prev_seq - 1)
                except Exception:
                    pass
            
            channels = packet.get('channels') or {}
            # Also check firmware schema
            piezo = packet.get('piezo') or {}
            if isinstance(piezo, dict):
                # Merge piezo into channels
                if isinstance(channels, dict):
                    channels = {**channels, **piezo}
                else:
                    channels = piezo
            # Check sensors.ads1115 / other forms
            sensors_obj = packet.get('sensors')
            if isinstance(sensors_obj, dict):
                ads = sensors_obj.get('ads1115') or sensors_obj.get('ads') or sensors_obj.get('adc')
                if isinstance(ads, dict):
                    if isinstance(channels, dict):
                        channels = {**channels, **ads}
                    else:
                        channels = ads
                # mpu6050 might be under sensors
                if not packet.get('imu') and not packet.get('mpu6050'):
                    if sensors_obj.get('mpu6050'):
                        packet = {**packet, 'mpu6050': sensors_obj.get('mpu6050')}
            normalized_channels = {}
            channel_map = {
                'A0': 'HEAD', 0: 'HEAD', '0': 'HEAD',
                'A1': 'CHEST', 1: 'CHEST', '1': 'CHEST',
                'A2': 'LEFT_WAIST', 2: 'LEFT_WAIST', '2': 'LEFT_WAIST',
                'A3': 'RIGHT_WAIST', 3: 'RIGHT_WAIST', '3': 'RIGHT_WAIST',
                'HEAD': 'HEAD', 'head': 'HEAD', 'Head': 'HEAD',
                'CHEST': 'CHEST', 'chest': 'CHEST', 'Chest': 'CHEST',
                'LEFT_WAIST': 'LEFT_WAIST', 'left_waist': 'LEFT_WAIST', 'LEFTWAIST': 'LEFT_WAIST', 'leftwaist': 'LEFT_WAIST',
                'RIGHT_WAIST': 'RIGHT_WAIST', 'right_waist': 'RIGHT_WAIST', 'RIGHTWAIST': 'RIGHT_WAIST', 'rightwaist': 'RIGHT_WAIST',
            }
            
            if isinstance(channels, dict):
                for k, v in channels.items():
                    zone = channel_map.get(k) or channel_map.get(str(k).upper())
                    if not zone:
                        # try direct match
                        zk = str(k).upper()
                        if zk in ['HEAD','CHEST','LEFT_WAIST','RIGHT_WAIST']:
                            zone = zk
                    if zone:
                        # Handle different formats
                        if isinstance(v, dict):
                            rawv = v.get('raw') if v.get('raw') is not None else v.get('value') if v.get('value') is not None else v.get('adc') if v.get('adc') is not None else v
                            if isinstance(rawv, dict):  # unlikely
                                continue
                            try:
                                normv = float(rawv)
                            except Exception:
                                continue
                            normalized_channels[zone] = {
                                'adc': int(normv) if isinstance(normv, float) and normv.is_integer() else normv,
                                'raw': normv,
                                'baseline': v.get('baseline'),
                                'event': v.get('event'),
                                'source': 'physical_hardware'
                            }
                        elif isinstance(v, (int, float)):
                            normalized_channels[zone] = {
                                'adc': int(v),
                                'raw': v,
                                'source': 'physical_hardware'
                            }
            elif isinstance(channels, list):
                zone_order = ['HEAD', 'CHEST', 'LEFT_WAIST', 'RIGHT_WAIST']
                for i, v in enumerate(channels):
                    if i < len(zone_order) and isinstance(v, (int, float)):
                        normalized_channels[zone_order[i]] = {
                            'adc': int(v),
                            'raw': v,
                            'source': 'physical_hardware'
                        }
            
            imu = packet.get('imu') or packet.get('mpu6050') or {}
            normalized_imu = None
            if isinstance(imu, dict):
                acc = imu.get('accel') or imu.get('acceleration') or imu.get('a')
                gyro = imu.get('gyro') or imu.get('gyroscope') or imu.get('g')
                # Check for flat fields
                if acc is None and all(k in imu for k in ['accel_x_m_s2', 'accel_y_m_s2', 'accel_z_m_s2']):
                    acc = [imu.get('accel_x_m_s2'), imu.get('accel_y_m_s2'), imu.get('accel_z_m_s2')]
                if acc is None and all(k in imu for k in ['accel_x', 'accel_y', 'accel_z']):
                    acc = [imu.get('accel_x'), imu.get('accel_y'), imu.get('accel_z')]
                if gyro is None and all(k in imu for k in ['gyro_x_rad_s', 'gyro_y_rad_s', 'gyro_z_rad_s']):
                    gyro = [imu.get('gyro_x_rad_s'), imu.get('gyro_y_rad_s'), imu.get('gyro_z_rad_s')]
                if gyro is None and all(k in imu for k in ['gyro_x', 'gyro_y', 'gyro_z']):
                    gyro = [imu.get('gyro_x'), imu.get('gyro_y'), imu.get('gyro_z')]
                normalized_imu = {
                    'accel': acc,
                    'gyro': gyro,
                    'accel_x_m_s2': imu.get('accel_x_m_s2') if imu.get('accel_x_m_s2') is not None else imu.get('accel_x'),
                    'accel_y_m_s2': imu.get('accel_y_m_s2') if imu.get('accel_y_m_s2') is not None else imu.get('accel_y'),
                    'accel_z_m_s2': imu.get('accel_z_m_s2') if imu.get('accel_z_m_s2') is not None else imu.get('accel_z'),
                    'gyro_x_rad_s': imu.get('gyro_x_rad_s') if imu.get('gyro_x_rad_s') is not None else imu.get('gyro_x'),
                    'gyro_y_rad_s': imu.get('gyro_y_rad_s') if imu.get('gyro_y_rad_s') is not None else imu.get('gyro_y'),
                    'gyro_z_rad_s': imu.get('gyro_z_rad_s') if imu.get('gyro_z_rad_s') is not None else imu.get('gyro_z'),
                    'temperature_c': imu.get('temperature_c') or imu.get('temp_c'),
                    'units': {
                        'accel': 'm/s^2',
                        'gyro': 'rad/s'
                    }
                }
            
            reading = {
                'node_id': node_id,
                'timestamp': receive_ts,
                'receive_epoch': receive_epoch,
                'sequence': seq,
                'channels': normalized_channels,
                'piezo': normalized_channels,
                'imu': normalized_imu,
                'source': 'physical_hardware',
                'raw_packet': packet,
                'uptime_ms': packet.get('uptime_ms'),
                'device_type': device_type or self.devices.get(node_id, {}).get('device_type'),
                'protocol': protocol,
                'sensors': packet.get('sensors') or {'ads1115': True, 'mpu6050': normalized_imu is not None}
            }
            
            self.latest_readings[node_id] = reading
            self.devices[node_id]['channels'] = list(normalized_channels.keys())
            self.devices[node_id]['has_imu'] = normalized_imu is not None
            if device_type:
                self.devices[node_id]['device_type'] = device_type
            if protocol:
                self.devices[node_id]['protocol'] = protocol
            self.devices[node_id]['sensors'] = reading.get('sensors')
            
            events_reported = packet.get('events') or packet.get('hits') or []
            if isinstance(events_reported, list):
                for ev in events_reported:
                    if isinstance(ev, dict):
                        event = {
                            'id': f"hw_{node_id}_{receive_epoch}_{len(self.events)}",
                            'node_id': node_id,
                            'timestamp': receive_ts,
                            'source': 'physical_hardware',
                            'type': ev.get('type', 'impact_candidate'),
                            'zone': ev.get('zone') or ev.get('channel'),
                            'labeled': 'threshold-based contact candidate',
                            'raw': ev
                        }
                        self.events.insert(0, event)
            elif normalized_channels:
                for zone, ch in normalized_channels.items():
                    if isinstance(ch.get('adc'), (int, float)) and ch['adc'] > 2000:
                        event = {
                            'id': f"hw_{node_id}_{receive_epoch}_{zone}",
                            'node_id': node_id,
                            'timestamp': receive_ts,
                            'source': 'physical_hardware',
                            'type': 'impact_candidate',
                            'zone': zone,
                            'labeled': 'threshold-based contact candidate (unvalidated)',
                            'adc': ch['adc']
                        }
                        self.events.insert(0, event)
            
            if len(self.events) > self.max_events:
                self.events = self.events[:self.max_events]
    
    def get_devices(self):
        now = time.time()
        with self.lock:
            devices = []
            for node_id, dev in self.devices.items():
                last_seen = dev.get('last_seen_epoch', 0)
                stale = (now - last_seen) > STALE_TIMEOUT_SEC if last_seen > 0 else True
                devices.append({
                    **dev,
                    'stale': stale,
                    'seconds_since_seen': round(now - last_seen, 2) if last_seen > 0 else None
                })
            return devices
    
    def get_latest(self, node_id=None):
        with self.lock:
            if node_id:
                return self.latest_readings.get(node_id)
            result = dict(self.latest_readings)
            return result
    
    def get_events(self, limit=50):
        with self.lock:
            return self.events[:limit]
    
    def get_health(self):
        now = time.time()
        with self.lock:
            devices = self.get_devices()
            online = sum(1 for d in devices if not d.get('stale'))
            return {
                'receiver_running': self.running,
                'port': self.port,
                'devices_total': len(devices),
                'devices_online': online,
                'total_events': len(self.events),
                'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
            }


_receiver = None


def get_receiver(app=None):
    global _receiver
    if _receiver is None:
        port = int(os.environ.get('DUMMY_TELEMETRY_PORT', DEFAULT_UDP_PORT))
        _receiver = DummyTelemetryReceiver(port=port, app=app)
    return _receiver


def start_receiver(app=None):
    receiver = get_receiver(app)
    receiver.start()
    return receiver


def stop_receiver():
    global _receiver
    if _receiver:
        _receiver.stop()
        _receiver = None


def get_node_configs():
    receiver = get_receiver()
    return getattr(receiver, 'node_configs', {})


def save_node_config(node_id, config):
    receiver = get_receiver()
    if not hasattr(receiver, 'node_configs'):
        receiver.node_configs = {}
    receiver.node_configs[node_id] = config
    return config
