from dummy_telemetry import get_receiver, start_receiver
r = start_receiver()
import time, socket, json
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
pkt = {'node_id':'test-dummy','seq':1,'channels':[1200,1500,900,1100],'imu':{'accel':[0.1,0.2,9.8],'gyro':[0.01,0.02,0.03]}}
s.sendto(json.dumps(pkt).encode(), ('127.0.0.1',5005))
time.sleep(2)
print(r.get_devices())
s.close()
r.stop()
