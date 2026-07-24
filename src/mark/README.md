# MARK — Tactical Quadruped Robot
**Lead Developer & Architect: Moksh**

MARK is an advanced ROS2 Humble based quadruped robotic system featuring a fully custom glassmorphism web dashboard, real-time camera streaming, teleoperation, and dynamic gestures.

## 🚀 Quick Launch Guide (Empty World)
Open 5 separate terminals and run these commands in order:

**Terminal 1 — Physics Engine (Gazebo)**
`source ~/hermes_ws/install/setup.bash`
`export LIBGL_ALWAYS_SOFTWARE=1`
`ros2 launch mark_config gazebo.launch.py world:="empty.world"`

**Terminal 2 — ROS Websocket Bridge**
`source ~/hermes_ws/install/setup.bash`
`ros2 run rosbridge_server rosbridge_websocket`

**Terminal 3 — Live Camera Stream**
`source ~/hermes_ws/install/setup.bash`
`ros2 run web_video_server web_video_server`

**Terminal 4 — Teleoperation (Keyboard Controls)**
`source ~/hermes_ws/install/setup.bash`
`ros2 launch mark_teleop teleop.launch.py`

**Terminal 5 — Web Dashboard**
`python3 -m http.server 8000 --directory ~/hermes_ws/src/mark/mark_config/web_app`
*(Open http://localhost:8000 in your browser)*
