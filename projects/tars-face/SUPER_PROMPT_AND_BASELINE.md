# T.A.R.S. World v0.3 — Super Prompt & Visual Baseline

> **Created:** July 26, 2026
> **Purpose:** Baseline HTML and architecture specification for T.A.R.S. Embodiment System (Option B: Web Kiosk / Three.js Procedural Entity).

---

## 1. Super Prompt Requirements Summary

* **Baseline HTML:** `T.A.R.S. World v0.3` (3D room with window, weather, day/night cycle, desk, rack, PC tower RGB, camera parallax).
* **Objective:** Evolve T.A.R.S. into a dynamic procedural digital entity (semi-organic, semi-machine floating orb/blob with central energy core, translucent body, outer shell, deforming surface, particles, scanlines) inside the 3D room.
* **Architecture:**
  - LLM = Decides WHAT T.A.R.S. expresses (compact behavioral intent JSON: `emotion`, `intensity`, `energy`, `urgency`, `gesture`, `movement`, `gaze`).
  - Local Animation Engine (`TARSBehaviorEngine`, `TARSAnimationController`, `TARSProceduralBody`, `TARSParticleField`, `TARSBehaviorPresets`, `TARSAnimationMixer`) = Decides HOW T.A.R.S. physically expresses it through Three.js procedural animation.
* **Behavior Presets:** IDLE, LISTENING, THINKING, SPEAKING, EXCITED, SARCASTIC, AMUSED, CONFUSED, DISAPPROVING, SERIOUS, WARNING, CRITICAL, CELEBRATORY, CALM/CHILL.
* **API Exposing:** `TARS.setEmotion("sarcastic", 0.7)`, `TARS.setSpeaking(true)`, `TARS.lookAt("user")`, `TARS.moveTo({x,y,z})`, etc.

---

## 2. Approved Baseline HTML Code (`T.A.R.S. World v0.3`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>T.A.R.S. World v0.3</title>

<style>
    * { box-sizing: border-box; }

    html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #05070a;
        font-family: Arial, sans-serif;
    }

    #scene { position: fixed; inset: 0; }

    #hud {
        position: fixed;
        top: 20px;
        left: 24px;
        z-index: 10;
        color: rgba(210, 235, 255, 0.75);
        pointer-events: none;
        text-shadow: 0 0 12px rgba(80, 180, 255, 0.6);
    }

    #hud .title { font-size: 13px; letter-spacing: 5px; font-weight: bold; }
    #hud .status { margin-top: 8px; font-size: 10px; letter-spacing: 2px; opacity: 0.65; }

    #status {
        position: fixed;
        bottom: 20px;
        left: 24px;
        z-index: 10;
        color: rgba(170, 210, 235, 0.55);
        font-size: 10px;
        letter-spacing: 2px;
        pointer-events: none;
    }

    #hint {
        position: fixed;
        bottom: 20px;
        right: 24px;
        z-index: 10;
        color: rgba(170, 210, 235, 0.35);
        font-size: 9px;
        letter-spacing: 1px;
        pointer-events: none;
    }
</style>
</head>

<body>

<div id="scene"></div>

<div id="hud">
    <div class="title">T.A.R.S. // WORLD</div>
    <div class="status">ENVIRONMENTAL SYSTEM // ONLINE</div>
</div>

<div id="status">ROOM STATUS: IDLE</div>
<div id="hint">MOVE POINTER TO EXPLORE</div>

<script type="module">

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";

// ============================================================
// CORE
// ============================================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020407);
scene.fog = new THREE.FogExp2(0x05080c, 0.035);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2.7, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById("scene").appendChild(renderer.domElement);

// ============================================================
// LIGHTING
// ============================================================

const ambientLight = new THREE.AmbientLight(0x263746, 1.2);
scene.add(ambientLight);

const blueLight = new THREE.PointLight(0x2d8cff, 18, 30);
blueLight.position.set(-3, 4, 2);
scene.add(blueLight);

const warmLight = new THREE.PointLight(0xff8b3d, 8, 12);
warmLight.position.set(2, 3, 1);
scene.add(warmLight);

const serverLight = new THREE.PointLight(0x00aaff, 10, 8);
serverLight.position.set(-4, 2, -2);
scene.add(serverLight);

// ============================================================
// HELPERS
// ============================================================

function material(color, roughness = 0.8, metalness = 0) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function glowMaterial(color) {
    return new THREE.MeshBasicMaterial({ color, toneMapped: false });
}

function makeCanvas(w, h) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    return { canvas, ctx: canvas.getContext("2d") };
}

function canvasTexture(draw, w = 512, h = 512) {
    const { canvas, ctx } = makeCanvas(w, h);
    draw(ctx, w, h);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
}

// soft round sprite used for all particle systems (rain, dust, stars) so
// points render as gentle round dots instead of raw square GL points
function circleSpriteTexture() {
    return canvasTexture((ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.4, "rgba(255,255,255,0.9)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
    }, 32, 32);
}
const dotSprite = circleSpriteTexture();

// registry of screens that get their canvas redrawn every animation tick
const animatedScreens = [];
function registerAnimatedScreen(w, h, drawFn, refreshRate = 0.12) {
    const { canvas, ctx } = makeCanvas(w, h);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const entry = { ctx, w, h, tex, drawFn, refreshRate, nextUpdate: 0 };
    animatedScreens.push(entry);
    return tex;
}

const room = new THREE.Group();
scene.add(room);

// ============================================================
// FLOOR / SIDE WALLS / CEILING
// ============================================================

const floor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 14), material(0x111820, 0.95));
floor.position.y = -0.15;
floor.receiveShadow = true;
room.add(floor);

const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 8, 14), material(0x0a1016, 0.95));
leftWall.position.set(-8, 4, 0);
leftWall.receiveShadow = true;
room.add(leftWall);

const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 8, 14), material(0x0a1016, 0.95));
rightWall.position.set(8, 4, 0);
rightWall.receiveShadow = true;
room.add(rightWall);

const ceiling = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 14), material(0x070b10, 0.95));
ceiling.position.y = 8;
ceiling.receiveShadow = true;
room.add(ceiling);

// ============================================================
// BACK WALL WITH A REAL WINDOW OPENING
// ============================================================

const backWallMat = material(0x0c1219, 0.95);
const WIN_X = 2.5, WIN_Y = 4.2, WIN_W = 6, WIN_H = 4, WALL_Z = -6, WALL_THICK = 0.3;
const winLeft = WIN_X - WIN_W / 2;
const winRight = WIN_X + WIN_W / 2;
const winTop = WIN_Y + WIN_H / 2;
const winBottom = WIN_Y - WIN_H / 2;

const wallLeftSeg = new THREE.Mesh(new THREE.BoxGeometry(winLeft - (-8), 8, WALL_THICK), backWallMat);
wallLeftSeg.position.set((-8 + winLeft) / 2, 4, WALL_Z);
wallLeftSeg.receiveShadow = true;
room.add(wallLeftSeg);

const wallRightSeg = new THREE.Mesh(new THREE.BoxGeometry(8 - winRight, 8, WALL_THICK), backWallMat);
wallRightSeg.position.set((winRight + 8) / 2, 4, WALL_Z);
wallRightSeg.receiveShadow = true;
room.add(wallRightSeg);

const wallTopSeg = new THREE.Mesh(new THREE.BoxGeometry(WIN_W, 8 - winTop, WALL_THICK), backWallMat);
wallTopSeg.position.set(WIN_X, (winTop + 8) / 2, WALL_Z);
wallTopSeg.receiveShadow = true;
room.add(wallTopSeg);

const wallBottomSeg = new THREE.Mesh(new THREE.BoxGeometry(WIN_W, winBottom, WALL_THICK), backWallMat);
wallBottomSeg.position.set(WIN_X, winBottom / 2, WALL_Z);
wallBottomSeg.receiveShadow = true;
room.add(wallBottomSeg);

// ============================================================
// WINDOW FRAME + GLASS (kept clear so the outside is visible)
// ============================================================

const windowFrame = new THREE.Group();
windowFrame.position.set(WIN_X, WIN_Y, WALL_Z + 0.22);
room.add(windowFrame);

const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(WIN_W, WIN_H),
    new THREE.MeshPhysicalMaterial({
        color: 0x0b2233,
        transparent: true,
        opacity: 0.12,
        roughness: 0.03,
        metalness: 0.05,
        transmission: 0.9,
        side: THREE.DoubleSide
    })
);
windowFrame.add(glass);

const windowGlow = new THREE.PointLight(0x1679c9, 10, 15);
windowGlow.position.set(WIN_X, WIN_Y - 0.2, WALL_Z + 1);
scene.add(windowGlow);

const frameMaterial = material(0x101820, 0.6, 0.5);
const vFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, WIN_H + 0.3, 0.2), frameMaterial);
windowFrame.add(vFrame);
const hFrame = new THREE.Mesh(new THREE.BoxGeometry(WIN_W + 0.3, 0.12, 0.2), frameMaterial);
windowFrame.add(hFrame);
const trimMat = material(0x0d151c, 0.55, 0.4);
const trimTop = new THREE.Mesh(new THREE.BoxGeometry(WIN_W + 0.4, 0.15, 0.25), trimMat);
trimTop.position.y = WIN_H / 2 + 0.1;
windowFrame.add(trimTop);
const trimBottom = trimTop.clone();
trimBottom.position.y = -WIN_H / 2 - 0.1;
windowFrame.add(trimBottom);
const trimLeft = new THREE.Mesh(new THREE.BoxGeometry(0.15, WIN_H + 0.4, 0.25), trimMat);
trimLeft.position.x = -WIN_W / 2 - 0.1;
windowFrame.add(trimLeft);
const trimRight = trimLeft.clone();
trimRight.position.x = WIN_W / 2 + 0.1;
windowFrame.add(trimRight);

// ============================================================
// EXTERIOR: SKYLINE + SKY + SUN/MOON + STARS + RAIN
// all positioned behind the actual wall opening
// ============================================================

const exterior = new THREE.Group();
exterior.position.set(0, 0, WALL_Z - 3);
scene.add(exterior);

const skyPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 20),
    new THREE.MeshBasicMaterial({ color: 0x04070c, fog: false })
);
skyPlane.position.set(0, 6, -10);
exterior.add(skyPlane);

const celestial = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff3d6, toneMapped: false, transparent: true })
);
celestial.position.set(0, 5, -9.5);
exterior.add(celestial);

const starGeometry = new THREE.BufferGeometry();
const starCount = 200;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
    starPositions[i * 3] = (Math.random() - 0.5) * 26;
    starPositions[i * 3 + 1] = 2 + Math.random() * 14;
    starPositions[i * 3 + 2] = -9.8 - Math.random() * 2;
}
starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({
    color: 0xffffff, size: 0.045, map: dotSprite, transparent: true, opacity: 0.8, depthWrite: false
}));
exterior.add(stars);

function buildingWindowTex() {
    return canvasTexture((ctx, w, h) => {
        ctx.fillStyle = "#050a10";
        ctx.fillRect(0, 0, w, h);
        for (let y = 8; y < h; y += 14) {
            for (let x = 6; x < w; x += 14) {
                if (Math.random() > 0.5) {
                    ctx.fillStyle = Math.random() > 0.5 ? "#ffcd8a" : "#8fd0ff";
                    ctx.fillRect(x, y, 6, 8);
                }
            }
        }
    }, 128, 256);
}

const buildings = [];
for (let i = 0; i < 9; i++) {
    const bw = 1.2 + Math.random() * 1.6;
    const bh = 3 + Math.random() * 7;
    const bd = 1.2 + Math.random() * 1.6;
    const bx = -3 + i * 1.3 + (Math.random() - 0.5) * 0.6;
    const tex = buildingWindowTex();
    const buildingMat = new THREE.MeshStandardMaterial({
        map: tex, color: 0x2a3a4c, roughness: 0.9,
        emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.6
    });
    const buildingMesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), buildingMat);
    buildingMesh.position.set(bx, bh / 2 - 0.1, -Math.random() * 4);
    exterior.add(buildingMesh);
    buildings.push(buildingMat);
}

const rainGroup = new THREE.Group();
rainGroup.position.set(0, 0, WALL_Z - 0.6);
scene.add(rainGroup);

const rainCount = 500;
const rainGeometry = new THREE.BufferGeometry();
const rainPositions = new Float32Array(rainCount * 3);
const rainSpeeds = new Float32Array(rainCount);
for (let i = 0; i < rainCount; i++) {
    rainPositions[i * 3] = winLeft + Math.random() * WIN_W;
    rainPositions[i * 3 + 1] = winBottom + Math.random() * (WIN_H + 2);
    rainPositions[i * 3 + 2] = -Math.random() * 2.5;
    rainSpeeds[i] = 0.04 + Math.random() * 0.05;
}
rainGeometry.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
const rain = new THREE.Points(rainGeometry, new THREE.PointsMaterial({
    color: 0x9fd4ef, size: 0.035, map: dotSprite, transparent: true, opacity: 0.7, depthWrite: false
}));
rainGroup.add(rain);

// ============================================================
// DAY / NIGHT CYCLE (driven by the visitor's real local clock)
// ============================================================

const NIGHT_SKY = new THREE.Color(0x03050a);
const DAY_SKY = new THREE.Color(0x2f5a82);
const WARM_TINT = new THREE.Color(0xff9a52);
const MOON_COLOR = new THREE.Color(0xd8e8ff);
const SUN_COLOR = new THREE.Color(0xfff3d6);
const NIGHT_GLOW = new THREE.Color(0x1679c9);
const DAY_GLOW = new THREE.Color(0xcfe9ff);

function bell(hours, center, width) {
    const d = Math.abs(((hours - center + 12 + 24) % 24) - 12);
    return Math.max(0, 1 - d / width);
}

function updateDayNight() {
    const now = new Date();
    const hours = now.getHours() + now.getMinutes() / 60;
    const t = hours / 24;

    const dayFactor = Math.cos((t - 0.5) * Math.PI * 2) * 0.5 + 0.5; // 0 at midnight, 1 at noon
    const dawn = bell(hours, 6.5, 2.2);
    const dusk = bell(hours, 19.5, 2.2);
    const warmth = Math.min(1, dawn + dusk);

    const sky = new THREE.Color().lerpColors(NIGHT_SKY, DAY_SKY, dayFactor).lerp(WARM_TINT, warmth * 0.35);
    skyPlane.material.color.copy(sky);

    const glow = new THREE.Color().lerpColors(NIGHT_GLOW, DAY_GLOW, dayFactor).lerp(WARM_TINT, warmth * 0.5);
    windowGlow.color.copy(glow);
    windowGlow.intensity = 6 + dayFactor * 8 + warmth * 4;

    ambientLight.intensity = 1.0 + dayFactor * 0.7;

    // celestial body arcs across the window; sun by day, moon by night
    const angle = t * Math.PI * 2 - Math.PI / 2;
    celestial.position.x = Math.cos(angle) * 3.2;
    celestial.position.y = 4 + Math.sin(angle) * 5.5;
    const aboveHorizon = celestial.position.y > 0.5 ? 1 : 0;
    celestial.material.opacity = aboveHorizon * (0.6 + warmth * 0.4);
    celestial.material.color.copy(dayFactor > 0.5 ? SUN_COLOR : MOON_COLOR).lerp(WARM_TINT, warmth * 0.6);

    stars.material.opacity = (1 - dayFactor) * 0.85;

    buildings.forEach(mat => { mat.emissiveIntensity = 0.15 + (1 - dayFactor) * 0.75; });

    return dayFactor;
}

// ============================================================
// FRAMED WALL ART
// ============================================================

function drawSchematic(ctx, w, h) {
    ctx.fillStyle = "#050c14";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(70,150,200,0.25)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.strokeStyle = "#5fd0ff";
    ctx.lineWidth = 3;
    ctx.strokeRect(w * 0.32, h * 0.15, w * 0.36, h * 0.6);
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(w * 0.32, h * (0.25 + i * 0.1));
        ctx.lineTo(w * 0.32 + w * 0.36, h * (0.25 + i * 0.1));
        ctx.stroke();
    }
    ctx.fillStyle = "#5fd0ff";
    for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(w * (0.15 + i * 0.14), h * 0.85, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.font = "12px monospace";
    ctx.fillStyle = "rgba(150,210,240,0.6)";
    ctx.fillText("UNIT// SCHEMATIC 07-A", w * 0.08, h * 0.92);
}

function drawNebula(ctx, w, h) {
    const grad = ctx.createRadialGradient(w * 0.4, h * 0.4, 10, w * 0.4, h * 0.4, w * 0.7);
    grad.addColorStop(0, "#5a2d8f");
    grad.addColorStop(0.4, "#22376b");
    grad.addColorStop(1, "#020409");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 180; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.8})`;
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 1.4, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawCircuit(ctx, w, h) {
    ctx.fillStyle = "#07131a";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#e0a752";
    ctx.lineWidth = 2;
    let x = 20, y = h * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 0; i < 14; i++) {
        x += 20 + Math.random() * 20;
        y += (Math.random() - 0.5) * 60;
        y = Math.max(20, Math.min(h - 20, y));
        ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "#5fd0ff";
    for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

function createFramedArt({ x, y, z, rotY = 0, width = 1.6, height = 1.1, draw, glow = 0.2 }) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotY;
    room.add(group);

    const tex = canvasTexture(draw);
    const artMat = new THREE.MeshStandardMaterial({
        map: tex, roughness: 0.7, emissive: 0x223344, emissiveMap: tex, emissiveIntensity: glow
    });
    const artPlane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), artMat);
    group.add(artPlane);

    const frameMat = material(0x1a1410, 0.6, 0.3);
    const t = 0.07;
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(width + t * 2, t, 0.06), frameMat);
    topBar.position.set(0, height / 2 + t / 2, -0.02);
    group.add(topBar);
    const botBar = topBar.clone();
    botBar.position.y = -height / 2 - t / 2;
    group.add(botBar);
    const leftBar = new THREE.Mesh(new THREE.BoxGeometry(t, height, 0.06), frameMat);
    leftBar.position.set(-width / 2 - t / 2, 0, -0.02);
    group.add(leftBar);
    const rightBar = leftBar.clone();
    rightBar.position.x = width / 2 + t / 2;
    group.add(rightBar);

    return group;
}

createFramedArt({ x: -3.2, y: 4.6, z: -5.83, width: 2.1, height: 1.5, draw: drawSchematic, glow: 0.35 });
createFramedArt({ x: -7.83, y: 4.7, z: -2.3, rotY: Math.PI / 2, width: 1.5, height: 2, draw: drawNebula, glow: 0.4 });
createFramedArt({ x: -7.83, y: 2.7, z: 0.8, rotY: Math.PI / 2, width: 1.2, height: 1.2, draw: drawCircuit, glow: 0.3 });
createFramedArt({ x: 7.83, y: 4.8, z: -3.6, rotY: -Math.PI / 2, width: 1.6, height: 1.1, draw: drawCircuit, glow: 0.3 });

// ============================================================
// WALL CLOCK
// ============================================================

const clockGroup = new THREE.Group();
clockGroup.position.set(7.82, 6.2, -1.2);
clockGroup.rotation.y = -Math.PI / 2;
room.add(clockGroup);

const clockFaceTex = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = "#0b1218";
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5fd0ff";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = "#5fd0ff";
    for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const x1 = w / 2 + Math.cos(a) * (w / 2 - 16);
        const y1 = h / 2 + Math.sin(a) * (w / 2 - 16);
        ctx.beginPath();
        ctx.arc(x1, y1, 3, 0, Math.PI * 2);
        ctx.fill();
    }
});
const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.4, 32), new THREE.MeshStandardMaterial({ map: clockFaceTex, emissive: 0x113344, emissiveIntensity: 0.3 }));
clockGroup.add(clockFace);

// each hand lives inside its own pivot group anchored at the face center (0,0,z),
// with the hand mesh offset outward from that pivot — this is what makes
// rotating the pivot sweep the hand around the face instead of spinning
// the hand around its own midpoint in place
const hourPivot = new THREE.Group();
hourPivot.position.set(0, 0, 0.015);
clockGroup.add(hourPivot);
const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.01), glowMaterial(0x9fe6ff));
hourHand.position.set(0, 0.09, 0);
hourPivot.add(hourHand);

const minutePivot = new THREE.Group();
minutePivot.position.set(0, 0, 0.02);
clockGroup.add(minutePivot);
const minuteHand = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.32, 0.01), glowMaterial(0x9fe6ff));
minuteHand.position.set(0, 0.15, 0);
minutePivot.add(minuteHand);

const clockPin = new THREE.Mesh(new THREE.CircleGeometry(0.022, 16), glowMaterial(0x9fe6ff));
clockPin.position.set(0, 0, 0.022);
clockGroup.add(clockPin);

// this clock shows the real local time, matching the day/night cycle outside
function setClockToRealTime() {
    const now = new Date();
    const h = now.getHours() % 12;
    const m = now.getMinutes();
    hourPivot.rotation.z = -((h + m / 60) / 12) * Math.PI * 2;
    minutePivot.rotation.z = -(m / 60) * Math.PI * 2;
}

// ============================================================
// CORK BOARD
// ============================================================

const corkTex = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = "#5a4632";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`;
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
    }
    const notes = ["#e8d24a", "#5fd0ff", "#ff8b6b", "#8de88a"];
    for (let i = 0; i < 6; i++) {
        ctx.fillStyle = notes[i % notes.length];
        const x = 20 + (i % 3) * (w / 3.2);
        const y = 20 + Math.floor(i / 3) * (h / 2.2);
        ctx.save();
        ctx.translate(x + 40, y + 40);
        ctx.rotate((Math.random() - 0.5) * 0.3);
        ctx.fillRect(-40, -40, 80, 80);
        ctx.restore();
    }
});
const corkBoard = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1), new THREE.MeshStandardMaterial({ map: corkTex, roughness: 0.9 }));
corkBoard.position.set(6.7, 3.3, -5.83);
room.add(corkBoard);

// ============================================================
// SHELF WITH BOOKS
// ============================================================

const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.35), material(0x1a130d, 0.7));
shelf.position.set(7.7, 5.6, -1.9);
room.add(shelf);
const bookColors = [0x8b2c2c, 0x2c5c8b, 0x3c8b4a, 0xb08a2c, 0x6b3c8b];
for (let i = 0; i < 8; i++) {
    const bw = 0.08 + Math.random() * 0.05;
    const bh = 0.35 + Math.random() * 0.15;
    const book = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.28), material(bookColors[i % bookColors.length], 0.6));
    book.position.set(7.4 + i * 0.12, 5.64 + bh / 2, -1.9);
    room.add(book);
}

// ============================================================
// DESK
// ============================================================

const desk = new THREE.Group();
desk.position.set(1.7, 0, -2.2);
room.add(desk);

const desktop = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.25, 1.5), material(0x171d23, 0.75));
desktop.position.y = 2.3;
desktop.castShadow = true;
desktop.receiveShadow = true;
desk.add(desktop);

for (const x of [-1.7, 1.7]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.3, 0.8), material(0x0b1015, 0.8));
    leg.position.set(x, 1.15, 0);
    desk.add(leg);
}

// ---- monitors, now with live-updating screen content ----

function drawTerminal(ctx, w, h, time) {
    ctx.fillStyle = "#040d14";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#4fd6ff";
    ctx.font = "13px monospace";
    const load = Math.floor(4 + Math.sin(time * 0.6) * 3 + 4);
    const loadBar = "|".repeat(Math.max(1, load)) + ".".repeat(Math.max(0, 10 - load));
    const cursor = Math.floor(time * 2) % 2 === 0 ? "_" : " ";
    const lines = [
        "> tars.core.status()",
        "SYS  : nominal",
        "PWR  : " + (95 + Math.sin(time * 0.4) * 3).toFixed(1) + "%",
        "TEMP : " + (40 + Math.sin(time * 0.9) * 2).toFixed(0) + "C",
        "NET  : " + (1.1 + Math.sin(time * 1.3) * 0.2).toFixed(1) + "gbps",
        "LOAD : " + loadBar,
        "> awaiting input" + cursor
    ];
    lines.forEach((l, i) => ctx.fillText(l, 14, 30 + i * 22));
    ctx.strokeStyle = "rgba(79,214,255,0.4)";
    ctx.strokeRect(2, 2, w - 4, h - 4);
}

function drawWaveform(ctx, w, h, time) {
    ctx.fillStyle = "#050a12";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#5fd0ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
        const y = h / 2 + Math.sin(x * 0.05 + time * 2) * 20 * Math.sin(x * 0.003 + time * 0.5) + (Math.random() - 0.5) * 6;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "#ff8b6b";
    for (let i = 0; i < 8; i++) {
        const bx = 20 + i * (w / 9);
        const bh = 10 + (Math.sin(time * 3 + i) * 0.5 + 0.5) * (h - 30);
        ctx.fillRect(bx, h - bh, 10, bh);
    }
}

function createMonitor(x, y, z, scale, drawFn, refreshRate) {
    const monitor = new THREE.Group();
    monitor.position.set(x, y, z);
    monitor.scale.setScalar(scale);
    desk.add(monitor);

    const tex = registerAnimatedScreen(512, 320, drawFn, refreshRate);
    const screen = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.9, 0.08),
        new THREE.MeshStandardMaterial({
            map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 1.1, roughness: 0.3
        })
    );
    monitor.add(screen);

    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), material(0x151b20, 0.5));
    stand.position.y = -0.65;
    monitor.add(stand);

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.3), material(0x151b20, 0.5));
    base.position.y = -0.9;
    monitor.add(base);

    return screen;
}

const monitor1 = createMonitor(-0.9, 3.1, -0.3, 1.1, drawTerminal, 0.15);
const monitor2 = createMonitor(0.8, 3.1, -0.3, 0.9, drawWaveform, 0.05);

// ---- keyboard, mouse, mug ----

const keyboard = new THREE.Group();
keyboard.position.set(-0.1, 2.44, 0.35);
desk.add(keyboard);
const kbBody = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.45), material(0x14181c, 0.6));
keyboard.add(kbBody);
const kbTex = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = "#14181c";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#2a3138";
    const cols = 14, rows = 5;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            ctx.fillRect(6 + c * (w / cols), 6 + r * (h / rows), w / cols - 4, h / rows - 4);
        }
    }
}, 256, 96);
const kbTop = new THREE.Mesh(new THREE.PlaneGeometry(1.28, 0.43), new THREE.MeshStandardMaterial({ map: kbTex, roughness: 0.7 }));
kbTop.rotation.x = -Math.PI / 2;
kbTop.position.y = 0.026;
keyboard.add(kbTop);

const mouse = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.08, 4, 8), material(0x1c2126, 0.4, 0.2));
mouse.rotation.x = Math.PI / 2;
mouse.position.set(0.85, 2.35, 0.4);
desk.add(mouse);

const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.14, 16), material(0x3a4a55, 0.5));
mug.position.set(-1.75, 2.42, 0.45);
desk.add(mug);
const mugHandle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 16, Math.PI), material(0x3a4a55, 0.5));
mugHandle.rotation.z = Math.PI / 2;
mugHandle.position.set(-1.68, 2.42, 0.45);
desk.add(mugHandle);

// ---- desk lamp ----

const lamp = new THREE.Group();
lamp.position.set(-1.85, 2.3, -0.4);
desk.add(lamp);
const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.04, 16), material(0x1a1e22, 0.5, 0.3));
lamp.add(lampBase);
const lampArmLower = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), material(0x1a1e22, 0.5, 0.3));
lampArmLower.position.set(0, 0.25, 0);
lampArmLower.rotation.z = 0.3;
lamp.add(lampArmLower);
const lampArmUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8), material(0x1a1e22, 0.5, 0.3));
lampArmUpper.position.set(0.2, 0.55, 0);
lampArmUpper.rotation.z = -0.5;
lamp.add(lampArmUpper);
const lampHead = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.16, 16, 1, true), material(0x1a1e22, 0.4, 0.3));
lampHead.position.set(0.42, 0.72, 0);
lampHead.rotation.z = Math.PI / 2 + 0.6;
lamp.add(lampHead);
const lampBulb = new THREE.PointLight(0xffb066, 3, 3);
lampBulb.position.set(0.5, 0.68, 0);
lamp.add(lampBulb);

// ---- PC tower with RGB strip, and the room reacting to it ----

const pcTower = new THREE.Group();
pcTower.position.set(2.3, 1.15, -0.5);
desk.add(pcTower);
const towerBody = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.2, 1.1), material(0x121619, 0.5, 0.4));
towerBody.castShadow = true;
pcTower.add(towerBody);
const towerGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x0a1520, emissive: 0x1c4fbf, emissiveIntensity: 1, roughness: 0.2, transparent: true, opacity: 0.85 })
);
towerGlass.rotation.y = Math.PI / 2;
towerGlass.position.set(0.26, 0.1, 0);
pcTower.add(towerGlass);
const rgbStrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2, 0.05), glowMaterial(0xff2ec4));
rgbStrip.position.set(0.26, 0.1, 0.5);
pcTower.add(rgbStrip);

// a real dynamic light living inside the tower — this is what makes the
// floor and desk actually catch color as the RGB cycles, not just the mesh itself
const rgbLight = new THREE.PointLight(0xff2ec4, 6, 5, 2);
rgbLight.position.set(0.4, -1.0, 0.2);
pcTower.add(rgbLight);

// ---- cable runs ----

function makeCable(points, color = 0x0d0f11) {
    const curve = new THREE.CatmullRomCurve3(points);
    const geo = new THREE.TubeGeometry(curve, 20, 0.02, 6, false);
    return new THREE.Mesh(geo, material(color, 0.6));
}

desk.add(makeCable([
    new THREE.Vector3(2.3, 2.15, -0.1),
    new THREE.Vector3(2.3, 1.6, -0.1),
    new THREE.Vector3(2.3, 0.3, -0.3),
    new THREE.Vector3(2.3, 0.02, -0.3)
]));
desk.add(makeCable([
    new THREE.Vector3(-0.9, 2.6, -0.3),
    new THREE.Vector3(-1.2, 2.0, -0.2),
    new THREE.Vector3(-1.6, 0.8, -0.1),
    new THREE.Vector3(-1.6, 0.02, -0.1)
]));

// ============================================================
// SERVER RACK(S) — real rack hardware: glass door, patch panel, switches
// ============================================================

const serverLEDs = [];
const rackFans = [];
const UNIT_H = 0.42;
const UNIT_PITCH = 0.58;

function drawPatchPanel(ctx, w, h) {
    ctx.fillStyle = "#111417";
    ctx.fillRect(0, 0, w, h);
    ctx.font = "10px monospace";
    ctx.fillStyle = "#8a95a0";
    ctx.fillText("PATCH PANEL // 24 PORT", 8, 12);
    const cols = 12;
    for (let i = 0; i < cols; i++) {
        const px = 10 + i * (w / cols);
        for (let row = 0; row < 2; row++) {
            const py = 20 + row * 22;
            ctx.fillStyle = "#1c2126";
            ctx.fillRect(px, py, w / cols - 8, 16);
            ctx.strokeStyle = "#3a4249";
            ctx.strokeRect(px, py, w / cols - 8, 16);
            // a handful of ports have a cable plugged in
            if (Math.random() > 0.55) {
                ctx.fillStyle = ["#e0a752", "#5fd0ff", "#4fe07a", "#ff6b5c"][Math.floor(Math.random() * 4)];
                ctx.fillRect(px + 3, py + 4, w / cols - 14, 8);
            }
        }
    }
}

function drawSwitchFace(ctx, w, h, label) {
    ctx.fillStyle = "#0d0f11";
    ctx.fillRect(0, 0, w, h);
    ctx.font = "11px monospace";
    ctx.fillStyle = "#e8ecef";
    ctx.fillText(label, 8, 14);
    ctx.fillStyle = "#5a6570";
    ctx.font = "8px monospace";
    ctx.fillText("24x GbE  PoE+  250W", 8, h - 6);
}

function drawRackScreen(ctx, w, h, label) {
    ctx.fillStyle = "#020608";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#4fe07a";
    ctx.font = "11px monospace";
    ctx.fillText(label, 8, 16);
    for (let i = 0; i < 6; i++) {
        const bh = 4 + Math.random() * 20;
        ctx.fillStyle = i % 3 === 0 ? "#ff6b5c" : "#4fe07a";
        ctx.fillRect(8 + i * 14, h - 6 - bh, 8, bh);
    }
}

function createFan(radius = 0.16) {
    const fanGroup = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 0.75, radius, 24), material(0x0c1013, 0.5, 0.3));
    fanGroup.add(ring);
    const blades = new THREE.Group();
    for (let i = 0; i < 5; i++) {
        const blade = new THREE.Mesh(new THREE.PlaneGeometry(radius * 0.55, radius * 0.16), material(0x1a2126, 0.4, 0.3));
        blade.position.x = radius * 0.35;
        blade.rotation.z = (i / 5) * Math.PI * 2;
        blades.add(blade);
    }
    fanGroup.add(blades);
    const hub = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.15, 12), glowMaterial(0xff3b3b));
    hub.position.z = 0.01;
    fanGroup.add(hub);
    rackFans.push(blades);
    return fanGroup;
}

// a 1U unit body with a handful of small LEDs physically protruding from the face —
// sized and lit to read clearly through the glass door
function addUnitLEDs(parent, unitY, count, palette, spread = 1.15) {
    for (let j = 0; j < count; j++) {
        const color = palette[Math.floor(Math.random() * palette.length)];
        const led = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.035), glowMaterial(color));
        led.position.set(-spread / 2 + (j / (count - 1 || 1)) * spread, unitY, 0.62);
        parent.add(led);
        serverLEDs.push({ mesh: led, phase: Math.random() * Math.PI * 2, speed: 2 + Math.random() * 4 });
    }
}

function buildPatchPanelUnit(rack, unitY) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.35, UNIT_H, 1.2), material(0x14181c, 0.55, 0.4));
    body.position.y = unitY;
    rack.add(body);
    const tex = canvasTexture((ctx, w, h) => drawPatchPanel(ctx, w, h), 512, 128);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.3, UNIT_H - 0.02), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
    face.position.set(0, unitY, 0.605);
    rack.add(face);
}

function buildSwitchUnit(rack, unitY, label) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.35, UNIT_H, 1.2), material(0x101316, 0.4, 0.5));
    body.position.y = unitY;
    rack.add(body);
    const tex = canvasTexture((ctx, w, h) => drawSwitchFace(ctx, w, h, label), 512, 128);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.3, UNIT_H - 0.02), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }));
    face.position.set(0, unitY, 0.605);
    rack.add(face);
    addUnitLEDs(rack, unitY, 12, [0x2ecc71, 0xf5a623, 0x2ecc71, 0x2ecc71], 1.2);
}

function buildServerUnit(rack, unitY) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.35, UNIT_H, 1.2), material(0x151c23, 0.55, 0.4));
    body.position.y = unitY;
    rack.add(body);
    for (let v = 0; v < 3; v++) {
        const vent = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.02, 0.02), material(0x090c0f, 0.9));
        vent.position.set(0, unitY - 0.1 + v * 0.09, 0.61);
        rack.add(vent);
    }
    addUnitLEDs(rack, unitY, 4, [0x00aaff, 0x00ff66, 0xff3b3b, 0xffb400], 0.9);
}

function buildFillerUnit(rack, unitY) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.35, UNIT_H, 1.2), material(0x0c0f12, 0.7, 0.2));
    body.position.y = unitY;
    rack.add(body);
}

function buildRack(originX, originZ, unitTypes) {
    const rack = new THREE.Group();
    rack.position.set(originX, 0, originZ);
    rack.castShadow = true;
    room.add(rack);

    const rackHeight = 0.7 + unitTypes.length * UNIT_PITCH;
    // open-fronted cabinet shell — top, bottom, two sides, and back only.
    // (previously this was one solid box wrapping all 6 sides, and its own
    // front face sat further forward than the equipment LEDs/panels, sealing
    // them inside completely — that was the real bug, not the door.)
    const shellMat = material(0x090d12, 0.6, 0.55);
    const shellThick = 0.08;
    const shellDepth = 1.3;
    const shellTop = new THREE.Mesh(new THREE.BoxGeometry(1.6, shellThick, shellDepth), shellMat);
    shellTop.position.set(0, rackHeight, 0);
    shellTop.castShadow = true;
    rack.add(shellTop);
    const shellBottom = new THREE.Mesh(new THREE.BoxGeometry(1.6, shellThick, shellDepth), shellMat);
    shellBottom.position.set(0, 0, 0);
    rack.add(shellBottom);
    const shellLeft = new THREE.Mesh(new THREE.BoxGeometry(shellThick, rackHeight, shellDepth), shellMat);
    shellLeft.position.set(-0.8, rackHeight / 2, 0);
    shellLeft.castShadow = true;
    rack.add(shellLeft);
    const shellRight = shellLeft.clone();
    shellRight.position.x = 0.8;
    rack.add(shellRight);
    const shellBack = new THREE.Mesh(new THREE.BoxGeometry(1.6, rackHeight, shellThick), shellMat);
    shellBack.position.set(0, rackHeight / 2, -0.65 + shellThick / 2);
    rack.add(shellBack);

    for (const rx of [-0.78, 0.78]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, rackHeight, 1.32), material(0x14191f, 0.4, 0.5));
        rail.position.set(rx, rackHeight / 2, 0);
        rack.add(rail);
    }

    unitTypes.forEach((type, i) => {
        const unitY = 0.5 + i * UNIT_PITCH;
        if (type === "patch") buildPatchPanelUnit(rack, unitY);
        else if (type === "switch") buildSwitchUnit(rack, unitY, i === 0 ? "UBNT US-24-250W" : "UBNT US-24");
        else if (type === "filler") buildFillerUnit(rack, unitY);
        else buildServerUnit(rack, unitY);
    });

    // status screen near the top
    const screenLabel = "NODE " + Math.floor(Math.random() * 90 + 10);
    const screenTex = registerAnimatedScreen(256, 96, (ctx, w, h) => drawRackScreen(ctx, w, h, screenLabel), 0.3);
    const statusScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 0.3),
        new THREE.MeshStandardMaterial({ map: screenTex, emissiveMap: screenTex, emissive: 0xffffff, emissiveIntensity: 0.9 })
    );
    statusScreen.position.set(0, rackHeight - 0.35, 0.646);
    rack.add(statusScreen);

    // top fans
    for (const fx of [-0.4, 0.4]) {
        const fan = createFan(0.18);
        fan.position.set(fx, rackHeight + 0.02, 0);
        fan.rotation.x = -Math.PI / 2;
        rack.add(fan);
    }

    // hanging cables at the base
    for (let c = 0; c < 3; c++) {
        const cx = -0.5 + c * 0.5;
        const cable = makeCable([
            new THREE.Vector3(cx, 0.5, -0.6),
            new THREE.Vector3(cx + 0.1, 0.25, -0.4),
            new THREE.Vector3(cx + 0.15, 0.02, -0.1)
        ]);
        rack.add(cable);
    }

    // door removed — rack front is open so the LEDs and screens are fully visible

    // soft cyan bounce light from the LEDs so the glow reaches the floor/nearby walls
    const rackGlow = new THREE.PointLight(0x2ec8ff, 3.5, 4.5);
    rackGlow.position.set(0, rackHeight * 0.55, 0.5);
    rack.add(rackGlow);

    return rack;
}

buildRack(-4.7, -4, ["patch", "switch", "server", "server", "server", "server", "server", "filler"]);
buildRack(-6.6, -5.2, ["patch", "switch", "server", "server", "filler"]);

// ============================================================
// PLANTS
// ============================================================

function createPlant(x, z) {
    const plant = new THREE.Group();
    plant.position.set(x, 0, z);
    room.add(plant);

    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.6, 8), material(0x34302b, 0.9));
    pot.position.y = 0.3;
    plant.add(pot);

    for (let i = 0; i < 7; i++) {
        const leaf = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.7, 4, 8), material(0x1b4f3a, 0.9));
        const angle = i * Math.PI / 3.5;
        leaf.position.set(Math.cos(angle) * 0.25, 0.9 + Math.random() * 0.4, Math.sin(angle) * 0.25);
        leaf.rotation.z = angle;
        plant.add(leaf);
    }
}

createPlant(5.7, -4.7);
createPlant(-1.2, -5.2);

// ============================================================
// CEILING LED STRIP
// ============================================================

const ledStripMat = new THREE.MeshBasicMaterial({ color: 0x3fb8ff, toneMapped: false });
const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(15, 0.05, 0.1), ledStripMat);
ledStrip.position.set(0, 7.85, -5.5);
room.add(ledStrip);
const ledStripLight = new THREE.PointLight(0x3fb8ff, 4, 8);
ledStripLight.position.set(0, 7.7, -5.3);
scene.add(ledStripLight);

// ============================================================
// FLOATING DUST (kept inside the room only)
// ============================================================

const dustGeometry = new THREE.BufferGeometry();
const dustCount = 130;
const dustPositions = new Float32Array(dustCount * 3);
for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 14;
    dustPositions[i * 3 + 1] = Math.random() * 7;
    dustPositions[i * 3 + 2] = -Math.random() * 9 + 1;
}
dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: 0x6fa8c9, size: 0.03, transparent: true, opacity: 0.45 }));
scene.add(dust);

// ============================================================
// TARS LIGHT RIG + SPATIAL BOUNDS
// This room is real, walkable 3D space (not a backdrop illusion) —
// the interior volume below is the navigable area for an orb entity,
// and tarsLight is a real dynamic PointLight + shadow caster that
// will follow him around and light/shadow the room as he moves.
// Nothing visible is added yet; this just wires up the reactivity.
// ============================================================

const tarsLight = new THREE.PointLight(0x6fe0ff, 5, 9, 2);
tarsLight.position.set(0, 2.6, 1.5);
tarsLight.castShadow = true;
tarsLight.shadow.mapSize.set(1024, 1024);
tarsLight.shadow.camera.near = 0.1;
tarsLight.shadow.camera.far = 12;
scene.add(tarsLight);

// small idle glow so the rig is visibly "live" before the orb mesh exists;
// swap TARS_ROOM.setOrbMesh(mesh) in later to attach a real body to the light
const tarsPlaceholder = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0x6fe0ff, toneMapped: false, transparent: true, opacity: 0.9 })
);
tarsPlaceholder.position.copy(tarsLight.position);
scene.add(tarsPlaceholder);

const ROOM_BOUNDS = { xMin: -7.5, xMax: 7.5, yMin: 0.15, yMax: 7.6, zMin: -5.5, zMax: 6.8 };
const OBSTACLES = [
    { x: 1.7, z: -2.2, radius: 1.3, label: "desk" },
    { x: -4.7, z: -4, radius: 1.1, label: "rack-a" },
    { x: -6.6, z: -5.2, radius: 1.0, label: "rack-b" },
    { x: 5.7, z: -4.7, radius: 0.6, label: "plant-a" },
    { x: -1.2, z: -5.2, radius: 0.6, label: "plant-b" }
];

window.TARS_ROOM = {
    bounds: ROOM_BOUNDS,
    obstacles: OBSTACLES,
    light: tarsLight,
    placeholder: tarsPlaceholder,
    setPosition(x, y, z) {
        tarsLight.position.set(x, y, z);
        tarsPlaceholder.position.set(x, y, z);
    },
    setColor(hex) {
        tarsLight.color.set(hex);
        tarsPlaceholder.material.color.set(hex);
    },
    setIntensity(v) {
        tarsLight.intensity = v;
    },
    setOrbMesh(mesh) {
        tarsPlaceholder.visible = false;
        if (mesh) scene.add(mesh);
    }
};

// ============================================================
// CAMERA PARALLAX
// ============================================================

let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;

window.addEventListener("pointermove", event => {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = (event.clientY / window.innerHeight) * 2 - 1;
});

// ============================================================
// ANIMATION
// ============================================================

const clock = new THREE.Clock();
let dayNightAccum = 0;
let clockAccum = 0;

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();
    const dt = clock.getDelta();

    // camera parallax
    targetX = mouseX * 0.7;
    targetY = mouseY * 0.35;
    camera.position.x += (targetX - camera.position.x) * 0.025;
    camera.position.y += (2.7 - targetY - camera.position.y) * 0.025;
    camera.lookAt(0, 2.8, -3);

    // day/night, recalculated a few times a second (cheap, but no need every frame)
    dayNightAccum += dt;
    if (dayNightAccum > 0.5) {
        dayNightAccum = 0;
        updateDayNight();
    }

    // real-time wall clock, updated once a second is plenty
    clockAccum += dt;
    if (clockAccum > 1) {
        clockAccum = 0;
        setClockToRealTime();
    }

    // server / switch LEDs, randomized phase per light
    serverLEDs.forEach(entry => {
        const pulse = Math.sin(time * entry.speed + entry.phase);
        entry.mesh.material.opacity = 0.5 + pulse * 0.4;
    });

    // rack fans spinning
    rackFans.forEach((fanBlades, i) => {
        fanBlades.rotation.z += (i % 2 === 0 ? 1 : -1) * 0.06;
    });

    // animated screens: each redraws its own canvas on its own throttle
    animatedScreens.forEach(s => {
        if (time >= s.nextUpdate) {
            s.nextUpdate = time + s.refreshRate;
            s.drawFn(s.ctx, s.w, s.h, time);
            s.tex.needsUpdate = true;
        }
    });

    // PC RGB cycle — drives both the visible strip/glass AND the real point
    // light inside the tower, so the floor and desk actually catch the color
    const hue = (time * 0.08) % 1;
    rgbStrip.material.color.setHSL(hue, 1, 0.55);
    towerGlass.material.emissive.setHSL(hue, 0.8, 0.4);
    rgbLight.color.setHSL(hue, 1, 0.55);
    rgbLight.intensity = 5 + Math.sin(time * 3) * 1.2;

    // rain fall, wrapping within the window opening
    const positions = rain.geometry.attributes.position.array;
    for (let i = 0; i < rainCount; i++) {
        positions[i * 3 + 1] -= rainSpeeds[i];
        if (positions[i * 3 + 1] < winBottom - 1.5) {
            positions[i * 3 + 1] = winTop + 1.5;
            positions[i * 3] = winLeft + Math.random() * WIN_W;
        }
    }
    rain.geometry.attributes.position.needsUpdate = true;

    // floating dust drift
    dust.rotation.y = time * 0.015;

    // ambient light breathing + ceiling strip shimmer
    blueLight.intensity = 16 + Math.sin(time * 0.4) * 2;
    ledStripLight.intensity = 3.5 + Math.sin(time * 2.2) * 0.8;

    // DEMO FLIGHT PATH — proves this is a true walkable 3D volume, not a flat
    // backdrop. Drives x, y, and z independently at different periods (a
    // lissajous path) across the full room bounds, using the exact same
    // TARS_ROOM.setPosition() API a real orb/controller would call later.
    // Watch the shadow it casts sweep across the floor/rack/desk as it moves
    // through all three axes — that shadow is only possible in real 3D space.
    const demoX = THREE.MathUtils.clamp(Math.sin(time * 0.18) * 5.8, ROOM_BOUNDS.xMin + 0.6, ROOM_BOUNDS.xMax - 0.6);
    const demoZ = THREE.MathUtils.clamp(-0.5 + Math.cos(time * 0.13) * 3.8, ROOM_BOUNDS.zMin + 0.6, ROOM_BOUNDS.zMax - 0.6);
    const demoY = THREE.MathUtils.clamp(2.6 + Math.sin(time * 0.27) * 1.8, ROOM_BOUNDS.yMin + 0.3, ROOM_BOUNDS.yMax - 0.3);
    window.TARS_ROOM.setPosition(demoX, demoY, demoZ);
    tarsLight.intensity = 5 + Math.sin(time * 1.5) * 1;

    renderer.render(scene, camera);
}

updateDayNight();
setClockToRealTime();
animate();

// ============================================================
// RESIZE
// ============================================================

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

</script>

</body>
</html>
```
