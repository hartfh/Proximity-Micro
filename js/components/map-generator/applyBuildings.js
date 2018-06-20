let mapAccess = require('./map-access');

module.exports = function(mapGrid) {
	mapGrid.eachPoint(function(point, x, y, self) {
		if( point ) {
			mapAccess.insertDataPointValue(self, x, y, 'temp', false);
		}
	});

	mapGrid.addFilter(function(point, x, y) {
		if( point ) {
			let dataPoint = mapGrid.getDataPoint(x, y);

			if( dataPoint.type == 'sidewalk' ) {
				return point;
			}
		}

		return false;
	});

	let scanArea = function(origin = {}, direction = {}, sweepSize = 1, odd = (Math.random() > 0.5), shallow = []) {
		let openPoints	= [];
		let blocked	= false;

		if( sweepSize > 7 ) {
			return openPoints;
		}

		scanLoop:
		for(let i = 0; i < sweepSize; i++) {
			let testCoords = {};

			if( odd ) {
				// Vertical sweep
				testCoords.x = origin.x + (sweepSize - 1) * direction.x;
				testCoords.y = origin.y + i * direction.y;
			} else {
				// Horizontal sweep
				testCoords.x = origin.x + i * direction.x;
				testCoords.y = origin.y + sweepSize * direction.y;
			}

			let testDataPoint	= mapGrid.getDataPoint(testCoords.x, testCoords.y);
			let testMetaPoint	= mapGrid.getMetaPoint(testCoords.x, testCoords.y);

			let pointAdded		= false;
			let neighborsOkay	= true;

			if( testDataPoint && testDataPoint.type == 'sidewalk' && testMetaPoint.type == 'inside' && !testDataPoint.solid && !testDataPoint.temp ) {
				let neighborCoords = mapGrid.getOrdinalNeighbors(testCoords.x, testCoords.y);
				let counter = 0;

				mapGrid.withPoints(neighborCoords, function(neighborPoint, x, y) {
					if( neighborPoint ) {
						let neighborMeta = mapGrid.getMetaPoint(x, y);
						let neighborData = mapGrid.getDataPoint(x, y);

						if( shallow.indexOf(counter) != -1 ) {

						} else if( neighborMeta.type != 'inside' ) {
							neighborsOkay = false;
							return true;
						}
					}

					counter++;
				});

				if( neighborsOkay ) {
					pointAdded = true;

					openPoints.push({x: testCoords.x, y: testCoords.y});
				}
			}
			if( !pointAdded ) {
				blocked		= true;
				openPoints	= [];

				break scanLoop;
			}
		}

		odd = !odd;

		if( odd ) {
			sweepSize++;
		}
		if( Math.random() > 0.9 ) {
			return openPoints;
		}
		if( !blocked ) {
			openPoints = [...openPoints, ...scanArea(origin, direction, sweepSize, odd, shallow)];
		}

		return openPoints;
	};

	let buildingID = 0;
	//let buildingGroups = {};

	mapGrid.setHexValues(false, false).eachPointRandom(function(point, x, y, self) {
		if( point ) {
			let metaPoint = self.getMetaPoint(x, y);
			let scanDirectionX	= 1;
			let scanDirectionY	= 1;
			let scanBufferX	= 0;
			let scanBufferY	= 0;
			let shallowScan	= [];

			if( metaPoint.type == 'edge' ) {
				let streetCoords = {x: 0, y: 0};

				if( metaPoint.rotations == 0 ) {
					scanDirectionY = -1;
					scanBufferY = 1;
					streetCoords.y++;
					shallowScan = [2, 0];
				} else if( metaPoint.rotations == 1 ) {
					scanBufferX = 1;
					streetCoords.x--;
					shallowScan = [3, 1];
				} else if( metaPoint.rotations == 2 ) {
					scanBufferY = 1;
					streetCoords.y--;
					shallowScan = [0, 2];
				} else if( metaPoint.rotations == 3 ) {
					scanDirectionX = -1;
					scanBufferX = 1;
					streetCoords.x++;
					shallowScan = [1, 3];
				}

				let streetMetaPoint = self.getMetaPoint(x + streetCoords.x, y + streetCoords.y);

				if( streetMetaPoint && streetMetaPoint.type == 'channel' ) {
					scanBufferX *= 0.5;
					scanBufferY *= 0.5;
				}
			} else if( metaPoint.type == 'corner' || metaPoint.type == 'bend' ) {
				let streetCoords1 = {x: 0, y: 0};
				let streetCoords2 = {x: 0, y: 0};

				scanBufferX	= 1;
				scanBufferY	= 1;

				if( metaPoint.rotations == 0 ) {
					scanDirectionY = -1;
					scanDirectionX = -1;
					streetCoords1.y++;
					streetCoords2.x++;
				} else if( metaPoint.rotations == 1 ) {
					scanDirectionY = -1;
					streetCoords1.y++;
					streetCoords2.x--;
				} else if( metaPoint.rotations == 2 ) {
					streetCoords1.y--;
					streetCoords2.x--;
				} else if( metaPoint.rotations == 3 ) {
					scanDirectionX = -1;
					streetCoords1.y--;
					streetCoords2.x++;
				}

				if( metaPoint.type == 'corner' ) {
					let streetMetaPoint1 = self.getMetaPoint(x + streetCoords1.x, y + streetCoords1.y);
					let streetMetaPoint2 = self.getMetaPoint(x + streetCoords2.x, y + streetCoords2.y);

					if( streetMetaPoint1 && streetMetaPoint1.type == 'channel' ) {
						scanBufferY *= 0.5;

						shallowScan.push( streetCoords1.y > 0 ? 2 : 0 );
					}
					if( streetMetaPoint2 && streetMetaPoint2.type == 'channel' ) {
						scanBufferX *= 0.5;

						shallowScan.push( streetCoords2.x > 0 ? 1 : 3 );
					}
				}
			} else {
				return;
			}

			let scanOrigin		= {x: x + scanBufferX * scanDirectionX * 2, y: y + scanBufferY * scanDirectionY * 2};
			let scanDirection	= {x: scanDirectionX, y: scanDirectionY};
			let bldgPoints		= scanArea(scanOrigin, scanDirection, null, null, shallowScan);

			if( bldgPoints.length > 0 ) {
				let temp = (bldgPoints.length < 4 && Math.random() > 0.85) ? true : false;
				//let temp = false;

				self.withPoints(bldgPoints, function(bldgPoint, x, y) {
					mapAccess.insertDataPointValue(self, x, y, 'temp', temp);

					if( !temp ) {
						//_insertDataPointValue(self, x, y, 'id', `building-${buildingID}`);
					}
				});

				if( !temp ) {
					let dataPoint = self.getDataPoint(x, y);

					// Find rectangular area bounds to determine base point and dimensions
					let min = false;
					let max = false;

					bldgPoints.forEach(function(point) {
						if( !min ) {
							min = {x: point.x, y: point.y};
						}
						if( !max ) {
							max = {x: point.x, y: point.y};
						}
						if( point.x < min.x ) {
							min.x = point.x;
						}
						if( point.y < min.y ) {
							min.y = point.y;
						}
						if( point.x > max.x ) {
							max.x = point.x;
						}
						if( point.y > max.y ) {
							max.y = point.y;
						}
						if( dataPoint.density == 'medium' ) {
							mapAccess.insertDataPointValue(self, point.x, point.y, 'medbldg', true);
						}
						if( dataPoint.density == 'high' ) {
							mapAccess.insertDataPointValue(self, point.x, point.y, 'highbldg', true);
						}
					});

					let width		= (max.x - min.x) + 1;
					let height	= (max.y - min.y) + 1;
					// TODO: incorporate density value into bulding query/seeding

					_seedBuildingSolid(width, height, {district: dataPoint.district}, min, mapGrid);
				}

				buildingID++;
			}
		}
	});

	mapGrid.eachPoint(function(point, x, y, self) {
		if( point ) {
			mapAccess.insertDataPointValue(self, x, y, 'temp', false);
		}
	});

	log('buildings finished seeding');
};
