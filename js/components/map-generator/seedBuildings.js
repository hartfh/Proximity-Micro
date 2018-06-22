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
		});

		// TODO: figure out location of 1+ doors. Or 0 if points.length is sufficiently small
		// When adding terrain filler, skip location of doors. Also ignore from any interior work.

		shrinkFootprint();
		markDoors();
		seedWalls();
		seedInterior();
		seedExterior();

		function shrinkFootprint() {
			bldgGrid.setHexValues().eachPoint(function(point, x, y, self) {
				if( point ) {
					let metaPoint = self.getMetaPoint(x, y);

					if( metaPoint.type != 'inside' ) {
						self.setPoint(x, y, 0);
					}
				}
			});

			bldgGrid.setHexValues().eachPoint(function(point, x, y, self) {
				if( point ) {
					let metaPoint = self.getMetaPoint(x, y);

					if( metaPoint.type == 'pipe' || metaPoint.type == 'end' ) {
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
				bldgGrid.setDataPoint(door.x, door.y, {door: true});
			});
		}

		function seedWalls() {
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

						mapAccess.insertDataPointValue(bldgGrid, x, y, 'type', 'wall');

						if( !dataPoint.door ) {
							mapAccess.loadMapActorData(mapGrid, mapCoords.x, mapCoords.y, 'filler', 'terrain');
						}

						// load wall sides
						// load wall tops
					}
				}
			});

			bldgGrid.addFilter(function(point, x, y) {
				if( point ) {
					let dataPoint = bldgGrid.getDataPoint(x, y);

					if( dataPoint.type == 'wall' && !dataPoint.door ) {
						return point;
					}
				}

				return false;
			});

			bldgGrid.setHexValues(false, false).eachPoint(function(point, x, y, self) {
				if( point ) {
					let metaPoint = self.getMetaPoint(x, y);
					let mapCoords = {
						x:	x + data.min.x,
						y:	y + data.min.y,
					};

					// load wall face at y and y - 1. Don't place if metaPoint is a vertical pipe or vertical edge. Or top 2 corners

					//mapAccess.loadMapActorData(mapGrid, mapCoords.x, mapCoords.y - 2, 'test-wall-top', 'doodad', metaPoint);
				}
			});
		}

		function seedInterior() {
			bldgGrid.setHexValues().eachPoint(function(point, x, y, self) {
				if( point ) {
					let metaPoint = self.getMetaPoint(x, y);

					if( metaPoint.type == 'inside' ) {
						mapAccess.insertDataPointValue(mapGrid, x + data.min.x, y + data.min.y, 'type', 'building');
						mapAccess.insertDataPointValue(mapGrid, x + data.min.x, y + data.min.y, 'subtype', 'floor');

						mapAccess.insertDataPointValue(bldgGrid, x, y, 'type', 'floor');
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
