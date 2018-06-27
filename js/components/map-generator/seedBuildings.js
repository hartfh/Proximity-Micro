let mapAccess = require('./map-access');

module.exports = function(bldgList, mapGrid) {
	for(let i in bldgList) {
		seedBuilding(bldgList[i]);
	}
	log('done seeding all buildings');

	function seedBuilding(data) {
		const ELEVATION = 3;

		if( data.points.length < 40 ) {
			return;
		}

		let bldgGrid = new Grid(data.width, data.height);

		data.points.forEach(function(point, index) {
			bldgGrid.setPoint(point.x - data.min.x, point.y - data.min.y, 1);
			bldgGrid.setDataPoint(point.x - data.min.x, point.y - data.min.y, {});
		});

		// TODO: figure out location of 1+ doors. Or 0 if points.length is sufficiently small
		// When adding terrain filler, skip location of doors. Also ignore from any interior work.

		shrinkFootprint();
		let doors = markDoors();
		seedWalls(doors);
		seedInterior();
		seedExterior();

		let color = Utilities.getRandomColor();
		bldgGrid.eachPoint(function(point, x, y, self) {
			if( point ) {
				mapAccess.insertDataPointValue(mapGrid, x + data.min.x, y + data.min.y, 'color', color);
			}
		});

		function shrinkFootprint() {
			// Reduce by two tiles
			for(let i = 0; i < 2; i++) {
				bldgGrid.setHexValues().eachPoint(function(point, x, y, self) {
					if( point ) {
						let metaPoint = self.getMetaPoint(x, y);

						if( metaPoint.type != 'inside' ) {
							self.setPoint(x, y, 0);
						}
					}
				});
			}

			bldgGrid.setHexValues().eachPoint(function(point, x, y, self) {
				if( point ) {
					let metaPoint = self.getMetaPoint(x, y);
					let remove = false;

					if( metaPoint.type == 'island' || metaPoint.type == 'pipe' || metaPoint.type == 'end' ) {
						remove = true;
					}
					if( metaPoint.type == 'edge' ) {
						let offset1 = {x: 0, y: 0};
						let offset2 = {x: 0, y: 0};

						switch(metaPoint.rotations) {
							case 0:
								offset1.y = -1;
								offset2.y = -2;
								break;
							case 1:
								offset1.x = 1;
								offset2.x = 2;
								break;
							case 2:
								offset1.y = 1;
								offset2.y = 2;
								break;
							case 3:
								offset1.x = -1;
								offset2.x = -2;
								break;
							default:
								break;
						}

						let metaPoint1 = self.getMetaPoint(x + offset1.x, y + offset1.y);
						let metaPoint2 = self.getMetaPoint(x + offset2.x, y + offset2.y);

						if( metaPoint1.type == 'edge' ) {
							remove = true;
						}
						if( metaPoint2.type == 'edge' ) {
							remove = true;
						}
					}
					if( remove ) {
						mapAccess.insertDataPointValue(self, x, y, 'remove', true);
					}
				}
			});

			bldgGrid.eachPoint(function(point, x, y, self) {
				if( point ) {
					let dataPoint = self.getDataPoint(x, y);

					if( dataPoint.remove ) {
						self.setPoint(x, y, 0);
					}
				}
			});

			bldgGrid.setHexValues().eachPoint(function(point, x, y, self) {
				if( point ) {
					let metaPoint = self.getMetaPoint(x, y);

					if( metaPoint.type == 'pipe' || metaPoint.type == 'end' || metaPoint.type == 'island' ) {
						self.setPoint(x, y, 0);
					}
				}
			});
		}

		function markDoors() {
			let doors = [];

			if( data.points.length > 80 ) {
				const NUM_DOORS = Math.ceil( Math.random() * 2); // 1-2

				bldgGrid.setHexValues().eachPointRandom(function(point, x, y, self) {
					if( point ) {
						let metaPoint = self.getMetaPoint(x, y);

						// TODO: also check if point 1 up is type == inside
						if( metaPoint.type == 'edge' && metaPoint.rotations == 0 && doors.length < NUM_DOORS ) {
							doors.push({x: x, y: y});

							if( doors.length == NUM_DOORS ) {
								return true;
							}
						}
					}
				});
			}

			doors.forEach(function(door) {
				mapAccess.insertDataPointValue(bldgGrid, door.x, door.y, 'door', true);
				//bldgGrid.setDataPoint(door.x, door.y, {door: true});
			});

			return doors;
		}

		function seedWalls(doors) {
			bldgGrid.setHexValues().eachPoint(function(point, x, y, self) {
				if( point ) {
					let metaPoint = self.getMetaPoint(x, y);

					if( metaPoint.type != 'inside' ) {
						let mapCoords = {
							x:	x + data.min.x,
							y:	y + data.min.y,
						};
						let dataPoint = self.getDataPoint(x, y);
						let mapSubType = dataPoint.door ? 'floor' : 'wall';

						mapAccess.insertDataPointValue(mapGrid, mapCoords.x, mapCoords.y, 'type', 'building');
						mapAccess.insertDataPointValue(mapGrid, mapCoords.x, mapCoords.y, 'subtype', mapSubType);

						mapAccess.insertDataPointValue(bldgGrid, x, y, 'type', mapSubType);

						if( !dataPoint.door ) {
							mapAccess.loadMapActorData(mapGrid, mapCoords.x, mapCoords.y, 'filler', 'terrain');
						}

						// load wall sides
						// load wall tops
					}
				}
			});

			// Partition method #2
			// Look for "bend" tiles and extend walls out opposite them. Place a door on any wall that gets added

			 /* Partition method #1
			for(let p = 0; p < 1; p++) {
				let dims = bldgGrid.getDimensions();
				let xCoord = Math.floor( Utilities.randomFromTo(3, dims.width - 3) );

				// Compare against doors
				for(let d = 0; d < doors.length; d++) {
					if( xCoord == doors[d].x ) {
						continue;
					}
				}

				// Seed points vertically with one gap
				let majorPartitionPoints = [];
				for(let yCoord = 0; yCoord < dims.height; yCoord++) {
					if( bldgGrid.getPoint(xCoord, yCoord) ) {
						mapAccess.insertDataPointValue(bldgGrid, xCoord, yCoord, 'type', 'wall');
						let mapCoords = {
							x:	xCoord + data.min.x,
							y:	yCoord + data.min.y,
						};
						mapAccess.insertDataPointValue(mapGrid, mapCoords.x, mapCoords.y, 'subtype', 'wall');

						majorPartitionPoints.push({x: xCoord, y: yCoord});
					}
				}

				// pick door point, and then 0 - 3 horizontal partitions
				majorPartitionPoints.pop();
				majorPartitionPoints.shift();
				let majorDoor = majorPartitionPoints.random();

				//const NUM_HORZ_PARTITIONS = Math.floor(Math.random() * 3);

				//for(let n = 0; n < NUM_HORZ_PARTITIONS; n++) {
					// seed horizontal partition and door
				//}


				if( majorDoor ) {
					mapAccess.insertDataPointValue(bldgGrid, majorDoor.x, majorDoor.y, 'type', 'floor');
					mapAccess.insertDataPointValue(mapGrid, majorDoor.x + data.min.x, majorDoor.y + data.min.y, 'subtype', 'floor');
				}
			}
			*/

			bldgGrid.addFilter(function(point, x, y) {
				if( point ) {
					let dataPoint = bldgGrid.getDataPoint(x, y);

					if( dataPoint.type == 'wall' && !dataPoint.door ) {
						return point;
					}
				}

				return false;
			});

			bldgGrid.setHexValues('reduced15', false).eachPoint(function(point, x, y, self) {
				if( point ) {
					let metaPoint = self.getMetaPoint(x, y);
					let mapCoords = {
						x:	x + data.min.x,
						y:	y + data.min.y,
					};

					// load wall face at y and y - 1. Don't place if metaPoint is a vertical pipe or vertical edge. Or top 2 corners
					if( metaPoint.type == 'inside' ) {
						return;
					}
					//log(metaPoint.type)
					//metaPoint.type = 'corner';
					//metaPoint.rotations = 0;
					//mapAccess.insertDataPointValue(mapGrid, mapCoords.x, mapCoords.y - 2, 'subtype', 'roof-top');
					mapAccess.loadMapActorData(mapGrid, mapCoords.x, mapCoords.y - 2, 'test-wall-top', 'doodad', metaPoint);

					let wallFace = false;

					if( metaPoint.type == 'pipe' && metaPoint.rotations == 1 ) {
						wallFace = true;
					}

					if( wallFace ) {
						for(let i = 0; i < 2; i++) {
							metaPoint.type = 'inside';
							metaPoint.rotations = 0;
							mapAccess.loadMapActorData(mapGrid, mapCoords.x, mapCoords.y - i, 'test-wall-face', 'doodad', metaPoint);
						}
					}
				}
			});
		}

		function seedInterior() {
			bldgGrid.setHexValues().eachPoint(function(point, x, y, self) {
				if( point ) {
					let metaPoint = self.getMetaPoint(x, y);

					if( metaPoint.type == 'inside' ) {
						let bldgDataPoint = bldgGrid.getDataPoint(x, y);
						let mapDataPoint = mapGrid.getDataPoint(x + data.min.x, y + data.min.y);

						mapDataPoint.type = 'building';

						if( bldgDataPoint.type != 'wall' ) {
							bldgDataPoint.type = 'floor';
							mapDataPoint.subtype = 'floor';
						}

						//mapAccess.insertDataPointValue(mapGrid, x + data.min.x, y + data.min.y, 'type', 'building');
						//mapAccess.insertDataPointValue(mapGrid, x + data.min.x, y + data.min.y, 'subtype', 'floor');

								//mapAccess.insertDataPointValue(bldgGrid, x, y, 'type', 'floor');

						// load map actor: floor. maybe ignore metaType and just have one floor tile for all configurations
					}
				}
			});
		}

		function seedExterior() {
			let facadeGrid = new Grid(data.width, data.height + ELEVATION);

			// Roof
			bldgGrid.eachPoint(function(point, x, y, self) {
				if( point ) {
					let metaPoint = self.getMetaPoint(x, y);

					//mapAccess.loadMapActorData(mapGrid, mapCoords.x, mapCoords.y - ELEVATION, 'test-roof', 'doodad', metaPoint);

					if( metaPoint.type == 'inside' ) {
						// load roof top doodad actor at -ELEVATION
					} else if( metaPoint.type == 'edge' && metaPoint.rotations == 0 ) {
						for(let i = 0; i < ELEVATION; i++) {
							let type = '';

							if( i == 1 ) {
								type = 'firstfloor'
							}

							facadeGrid.setPoint(x, y - i, 1);
							mapAccess.insertDataPointValue(facadeGrid, x, y - i + ELEVATION, 'type', type);
						}
					} else if( metaPoint.type == 'corner' && ( metaPoint.rotations == 0 || metaPoint.rotations == 1 ) ) {
						for(let i = 0; i < ELEVATION; i++) {
							let rotations = (metaPoint.rotations == 0) ? 3 : 1;

							facadeGrid.setPoint(x, y - i, 1);
							mapAccess.insertDataPointValue(facadeGrid, x, y - i + ELEVATION, 'type', 'edge');
							mapAccess.insertDataPointValue(facadeGrid, x, y - i + ELEVATION, 'rotations', rotations);
						}
					}
				}
			});

			// Facade
			facadeGrid.setHexValues().eachPoint(function(point, x, y, self) {
				if( point ) {
					let metaPoint = self.getMetaPoint(x, y);
					let dataPoint = self.getDataPoint(x, y);

					if( dataPoint.type == 'edge' ) {
						if( metaPoint.type == 'edge' && metaPoint.rotations == 2 ) {
							metaPoint.type = 'corner';
							metaPoint.rotations = (dataPoint.rotations == 3) ? 3 : 2;
						} else {
							metaPoint.type = 'edge';
							metaPoint.rotations = dataPoint.rotations;
						}
					}
				}
			});

			// do doodad seeding
				// add things to inside tiles and type != firstfloor
				// look at bottom edge and 1 up from it (type == firstfloor)

			// load into mapGrid
		}
	}
};
