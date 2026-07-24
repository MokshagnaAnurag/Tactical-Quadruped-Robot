# MARK — Tactical Quadruped Robot
**Lead Developer & Architect: Moksh**

MARK is an advanced, fully autonomous ROS2 Humble quadruped robotic system. It features a custom state-of-the-art Glassmorphism web dashboard, real-time camera optics streaming, dynamic IK gesture commands, and live SLAM Radar mapping for autonomous navigation.

---

## 🚀 Features
- **Tactical Command Center (Web UI):** Beautiful Cyberpunk/Glassmorphism interface for full remote control.
- **Autonomous Navigation (Nav2):** Live 2D SLAM Radar. Click anywhere on the map to send MARK walking autonomously.
- **Dynamic Gestures:** Inverse Kinematics driven poses (Sit, Stand, Bow, Heart Dance).
- **Live Optics:** Real-time camera feed streaming directly to the browser.
- **Telemetry & Gyroscope:** Real-time IMU roll/pitch/yaw visualization and leg joint tracking.

---

## 🛠️ System Requirements
- Ubuntu 22.04
- ROS2 Humble
- Gazebo Classic
- `tf2_web_republisher` & `web_video_server`

---

## 💻 Quick Launch Guide (Autonomous Radar Mode)
To launch the full system with live mapping, open 7 separate terminals and run these commands in order:

### 1. The Physics Engine
```bash
source ~/hermes_ws/install/setup.bash
export LIBGL_ALWAYS_SOFTWARE=1
ros2 launch mark_config gazebo.launch.py world:='/home/moksh/hermes_ws/src/mark/mark_gazebo/worlds/custom_playground.world'
```
### 2. ROS Bridge (Web Connection)
```bash
source ~/hermes_ws/install/setup.bash
ros2 run rosbridge_server rosbridge_websocket
```
### 3. Live Optics Stream
```bash
source ~/hermes_ws/install/setup.bash
ros2 run web_video_server web_video_server
```
### 4. Teleoperation (Manual Keyboard)
```bash
source ~/hermes_ws/install/setup.bash
ros2 launch mark_teleop teleop.launch.py
```
### 5. Tactical Command Center (Web Server)
```bash
python3 -m http.server 8000 --directory ~/hermes_ws/src/mark/mark_config/web_app
```
### 6. Autonomous Brain (Nav2 & SLAM)
```bash
source ~/hermes_ws/install/setup.bash
ros2 launch mark_navigation slam.launch.py sim:=true
```
### 7. Radar Web Bridge
```bash
source ~/hermes_ws/install/setup.bash
ros2 run tf2_web_republisher tf2_web_republisher
```

Once running, navigate to `http://localhost:8000` in your browser to access the Command Center.

---
*Created and maintained exclusively by Moksh.*
