# KINETIC — Raspberry Pi 5 Setup Guide (Beginner Friendly)

This guide takes a **fresh Raspberry Pi 5 running Raspberry Pi OS Bookworm 64-bit**
from first boot to a running KINETIC session with the Pi camera and pose tracking.

It is written for someone who has not used a Raspberry Pi before. Run every
command in a terminal on the Pi, in the order shown.

> **Already working on Windows?** Use `python start.py` there. The Pi uses
> `python3 start_pi.py`. Both run the same frontend and backend.

---

## 0. What you need

| Item | Requirement |
| --- | --- |
| Computer | Raspberry Pi 5 (4 GB or 8 GB) |
| Camera | Raspberry Pi Camera Module 3, Module 2, or HQ Camera |
| Cable | The correct Pi 5 camera ribbon cable (15-pin to 22-pin) |
| Power | Official 27 W USB-C power supply |
| Storage | 32 GB+ microSD (A2) or NVMe SSD |
| OS | Raspberry Pi OS **Bookworm, 64-bit** |
| Browser | Chromium (pre-installed on the desktop image) |

> A Raspberry Pi 4 may work, but this guide and the launcher target the Pi 5.
> Do not use the 32-bit OS: the pose model runs in the browser and needs 64-bit.

---

## 1. Prepare Raspberry Pi OS

1. Flash **Raspberry Pi OS (64-bit) Bookworm** with Raspberry Pi Imager.
2. In Imager's settings, set the username, password, Wi-Fi, and hostname.
3. Boot the Pi, connect it to a monitor/keyboard, or connect over SSH:

```bash
ssh <username>@<hostname>.local
```

4. Update the system and reboot:

```bash
sudo apt update
sudo apt full-upgrade -y
sudo reboot
```

After the reboot, reconnect to the terminal.

---

## 2. Connect the camera correctly

**Power the Pi off before touching the camera cable.**

1. Locate the camera connector on the Pi 5 (between the USB ports and the
   HDMI ports, labelled `CAM/DISP0`).
2. Lift the plastic retaining clip gently.
3. Insert the ribbon cable with the metal contacts facing the correct way for
   your cable, then press the clip back down.
4. Check both ends: the cable must be fully seated and square.

Pi 5 uses a 22-pin connector. Camera Module 3 ships with a 15-pin cable, so you
need the official **Pi 5 camera cable** (15-pin camera end, 22-pin Pi end).

---

## 3. Install system packages (including the camera stack)

Install the camera software from **apt**. Do **not** run `pip install picamera2`;
the pip package is not supported on Raspberry Pi OS.

```bash
sudo apt install -y \
  python3-picamera2 \
  python3-libcamera \
  libcamera-tools \
  python3-pip \
  python3-venv \
  python3-numpy \
  python3-pil \
  git \
  curl \
  build-essential
```

Install Node.js 20 LTS (the frontend build needs Node 20 or newer):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify:

```bash
node -v    # v20.x.x or newer
npm -v     # 10.x.x or newer
python3 --version   # Python 3.11.x
```

---

## 4. Verify the camera before installing KINETIC

Do this now. Fixing camera problems is much easier before the app is running.

```bash
rpicam-hello --list-cameras
```

Expected output looks like:

```
Available cameras
-----------------
0 : imx708 [4608x2592] (/base/axi/pcie@120000/rp1/i2c@88000/imx708@1a)
```

Then run a short preview:

```bash
rpicam-hello -t 2000
```

If you are on a desktop, a preview window should appear for two seconds. On a
headless SSH session, the command may fail with a "no preview" message; that is
fine as long as `--list-cameras` found the camera.

If no camera is listed, see **Troubleshooting** before continuing.

---

## 5. Get the KINETIC files

```bash
cd ~
git clone <YOUR_REPOSITORY_URL> kinetic
cd kinetic
```

Replace `<YOUR_REPOSITORY_URL>` with the repository address you were given.

---

## 6. Create the backend virtual environment

The virtual environment **must** be created with `--system-site-packages` so it
can see the apt-installed `picamera2` and `libcamera` modules.

```bash
cd ~/kinetic/backend
python3 -m venv --system-site-packages venv
source venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements-pi.txt
cd ~/kinetic
```

> `requirements-pi.txt` intentionally does **not** list Picamera2. Picamera2 is
> provided by `python3-picamera2` from apt.

Verify the camera library and the backend dependencies inside that venv:

```bash
~/kinetic/backend/venv/bin/python -c "from picamera2 import Picamera2; print('Picamera2 OK')"
~/kinetic/backend/venv/bin/python -c "import flask, flask_cors, numpy, joblib, sklearn, dotenv, PIL; print('Backend dependencies OK')"
```

Both commands must print `OK`.

If Picamera2 fails here, the venv was probably created without
`--system-site-packages`. Delete and recreate it:

```bash
cd ~/kinetic/backend
rm -rf venv
python3 -m venv --system-site-packages venv
source venv/bin/activate
pip install -r requirements-pi.txt
cd ~/kinetic
```

---

## 7. Install the frontend

```bash
cd ~/kinetic/Frontend
npm install
cd ~/kinetic
```

This downloads packages and may take several minutes on a Pi. It only needs to
be done again when `package.json` changes.

---

## 8. Start KINETIC

From the repository root:

```bash
cd ~/kinetic
python3 start_pi.py
```

The launcher:

1. Checks the platform, Node.js, backend packages, and Picamera2.
2. Probes the physical camera with libcamera.
3. Starts the Flask backend on `0.0.0.0:5000`.
4. Starts exactly **one** Vite frontend on `0.0.0.0:8080`.
5. Waits for both servers, then opens the browser when a desktop session exists.
6. Prints the LAN URL when running headless over SSH.
7. Stops both processes and releases the camera on `CTRL+C`.

Expected output ends with:

```
============================================================
       KINETIC SYSTEM READY
============================================================

[OK] Flask backend:      http://0.0.0.0:5000
[OK] Frontend dashboard:  http://0.0.0.0:8080
[OK] Camera stream:      http://0.0.0.0:5000/api/camera/stream
```

Open the dashboard:

- On the Pi desktop: `http://localhost:8080`
- From another device on the same Wi-Fi/LAN: `http://<PI_LAN_IP>:8080`
- Headless: use the `LAN access` URL printed by the launcher.

Keep the terminal open. Closing it or pressing `CTRL+C` stops KINETIC.

### Optional environment variables

Set these before `python3 start_pi.py` if the defaults conflict:

```bash
export KINETIC_BACKEND_PORT=5000
export KINETIC_FRONTEND_PORT=8080
export KINETIC_NO_BROWSER=1   # never open a browser automatically
```

---

## 9. Use KINETIC on the Pi

1. Open **Live Session** (`/live`).
2. The camera stays in **STANDBY** until you press **Start Session**. This is
   deliberate: KINETIC never holds the camera while idle.
3. Press **Start Session**. The camera starts, pose tracking begins, and both
   guided demonstrations start automatically at the same time:
   - **Dummy:** 8 guided strikes at 0, 5, 10, 15, 20, 25, 30, 35 seconds,
     completing at **40 seconds**.
   - **Mat:** 6 footwork steps at 0, 5, 10, 15, 20, 25 seconds,
     completing at **30 seconds**.
4. **Pause Session** freezes the timer and both demonstrations. The camera and
   pose overlay stay live. **Resume Session** continues from the same point.
5. **Restart Session** resets the timer, round, strikes, combos, history, and
   demo progress, then restarts both demonstrations. The camera stays active.
6. **End Session** stops the demonstrations and session updates.

There are **no separate demo start buttons**. Demonstrations follow the session.

### What counts as a real strike

Only events that a verified classifier explicitly labels as a strike with source
`camera_inference`, or validated `hardware_telemetry`, are counted in the Live
Strike Counter, Combo HUD, and Coach panel.

The following are **never** counted as real strikes:

- BlazePose / MediaPipe landmarks (pose is a visual overlay, not a punch proof)
- Guided demonstration events
- Manual simulator triggers

If no strike classifier is connected, the HUD shows
**"Real strike recognition is not yet available"** instead of inventing numbers.
Velocity and power show **NOT AVAILABLE** unless a classifier reports them.

The ESP8266 hardware badge shows **DISCONNECTED** until real telemetry arrives.

---

## 10. Validation checklist

Run these tests on the physical Pi. Record each result as **PASS**, **FAIL**, or
**NOT TESTED**. Do not mark a test PASS without observing it on the device.

| # | Test | How to verify | Result |
| --- | --- | --- | --- |
| 1 | OS and packages | `node -v`, `python3 --version`, and the apt install from step 3 succeed | NOT TESTED |
| 2 | Camera detected | `rpicam-hello --list-cameras` lists a camera | NOT TESTED |
| 3 | Camera preview | `rpicam-hello -t 2000` shows video (or only fails because the session is headless) | NOT TESTED |
| 4 | Picamera2 in venv | `backend/venv/bin/python -c "from picamera2 import Picamera2"` succeeds | NOT TESTED |
| 5 | Backend packages | Flask, flask_cors, numpy, joblib, sklearn, dotenv, PIL all import | NOT TESTED |
| 6 | Frontend install | `npm install` finishes and `Frontend/node_modules` exists | NOT TESTED |
| 7 | Launcher startup | `python3 start_pi.py` prints `KINETIC SYSTEM READY` with backend + frontend OK | NOT TESTED |
| 8 | Backend health | `curl http://127.0.0.1:5000/api/health` returns `"status": "healthy"` | NOT TESTED |
| 9 | Live page + camera | `/live` loads, and after Start Session the Pi camera feed appears | NOT TESTED |
| 10 | Pose tracking | A person in frame shows a skeleton overlay and the camera HUD reports tracking | NOT TESTED |
| 11 | Guided demonstrations | Start Session starts the dummy **and** mat demos together with progress bars | NOT TESTED |
| 12 | Session integrity | Pause freezes timer/demos, resume continues, restart resets, end stops | NOT TESTED |

### 45-second timed validation

Start a session and time it with a phone. Use a stopwatch against the on-screen
clock.

| Time | Expected observation | Result |
| --- | --- | --- |
| 0–5 s | Session status RUNNING, timer starts at `00:00`, camera connects, pose model loads, both demos show step 0 | NOT TESTED |
| 5–10 s | Pose skeleton or "searching" state is visible; timer advances; dummy step 1 and mat step 1 fire | NOT TESTED |
| 10–25 s | Dummy continues through its steps; mat continues through its steps; both progress bars advance; guided events stay separate from verified strikes | NOT TESTED |
| 25–35 s | Mat reaches 6 steps and completes at ~30 s; dummy continues to 8 steps | NOT TESTED |
| 35–40 s | Dummy completes at ~40 s; both demos stop; no further guided events appear | NOT TESTED |
| 40–45 s | Press Restart: timer resets to `00:00`, strikes/combos/history clear, both demos restart, camera stays live | NOT TESTED |

At the end, pause for 5 seconds and confirm the clock does not move, then resume
and confirm it continues from the same value.

> The repository has automated tests for the demo engine, timer, and verified
> strike rules. Those do **not** replace this physical checklist.

---

## 11. Troubleshooting

### `rpicam-hello --list-cameras` shows no cameras

- Power off and reseat both ends of the ribbon cable.
- Confirm you are using the Pi 5 (22-pin) cable, not the older 15-pin cable.
- Check the cable orientation; the contacts must face the correct side.
- Try the other `CAM/DISP` connector.
- Update firmware and reboot: `sudo apt full-upgrade -y && sudo reboot`.
- Confirm the camera is not also claimed by another process.

### `python3 -m venv --system-site-packages` but Picamera2 still missing

- Confirm the apt package is installed: `dpkg -l | grep picamera2`.
- Re-run: `sudo apt install -y python3-picamera2 python3-libcamera`.
- Recreate the venv exactly as shown in step 6.
- Never `pip install picamera2`; remove it if present:
  `pip uninstall -y picamera2`.

### `start_pi.py` says packages are missing

Run the install inside the backend venv:

```bash
cd ~/kinetic/backend
source venv/bin/activate
pip install -r requirements-pi.txt
cd ~/kinetic
```

### Port already in use

```bash
sudo lsof -i :5000
sudo lsof -i :8080
```

Stop the old process, or choose other ports with
`KINETIC_BACKEND_PORT` / `KINETIC_FRONTEND_PORT`.

### Page loads but the camera says CAMERA UNAVAILABLE

- Confirm `rpicam-hello --list-cameras` works while KINETIC is stopped.
- Check the backend log for `Pi camera` errors.
- Test the stream directly: `http://<PI_LAN_IP>:5000/api/camera/stream`.
- Press **Retry Camera** on the Live page.
- Only one program may use the camera at a time. Close `rpicam-hello` and other
  camera apps.

### The camera works but the browser shows no skeleton

- Stand fully in frame with good lighting.
- Wait a few seconds for the pose model to download and initialize.
- Check the browser console for MediaPipe errors.
- On a Pi 5, use Chromium and close other heavy tabs.

### The page is blank or will not load from another device

- Keep both servers running in the terminal.
- Use the exact LAN URL printed by the launcher.
- Confirm the Pi and the other device are on the same network.
- Allow ports 8080 and 5000 through any firewall.

### Everything is slow

- Use the 64-bit Bookworm image.
- Close unused browser tabs and desktop apps.
- Use the official power supply; undervoltage throttles the Pi.
- `rpicam-hello --list-cameras` confirms the camera is healthy even if the UI
  is slow.

### Clean shutdown

Press `CTRL+C` once in the launcher terminal. Wait for "Shutdown complete."
This releases the camera so the next start can use it.

---

## 12. Quick reference

```bash
# One-time setup
sudo apt install -y python3-picamera2 python3-libcamera libcamera-tools python3-venv
cd ~/kinetic/backend
python3 -m venv --system-site-packages venv
source venv/bin/activate
pip install -r requirements-pi.txt
cd ~/kinetic/Frontend && npm install && cd ..

# Every run
cd ~/kinetic
python3 start_pi.py
```

- Dashboard: `http://localhost:8080`
- Backend health: `http://localhost:5000/api/health`
- Camera stream: `http://localhost:5000/api/camera/stream`
- Windows equivalent: `python start.py`
