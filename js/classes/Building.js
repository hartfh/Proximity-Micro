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
	let self = this;
	let primaryRoom = this.rooms[0];
	let facings = [
		{
			code:		'w',
			basePoint:	{x: this.basePoint.x, y: primaryRoom.basePoint.y},
			faceLength:	primaryRoom.height,
			perpLenth:	primaryRoom.basePoint.x,
		},
		{
			code:		'n',
			basePoint:	{x: primaryRoom.basePoint.x, y: this.basePoint.y},
			faceLength:	primaryRoom.width,
			perpLenth:	primaryRoom.basePoint.y,
		},
		{
			code:		'e',
			basePoint:	{x: primaryRoom.basePoint.x + primaryRoom.width, y: this.basePoint.y},
			faceLength:	primaryRoom.height,
			perpLenth:	this.width - (primaryRoom.width + primaryRoom.basePoint.x),
		},
	];

	facings.forEach(function(facing) {
		let lengths = [];

		for(let i = 1; i < facingLength; i++) {
			lengths.push(i);
		}

		let roomWidths = Utilities.subdivideLength(facing.faceLength, lengths);
		let baseOffset = {x: 0, y: 0};

		roomWidths.forEach(function(width) {
			if( width >= 5 && Math.random() > 0.01 ) {
				let roomWidth;
				let roomHeight;
				let roomBasePoint = {x: facing.basePoint + baseOffset.x, y: facing.basePoint + baseOffset.y};

				if( facing.code == 'n' ) {
					roomWidth		= width;
					roomHeight	= room.perpLength;
				} else {
					roomWidth		= room.perpLength;
					roomHeight	= width;
				}

				self.rooms.push( new Room(roomWidth, roomHeight, roomBasePoint, 2, self) );
			}

			if( facing.code == 'n' ) {
				baseOffset.x += width;
			} else {
				baseOffset.y += width;
			}
		});
	});
};

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
					// TODO: doorways might need to be 2-3 wide
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

module.exports = Building;
