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

		bldgGrid.eachDataPoint(function(dataPoint, x, y, self) {
			if( !dataPoint ) {
				self.setDataPoint(x, y, {});
			}
		});

		seedInterior();
		seedExterior();
		applyColoring();

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
						mapAccess.insertDataPointValue(bldgGrid, x, y, 'shell', true);

						if( !dataPoint.door ) {
							mapAccess.loadMapActorData(mapGrid, mapCoords.x, mapCoords.y, 'filler', 'terrain');
						}

						// load wall sides
						// load wall tops
					}
				}
			});

			placePartitions(doors);

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
					let metaPoint		= self.getMetaPoint(x, y);
					let dataPoint		= self.getDataPoint(x, y);
					let mapDataPoint	= mapGrid.getDataPoint(x + data.min.x, y + data.min.y);

					if( metaPoint.type == 'inside' ) {
						let bldgDataPoint = bldgGrid.getDataPoint(x, y);

						mapDataPoint.type = 'building';

						if( bldgDataPoint.type != 'wall' ) {
							bldgDataPoint.type = 'floor';
							mapDataPoint.subtype = 'floor';
						}

						//mapAccess.insertDataPointValue(mapGrid, x + data.min.x, y + data.min.y, 'type', 'building');
						//mapAccess.insertDataPointValue(mapGrid, x + data.min.x, y + data.min.y, 'subtype', 'floor');

								//mapAccess.insertDataPointValue(bldgGrid, x, y, 'type', 'floor');

						// load map actor: floor. maybe ignore metaType and just have one floor tile for all configurations
						mapAccess.loadMapActorData(mapGrid, x + data.min.x, y + data.min.y, 'test-floor', 'doodad', {type: 'inside', rotations: 0});
					}
					if( dataPoint.shell ) {
						mapAccess.insertDataPointValue(mapGrid, x + data.min.x, y + data.min.y, 'sidewalk-temp', true);
					}
				}
			});


			// look at all floor-type points. re-use algorithm from old MapFactory got placing building rectangles.
			// Before placing rectangles, or maybe as part of it, place longer ones near walls (furniture up against or close to walls).
		}

		function seedExterior() {
			let facadeGrid = new Grid(data.width, data.height + ELEVATION);
			// let roofGrid = new Grid(data.width, data.height);
			// copy over all bldgGrid points into roofGrid

			// Roof
			bldgGrid.eachPoint(function(point, x, y, self) {
				if( point ) {
					let metaPoint = self.getMetaPoint(x, y);

					//mapAccess.loadMapActorData(mapGrid, mapCoords.x, mapCoords.y - ELEVATION, 'test-roof', 'doodad', metaPoint);

					if( metaPoint.type == 'inside' ) {

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

		function placePartitions(doors) {
			const CHANCE_TO_SKIP = 0.25;
			const MIN_ROOM_SIZE = 4;
			let bends = [];

			function getExtension(base, extender, continueType) {
				let points	= [];
				let length	= 1;

				do {
					let coords	= {x: base.x + extender.x * length, y: base.y + extender.y * length};
					let point		= bldgGrid.getPoint(coords.x, coords.y);
					let metaPoint	= bldgGrid.getMetaPoint(coords.x, coords.y);

					length++;

					if( !point || metaPoint.type != continueType ) {
						length = false;
					} else {
						points.push(coords);
					}
				} while( length )

				return points;
			}

			bldgGrid.eachPoint(function(point, x, y, self) {
				if( point ) {
					let metaPoint = self.getMetaPoint(x, y);

					if( metaPoint.type == 'bend' ) {
						if( Math.random() < CHANCE_TO_SKIP ) {
							return;
						}

						let bend = {};

						bend.base			= {x: x, y: y};
						bend.extension1	= {x: 0, y: 0};
						bend.extension2	= {x: 0, y: 0};

						switch(metaPoint.rotations) {
							case 0:
								bend.extension1.y = -1;
								bend.extension2.x = -1;
								break;
							case 1:
								bend.extension1.x = 1;
								bend.extension2.y = -1;
								break;
							case 2:
								bend.extension1.y = 1;
								bend.extension2.x = 1;
								break;
							case 3:
								bend.extension1.x = -1;
								bend.extension2.y = 1;
								break;
							default:
								break;
						}

						bend.negExtension1Points = getExtension(bend.base, {x: -bend.extension2.x, y: -bend.extension2.y}, 'edge');
						bend.negExtension2Points = getExtension(bend.base, {x: -bend.extension1.x, y: -bend.extension1.y}, 'edge');

						if( bend.negExtension1Points.length > MIN_ROOM_SIZE ) {
							bend.extension1Points = getExtension(bend.base, bend.extension1, 'inside');
						}
						if( bend.negExtension2Points.length > MIN_ROOM_SIZE ) {
							bend.extension2Points = getExtension(bend.base, bend.extension2, 'inside');
						}

						bends.push(bend);
					}
				}
			});

			let expandedBends = [];

			bends.forEach(function(bend) {
				if( bend.extension1Points && bend.extension1Points.length > 1 ) {
					expandedBends.push({
						base:		bend.base,
						points:		bend.extension1Points,
						alignment:	(bend.extension1Points[0].x == bend.extension1Points[1].x) ? 'vertical' : 'horizontal',
					});
				}
				if( bend.extension2Points && bend.extension2Points.length > 1 ) {
					expandedBends.push({
						base:		bend.base,
						points:		bend.extension2Points,
						alignment:	(bend.extension2Points[0].x == bend.extension2Points[1].x) ? 'vertical' : 'horizontal',
					});
				}
			});

			expandedBends.sort(function(a, b) {
				if( a.points.length < b.points.length ) {
					return -1;
				} else if( a.points.length > b.points.length ) {
					return 1;
				} else {
					return 0;
				}
			});

			expandedBends.forEach(function(bend, index) {
				let covered = [];
				let perpendicular = {x: 0, y: 0};

				// Skip any vertical partitions that might hit an external door
				if( bend.alignment == 'vertical' ) {
					perpendicular.x = 1;

					for(let i = 0; i < doors.length; i++) {
						if( bend.base.x == doors[i].x ) {
							return;
						}
					}
				} else {
					perpendicular.y = 1;
				}

				wallExtensionLoop:
				for(let i = 0; i < bend.points.length; i++) {
					let extCoords = bend.points[i];
					let dataPoint = bldgGrid.getDataPoint(extCoords.x, extCoords.y);

					// Check laterally to ensure that this wall isn't too close to another
					if( i % 3 == 0 || i == bend.points.length - 1 ) {
						perpendicularLoop:
						for(let p = 1; p < 5; p++) {
							let positiveData = bldgGrid.getDataPoint(extCoords.x + perpendicular.x * p, extCoords.y + perpendicular.y * p);
							let negativeData = bldgGrid.getDataPoint(extCoords.x + perpendicular.x * -p, extCoords.y + perpendicular.y * -p);

							if( positiveData.type == 'wall' || negativeData.type == 'wall' ) {
								covered = [];
								break wallExtensionLoop;
							}
						}
					}

					if( dataPoint.type == 'wall' ) {
						break wallExtensionLoop;
					} else {
						covered.push({x: extCoords.x, y: extCoords.y});
					}
				}

				covered.forEach(function(coveredPoint, index) {
					mapAccess.insertDataPointValue(bldgGrid, coveredPoint.x, coveredPoint.y, 'type', 'wall');
					mapAccess.insertDataPointValue(mapGrid, coveredPoint.x + data.min.x, coveredPoint.y + data.min.y, 'subtype', 'wall');
				});

				let tempDoor = covered.random();

				if( tempDoor ) {
					mapAccess.insertDataPointValue(bldgGrid, tempDoor.x, tempDoor.y, 'temp-door', true);
				}
			});

			// Convert all temporary doors into actual doors
			bldgGrid.eachDataPoint(function(dataPoint, x, y, self) {
				if( dataPoint && dataPoint['temp-door'] ) {
					mapAccess.insertDataPointValue(bldgGrid, x, y, 'temp-door', false);
					mapAccess.insertDataPointValue(bldgGrid, x, y, 'type', 'floor');
					mapAccess.insertDataPointValue(mapGrid, x + data.min.x, y + data.min.y, 'subtype', 'floor');
				}
			});
		}

		function applyColoring() {
			let color = Utilities.getRandomColor();

			bldgGrid.eachPoint(function(point, x, y, self) {
				if( point ) {
					mapAccess.insertDataPointValue(mapGrid, x + data.min.x, y + data.min.y, 'color', color);
				}
			});
		}
	}
};
