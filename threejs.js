$(function() {

// Include core libraries for Physijs	
Physijs.scripts.worker = "physijs_worker.js";
Physijs.scripts.ammo = "ammo.js";

var scene = new Physijs.Scene();
scene.setGravity(new THREE.Vector3(0,0,0));
var aspect = window.innerWidth / window.innerHeight;
var camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
var canvas = renderer.domElement;
document.body.appendChild(canvas);
var textureLoader = new THREE.TextureLoader();

// Objects for object interaction
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var interactableObjects = [];

/*--------*
 | Planet |
 *--------*/

var Planet = (function() {
	
	/*-------------*
	 | Constructor |
	 *-------------*/
	
	function Planet(args) {
		
		/*------------*
		 | Properties |
		 *------------*/
		
		this.scene = args.scene;
		this.radius = args.radius || 1;
		this.distance = args.distance || 0;
		this.centerX = args.centerX || 0;
		this.centerY = args.centerY || 0;
		this.centerZ = args.centerZ || 0;
		this.moveSpeed = args.moveSpeed || 0;
		this.rotateSpeed = args.rotateSpeed || 0;
		this.angle = args.angle || 0;
		this.tiltAngle = args.tiltAngle || 0;
		this.rotateAngle = 0;
		this.satelliteOf = args.satelliteOf || null;
		this.light = null;
		if (typeof args.lightIntensity != "undefined") {
			this.light = new THREE.PointLight(0xffffff, args.lightIntensity, 0);
			this.light.castShadow = true;
			this.light.shadow.camera.near = 1;
			this.light.shadow.camera.far = 30;
			this.light.shadow.bias = 0.01;
			this.scene.add(this.light);
		}
		this.controllable = args.controllable || false;
		this.dx = 0;
		this.dy = 0;
		this.dz = 0;
		this.controlSpeed = 0;
		this.hasPhysics = args.hasPhysics || false;
		
		// Particles
		this.particleCount = args.particleCount || 0;
		this.particleSpawnRadius = args.particleSpawnRadius || 0.5;
		this.particles = [];
		
		// Material
		if (typeof args.material == "object" && args.material instanceof THREE.Material) {
			this.material = args.material;
		} else {
			var matOptions = {};
			if (typeof args.texture != "undefined") { matOptions.map = Planet.getTexture(args.texture); }
			this.material = this.light == null ? new THREE.MeshPhongMaterial(matOptions) : new THREE.MeshBasicMaterial(matOptions);
		}
		
		// Geometry
		this.geometry = new THREE.SphereGeometry(this.radius, 50, 50);
		
		// THREE object
		this.object = new Physijs.SphereMesh(this.geometry, this.material);
		if (this.controllable) {
			this.object.position.x = args.x || 0;
			this.object.position.y = args.y || 0;
			this.object.position.z = args.z || 0;
			// Tell Physijs that the position and rotation was changed manually
			this.object.__dirtyPosition = true;
			this.object.__dirtyRotation = true;
		}
		if (this.light == null) {
			this.object.castShadow = true;
			this.object.receiveShadow = true;
		}
		
		// Glow effect
		this.glowIntensity = args.glowIntensity || 0;
		this.currentGlow = this.glowIntensity;
		if (this.glowIntensity > 0) {
			this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: Planet.glowTexture, color: args.glowColour || 0xf5ac3f, transparent: false, blending: THREE.AdditiveBlending }));
			this.glow.scale.set(this.radius * this.glowIntensity, this.radius * this.glowIntensity, 1.0);
			this.object.add(this.glow);
		}
		
		/*--------------------*
		 | Initial operations |
		 *--------------------*/
		
		// Add to array and scene
		this.scene.add(this.object);
		Planet.planets.push(this);
		Planet.interactables.push(this.object);
		
		/*--------*
		 | Events |
		 *--------*/
		
		this.object.addEventListener("collision", (otherObject) => {
			console.log("collision!");
		});
		
	}
	
	/*-------------------*
	 | Static properties |
	 *-------------------*/
	
	Planet.planets = [];
	Planet.interactables = [];
	Planet.loadedTextures = [];
	Planet.following = null;
	Planet.glowTexture = textureLoader.load("img/glow.png");
	
	/*----------------*
	 | Static methods |
	 *----------------*/
	
	Planet.getTexture = function(path) {
		if (typeof Planet.loadedTextures[path] == "undefined") {
			Planet.loadedTextures[path] = textureLoader.load(path);
		}
		return Planet.loadedTextures[path];
	}
	
	/*------------------*
	 | Instance methods |
	 *------------------*/
	
	Planet.prototype.step = function() {
		// Object has physics
		if (this.hasPhysics) {
			
		}
		// Object is controllable
		else if (this.controllable) {
			// Movements
			var progression = 0.005;
			this.dx = -this.controlSpeed * Math.sin(THREE.Math.degToRad(cameraXAngle)) * Math.abs(Math.cos(THREE.Math.degToRad(cameraYAngle)));
			this.dy = -this.controlSpeed * Math.sin(THREE.Math.degToRad(cameraYAngle));
			this.dz = -this.controlSpeed * Math.cos(THREE.Math.degToRad(cameraXAngle)) * Math.abs(Math.cos(THREE.Math.degToRad(cameraYAngle)));
			if ((pressedButtons[38] && !pressedButtons[40]) || ((pressedButtons[87] || pressedButtons[90]) && !pressedButtons[83])) {
				this.controlSpeed += progression;
				if (this.controlSpeed > 1) { this.controlSpeed = 1; }
			} else if ((pressedButtons[40] && !pressedButtons[38]) || (pressedButtons[83] && !(pressedButtons[87] || pressedButtons[90]))) {
				this.controlSpeed -= progression;
				if (this.controlSpeed < -1) { this.controlSpeed = -1; }
			} else {
				if (this.controlSpeed > 0) { this.controlSpeed -= progression; }
				else if (this.controlSpeed < 0) { this.controlSpeed += progression; }
				if (this.controlSpeed >= -progression && this.controlSpeed <= progression) { this.controlSpeed = 0; }
			}
			// Position
			this.object.position.x += this.dx;
			this.object.position.y += this.dy;
			this.object.position.z += this.dz;
			// Tell Physijs that the position and rotation was changed manually
			this.object.__dirtyPosition = true;
			this.object.__dirtyRotation = true;
		}
		// Object is not controllable
		else {
			// Position
			this.object.position.x = this.centerX + this.distance * Math.cos(THREE.Math.degToRad(this.angle));
			this.object.position.y = this.centerY + Math.cos(THREE.Math.degToRad(this.tiltAngle));
			this.object.position.z = this.centerZ + this.distance * Math.sin(THREE.Math.degToRad(this.angle));
			this.angle += this.moveSpeed;
			this.angle %= 360;
			this.tiltAngle += this.moveSpeed;
			this.tiltAngle %= 360;
			// Rotation
			this.object.rotation.y = this.rotateAngle;
			this.rotateAngle += this.rotateSpeed;
			// Set center
			if (this.satelliteOf == null) {
				this.centerX = 0;
				this.centerY = 0;
				this.centerZ = 0;
			} else {
				this.centerX = this.satelliteOf.object.position.x;
				this.centerY = this.satelliteOf.object.position.y;
				this.centerZ = this.satelliteOf.object.position.z;
			}
			// Tell Physijs that the position and rotation was changed manually
			this.object.__dirtyPosition = true;
			this.object.__dirtyRotation = true;
		}
		// Light position
		if (this.light != null) {
			this.light.position.x = this.object.position.x;
			this.light.position.y = this.object.position.y;
			this.light.position.z = this.object.position.z;
		}
		// Glow
		if (this.glowIntensity > 0) {
			var curve = Math.cos(new Date().getTime() / 500);
			this.glow.scale.set(this.radius * this.glowIntensity + curve / 2 * this.radius, this.radius * this.glowIntensity + curve / 2 * this.radius, 1.0);
		}
		// Particles
		for (var i in this.particles) {
			this.particles[i].step();
		}
		
		for (var i = this.particles.length; i < this.particleCount; i++) {
			var _this = this;
			this.particles.push(new Particle({
				scene: this.scene,
				x: this.object.position.x,
				y: this.object.position.y,
				z: this.object.position.z,
				spawnRadius: this.particleSpawnRadius,
				colour: 0xf5ac3f,
				dx: (Math.random() - 0.5) / 25,
				dy: (Math.random() - 0.5) / 25,
				dz: (Math.random() - 0.5) / 25,
				onDie: function() { _this.particles.splice(_this.particles.indexOf(this), 1); }
			}));
		}
	}
	
	Planet.prototype.gravitateAround = function(planet) {
		this.satelliteOf = planet;
	}
	
	/*--------*
	 | Return |
	 *--------*/
	
	return Planet;
	
})();

/*----------*
 | Particle |
 *----------*/

var Particle = (function() {
	
	function Particle(args) {
		
		// Properties
		this.scene = args.scene;
		var minLife = args.minLife || 50;
		this.startLife = Math.random() * ((args.maxLife || 100) - minLife) + minLife;
		this.life = this.startLife;
		var spawnRadius = args.spawnRadius || 1;
                var angle1 = Math.random() * Math.PI * 2, angle2 = Math.random() * Math.PI * 2;
		this.x = (args.x || 0) + spawnRadius * Math.cos(angle1) * Math.sin(angle2);
		this.y = (args.y || 0) + spawnRadius * Math.sin(angle1) * Math.sin(angle2);
		this.z = (args.z || 0) + spawnRadius * Math.cos(angle2);
		this.dx = (args.dx || 0);
		this.dy = (args.dy || 0);
		this.dz = (args.dz || 0);
		
		// THREE object
		this.material = new THREE.SpriteMaterial({ map: Particle.texture, color: args.colour || 0xffffff });
		this.material.blending = THREE.AdditiveBlending;
		this.object = new THREE.Sprite(this.material);
		this.object.position.set(this.x, this.y, this.z);
		
		// Function to call when the particle dies
		this.onDie = args.onDie || function() {};
		
		// Add to arrays
		this.scene.add(this.object);
		Particle.particles.push(this);
		
	}
	
	Particle.texture = textureLoader.load("img/spark.png");
	Particle.particles = [];
	
	Particle.prototype.step = function() {
		if (this.life-- <= 0) {
			this.scene.remove(this.object);
			Particle.particles.splice(Particle.particles.indexOf(this), 1);
			this.onDie();
		}
		// Scale
		var scale = this.life / this.startLife;
		this.object.scale.set(scale, scale, scale);
		// Position
		this.x += this.dx;
		this.y += this.dy;
		this.z += this.dz;
		this.object.position.set(this.x, this.y, this.z);
	}
	
	return Particle;
	
})();

// Sun material
var sunMaterialUniforms = {
	fogDensity: { value: 0.0 },
	fogColor:   { value: new THREE.Vector3( 0, 0, 0 ) },
	time:       { value: 1.0 },
	resolution: { value: new THREE.Vector2() },
	uvScale:    { value: new THREE.Vector2( 3.0, 1.0 ) },
	texture1:   { value: textureLoader.load("img/cloud.png") },
	texture2:   { value: textureLoader.load("img/lavatile.jpg") }
};
sunMaterialUniforms.texture1.value.wrapS = sunMaterialUniforms.texture1.value.wrapT = THREE.RepeatWrapping;
sunMaterialUniforms.texture2.value.wrapS = sunMaterialUniforms.texture2.value.wrapT = THREE.RepeatWrapping;
var sunMaterial = new THREE.ShaderMaterial({
	uniforms: sunMaterialUniforms,
	vertexShader: document.getElementById("lavaVertexShader").textContent,
	fragmentShader: document.getElementById("lavaFragmentShader").textContent
});

// Planets
var sun = new Planet({ scene: scene, texture: "img/sun.jpg", radius: 3, distance: 0, lightIntensity: 2, material: sunMaterial, glowIntensity: 8, particleCount: 500, particleSpawnRadius: 2.5 });
var earth = new Planet({ scene: scene, texture: "img/earth.jpg", radius: 1, distance: 10, rotateSpeed: 0.01, moveSpeed: 0.1, tiltAngle: 45 });
var uk = new Planet({ scene: scene, texture: "img/unionJack.png", radius: 1.2, distance: 15, rotateSpeed: 0.01, moveSpeed: 0.1, tiltAngle: -45, angle: 90 });
var moon = new Planet({ scene: scene, texture: "img/moon.jpg", radius: 0.27, distance: 2, rotateSpeed: 0.01, moveSpeed: 0.5, satelliteOf: earth });
var france = new Planet({ scene: scene, texture: "img/frenchFlag.png", radius: 0.4, distance: 2, rotateSpeed: 0.01, moveSpeed: 0.5, satelliteOf: uk });
var comet = new Planet({ scene: scene, texture: "img/sun.jpg", lightIntensity: 2, x: 0, z: 10, y: 10, controllable: true, glowIntensity: 5, particleCount: 500, particleSpawnRadius: 0.5 });
//var physicsComet = new Planet({ scene: scene, texture: "img/sun.jpg", lightIntensity: 2, x: 0, z: -10, y: 10, controllable: true, glowIntensity: 2, radius: 0.5, particleCount: 100, particleSpawnRadius: 0.2, hasPhysics: true });

// Function which generates n amount of planets
function randPlanet(n) {
    if (typeof n == "undefined") { n = 1; }
	var textures = ["img/moon.jpg", "img/earth.jpg", "img/sun.jpg", "img/unionJack.png", "img/frenchFlag.png"];
    for (var i = 0; i < n; i++) {
        var lastPlanet = new Planet({
            scene: scene,
            texture: textures[Math.floor(Math.random() * textures.length)],
            radius: Math.random() * 2 + 0.1,
            distance: Math.random() * 10 + 1,
            rotateSpeed: Math.random() / 10,
            moveSpeed: (Math.random() > 0.5 ? -1 : 1) * Math.random() * 2 + 0.2,
            tiltAngle: Math.random() * 45,
            angle: Math.random() * 360,
            satelliteOf: (Math.random() > 0.5 ? Planet.planets[0] : Planet.planets[Math.floor(Math.random() * Planet.planets.length)])
            //satelliteOf: Planet.planets[Planet.planets.length - 1]
        });
    }
    return lastPlanet;
}

// Ambient Light
var ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);

// Skybox
var skybox = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 32), new THREE.MeshBasicMaterial({map: new textureLoader.load("img/stars.jpg")}));
scene.add(skybox);
skybox.scale.x = -1;

camera.position.z = 5;

var pressedButtons = [];
window.onkeydown = function(event) {
	pressedButtons[event.which] = true;
	// Pause / Unpause the game
	if (event.which == 32) { paused = !paused; $("#pause").fadeToggle(0); }
}
window.onkeyup = function(event) { pressedButtons[event.which] = false; }
var pressedMousedButtons = [];
canvas.onmousedown = function(event) {
	pressedMousedButtons[event.which] = true;
	// Check clicked objects
	if (!isLocked()) {
		mouse.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
		mouse.y = - ( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;
		raycaster.setFromCamera( mouse, camera );
		var intersects = raycaster.intersectObjects(Planet.interactables);
		if (typeof intersects[0] != "undefined") {
			zoom = zoom / Planet.following.object.geometry.parameters.radius * intersects[0].object.geometry.parameters.radius
			for (var i in Planet.planets) {
				if (Planet.planets[i].object == intersects[0].object) { Planet.following = Planet.planets[i]; }
			}
			canvas.requestPointerLock();
			restrictZoom();
		}
	} else {
		document.exitPointerLock();
	}
}
window.onmouseup = function(event) { pressedMousedButtons[event.which] = false; }

var cameraXAngle = 45;
var cameraYAngle = 27;
var zoom = 30;
var paused = false;
Planet.following = Planet.planets[0];
var render = function () {
	requestAnimationFrame( render );
	
	if (!paused) {
		// Cycle through the planets
		for (var i in Planet.planets) {
			Planet.planets[i].step();
		}
	
		// Update the lava
		sunMaterialUniforms.time.value += 0.05;
	}
	
	// Camera
	camera.position.x = Planet.following.object.position.x + zoom * (Math.sin(THREE.Math.degToRad(cameraXAngle)) * Math.abs(Math.cos(THREE.Math.degToRad(cameraYAngle))));
	camera.position.y = Planet.following.object.position.y + zoom * Math.sin(THREE.Math.degToRad(cameraYAngle));
	camera.position.z = Planet.following.object.position.z + zoom * (Math.cos(THREE.Math.degToRad(cameraXAngle)) * Math.abs(Math.cos(THREE.Math.degToRad(cameraYAngle))));
	camera.up = new THREE.Vector3(0,1,0);
	camera.lookAt(new THREE.Vector3(Planet.following.object.position.x,Planet.following.object.position.y,Planet.following.object.position.z));
	
	// Skybox
	skybox.position.x = camera.position.x;
	skybox.position.y = camera.position.y;
	skybox.position.z = camera.position.z;
	
	// Render the scene
	scene.simulate();
	renderer.render(scene, camera);
	
};

render();

window.onresize = function() {
	renderer.setSize( window.innerWidth, window.innerHeight );
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
}

//var prevX = null, prevY = null;
window.onmousemove = function(event) {
	/*if (prevX != null && prevY != null && pressedMousedButtons[1] && pressedButtons[32]) {
		cameraXAngle += (prevX - event.clientX) / 10;
		//cameraYAngle += (prevY - event.clientY) / 10;
	}
	prevX = event.clientX;
	prevY = event.clientY;*/
	if (isLocked()) {
		cameraXAngle -= event.movementX / 10;
		cameraXAngle %= 360;
		cameraYAngle += isLocked() ? event.movementY / 10 : -event.movementY / 10;
		if (cameraYAngle < -75) { cameraYAngle = -75; }
		else if (cameraYAngle > 75) { cameraYAngle = 75; }
	}
}

window.onmousewheel = function(event) {
	zoom += event.deltaY / 100;
	restrictZoom();
}

function isLocked() { return document.pointerLockElement != null; }
function restrictZoom() {
	var maxZoom = 2 * (Planet.following.object.geometry.type == "SphereGeometry" ? Planet.following.object.geometry.parameters.radius : 1);
	if (zoom > 30) { zoom = 30; }
	else if (zoom < maxZoom) { zoom = maxZoom; }
}

document.getElementById("addRandomPlanet").onclick = function() { /*Planet.following.object = */randPlanet().object; }
document.getElementById("centerOnComet").onclick = function() {
	zoom = zoom / Planet.following.object.geometry.parameters.radius * comet.object.geometry.parameters.radius
	Planet.following = comet;
	canvas.requestPointerLock();
}

});