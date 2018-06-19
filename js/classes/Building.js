let Room = require('./BuildingRoom');
let Grid = require('./Grid');

let Building = function (width, height, basePoint = {x: 0, y: 0}, ID, facing = 's') {
     let _self = this;

     this.width		= width;
     this.height		= height;
     this.basePoint		= {x: basePoint.x, y: basePoint.y};
     this.ID			= ID;
     this.type			= ''; // retail, office, residential
     this.style		= ''; // shabby, clean
     this.rooms		= [];
	this.facing		= facing;
     //this.partitions	= [];

     this.setupRooms();
	this.createGrid();

	// this.populate(); // furniture, etc.
};

Building.prototype.setupRooms = function() {
     this.addPrimaryRoom();

	// add secondary rooms
};

Building.prototype.addPrimaryRoom = function() {
	let thirdWidth		= (1 / 3) * this.width;
     let thirdHeight	= (1 / 3) * this.height;

	let fromLeft	= Math.floor(Math.random() * thirdWidth);
	let fromRight	= Math.floor(Math.random() * thirdWidth);
	let fromTop	= Math.floor(Math.random() * thirdHeight);

	let width		= this.width - (fromLeft + fromRight);
	let height	= this.height - fromTop;

	this.rooms.push( new Room(width, height, {x: this.basePoint.x + fromLeft, y: this.basePoint.y + fromRight}, 1, this) );
};

Building.prototype.addSecondaryRooms = function() {
	let facings = [
		{
			facing:		'w',
			faceLength:	0,
			perpLenth:	0,
		},
		{
			facing:	'n',
			faceLength:	0,
			perpLenth:	0,
		},
		{
			facing:	'e',
			faceLength:	0,
			perpLenth:	0,
		},
	];

	facings.forEach(function(facing) {

	});
	// split up three facings of primary room into pieces (Utilities.subDivide
	// check if remaining space for each facing is less than 5-6. If so, don't put any rooms there
	// Utilities.subdivideLength(length, [1, 2, 3, 4, 5, 6]); // unsure how to set maximums. but if less than 5 or 6, disregard
};

/*
Building.prototype.addRoom = function(size) {
     let thirdWidth		= (1 / 3) * this.width;
     let thirdHeight	= (1 / 3) * this.height;

     if( size == 'big' ) {
          let fromLeft	= Math.floor(Math.random() * thirdWidth);
          let fromRight	= Math.floor(Math.random() * thirdWidth);
          let fromTop	= Math.floor(Math.random() * thirdHeight);

          let width		= this.width - (fromLeft + fromRight);
          let height	= this.height - fromTop;

		this.rooms.push( new Room(width, height, {x: this.basePoint.x + fromLeft, y: this.basePoint.y + fromRight}, 1, this) );
     } else {
		// Get primary room dimensions
		if( this.rooms.length > 0 ) {
			//let width		= Math.floor(Math.random() * this.rooms[0].width);
			//let height	= Math.floor(Math.random() * this.rooms[0].height);

			// determine flush with W, N or E wall
			let randFacing = Math.random();

			if( randFacing > 0.666 ) {
				// west edge
			} else if( randFacing > 0.333 ) {
				// north edge
			} else {
				// east edge
			}


			// set small room so it is flush with one of large room's walls (they share walls)
		}
     }
};
*/

Building.prototype.createGrid = function() {
	let largest	= this.width > this.height ? this.width : this.height;
	let wallGrid	= new Grid(largest, largest); // make a square grid for easy rotation
	let insideGrid = new Grid(largest, largest);

	// Add points for total footprint
	this.rooms.forEach(function(room, roomIndex) {
		let min = room.basePoint;
		let max = {x: room.basePoint.x + room.width, y: room.basePoint.y + room.height};
		let doorPlaced = false;

		grid.eachPointWithin(min, max, function(point, x, y, self) {
			if( x == min.x || x == max.x || y == min.y || y == max.y ) {
				if( !doorPlaced && roomIndex > 0 && wallGrid.getPoint(x, y) ) {
					doorPlaced = true;
					insideGrid.setPoint(x, y, 1);
					wallGrid.setPoint(x, y, 0);
				} else {
					wallGrid.setPoint(x, y, 1);
				}
			} else {
				insideGrid.setPoint(x, y, 1);
			}
		});
	});

	switch(this.facing) {
		case 'w':
			wallGrid.rotate();
			insideGrid.rotate();
			break;
		case 'n':
			wallGrid.flipVertically();
			insideGrid.flipVertically();
			break;
		case 'e':
			wallGrid.rotate().flipHorizontally();
			insideGrid.rotate().flipHorizontally();
			break;
		default:
			break
	}

	// Set hex values of each
};

// Convert to points/grid:
     // Add aux room outlines, then add main room outline, then remove one aux. room wall piece per room and insert door doodads
     // Inside: Do another grid that's just all combined points and subtract walls from it

module.exports = Building;
