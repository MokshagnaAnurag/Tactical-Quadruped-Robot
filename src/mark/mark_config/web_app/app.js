// =========================================================
// HERMES Robot Control Dashboard - app.js
// Lightning McQueen Edition - Ka-Chow!
// Connects to ROS2 via rosbridge_websocket on port 9090
// =========================================================

// === CONFIG ===
const ROS_URL = 'ws://localhost:9090';
let ros = null;
let msgCount = 0;
let startTime = Date.now();
let moveInterval = null;
let maxSpeed = 0.5;
let maxTurn = 1.0;
let currentLinear = 0;
let currentAngular = 0;

let cmdPoseTopic = null;
let jointStateTopic = null;
let imuTopic = null;
let goalPoseTopic = null;

// ROS2D Map
let viewer = null;
let mapGridClient = null;
let navMode = 'camera';

// =========================================================
// CONNECTION MANAGEMENT
// =========================================================
function connect() {
    log('Connecting to ROS at ' + ROS_URL + '...', 'info');

    ros = new ROSLIB.Ros({ url: ROS_URL });

    ros.on('connection', () => {
        log('CONNECTED to ROS! Ka-Chow!', 'success');
        setStatus('connected', 'CONNECTED');
        setupTopics();
        startSpeedLines();
    });

    ros.on('error', (err) => {
        log('Connection error: ' + err, 'error');
        setStatus('disconnected', 'ERROR');
    });

    ros.on('close', () => {
        log('Disconnected from ROS', 'warn');
        setStatus('disconnected', 'DISCONNECTED');
        // Retry in 3s
        setTimeout(connect, 3000);
    });
}

function setStatus(state, text) {
    const dot = document.getElementById('connDot');
    const statusText = document.getElementById('statusText');
    dot.className = 'conn-dot ' + state;
    statusText.textContent = text;
}

// =========================================================
// ROS TOPICS SETUP
// =========================================================
function setupTopics() {
    // CMD_VEL publisher
    cmdVelTopic = new ROSLIB.Topic({
        ros: ros,
        name: '/cmd_vel',
        messageType: 'geometry_msgs/Twist'
    });

    // CMD_POSE publisher for gestures
    cmdPoseTopic = new ROSLIB.Topic({
        ros: ros,
        name: '/body_pose',
        messageType: 'geometry_msgs/Pose'
    });

    // Joint States subscriber
    jointStateTopic = new ROSLIB.Topic({
        ros: ros,
        name: '/joint_states',
        messageType: 'sensor_msgs/JointState'
    });
    jointStateTopic.subscribe(onJointState);

    // IMU subscriber
    imuTopic = new ROSLIB.Topic({
        ros: ros,
        name: '/imu/data',
        messageType: 'sensor_msgs/Imu'
    });
    imuTopic.subscribe(onImu);

    // Nav2 Goal Publisher
    goalPoseTopic = new ROSLIB.Topic({
        ros: ros,
        name: '/goal_pose',
        messageType: 'geometry_msgs/PoseStamped'
    });

    initMap();

    log('Topics subscribed. Robot ready!', 'success');
}

// =========================================================
// MOVEMENT
// =========================================================
function publishTwist(linear, angular) {
    if (!cmdVelTopic) return;
    const twist = new ROSLIB.Message({
        linear:  { x: linear,  y: 0.0, z: 0.0 },
        angular: { x: 0.0, y: 0.0, z: angular }
    });
    cmdVelTopic.publish(twist);
    msgCount++;
    currentLinear = linear;
    currentAngular = angular;
    updateSpeedDisplay(linear, angular);
}

function startMove(linear, angular) {
    if (moveInterval) clearInterval(moveInterval);
    publishTwist(linear * maxSpeed, angular * maxTurn);
    moveInterval = setInterval(() => publishTwist(linear * maxSpeed, angular * maxTurn), 100);
    updateModeDisplay(linear, angular);
}

function stopMove() {
    if (moveInterval) { clearInterval(moveInterval); moveInterval = null; }
    publishTwist(0, 0);
    document.getElementById('raceMode').textContent = 'IDLE';
}

function emergencyStop() {
    stopMove();
    log('EMERGENCY STOP!', 'error');
    document.getElementById('raceMode').textContent = 'E-STOP';
}

function updateModeDisplay(linear, angular) {
    let mode = 'MOVING';
    if (linear > 0) mode = 'FORWARD';
    else if (linear < 0) mode = 'REVERSE';
    else if (angular > 0) mode = 'TURN L';
    else if (angular < 0) mode = 'TURN R';
    document.getElementById('raceMode').textContent = mode;
}

function updateSpeedDisplay(linear, angular) {
    document.getElementById('linearSpeed').textContent = Math.abs(linear).toFixed(2);
    document.getElementById('angularSpeed').textContent = Math.abs(angular).toFixed(2);
    document.getElementById('linearBar').style.width = (Math.abs(linear) / maxSpeed * 100) + '%';
    document.getElementById('angularBar').style.width = (Math.abs(angular) / maxTurn * 100) + '%';
    document.getElementById('msgCount').textContent = 'MSGS: ' + msgCount;
}

function updateMaxSpeed(val) {
    maxSpeed = parseFloat(val);
    document.getElementById('maxSpeedVal').textContent = parseFloat(val).toFixed(1);
}

function updateMaxTurn(val) {
    maxTurn = parseFloat(val);
    document.getElementById('maxTurnVal').textContent = parseFloat(val).toFixed(1);
}

function setGait(type) {
    document.querySelectorAll('.gait-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn' + type.charAt(0).toUpperCase() + type.slice(1)).classList.add('active');
    log('Gait changed to: ' + type.toUpperCase(), 'info');
}

// =========================================================
// SENSOR CALLBACKS
// =========================================================
function onJointState(msg) {
    const names = msg.name;
    const positions = msg.position;

    const jointMap = {
        'FR_hip_joint': 'fr_hip', 'FR_thigh_joint': 'fr_thigh', 'FR_calf_joint': 'fr_calf',
        'FL_hip_joint': 'fl_hip', 'FL_thigh_joint': 'fl_thigh', 'FL_calf_joint': 'fl_calf',
        'RR_hip_joint': 'rr_hip', 'RR_thigh_joint': 'rr_thigh', 'RR_calf_joint': 'rr_calf',
        'RL_hip_joint': 'rl_hip', 'RL_thigh_joint': 'rl_thigh', 'RL_calf_joint': 'rl_calf',
    };

    for (let i = 0; i < names.length; i++) {
        const id = jointMap[names[i]];
        if (id) {
            const el = document.getElementById(id);
            if (el) el.textContent = positions[i].toFixed(3);
        }
    }
    document.getElementById('jointStatus').textContent = 'ACTIVE';
    document.getElementById('jointStatus').className = 'sensor-status ok';
}

function onImu(msg) {
    // Convert quaternion to euler
    const q = msg.orientation;
    const roll  = Math.atan2(2*(q.w*q.x + q.y*q.z), 1 - 2*(q.x*q.x + q.y*q.y));
    const pitch = Math.asin(2*(q.w*q.y - q.z*q.x));
    const yaw   = Math.atan2(2*(q.w*q.z + q.x*q.y), 1 - 2*(q.y*q.y + q.z*q.z));

    const toDeg = r => (r * 180 / Math.PI).toFixed(1);
    const toPercent = r => ((r / Math.PI + 1) / 2 * 100).toFixed(1);

    document.getElementById('rollVal').textContent = toDeg(roll) + '°';
    document.getElementById('pitchVal').textContent = toDeg(pitch) + '°';
    document.getElementById('yawVal').textContent = toDeg(yaw) + '°';

    // Move bar indicators (clamped 0-100%)
    const clamp = v => Math.max(5, Math.min(95, parseFloat(v)));
    document.getElementById('rollBar').style.left = clamp(toPercent(roll)) + '%';
    document.getElementById('pitchBar').style.left = clamp(toPercent(pitch)) + '%';
    document.getElementById('yawBar').style.left = clamp(toPercent(yaw)) + '%';

    document.getElementById('imuStatus').textContent = 'ACTIVE';
    document.getElementById('imuStatus').className = 'sensor-status ok';
}

// =========================================================
// KEYBOARD CONTROLS
// =========================================================
const keyState = {};

document.addEventListener('keydown', (e) => {
    if (keyState[e.key]) return; // prevent repeat
    keyState[e.key] = true;

    switch(e.key) {
        case 'w': case 'W':
            startMove(1.0, 0); highlightDpad('btnFwd'); break;
        case 's': case 'S':
            startMove(-1.0, 0); highlightDpad('btnBack'); break;
        case 'a': case 'A':
            startMove(0, 1.0); highlightDpad('btnLeft'); break;
        case 'd': case 'D':
            startMove(0, -1.0); highlightDpad('btnRight'); break;
        case 'q': case 'Q':
            startMove(0.5, 0.5); break;
        case 'e': case 'E':
            startMove(0.5, -0.5); break;
        case ' ':
            e.preventDefault();
            emergencyStop(); break;
    }
});

document.addEventListener('keyup', (e) => {
    delete keyState[e.key];
    if (['w','W','s','S','a','A','d','D','q','Q','e','E'].includes(e.key)) {
        stopMove();
        clearDpadHighlights();
    }
});

function highlightDpad(id) {
    clearDpadHighlights();
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
}

function clearDpadHighlights() {
    ['btnFwd','btnBack','btnLeft','btnRight'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });
}

// =========================================================
// LOG
// =========================================================
function log(msg, type = 'info') {
    const box = document.getElementById('logBox');
    const entry = document.createElement('div');
    const time = new Date().toTimeString().slice(0,8);
    entry.className = 'log-entry log-' + type;
    entry.textContent = '[' + time + '] ' + msg;
    box.insertBefore(entry, box.firstChild);

    // Keep max 50 entries
    while (box.children.length > 50) box.removeChild(box.lastChild);
}

function clearLog() {
    document.getElementById('logBox').innerHTML = '<div class="log-entry log-info">Log cleared.</div>';
}

// =========================================================
// UPTIME COUNTER
// =========================================================
function updateUptime() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    document.getElementById('uptimeVal').textContent = m + ':' + s;
}

// =========================================================
// SPEED LINES ANIMATION
// =========================================================
function startSpeedLines() {
    const container = document.getElementById('speedLines');
    for (let i = 0; i < 8; i++) {
        const line = document.createElement('div');
        line.className = 'speed-line';
        line.style.top = Math.random() * 100 + 'vh';
        line.style.width = (80 + Math.random() * 200) + 'px';
        line.style.animationDelay = (Math.random() * 3) + 's';
        line.style.animationDuration = (1 + Math.random() * 2) + 's';
        container.appendChild(line);
    }
}

// =========================================================
// START
// =========================================================
setInterval(updateUptime, 1000);
connect();

log('HERMES Robot Dashboard loaded. Ka-Chow!', 'success');
log('Connect to ROS at ws://localhost:9090', 'info');
log('Controls: WASD = drive, SPACE = E-Stop', 'info');

// =========================================================
// GESTURES
// =========================================================
function publishPose(roll, pitch, yaw, z) {
    if (!cmdPoseTopic) return;
    let cy = Math.cos(yaw * 0.5), sy = Math.sin(yaw * 0.5);
    let cp = Math.cos(pitch * 0.5), sp = Math.sin(pitch * 0.5);
    let cr = Math.cos(roll * 0.5), sr = Math.sin(roll * 0.5);
    
    let qx = sr * cp * cy - cr * sp * sy;
    let qy = cr * sp * cy + sr * cp * sy;
    let qz = cr * cp * sy - sr * sp * cy;
    let qw = cr * cp * cy + sr * sp * sy;
    
    let mag = Math.sqrt(qx*qx + qy*qy + qz*qz + qw*qw);
    
    // Force numbers to floats to avoid ROSbridge type errors
    let pose = new ROSLIB.Message({
        position: { x: 0.0001, y: 0.0001, z: parseFloat(z) || 0.0001 },
        orientation: {
            x: (qx/mag) || 0.0,
            y: (qy/mag) || 0.0,
            z: (qz/mag) || 0.0,
            w: (qw/mag) || 1.0
        }
    });
    cmdPoseTopic.publish(pose);
}

function stand() { publishPose(0, 0, 0, 0.0); log('Gesture: STAND', 'success'); }
function sit() { publishPose(0, -0.35, 0, -0.08); log('Gesture: SIT', 'success'); }
function bow() { publishPose(0, 0.35, 0, -0.05); log('Gesture: BOW', 'success'); }

function heartGesture() {
    log('Gesture: HEART DANCE 💖', 'success');
    let t = 0;
    let heartTimer = setInterval(() => {
        t += 0.15;
        let roll = -0.3 * (16 * Math.pow(Math.sin(t), 3)) / 16;
        let pitch = 0.3 * (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) / 16;
        publishPose(roll, pitch, 0, -0.02 + Math.abs(pitch)*0.05);
        if (t > Math.PI * 2) {
            clearInterval(heartTimer);
            stand();
        }
    }, 50);
}

// =========================================================
// MAP & NAV2
// =========================================================
function toggleViewMode() {
    const btn = document.getElementById('viewToggleBtn');
    const cam = document.getElementById('camFeed');
    const map = document.getElementById('mapFeed');

    if (navMode === 'camera') {
        navMode = 'map';
        btn.textContent = 'SWITCH TO OPTICS';
        cam.style.display = 'none';
        map.style.display = 'block';
        log('Switched to Autonomous Radar Mode', 'info');
    } else {
        navMode = 'camera';
        btn.textContent = 'SWITCH TO RADAR';
        map.style.display = 'none';
        cam.style.display = 'block';
        log('Switched to Optics Mode', 'info');
    }
}

function initMap() {
    if (viewer) return;
    
    // Create the 2D viewer
    viewer = new ROS2D.Viewer({
        divID: 'mapFeed',
        width: document.getElementById('mapContainer').clientWidth,
        height: document.getElementById('mapContainer').clientHeight,
        background: '#000000'
    });

    // Setup the map client
    mapGridClient = new ROS2D.OccupancyGridClient({
        ros: ros,
        rootObject: viewer.scene,
        continuous: true
    });

    mapGridClient.on('change', function() {
        viewer.scaleToDimensions(mapGridClient.currentGrid.width, mapGridClient.currentGrid.height);
        viewer.shift(mapGridClient.currentGrid.pose.position.x, mapGridClient.currentGrid.pose.position.y);
    });

    // Add click-to-navigate listener
    viewer.scene.addEventListener('stagemousedown', function(event) {
        if (navMode !== 'map') return;
        
        let pos = viewer.scene.globalToRos(event.stageX, event.stageY);
        sendNavGoal(pos.x, pos.y);
    });
}

function sendNavGoal(x, y) {
    if (!goalPoseTopic) return;
    
    let goal = new ROSLIB.Message({
        header: {
            frame_id: 'map',
            stamp: { sec: 0, nanosec: 0 }
        },
        pose: {
            position: { x: parseFloat(x), y: parseFloat(y), z: 0.0 },
            orientation: { x: 0.0, y: 0.0, z: 0.0, w: 1.0 }
        }
    });
    
    goalPoseTopic.publish(goal);
    log('Nav2 Waypoint Sent: [' + x.toFixed(2) + ', ' + y.toFixed(2) + ']', 'success');
}
