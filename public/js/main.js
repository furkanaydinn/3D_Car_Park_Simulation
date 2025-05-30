// public/js/main.js

import * as THREE from 'three';
import { GLTFLoader } from 'GLTFLoader';
import { OrbitControls } from 'OrbitControls';
import { GUI } from 'lil-gui';

// Temel Three.js bileşenleri
let scene, camera, renderer;
let controls;
let plane; // Ana zemin
let planeSize = 50;

// Araçlar için
const vehicles = [];
let activeVehicleIndex = -1;
let currentlyControlledVehicle = null;
let activeVehicleArrow;

// Işıklar
let ambientLight;
let directionalLight;

// UI Elemanları
let infoPanelActiveVehicleName;
let timerDisplayElement;
let parkingStatusDisplayElement;
let scoreDisplayElement;

// Park Etme Mücadelesi Değişkenleri
let parkingSpotMesh;
const parkingSpot = {
    position: new THREE.Vector3(10, 0.025, -10),
    dimensions: new THREE.Vector2(3, 7),
    targetRotationY: Math.PI / 4
};
let isChallengeActive = false;
let timeLeft = 0;
const challengeTimeLimit = 60;
let timerIntervalId = null;
let currentScore = 0;
const baseParkingScore = 100;
const timeBonusPerSecond = 5;

// Çarpışma Algılaması için
const obstacles = []; // Sahnedeki engelleri bu dizide tutacağız

// Araç tanımlamaları (brakeForce eklendi)
const vehicleDefinitions = [
    { name: 'Alfa Romeo', path: 'assets/models/alfa_romeo/scene.gltf', scale: new THREE.Vector3(2, 2, 2), initialPosition: new THREE.Vector3(0,0,0), initialRotationY: 0, movementParams: { acceleration: 0.002, deceleration: 0.001, maxSpeed: 0.15, maxReverseSpeed: 0.05, turnSpeed: 0.035, brakeForce: 0.005 }, radius: 1.5 },
    { name: 'Büyük Kamyon', path: 'assets/models/buyuk_kamyon/scene.gltf', scale: new THREE.Vector3(0.8,0.8,0.8), initialPosition: new THREE.Vector3(5,0,0), initialRotationY: 0, movementParams: { acceleration: 0.0005, deceleration: 0.0008, maxSpeed: 0.08, maxReverseSpeed: 0.03, turnSpeed: 0.015, brakeForce: 0.003 }, radius: 2.5 },
    { name: 'Spor Motosiklet', path: 'assets/models/kucuk_motosiklet/scene.gltf', scale: new THREE.Vector3(1.2,1.2,1.2), initialPosition: new THREE.Vector3(-5,0,0), initialRotationY: -Math.PI / 2, movementParams: { acceleration: 0.0025, deceleration: 0.0015, maxSpeed: 0.18, maxReverseSpeed: 0.04, turnSpeed: 0.020, brakeForce: 0.008 }, radius: 0.8 }
];
// Aktif aracın hareket durumu (isBraking eklendi)
const vehicleMoveState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    isBraking: false, // Fren durumu
    speed: 0.0
};

let miniMapCanvas, miniMapCtx;
const miniMapSize = 200; // Mini haritanın piksel boyutu (CSS ile eşleşmeli)
let miniMapScaleFactor;

// Yağmur için değişkenler
let rainParticles, rainGeometry, rainMaterial;
const rainCount = 10000; // Yağmur damlası sayısı
const rainSpread = 60;   // Yağmurun yayılacağı alan
const rainSpeed = 0.5;   // Yağmur damlalarının düşme hızı

function init() {
    scene = new THREE.Scene();
    const cubeTextureLoader = new THREE.CubeTextureLoader();
    cubeTextureLoader.setPath('assets/skybox/');
    const skyboxTexture = cubeTextureLoader.load(['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg']);
    scene.background = skyboxTexture;
    scene.environment = skyboxTexture;

    ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(20, 30, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048; directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5; directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -30; directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30; directionalLight.shadow.camera.bottom = -30;
    scene.add(directionalLight);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(4, 5, 8);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.05;

    const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
    const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x999999, side: THREE.DoubleSide });
    plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);

    const spotBoxGeometry = new THREE.BoxGeometry(parkingSpot.dimensions.x, 0.05, parkingSpot.dimensions.y);
    const spotBoxMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00, transparent: true, opacity: 0.4 });
    parkingSpotMesh = new THREE.Mesh(spotBoxGeometry, spotBoxMaterial);
    parkingSpotMesh.position.copy(parkingSpot.position);
    parkingSpotMesh.rotation.y = parkingSpot.targetRotationY;
    scene.add(parkingSpotMesh);

    createObstacles(); // Engelleri oluştur

    const dir = new THREE.Vector3(0, -1, 0); dir.normalize(); const origin = new THREE.Vector3(0,0,0);
    activeVehicleArrow = new THREE.ArrowHelper(dir, origin, 1.5, 0xffff00, 0.4, 0.2);
    activeVehicleArrow.visible = false; scene.add(activeVehicleArrow);

    const gui = new GUI();
    const lightFolder = gui.addFolder('Işık Ayarları');
    lightFolder.add(directionalLight, 'intensity', 0, 3, 0.01).name('Yönlü Işık Gücü');
    const dlPositionFolder = lightFolder.addFolder('Yönlü Işık Pozisyonu');
    dlPositionFolder.add(directionalLight.position, 'x', -50, 50, 0.5).name('X');
    dlPositionFolder.add(directionalLight.position, 'y', 0, 100, 0.5).name('Y');
    dlPositionFolder.add(directionalLight.position, 'z', -50, 50, 0.5).name('Z');
    lightFolder.add(ambientLight, 'intensity', 0, 2, 0.01).name('Ortam Işığı Gücü');
    lightFolder.add(renderer, 'toneMappingExposure', 0, 2, 0.01).name('Pozlama');
    lightFolder.open();

    infoPanelActiveVehicleName = document.getElementById('activeVehicleName');
    timerDisplayElement = document.getElementById('timerDisplay');
    parkingStatusDisplayElement = document.getElementById('parkingStatusDisplay');
    scoreDisplayElement = document.getElementById('scoreDisplay');
    
    if(timerDisplayElement) updateTimerDisplay();
    if(parkingStatusDisplayElement) parkingStatusDisplayElement.textContent = "Park etmek için P'ye basın.";
    if(scoreDisplayElement) updateScoreDisplay();

    // Mini Harita Canvas ve Context'ini Al
    miniMapCanvas = document.getElementById('miniMapCanvas');
    if (miniMapCanvas) {
        miniMapCanvas.width = miniMapSize;
        miniMapCanvas.height = miniMapSize;
        miniMapCtx = miniMapCanvas.getContext('2d');
        if (planeSize > 0) {
            miniMapScaleFactor = miniMapSize / planeSize;
        } else {
            miniMapScaleFactor = 1;
            console.warn("planeSize sıfır veya tanımsız, miniMapScaleFactor 1 olarak ayarlandı.");
        }
    }

    // Yağmur Partiküllerini Oluştur
    const positions = [];
    rainGeometry = new THREE.BufferGeometry();
    for (let i = 0; i < rainCount; i++) {
        positions.push(
            Math.random() * rainSpread - rainSpread / 2,
            Math.random() * rainSpread,
            Math.random() * rainSpread - rainSpread / 2
        );
    }
    rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    rainMaterial = new THREE.PointsMaterial({
        color: 0xaaaaaa,
        size: 0.1,
        transparent: true,
        opacity: 0.7,
    });
    rainParticles = new THREE.Points(rainGeometry, rainMaterial);
    rainParticles.visible = false;
    scene.add(rainParticles);
    // lil-gui'ye Yağmur Kontrolü Ekle
    if (gui) {
        const effectsFolder = gui.addFolder('Efektler');
        effectsFolder.add(rainParticles, 'visible').name('Yağmur Yağdır');
        effectsFolder.add(rainMaterial, 'opacity', 0, 1, 0.01).name('Yağmur Yoğunluğu');
        effectsFolder.add(window, 'toggleRainSound').name('Yağmur Sesi (Aç/Kapa)');
        effectsFolder.open();
    }

    createVehicleSelectionButtons();
    loadAllVehicles();
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onWindowResize, false);
    animate();
}

function createObstacles() {
    const obstacleMaterial = new THREE.MeshStandardMaterial({ color: 0xbb3333, roughness: 0.7, metalness: 0.2 }); // Kırmızımsı engel materyali

    // Engel 1 - Kutu
    const obstacle1Geo = new THREE.BoxGeometry(2, 2, 4); // Genişlik, Yükseklik, Derinlik
    const obstacle1 = new THREE.Mesh(obstacle1Geo, obstacleMaterial);
    obstacle1.position.set(-8, 1, -8); // Yükseklik/2 kadar yukarı
    obstacle1.castShadow = true;
    obstacle1.receiveShadow = true; // Engeller de gölge alabilir
    scene.add(obstacle1);
    obstacles.push(obstacle1);

    // Engel 2 - Silindir
    const obstacle2Geo = new THREE.CylinderGeometry(1.5, 1.5, 3, 16); // Üst Yarıçap, Alt Yarıçap, Yükseklik, Segmentler
    const obstacle2 = new THREE.Mesh(obstacle2Geo, obstacleMaterial);
    obstacle2.position.set(5, 1.5, 12); // Yükseklik/2 kadar yukarı
    obstacle2.castShadow = true;
    obstacle2.receiveShadow = true;
    scene.add(obstacle2);
    obstacles.push(obstacle2);

    // Engel 3 - Daha Uzun Duvar
    const obstacle3Geo = new THREE.BoxGeometry(1, 2.5, 10);
    const obstacle3 = new THREE.Mesh(obstacle3Geo, obstacleMaterial);
    obstacle3.position.set(15, 1.25, 0);
    obstacle3.rotation.y = Math.PI / 3; // Biraz daha farklı bir açı
    obstacle3.castShadow = true;
    obstacle3.receiveShadow = true;
    scene.add(obstacle3);
    obstacles.push(obstacle3);

    // Engeller için Bounding Box'ları önceden hesaplayıp sakla
    obstacles.forEach(obstacle => {
        obstacle.updateMatrixWorld(); // Pozisyon ve rotasyonun güncel olduğundan emin ol
        obstacle.userData.boundingBox = new THREE.Box3().setFromObject(obstacle);
    });
}

function createVehicleSelectionButtons() {
    const buttonsContainer = document.getElementById('vehicleSelectionButtons');
    if (!buttonsContainer) return;
    vehicleDefinitions.forEach((vehicleDef, index) => {
        const button = document.createElement('button');
        button.textContent = vehicleDef.name;
        button.style.marginRight = '5px'; button.style.marginBottom = '5px';
        button.style.padding = '5px 10px'; button.style.cursor = 'pointer';
        button.onclick = function() { switchActiveVehicle(index); };
        buttonsContainer.appendChild(button);
    });
}

function loadVehicle(vehicleDef, index) {
    const loader = new GLTFLoader();
    loader.load(
        vehicleDef.path,
        function (gltf) {
            const model = gltf.scene;
            model.scale.copy(vehicleDef.scale);
            model.rotation.y = vehicleDef.initialRotationY;
            // Konumlandırma kodu
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            model.position.x = vehicleDef.initialPosition.x - center.x;
            model.position.y = vehicleDef.initialPosition.y - center.y + (size.y / 2);
            model.position.z = vehicleDef.initialPosition.z - center.z;

            model.userData.movementParams = vehicleDef.movementParams;
            model.userData.name = vehicleDef.name;
            model.userData.radius = vehicleDef.radius || 1.0;
            model.userData.boundingBox = new THREE.Box3();

            // Araç materyallerini inceleme (Özellikle Alfa Romeo için)
            if (vehicleDef.name === 'Alfa Romeo') {
                console.log(`--- ${vehicleDef.name} Modeli Materyal İncelemesi ---`);
                model.traverse(function (node) {
                    if (node.isMesh) {
                        console.log("Mesh Adı:", node.name, "Materyal:", node.material);
                        if (Array.isArray(node.material)) {
                            node.material.forEach((mat, i) => {
                                console.log(`  Multi-Mat [${i}]:`, mat);
                                if (mat.name && (mat.name.toLowerCase().includes('paint') || mat.name.toLowerCase().includes('body'))) {
                                    console.log(">>> Potansiyel Ana Gövde Materyali Bulundu:", mat);
                                    // targetCarPaintMaterial = mat;
                                }
                            });
                        } else if (node.material) {
                            if (node.material.name && (node.material.name.toLowerCase().includes('paint') || node.material.name.toLowerCase().includes('body'))) {
                                console.log(">>> Potansiyel Ana Gövde Materyali Bulundu:", node.material);
                                // targetCarPaintMaterial = node.material;
                            }
                        }
                    }
                });
                console.log(`-------------------------------------------------`);
            }

            if (vehicleDef.name === 'Spor Motosiklet') {
                // const axesHelper = new THREE.AxesHelper(2); 
                // model.add(axesHelper); 
            }
            model.castShadow = true; 
            model.traverse(function (node) { if (node.isMesh) { node.castShadow = true; } });
            vehicles[index] = model;
            scene.add(model);
            console.log(`${vehicleDef.name} modeli yüklendi!`);
            if (index === 0 && activeVehicleIndex === -1) { switchActiveVehicle(0); } else { model.visible = false; }
        },
        (xhr) => console.log(`${vehicleDef.name}: ${(xhr.loaded / xhr.total * 100)}% yüklendi`),
        (error) => console.error(`${vehicleDef.name} yüklenirken hata:`, error)
    );
}

function loadAllVehicles() { 
    vehicleDefinitions.forEach((def, index) => { 
        loadVehicle(def, index); 
    }); 
}

function switchActiveVehicle(newIndex) {
    // ... (Bu fonksiyon bir öncekiyle aynı) ...
    if (newIndex < 0 || newIndex >= vehicles.length || !vehicles[newIndex]) return;
    if (activeVehicleIndex === newIndex && currentlyControlledVehicle) return;
    if (activeVehicleIndex !== -1 && vehicles[activeVehicleIndex]) { vehicles[activeVehicleIndex].visible = false; }
    activeVehicleIndex = newIndex;
    currentlyControlledVehicle = vehicles[activeVehicleIndex];
    currentlyControlledVehicle.visible = true;
    vehicleMoveState.speed = 0.0;
    ['forward', 'backward', 'left', 'right'].forEach(key => vehicleMoveState[key] = false);
    console.log(`Aktif araç: ${currentlyControlledVehicle.userData.name}`);
    if (infoPanelActiveVehicleName) infoPanelActiveVehicleName.textContent = currentlyControlledVehicle.userData.name;
    if (currentlyControlledVehicle && activeVehicleArrow) {
        const vehicleBox = new THREE.Box3().setFromObject(currentlyControlledVehicle);
        const vehicleCenter = vehicleBox.getCenter(new THREE.Vector3());
        const vehicleSize = vehicleBox.getSize(new THREE.Vector3());
        const arrowDisplayY = vehicleCenter.y + (vehicleSize.y / 2) + (activeVehicleArrow.line.scale.y / 2) + 0.3;
        activeVehicleArrow.position.set(vehicleCenter.x, arrowDisplayY, vehicleCenter.z);
        activeVehicleArrow.visible = true;
    } else if (activeVehicleArrow) { activeVehicleArrow.visible = false; }
    if (controls && currentlyControlledVehicle) {
        const targetPosition = new THREE.Vector3();
        new THREE.Box3().setFromObject(currentlyControlledVehicle).getCenter(targetPosition);
        controls.target.copy(targetPosition);
        camera.lookAt(targetPosition);
        controls.update();
    }
}

function updateTimerDisplay() { if (timerDisplayElement) { if (isChallengeActive) { timerDisplayElement.textContent = `Kalan Süre: ${timeLeft}s`; } else { timerDisplayElement.textContent = "Mücadele: P'ye Bas"; } } }
function updateScoreDisplay() { if (scoreDisplayElement) { scoreDisplayElement.textContent = `Skor: ${currentScore}`; } }
function startParkingChallenge() {  if (isChallengeActive || !currentlyControlledVehicle) return; isChallengeActive = true; timeLeft = challengeTimeLimit; currentScore = 0; updateTimerDisplay(); updateScoreDisplay(); if (parkingStatusDisplayElement) parkingStatusDisplayElement.textContent = "Park alanına aracı yerleştirin!"; if (parkingSpotMesh) { parkingSpotMesh.material.color.setHex(0xffaa00); parkingSpotMesh.material.opacity = 0.4;} console.log("Park Etme Mücadelesi Başladı!"); if (timerIntervalId) clearInterval(timerIntervalId); timerIntervalId = setInterval(() => { timeLeft--; updateTimerDisplay(); if (timeLeft <= 0) { gameOver("Süre Doldu! Park Edilemedi."); } if (isChallengeActive) { checkParking(false); } }, 1000); }
function gameOver(message) {  if (!isChallengeActive) return; clearInterval(timerIntervalId); timerIntervalId = null; isChallengeActive = false; updateScoreDisplay(); alert(message + ` Skorunuz: ${currentScore}`); updateTimerDisplay(); if (parkingStatusDisplayElement) parkingStatusDisplayElement.textContent = message + ` (Skor: ${currentScore})`; if (parkingSpotMesh && !message.includes("Başarıyla Park Edildi")) { parkingSpotMesh.material.color.setHex(0x00ff00); parkingSpotMesh.material.opacity = 0.4;}}
function getAngleDifference(angle1, angle2) {  let diff = (angle2 - angle1 + Math.PI) % (2 * Math.PI) - Math.PI; return (diff < -Math.PI) ? diff + (2 * Math.PI) : diff; }
function updateParkingSpotColor(isPositionCorrect, isRotationCorrect) { if (!parkingSpotMesh || !isChallengeActive) return; if (isPositionCorrect && isRotationCorrect) { parkingSpotMesh.material.color.setHex(0x00ff00); } else if (isPositionCorrect && !isRotationCorrect) { parkingSpotMesh.material.color.setHex(0xffff00); } else { parkingSpotMesh.material.color.setHex(0xffaa00); } }
function checkParking(finalAttempt = false) {  if (!currentlyControlledVehicle) { if (parkingStatusDisplayElement && finalAttempt) parkingStatusDisplayElement.textContent = "Aktif araç yok."; return { isPositionCorrect: false, isRotationCorrect: false }; } const positionTolerance = 0.8; const rotationTolerance = THREE.MathUtils.degToRad(25); const vehicleCenterWorld = new THREE.Box3().setFromObject(currentlyControlledVehicle).getCenter(new THREE.Vector3()); const localVehicleCenter = vehicleCenterWorld.clone(); localVehicleCenter.sub(parkingSpot.position); const inverseSpotRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -parkingSpot.targetRotationY, 0)); localVehicleCenter.applyQuaternion(inverseSpotRotation); const isPositionCorrect = Math.abs(localVehicleCenter.x) < (parkingSpot.dimensions.x / 2 - positionTolerance) && Math.abs(localVehicleCenter.z) < (parkingSpot.dimensions.y / 2 - positionTolerance); const vehicleRotationY = currentlyControlledVehicle.rotation.y; const targetRotationY = parkingSpot.targetRotationY; const angleDifference = getAngleDifference(vehicleRotationY, targetRotationY); const isRotationCorrect = Math.abs(angleDifference) < rotationTolerance; if (finalAttempt && isChallengeActive) { let message = ""; if (isPositionCorrect && isRotationCorrect) { currentScore = baseParkingScore + (timeLeft * timeBonusPerSecond); message = "Tebrikler! Başarıyla Park Edildi!"; gameOver(message); if (parkingSpotMesh) { parkingSpotMesh.material.color.setHex(0x00aa00); parkingSpotMesh.material.opacity = 0.6; } } else { currentScore = 0; message = "Park Başarısız! "; if (!isPositionCorrect) message += "Pozisyon hatalı. "; if (!isRotationCorrect) message += `Açı hatalı (Fark: ${THREE.MathUtils.radToDeg(angleDifference).toFixed(0)}°).`; alert(message); if (parkingSpotMesh) parkingSpotMesh.material.color.setHex(0xff0000); } if (parkingStatusDisplayElement) parkingStatusDisplayElement.textContent = message; updateScoreDisplay(); } else if (isChallengeActive) { updateParkingSpotColor(isPositionCorrect, isRotationCorrect); } return { isPositionCorrect, isRotationCorrect }; }

function onKeyDown(event) {
    switch (event.code) {
        case 'Digit1': switchActiveVehicle(0); return;
        case 'Digit2': switchActiveVehicle(1); return;
        case 'Digit3': switchActiveVehicle(2); return;
        case 'KeyP': 
            if (!isChallengeActive) startParkingChallenge();
            else gameOver("Mücadele İptal Edildi.");
            return;
        case 'Enter': 
            if (isChallengeActive) checkParking(true);
            return;
    }
    if (!currentlyControlledVehicle) return;
    switch (event.code) {
        case 'KeyW': case 'ArrowUp': vehicleMoveState.forward = true; break;
        case 'KeyS': case 'ArrowDown': vehicleMoveState.backward = true; break;
        case 'KeyA': case 'ArrowLeft': vehicleMoveState.left = true; break;
        case 'KeyD': case 'ArrowRight': vehicleMoveState.right = true; break;
        case 'Space': // Boşluk tuşu fren için
            vehicleMoveState.isBraking = true;
            break;
    }
}

function onKeyUp(event) {
    if (!currentlyControlledVehicle) return;
    switch (event.code) {
        case 'KeyW': case 'ArrowUp': vehicleMoveState.forward = false; break;
        case 'KeyS': case 'ArrowDown': vehicleMoveState.backward = false; break;
        case 'KeyA': case 'ArrowLeft': vehicleMoveState.left = false; break;
        case 'KeyD': case 'ArrowRight': vehicleMoveState.right = false; break;
        case 'Space': // Boşluk tuşu bırakıldığında freni kaldır
            vehicleMoveState.isBraking = false;
            break;
    }
}

function drawMiniMap() {
    if (!miniMapCtx || !planeSize) return;
    miniMapCtx.fillStyle = "rgba(70, 70, 70, 0.75)";
    miniMapCtx.fillRect(0, 0, miniMapSize, miniMapSize);
    miniMapCtx.save();
    miniMapCtx.translate(miniMapSize / 2, miniMapSize / 2);
    // Park Alanını Çiz
    if (parkingSpotMesh) {
        const spotWorldPosition = parkingSpot.position;
        const spotWidth3D = parkingSpot.dimensions.x;
        const spotDepth3D = parkingSpot.dimensions.y;
        const spotRotationY = parkingSpot.targetRotationY;
        const spotMapX = spotWorldPosition.x * miniMapScaleFactor;
        const spotMapZ = spotWorldPosition.z * miniMapScaleFactor;
        const spotMapWidth = spotWidth3D * miniMapScaleFactor;
        const spotMapDepth = spotDepth3D * miniMapScaleFactor;
        miniMapCtx.save();
        miniMapCtx.translate(spotMapX, spotMapZ);
        miniMapCtx.rotate(-spotRotationY);
        if(isChallengeActive && parkingSpotMesh.material.color){
            const color = parkingSpotMesh.material.color;
            miniMapCtx.fillStyle = `rgba(${Math.round(color.r*255)}, ${Math.round(color.g*255)}, ${Math.round(color.b*255)}, 0.7)`;
        } else {
            miniMapCtx.fillStyle = "rgba(0, 200, 0, 0.5)";
        }
        miniMapCtx.fillRect(-spotMapWidth / 2, -spotMapDepth / 2, spotMapWidth, spotMapDepth);
        miniMapCtx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        miniMapCtx.strokeRect(-spotMapWidth / 2, -spotMapDepth / 2, spotMapWidth, spotMapDepth);
        miniMapCtx.restore();
    }
    // Engelleri Çiz
    obstacles.forEach(obstacle => {
        const obsWorldPosition = obstacle.position;
        const obsBBox = obstacle.userData.boundingBox;
        const obsSize = obsBBox.getSize(new THREE.Vector3());
        const obsMapX = obsWorldPosition.x * miniMapScaleFactor;
        const obsMapZ = obsWorldPosition.z * miniMapScaleFactor;
        const obsMapWidth = obsSize.x * miniMapScaleFactor;
        const obsMapDepth = obsSize.z * miniMapScaleFactor;
        miniMapCtx.save();
        miniMapCtx.translate(obsMapX, obsMapZ);
        miniMapCtx.rotate(-obstacle.rotation.y);
        miniMapCtx.fillStyle = "rgba(150, 50, 50, 0.8)";
        miniMapCtx.fillRect(-obsMapWidth / 2, -obsMapDepth / 2, obsMapWidth, obsMapDepth);
        miniMapCtx.strokeStyle = "rgba(50, 0, 0, 0.9)";
        miniMapCtx.strokeRect(-obsMapWidth / 2, -obsMapDepth / 2, obsMapWidth, obsMapDepth);
        miniMapCtx.restore();
    });
    // Aktif Aracı Çiz
    if (currentlyControlledVehicle) {
        const vehicleWorldPosition = currentlyControlledVehicle.position;
        const vehicleMapX = vehicleWorldPosition.x * miniMapScaleFactor;
        const vehicleMapZ = vehicleWorldPosition.z * miniMapScaleFactor;
        const vehicleBBox = currentlyControlledVehicle.userData.boundingBox;
        const vehicleSize3D = vehicleBBox.getSize(new THREE.Vector3());
        const vehicleMapWidth = vehicleSize3D.x * miniMapScaleFactor * 0.8;
        const vehicleMapHeight = vehicleSize3D.z * miniMapScaleFactor * 0.8;
        const vehicleRotation = currentlyControlledVehicle.rotation.y;
        miniMapCtx.save();
        miniMapCtx.translate(vehicleMapX, vehicleMapZ);
        miniMapCtx.rotate(-vehicleRotation);
        miniMapCtx.fillStyle = "rgba(0, 100, 255, 0.9)";
        miniMapCtx.strokeStyle = "rgba(200, 200, 255, 1)";
        miniMapCtx.lineWidth = 1;
        miniMapCtx.fillRect(-vehicleMapWidth / 2, -vehicleMapHeight / 2, vehicleMapWidth, vehicleMapHeight);
        miniMapCtx.strokeRect(-vehicleMapWidth / 2, -vehicleMapHeight / 2, vehicleMapWidth, vehicleMapHeight);
        let forwardMarkerLength = vehicleMapHeight * 0.6;
        if (currentlyControlledVehicle.userData.name === 'Spor Motosiklet') {
            miniMapCtx.rotate(Math.PI / 2);
        }
        miniMapCtx.strokeStyle = "white";
        miniMapCtx.lineWidth = 2;
        miniMapCtx.beginPath();
        miniMapCtx.moveTo(0, 0);
        miniMapCtx.lineTo(0, -forwardMarkerLength);
        miniMapCtx.stroke();
        miniMapCtx.restore();
    }
    miniMapCtx.restore();
}

function updateVehicleMovement() {
    if (!currentlyControlledVehicle || !currentlyControlledVehicle.userData.movementParams) return;
    
    const params = currentlyControlledVehicle.userData.movementParams;
    const model = currentlyControlledVehicle;
    let newSpeed = vehicleMoveState.speed;

    // Hızlanma
    if (vehicleMoveState.forward && !vehicleMoveState.isBraking) { // Sadece fren yapılmıyorsa hızlan
        newSpeed = Math.min(params.maxSpeed, newSpeed + params.acceleration);
    } else if (vehicleMoveState.backward && !vehicleMoveState.isBraking) { // Sadece fren yapılmıyorsa geri hızlan
        newSpeed = Math.max(-params.maxReverseSpeed, newSpeed - params.acceleration);
    } else {
        // Yavaşlama (Fren veya Doğal Sürtünme)
        if (vehicleMoveState.isBraking) {
            if (newSpeed > params.brakeForce) {
                newSpeed -= params.brakeForce;
            } else if (newSpeed < -params.brakeForce) {
                newSpeed += params.brakeForce;
            } else {
                newSpeed = 0; // Frenle tamamen durdur
            }
        } else { // Doğal yavaşlama (fren yapılmıyorsa)
            if (newSpeed > params.deceleration) {
                newSpeed -= params.deceleration;
            } else if (newSpeed < -params.deceleration) {
                newSpeed += params.deceleration;
            } else {
                newSpeed = 0;
            }
        }
    }
    
    // Dönüş
    const previousRotationY = model.rotation.y;
    if (Math.abs(newSpeed) > 0.001) { 
        let actualTurnSpeed = params.turnSpeed; 
        if (newSpeed < 0) actualTurnSpeed = -actualTurnSpeed; 
        if (vehicleMoveState.left) model.rotation.y += actualTurnSpeed; 
        if (vehicleMoveState.right) model.rotation.y -= actualTurnSpeed; 
    }

    // Hareket Vektörü
    let localForwardDirection; 
    if (model.userData.name === 'Spor Motosiklet') localForwardDirection = new THREE.Vector3(-1, 0, 0); 
    else localForwardDirection = new THREE.Vector3(0, 0, 1);
    
    const worldForward = new THREE.Vector3(); 
    worldForward.copy(localForwardDirection).applyQuaternion(model.quaternion).normalize();
    
    const moveVector = worldForward.clone().multiplyScalar(newSpeed);
    const vehicleOriginalPosition = model.position.clone();
    const potentialPosition = model.position.clone().add(moveVector);

    model.position.copy(potentialPosition);
    model.updateMatrixWorld(true); 
    model.userData.boundingBox.setFromObject(model);

    let collisionDetected = false;
    const halfPlaneSize = planeSize / 2;
    const vehicleBBox = model.userData.boundingBox;

    if (vehicleBBox.min.x < -halfPlaneSize || vehicleBBox.max.x > halfPlaneSize ||
        vehicleBBox.min.z < -halfPlaneSize || vehicleBBox.max.z > halfPlaneSize) {
        collisionDetected = true;
    }

    if (!collisionDetected) {
        for (const obstacle of obstacles) {
            if (vehicleBBox.intersectsBox(obstacle.userData.boundingBox)) {
                collisionDetected = true;
                break; 
            }
        }
    }

    if (collisionDetected) {
        // Eğer ilk pozisyon ve rotasyon kaydedildiyse, aracı oraya döndür
        if (model.userData.initialPosition && typeof model.userData.initialRotationY === 'number') {
            model.position.copy(model.userData.initialPosition);
            model.rotation.y = model.userData.initialRotationY;
        } else {
            // Yedek: bir önceki pozisyona dön
            model.position.copy(vehicleOriginalPosition);
            model.rotation.y = previousRotationY;
        }
        vehicleMoveState.speed = 0;
    } else {
        vehicleMoveState.speed = newSpeed;
    }
}

function animate() {
    requestAnimationFrame(animate); 
    updateVehicleMovement();
    // Yağmur Partiküllerini Anime Et
    if (rainParticles && rainParticles.visible) {
        const positions = rainGeometry.attributes.position.array;
        for (let i = 0; i < rainCount; i++) {
            positions[i * 3 + 1] -= rainSpeed;
            if (positions[i * 3 + 1] < -rainSpread / 3) {
                positions[i * 3 + 1] = Math.random() * rainSpread / 2 + rainSpread / 2;
                positions[i * 3] = Math.random() * rainSpread - rainSpread / 2;
                positions[i * 3 + 2] = Math.random() * rainSpread - rainSpread / 2;
            }
        }
        rainGeometry.attributes.position.needsUpdate = true;
    }
    if (currentlyControlledVehicle && activeVehicleArrow && activeVehicleArrow.visible) {
        const vehicleBox = new THREE.Box3().setFromObject(currentlyControlledVehicle);
        const vehicleCenter = vehicleBox.getCenter(new THREE.Vector3());
        const vehicleSize = vehicleBox.getSize(new THREE.Vector3());
        const arrowDisplayY = vehicleCenter.y + (vehicleSize.y / 2) + (activeVehicleArrow.line.scale.y / 2) + 0.3;
        activeVehicleArrow.position.set(vehicleCenter.x, arrowDisplayY, vehicleCenter.z);
    }
    drawMiniMap(); // Mini haritayı her karede çiz
    if (controls) controls.update(); 
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight; 
    camera.updateProjectionMatrix(); 
    renderer.setSize(window.innerWidth, window.innerHeight);
}

let rainSound = null;
let isRainSoundPlaying = false;
function toggleRainSound(){
    if(!rainSound){
        rainSound = new Audio('assets/sounds/rain-weather-lightning-thunder-151314.mp3');
        rainSound.loop = true;
    }
    if(isRainSoundPlaying){
        rainSound.pause();
        isRainSoundPlaying = false;
    } else {
        rainSound.play().catch(e => console.warn("Ses oynatılamadı:", e));
        isRainSoundPlaying = true;
    }
}
window.toggleRainSound = toggleRainSound;

init();