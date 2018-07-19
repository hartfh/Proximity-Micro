let tex = {};

tex['wall-one-exterior-base'] = {
	x:				100,
	y:				100,
	path:			'',
	frames:			1,
	ticksPerFrame:		false,
	loop:			true,
	// facing data
};


/*
Save/instantiate map data as pre-defined objects. "Building 1 Wall" with shape, position and rotation.
	-Lower wall, Upper wall: define position, rotation (corners different from straight walls), texture
	-Exterior wall inside? Floors?
	-Entire interior/exterior/edge could all be define at once depending on wall type and tile-set
	-"Base" wall and "upper" wall: one creates a Matter.js body for collision purposes while the other does not?
	-Buildings with interior raised from sidewalk. Sidewalk raised from street

*/

module.exports = tex;
