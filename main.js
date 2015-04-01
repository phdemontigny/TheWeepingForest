var SCREEN_WIDTH 	= screen.width;
var SCREEN_HEIGHT 	= screen.height;

var GROUND_LEVEL 	= -60;

var MAP_WIDTH 		= 5000;
var MAP_HEIGHT 		= 5000;

var RENDER_RANGE 	= 800;

var TREE_RADIUS = 12;
var LANTERN_RADIUS = 10;
var ANGEL_RADIUS = 24;

var TURN_ON_RADIUS = 100;
var NOISE_DISTANCE = 500.0;

var FRUSTUM_SIZE = 1600;

var finished_loading = false;

var container = document.getElementById('container');
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
ctx.canvas.width = window.innerWidth;
ctx.canvas.height = window.innerHeight;

var Titlescreen = true;

var mouse_sensitivity = 0.5;
var movement_speed = 80.0;
var angel_speed = [20,50,90,160,240,0];
var num_lanterns = 0;

// if true, facing the angel will end the game
var too_close = false;

// if true, the angel will teleport when looking away
var look_away = false;

// if true, you have lost and cannot move
var frozen = false;

var noise_start = -1;

// mouse controls
var last_x = 0;
var last_y = 0;

var angel_face = new Image();
angel_face.src = "angel_face.png";

// Sounds
var FOOTSTEPS = new buzz.sound("footsteps.wav");
FOOTSTEPS_VOLUME = 60;

var AMBIENT1 = new buzz.sound("creepy.ogg");
var AMBIENT2 = new buzz.sound("creepy.ogg");
AMBIENT_VOLUME = 30;
AMBIENT1.setVolume(AMBIENT_VOLUME);
AMBIENT2.setVolume(AMBIENT_VOLUME);
var current_ambient = 1;

var SPOOKY = new buzz.sound("spooky_sound.wav");
var SPOOKY_VOLUME = 80;
SPOOKY.setVolume(SPOOKY_VOLUME);
var spooky_timer = new THREE.Clock();
var spooky_countdown = 60 + Math.random()*60;

var RUSTLE = new buzz.sound("Rustle.wav");
var RUSTLE_VOLUME = 80;
RUSTLE.setVolume(RUSTLE_VOLUME);
var rustle_timer = new THREE.Clock();
var angel_hidden = true;
var rustle_countdown = 0;

var BREATHING = new buzz.sound("breathing.wav");
var BREATHING_VOLUME = 30;
var heavy_breathing = false;

var LIGHT_SWITCH = new buzz.sound("light_switch.wav");

var STATIC = new buzz.sound("static.wav");

var BIRDS = new buzz.sound("birds.wav");
BIRDS.setVolume(100);

var DROP = new buzz.sound("drop.wav");
DROP.setVolume(100);

//--------------------------------------------------------------------------------------------------
//
//
// 	Setting Up the Scene
//
//
//--------------------------------------------------------------------------------------------------


// Creating Renderer, Scene, Camera

var renderer = new THREE.WebGLRenderer( {antialias:true} );
renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
renderer.autoClear = false;
renderer.setClearColor( 0xffffff, 1);
renderer.shadowMapEnabled = true;

var camera = {
	object: new THREE.PerspectiveCamera(45, SCREEN_WIDTH/SCREEN_HEIGHT, 0.1, 1.25*FRUSTUM_SIZE),
	yaw: 	0.0,
	pitch: 	0.0
};
camera.object.rotation.order 	= 	"YXZ";

var keyboard 	= 	new THREEx.KeyboardState();
var mouse 		= 	new THREE.Vector2();

var scene;
scene = new THREE.Scene;
// scene.fog = new THREE.Fog("0x000000",30,60);

var timer = new THREE.Clock();


//--------------------------------------------------------------------------------------------------

// Create Skybox Scene

var skybox_scene 	= new THREE.Scene();

var urls = [
  'sky01.png',
  'sky04.png',
  'sky05.png',
  'sky06.png',
  'sky02.png',
  'sky03.png'
]; 

/*
// A white skybox for debugging
var urls = [
	'white.png',
	'white.png',
	'white.png',
	'white.png',
	'white.png',
	'white.png'
];
*/

var cubemap = THREE.ImageUtils.loadTextureCube(urls); // load textures

var cube_shader = THREE.ShaderLib['cube']; // init cube shader from built-in lib
cube_shader.uniforms['tCube'].value = cubemap; // apply textures to shader

// create shader material
var skybox_material = new THREE.ShaderMaterial( {
	fragmentShader: cube_shader.fragmentShader,
	vertexShader: cube_shader.vertexShader,
	uniforms: cube_shader.uniforms,
	depthWrite: false,
	side: THREE.BackSide
});

// create skybox mesh
var skybox = new THREE.Mesh(
	new THREE.BoxGeometry(1, 1, 1),
	skybox_material
);

skybox_scene.add(skybox);


//--------------------------------------------------------------------------------------------------

// Create Ground Texture

var ground_texture 		= THREE.ImageUtils.loadTexture('grass_texture.png');
ground_texture.wrapS 	= THREE.RepeatWrapping;
ground_texture.wrapT 	= THREE.RepeatWrapping;
ground_texture.repeat.set(20,20);

var ground_geometry = 	new THREE.PlaneGeometry(1.5*MAP_WIDTH,1.5*MAP_HEIGHT);
var ground_material = 	new THREE.MeshPhongMaterial(
						{
							map: ground_texture,
							shininess: 0,
							
						});

var ground_mesh 		= new THREE.Mesh(ground_geometry, ground_material);
ground_mesh.position.x 	= 0.5 * MAP_WIDTH;
ground_mesh.position.z 	= 0.5 * MAP_HEIGHT;
ground_mesh.rotation.x 	= -Math.PI/2;
ground_mesh.position.y 	= GROUND_LEVEL;
ground_mesh.receiveShadow = true;

scene.add(ground_mesh);


//--------------------------------------------------------------------------------------------------

// Create Flashlight

// Infinite Pointlight for debugging
// var flashlight = new THREE.PointLight(0xffffff,1);

var flashlight 	= new THREE.SpotLight(0xffffff,1,RENDER_RANGE,Math.PI/9);
scene.add(flashlight);


//--------------------------------------------------------------------------------------------------

// A lantern object generator

var lantern_list = [];

function lantern(x,z) {

	this.x = x;
	this.z = z;
	this.top 			= null;
	this.glass_on 		= null;
	this.glass_off 		= null;
	this.pole 			= null;
	this.spot_light 	= null;
	this.point_light 	= null;

}

//--------------------------------------------------------------------------------------------------

// Create lantern model

var glass_texture 		= THREE.ImageUtils.loadTexture('lighted_glass.png');
var glass_on_material 	= 	new THREE.MeshBasicMaterial(
						{
							map: glass_texture,
  							color: 0xffffff,
							transparent: true,
							opacity: 0.6,
							shininess: 30
						});
var glass_off_material 	= 	new THREE.MeshLambertMaterial(
						{
							map: glass_texture,
  							color: 0xffffff,
							transparent: true,
							opacity: 0.2,
							shininess: 30
						});
var base_texture 		= THREE.ImageUtils.loadTexture('metal.png');
var base_material 	= 	new THREE.MeshLambertMaterial(
						{
							map: base_texture,
							color: 0x808080,
							shininess: 20
						});


var glass_geometry 	= 	new THREE.CylinderGeometry( 8, 5, 12, 32 );
var top_geometry 	= 	new THREE.CylinderGeometry( 5, 8, 10, 32 ); 
var pole_geometry 	= 	new THREE.CylinderGeometry( 2, 2, 58, 32 ); 


//--------------------------------------------------------------------------------------------------

// A tree object generator

var tree_list = [];

function tree( x, z ) {

	this.x = x;
	this.z = z;
	this.rotation = Math.random()*2*Math.PI;
	this.scale = 1+Math.random();
	this.mesh = null;
	this.billboard = null;
}


//--------------------------------------------------------------------------------------------------

// Importing tree models

var billboard_geometry 		= new THREE.PlaneGeometry( 125, 220, 32 );
var billboard_texture  		= THREE.ImageUtils.loadTexture('tree04.png');
billboard_texture.minFilter = THREE.NearestFilter;
var billboard_material 		= new THREE.MeshLambertMaterial( { 	
									map: 			billboard_texture,
									transparent: 	true,
							} ); 

var tree_billboard 	= new THREE.Mesh( billboard_geometry, billboard_material );
// default value in case loading doesn't work properly
var tree_mesh = new THREE.Mesh( billboard_geometry, billboard_material );

var onProgress = function ( xhr ) {
	if ( xhr.lengthComputable ) {
		var percentComplete = xhr.loaded / xhr.total * 100;
		console.log( Math.round(percentComplete, 2) + '% downloaded' );
	}
};

var onError = function ( xhr ) {
};

var manager = new THREE.LoadingManager();
var img_loader = new THREE.ImageLoader( manager );

var bark_texture = new THREE.Texture();
img_loader.load( 'oakbark.jpg', function ( image ) {

	bark_texture.image = image;
	bark_texture.needsUpdate = true;
	bark_texture.wrapS = THREE.RepeatWrapping;
	bark_texture.wrapT = THREE.RepeatWrapping;

	} 
);

var obj_loader = new THREE.OBJLoader( manager );

obj_loader.load( 'tree04.obj', function ( object ) {

	object.traverse( function ( child ) {

			if ( child instanceof THREE.Mesh ) {

				child.material.map = bark_texture;

			}
		} 
	);

	object.scale.x = object.scale.z = 60;
	object.scale.y = 40;
	object.position.y = GROUND_LEVEL;
	tree_mesh = object;
	create_angels();

	}, onProgress, onError 
);


//--------------------------------------------------------------------------------------------------

// Create Angel model

var angel1 = null;
var angel_texture 	= THREE.ImageUtils.loadTexture('angel_texture.png');
var angel_material 	= 	new THREE.MeshLambertMaterial(
						{
							// map: angel_texture,
  							color: 0xffffff,
							shininess: 30
						});

function create_angels() {

	var loader = new THREE.BinaryLoader( true );
	// document.body.appendChild( loader.statusDomElement );
	loader.load( 'Lucy100k_bin.js', function ( angel_geometry ) {

		angel1 = new THREE.Mesh( angel_geometry, angel_material );
		angel1.position.x = 0;
		angel1.position.y = GROUND_LEVEL + 65;
		angel1.position.z = 0;
		angel1.scale.x = angel1.scale.y = angel1.scale.z = 0.08;
		scene.add(angel1);
		begin_titlescreen();

	});
}

//--------------------------------------------------------------------------------------------------
//
//
// Game Logic
//
//
//--------------------------------------------------------------------------------------------------


function create_tree(x,z) {

	var new_tree = new tree(x,z);

	var billboard = tree_billboard.clone();
	billboard.translateY(-66 + 110*(new_tree.scale-1));
	billboard.position.x = new_tree.x;
	billboard.position.z = new_tree.z;
	billboard.scale.x 	*= new_tree.scale;
	billboard.scale.y 	*= new_tree.scale;
	billboard.scale.z 	*= new_tree.scale;
	new_tree.billboard = billboard;
	scene.add( billboard );

	while (tree_mesh == null);

	var mesh = tree_mesh.clone();
	mesh.position.x = new_tree.x;
	mesh.position.z = new_tree.z;
	mesh.scale.x 	*= new_tree.scale;
	mesh.scale.y 	*= new_tree.scale;
	mesh.scale.z 	*= new_tree.scale;
	mesh.rotation.y = new_tree.rotation;
	new_tree.mesh = mesh;
	scene.add( mesh );

	return new_tree;

}

//--------------------------------------------------------------------------------------------------

function draw_tree( tree ) {

	var origin 		= new THREE.Vector2(	camera.object.position.x,
											camera.object.position.z );
	var target 		= new THREE.Vector2(	tree.x, tree.z );
	var distance 	= distanceXZ(origin, target);

	// If far away, draw the billboard
	if (distance > RENDER_RANGE) {
		tree.billboard.visible = true;
		tree.mesh.visible = false;
		rotate_tree( tree );
	}
	else {
		tree.billboard.visible = false;
		tree.mesh.visible = true;
	}
}

//--------------------------------------------------------------------------------------------------

function rotate_tree( tree ) {

	// 1. Reset y-value of the billboard to match the camera
	tree.billboard.position.y = 0;
	// 2. Have the plane face the camera (while tree.billboard.y == camera.y == 0)
	var origin = new THREE.Vector3(	camera.object.position.x, 
									camera.object.position.y,
									camera.object.position.z);
	tree.billboard.lookAt( origin );
	// 3. Move the tree back to it's original y-value

	// tree.billboard.translateY(-66 + 110*(tree.scale-1));
	tree.billboard.position.y = GROUND_LEVEL + 110*tree.scale;

}

//--------------------------------------------------------------------------------------------------


function move_light() {

	var dx = -1 * Math.sin( rad(camera.yaw) );
	var dy = 1 * Math.sin( Math.min(rad(camera.pitch), rad(45)));
	var dz = 1 * Math.cos( rad(camera.yaw) );

	// put flashlight behind the camera, and face it directly
	flashlight.position.x 	= camera.object.position.x + 1*dx;
	flashlight.position.y 	= camera.object.position.y + 1*dy;
	flashlight.position.z 	= camera.object.position.z + 1*dz;
	flashlight.target 		= camera.object;

}

//--------------------------------------------------------------------------------------------------

function create_lantern(x,z) {

	var new_lantern = new lantern(x,z);

	var lantern_glass_on 		= new THREE.Mesh( glass_geometry, glass_on_material );
	lantern_glass_on.position.x = x;
	lantern_glass_on.position.z = z;
	lantern_glass_on.position.y = GROUND_LEVEL + 64;
	scene.add(lantern_glass_on);
	new_lantern.glass_on = lantern_glass_on;
	lantern_glass_on.visible = false;

	var lantern_glass_off 			= new THREE.Mesh( glass_geometry, glass_off_material );
	lantern_glass_off.position.x 	= x;
	lantern_glass_off.position.z 	= z;
	lantern_glass_off.position.y 	= GROUND_LEVEL + 64;
	scene.add(lantern_glass_off);
	new_lantern.glass_off = lantern_glass_off;
	lantern_glass_off.visible = true;

	var lantern_pole 		= 	new THREE.Mesh( pole_geometry, base_material );
	lantern_pole.position.x = x;
	lantern_pole.position.z = z;
	lantern_pole.position.y = GROUND_LEVEL + 29;
	scene.add(lantern_pole);
	new_lantern.pole = lantern_pole;

	var lantern_top 		=	new THREE.Mesh( top_geometry, base_material );
	lantern_top.position.x 	= x;
	lantern_top.position.z 	= z;
	lantern_top.position.y 	= GROUND_LEVEL + 75;
	scene.add(lantern_top);
	new_lantern.top = lantern_top;

	var lantern_point_light = new THREE.PointLight(0xffffff,0.8,200);
	lantern_point_light.position.x 	= x;
	lantern_point_light.position.z 	= z;
	lantern_point_light.position.y 	= GROUND_LEVEL + 70;
	scene.add(lantern_point_light);
	new_lantern.point_light = lantern_point_light;
	new_lantern.point_light.intensity = 0;

	var lantern_light = new THREE.SpotLight(0xffffff,1,300,Math.PI/2);
	lantern_light.position.x 	= x;
	lantern_light.position.z 	= z;
	lantern_light.position.y 	= GROUND_LEVEL + 70;
	lantern_light.target 		= lantern_pole;
	scene.add(lantern_light);
	new_lantern.spot_light = lantern_light;
	new_lantern.spot_light.intensity = 0;

	lantern_light.shadowMapWidth = 1024; 
	lantern_light.shadowMapHeight = 1024; 
	lantern_light.shadowCameraNear = 1; 
	lantern_light.shadowCameraFar = 1000; 
	lantern_light.shadowCameraFov = 30;

	lantern_light.castShadow 			= true;
	lantern_light.shadowDarkness 		= 0.7;
	// For debugging
	lantern_light.shadowCameraVisible 	= false;
	lantern_pole.castShadow 			= false;

	return new_lantern;
}

//--------------------------------------------------------------------------------------------------

function onMouseMove( event ) { 

	mouse.x = 	event.movementX ||
      			event.mozMovementX ||
      			event.webkitMovementX || 0;
  	mouse.y =	event.movementY ||
      			event.mozMovementY ||
      			event.webkitMovementY || 0;

	//mouse.x = ( event.clientX  ); 
	//mouse.y = - ( event.clientY );
	if (last_x == 0) {
		last_x = mouse.x;
		last_y = mouse.y;
	}
}

//--------------------------------------------------------------------------------------------------

function rad( angle ) {

	return (angle * Math.PI) / 180.0;

}

//--------------------------------------------------------------------------------------------------

function distanceXZ( v1, v2 ) {

	var dx = v1.x - v2.x;
    var dy = v1.y - v2.y;

    return Math.sqrt(dx*dx + dy*dy);

}


//--------------------------------------------------------------------------------------------------

function on_screen( object ) {

	var frustum = new THREE.Frustum();
	var cameraViewProjectionMatrix = new THREE.Matrix4();

	// every time the camera or objects change position (or every frame)

	camera.object.updateMatrixWorld(); // make sure the camera matrix is updated
	camera.object.matrixWorldInverse.getInverse( camera.object.matrixWorld );
	cameraViewProjectionMatrix.multiplyMatrices( camera.object.projectionMatrix, camera.object.matrixWorldInverse );
	frustum.setFromMatrix( cameraViewProjectionMatrix );

	// frustum is now ready to check all the objects you need
	return frustum.intersectsObject( object );
}

//--------------------------------------------------------------------------------------------------

// Mouse click controls

document.addEventListener( 'mousedown', onMouseDown, false );

function onMouseDown() {

	var origin = new THREE.Vector2(	camera.object.position.x,
									camera.object.position.z );

	if (num_lanterns < 5) {
		for (var i=0; i<lantern_list.length; i++) {
			var current_lantern = lantern_list[i];
			var target = new THREE.Vector2(	current_lantern.x,
											current_lantern.z );
			var distance = distanceXZ(origin, target);
			if ( distance < TURN_ON_RADIUS && on_screen(current_lantern.pole) ) {
				if ( current_lantern.glass_off.visible ) {
					current_lantern.glass_off.visible 	= false;
					current_lantern.glass_on.visible 	= true;
					current_lantern.point_light.intensity 	= 0.8;
					current_lantern.spot_light.intensity 	= 1;
					current_lantern.pole.castShadow 	= true;
					num_lanterns += 1;
					if (num_lanterns == 5) {
						BIRDS.loop().play().fadeIn(1000);
						AMBIENT1.fadeOut(1000);
						AMBIENT2.fadeOut(1000);
						BREATHING.fadeOut(1000);
					}
				}
				else {
					current_lantern.glass_off.visible 	= true;
					current_lantern.glass_on.visible 	= false;
					current_lantern.point_light.intensity 	= 0;
					current_lantern.spot_light.intensity 	= 0;
					current_lantern.pole.castShadow 	= false;
					num_lanterns -= 1;
				}
				LIGHT_SWITCH.play();
			}
		}
	}
}

//--------------------------------------------------------------------------------------------------

// tests if moving dx,dz would result in a collision
function collision(dx, dz) {

	var origin = new THREE.Vector2(	camera.object.position.x + dx,
									camera.object.position.z + dz );

	for (var i=0; i<tree_list.length; i++) {
		var current_tree = tree_list[i];
		var target = new THREE.Vector2(	current_tree.x,
										current_tree.z );
		if (distanceXZ( origin, target ) < TREE_RADIUS*current_tree.scale)  { return true; }
	}

	for (var i=0; i<lantern_list.length; i++) {
		var current_lantern = lantern_list[i];
		var target = new THREE.Vector2(	current_lantern.x,
										current_lantern.z );
		if (distanceXZ( origin, target ) < LANTERN_RADIUS)  { return true; }
	}

	var target = new THREE.Vector2(	angel1.position.x,
									angel1.position.z );
	if (distanceXZ( origin, target ) < ANGEL_RADIUS)  { return true; }

	return false;
}


//--------------------------------------------------------------------------------------------------

function inside_map(dx, dz) {

	var x = camera.object.position.x + dx;
	var z = camera.object.position.z + dz;

	if (x > 0 && x < MAP_WIDTH &&
		z > 0 && z < MAP_HEIGHT 	) {

		return true;		

	}
	return false;
}


//--------------------------------------------------------------------------------------------------

// Javascript Modulo operation (for negative numbers)

Number.prototype.mod = function(n) {
	return ((this%n)+n)%n;
}


//--------------------------------------------------------------------------------------------------

// Teleport Angel

function teleport_angel() {

	// random distance and direction
	var angle = Math.random()*2*Math.PI;	
	var dist = (0.5*Math.random()*FRUSTUM_SIZE) + 1.5*FRUSTUM_SIZE;

	var dx = Math.cos(angle) * dist;
	var dz = Math.sin(angle) * dist;

	angel1.position.x = camera.object.position.x + dx;
	angel1.position.z = camera.object.position.z + dz;

	if (angel1.position.x > MAP_WIDTH || angel1.position.x < 0) {
		angel1.position.x = angel1.position.x.mod(MAP_WIDTH);
	}
	if (angel1.position.z > MAP_HEIGHT || angel1.position.z < MAP_HEIGHT) {
		angel1.position.z = angel1.position.z.mod(MAP_HEIGHT);
	}
	
	angel_hidden = true;
	rustle_timer = new THREE.Clock();
	RUSTLE.play();
	// Reset Spooky timer as well
	if ( spooky_countdown < 20) {
		spooky_countdown = 20;
		spooky_timer = new THREE.Clock();
		spooky_timer.start();
	}

}


//--------------------------------------------------------------------------------------------------

// Move Angel a set distance from Player
var final_light = new THREE.PointLight(0xffffff,0,500);
scene.add(final_light);

function set_final_scene() {

	var origin = new THREE.Vector2(	angel1.position.x,
									angel1.position.z );
	var target = new THREE.Vector2( camera.object.position.x,
									camera.object.position.z );

	var dir = target.sub(origin);
	dir = dir.normalize();
	var distance = 200;
	angel1.position.x = camera.object.position.x + (-dir.x * distance);
	angel1.position.z = camera.object.position.z + (-dir.y * distance);

	final_light.position.x = camera.object.position.x;
	final_light.position.y = 0;
	final_light.position.z = camera.object.position.z;
	final_light.intensity = 1;
	flashlight.intensity = 0;

	var angel_target = new THREE.Vector3(	angel1.position.x, 0, 
											angel1.position.z );
	camera.object.lookAt(angel_target);

}

//--------------------------------------------------------------------------------------------------

// Process one angel move

function process_angel_move(dt, speed) {

	var origin = new THREE.Vector2(	angel1.position.x,
									angel1.position.z );
	var target = new THREE.Vector2( camera.object.position.x,
									camera.object.position.z );

	if (distanceXZ(origin,target) < NOISE_DISTANCE) {
		too_close = true;
	}
	else {
		too_close = false;
	}

	var dir = target.sub(origin);
	dir = dir.normalize();
	var distance 	= speed * dt;

	if (distanceXZ(origin,target) > 100) {

		angel1.position.x += (dir.x * distance);
		angel1.position.z += (dir.y * distance);

	}
	else {
		// Make sure angel is always at least 
		// a set distance from the player
		distance = 200;
		angel1.position.x = camera.object.position.x + (-dir.x * distance);
		angel1.position.z = camera.object.position.z + (-dir.y * distance);
		
	}
}


//--------------------------------------------------------------------------------------------------

// Angel Movement

function move_angels(dt) {

	if (frozen) {
		process_angel_move(dt,60);
	}
	else if ( !on_screen(angel1) ) {

		if ( 	!angel_hidden && !frozen &&
				rustle_timer.getElapsedTime() > rustle_countdown ) {

			teleport_angel();
		}
		process_angel_move(dt,angel_speed[num_lanterns]);
		origin = new THREE.Vector3(	camera.object.position.x, 
									camera.object.position.y,
									camera.object.position.z);
		angel1.lookAt( origin );
	}
	else {

		if (angel_hidden) {
			angel_hidden = false;
			rustle_countdown = 30 + Math.random()*20;
			rustle_timer.start();
		}

	}

}

//--------------------------------------------------------------------------------------------------

// Player Movement

function walk_forward(distance, yaw) {

	var dx = distance * Math.sin( rad(yaw) );
	var dz = -distance * Math.cos( rad(yaw) );

	if (!collision(dx, dz) && inside_map(dx,dz)) {
		camera.object.position.x += dx;
    	camera.object.position.z += dz;
	}
}

function walk_backward(distance, yaw) {

	var dx = 0.75 * -distance * Math.sin( rad(yaw) );
	var dz = 0.75 * distance * Math.cos( rad(yaw) );

	if (!collision(dx, dz) && inside_map(dx,dz)) {
		camera.object.position.x += dx;
    	camera.object.position.z += dz;
	}

}

function strafe_left(distance, yaw) {

	var dx = distance * Math.sin( rad(yaw-90) );
	var dz = -distance * Math.cos( rad(yaw-90) );

	if (!collision(dx, dz) && inside_map(dx,dz)) {
		camera.object.position.x += dx;
    	camera.object.position.z += dz; 
	}

}

function strafe_right(distance, yaw) {

	var dx = distance * Math.sin( rad(yaw+90) );
	var dz = -distance * Math.cos( rad(yaw+90) );

	if (!collision(dx, dz) && inside_map(dx,dz)) {
		camera.object.position.x += dx;
    	camera.object.position.z += dz;
	}
}

//--------------------------------------------------------------------------------------------------

function set_camera() {

	camera.object.rotation.x = Math.max(Math.min(-rad(camera.pitch), rad(45)), -rad(45));
	camera.object.rotation.y = -rad(camera.yaw);
}

//--------------------------------------------------------------------------------------------------

function pointer_lock_change(e) {

	if (document.pointerLockElement === document.body ||
		document.mozPointerLockElement === document.body ||
		document.webkitPointerLockElement === document.body) {

		// Pointer was just locked
		// Enable the mousemove listener
		document.addEventListener("mousemove", onMouseMove, false);
	} 
	else {

		// Pointer was just unlocked
		// Disable the mousemove listener
		document.removeEventListener("mousemove", onMouseMove, false);
	}
}

function pointer_lock_error(e) {
	
	console.log("ERROR WITH POINTER-LOCK");

}

//--------------------------------------------------------------------------------------------------

// Source: https://github.com/mrdoob/three.js/blob/master/examples/misc_controls_pointerlock.html

var havePointerLock = 	'pointerLockElement' in document || 
						'mozPointerLockElement' in document || 
						'webkitPointerLockElement' in document;

if ( havePointerLock ) {

	var element = document.body;

	// Hook pointer lock state change events
	document.addEventListener( 'pointerlockchange', pointer_lock_change, false );
	document.addEventListener( 'mozpointerlockchange', pointer_lock_change, false );
	document.addEventListener( 'webkitpointerlockchange', pointer_lock_change, false );
	
	document.addEventListener( 'pointerlockerror', pointer_lock_error, false );
	document.addEventListener( 'mozpointerlockerror', pointer_lock_error, false );
	document.addEventListener( 'webkitpointerlockerror', pointer_lock_error, false );

	element.addEventListener( 'click', function ( event ) {
		// Ask the browser to lock the pointer
		element.requestPointerLock = 	element.requestPointerLock || 
										element.mozRequestPointerLock || 
										element.webkitRequestPointerLock;

		if ( /Firefox/i.test( navigator.userAgent ) ) {
			
			var full_screen_change = function ( event ) {
				
				if ( 	document.fullscreenElement === element || 
						document.mozFullscreenElement === element || 
						document.mozFullScreenElement === element ) {

					document.removeEventListener( 'fullscreenchange', full_screen_change );
					document.removeEventListener( 'mozfullscreenchange', full_screen_change );
					element.requestPointerLock();
				}
			}

			document.addEventListener( 'fullscreenchange', full_screen_change, false );
			document.addEventListener( 'mozfullscreenchange', full_screen_change, false );

			element.requestFullscreen = element.requestFullscreen || 
										element.mozRequestFullscreen || 
										element.mozRequestFullScreen || 
										element.webkitRequestFullscreen;
			element.requestFullscreen();
		} 
		else {
			element.requestPointerLock();
		}
		if ( Titlescreen ) {
			Titlescreen = false;
			begin_intro();
		}
	}, false );
} 
else {
	console.log('Your browser doesn\'t seem to support Pointer Lock API');
}

//--------------------------------------------------------------------------------------------------

// contents is a string representation of the map
// width, height values for the grid representation
function create_map( contents, width, height ) {

	var grid_x = MAP_WIDTH / width;
	var grid_z = MAP_HEIGHT / height;

	var symbols = contents.split("");

	for (var i=0; i<height; i++) {
		for (var j=0; j<width; j++) {
			var symbol = symbols[width*i + j];
			var x = grid_x*(j+Math.random());
			var z = grid_z*(i+Math.random());
			if (symbol == "T") {
				tree_list[tree_list.length] = create_tree(x,z);
			}
			else if (symbol == "L") {
				lantern_list[lantern_list.length] = create_lantern(grid_x*j,grid_z*i);
			}
			else if (symbol == "1") {
				angel1.position.x = x;
				angel1.position.z = z;
			}
			else if (symbol == "S") {
				camera.object.position.x = grid_x*j;
				camera.object.position.z = grid_z*i;
			}
		}
	}
}


//--------------------------------------------------------------------------------------------------

function create_noise() {

	var origin 		= new THREE.Vector2(	camera.object.position.x,
											camera.object.position.z );
	var target 		= new THREE.Vector2(	angel1.position.x, 
											angel1.position.z );

	var distance = distanceXZ(origin, target);

	ctx.clearRect ( 0 , 0 , canvas.width, canvas.height );

	if ( distance < FRUSTUM_SIZE) {

		if ( !heavy_breathing ) {
			BREATHING.loop().play().fadeTo(BREATHING_VOLUME,1000);
			heavy_breathing = true;
		}
	
		// GAME OVER
		if ( (too_close && on_screen(angel1)) || frozen ) {

			if (noise_start == -1) {
				frozen = true;
				noise_start = timer.getElapsedTime();
				set_final_scene();
				DROP.play();
				STATIC.play().fadeIn(1000);
			}

			var elapsed = timer.getElapsedTime() - noise_start;

			if (elapsed >= 15) {
				location.reload();
			}

			var prob = elapsed / 10;
			prob = Math.min(prob,1);

			var w = ctx.canvas.width,
		        h = ctx.canvas.height,
		        idata = ctx.createImageData(w, h),
		        buffer32 = new Uint32Array(idata.data.buffer),
		        len = buffer32.length;

			var value, grayscale, color;

		    for(var i=0; i < len; i++) {
				value = Math.random() * 0xFF | 0;
				grayscale = (value << 16) | (value << 8) | value;
				color = '0xff' + grayscale.toString(16);
		        if (Math.random() < prob) buffer32[i] = color;
			}	
    
	    	ctx.putImageData(idata, 0, 0);
		}
		// "Look Away" Mechanic
		else if ( distance < NOISE_DISTANCE && on_screen(angel1) ) {
			look_away = true;
		}
		else if ( look_away && !on_screen(angel1) ) {
			teleport_angel();
			look_away = false;
		}
	}
	else {
		if ( heavy_breathing ) {
			BREATHING.stop().fadeOut(1000);
			heavy_breathing = false;
		}
	}
}


//--------------------------------------------------------------------------------------------------

function process_sounds() {

	if (timer.getElapsedTime() >= 40) {
		if ( current_ambient == 1 ) { 
			AMBIENT2.play(); 
			current_ambient = 2;
		}
		else { 
			AMBIENT1.play(); 
			current_ambient = 1;
		}
		timer = new THREE.Clock();
		timer.start();
	}

	if (!frozen && spooky_timer.getElapsedTime() >= spooky_countdown) {

		SPOOKY.play();
		spooky_countdown = 60 + Math.random()*30;
		spooky_timer = new THREE.Clock();
		spooky_timer.start();

		// Make sure sounds are far enough apart
		if ( !angel_hidden && rustle_countdown < 20) {

			rustle_countdown = 20;
			rustle_timer = new THREE.Clock();
			rustle_timer.start();

		}

	}

}

//--------------------------------------------------------------------------------------------------

function render() {

	var dt 			= timer.getDelta();
	var distance 	= movement_speed * dt;

	var dx = mouse.x;
	var dy = mouse.y;

	mouse.x = 0;
	mouse.y = 0;

	// update pitch and yaw
	camera.yaw 		+= 	(dx * mouse_sensitivity);
	camera.pitch 	+= 	(dy * mouse_sensitivity);
	
	if ( !frozen ) {
		if 	( 	keyboard.pressed("W") || 
				keyboard.pressed("A") || 
				keyboard.pressed("S") || 
				keyboard.pressed("D")) {
			FOOTSTEPS.play().fadeTo(FOOTSTEPS_VOLUME, 1000);
			if 	( keyboard.pressed("W") ) 	{ walk_forward(distance, camera.yaw); }
			if 	( keyboard.pressed("S") ) 	{ walk_backward(distance, camera.yaw); }
			if 	( keyboard.pressed("A") ) 	{ strafe_left(distance, camera.yaw); }
			if 	( keyboard.pressed("D") ) 	{ strafe_right(distance, camera.yaw); }
		}
		else {
			FOOTSTEPS.fadeOut(1000);
		}
	}
	else {
		FOOTSTEPS.stop();
		BREATHING.stop();
	}

	if (!frozen) {
		set_camera();	
		move_light();
	}

	for (var i=0; i<tree_list.length; i++) {	
	 	draw_tree(tree_list[i]);
	}

	if ( num_lanterns < 5 ) {
		move_angels(dt);
		create_noise();
		process_sounds();
	}
	skybox.position.copy( camera.object.position );

	renderer.render(skybox_scene, camera.object);
	renderer.render(scene, camera.object);

	requestAnimationFrame(render);
}

//--------------------------------------------------------------------------------------------------

// function calls

function begin_game() {

	var map = "";

	map += "TTTTTTTTTTTTTTTT";
	map += "T...TTTTTTTTTTTT";
	map += "T.L.TTTTTTT....T";
	map += "T............L.T";
	map += "TTTTTTTT.TTT...T";
	map += "TTTTTTTT.TTTTTTT";
	map += "TTTTTTTT.TTTTTTT";
	map += "TTT1TTT...TTTTTT";
	map += "TTTTTTT.L.TTTTTT";
	map += "TTTTTTT...TTTTTT";
	map += "TTTTTTTTTTTTTTTT";
	map += "T...TTTTTTTTTTTT";
	map += "T.L.TTTTTTTT...T";
	map += "T...TTTTTTTT.L.T";
	map += "TTTTTTTTTTTT.S.T";
	map += "TTTTTTTTTTTT1TTT";

	create_map(map,16,16);

	// For setting up billboard screenshots

	// tree_list[tree_list.length] = create_tree(ground_mesh.position.x,ground_mesh.position.z);
	// tree_list[tree_list.length] = create_tree(MAP_WIDTH,MAP_HEIGHT);
	// camera.object.position.z = 275;
	// camera.object.lookAt( new THREE.Vector3(0,66,0) );

	AMBIENT1.play();
	spooky_timer.start();

	requestAnimationFrame(render);

}


//--------------------------------------------------------------------------------------------------

function begin_intro() {

	timer.start();
	AMBIENT1.play();
	FOOTSTEPS.play().fadeTo(FOOTSTEPS_VOLUME, 1000);

	ctx.canvas.width = SCREEN_WIDTH;
	ctx.canvas.height = SCREEN_HEIGHT;

	container.appendChild(renderer.domElement);

	var alpha = [0,0];
	var offset = [0,0];
	var text_timer = 0;

	text = setInterval(function(){
		
		text_timer += 30;
		offset[0] += 1;
		offset[1] += -1;
		if (text_timer < 6000) {
			alpha[0] = Math.min(alpha[0] + 0.01,0.8);
			if (text_timer > 3000) {
				alpha[1] = Math.min(alpha[1] + 0.01,0.8);
			}
		}
		else {
			alpha[0] = Math.max(0,alpha[0] - 0.03);
			alpha[1] = Math.max(0,alpha[1] - 0.03);
		}


		ctx.clearRect ( 0 , 0 , ctx.canvas.width, ctx.canvas.height );
        ctx.globalAlpha = 1;
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

		draw_text(	"The angels are coming...",
					SCREEN_WIDTH/3, SCREEN_HEIGHT/2-20,
					"white", alpha[0], offset[0]);
		draw_text(	"It's not safe in the dark...",
					2*SCREEN_WIDTH/3, SCREEN_HEIGHT/2+20,
					"white", alpha[1], offset[1]);

	},30);

	setTimeout(function() {
		clearInterval(text);
		begin_game();
	},7000);

}

//--------------------------------------------------------------------------------------------------

// Title Screen

function begin_titlescreen() {

	ctx.clearRect ( 0 , 0 , ctx.canvas.width, ctx.canvas.height );
    ctx.globalAlpha = 1;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

	title_image = new Image();
  	title_image.src = 'Titlescreen.png';
  	title_image.onload = function() {
    	ctx.drawImage(title_image, 0, 0, ctx.canvas.width, ctx.canvas.height);
  	}
}


//--------------------------------------------------------------------------------------------------

function draw_text(text, x, y, color, alpha, offset) {

	ctx.font = "30px Georgia";
	ctx.textAlign    = "center";
	ctx.textBaseline = "Middle";
	ctx.fillStyle = color;
	ctx.globalAlpha = alpha;
	ctx.fillText(	text, x + offset, y);

}

