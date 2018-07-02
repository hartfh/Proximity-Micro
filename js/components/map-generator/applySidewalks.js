let mapAccess = require('./map-access');

function _correctSidewalkDistricts(mapGrid) {
	mapGrid.eachPoint(function(point, x, y, thisGrid) {
		if( point ) {
			let dataPoint = thisGrid.getDataPoint(x, y);

			 if( dataPoint.type == 'sidewalk' && dataPoint.district != 0 ) {
				 applyDistrictToNeighbors(x, y, dataPoint.district);
			 }
		}
	});

	function applyDistrictToNeighbors(x, y, district, depth = 0) {
		let testPoints = mapGrid.getOrdinalNeighbors(x, y);

		mapGrid.withPoints(testPoints, function(nghbrPoint, x, y) {
			if( !nghbrPoint ) {
				return;
			}

			let nghbrDataPoint = mapGrid.getDataPoint(x, y);

			if( nghbrDataPoint && nghbrDataPoint.type == 'sidewalk' && nghbrDataPoint.district != district ) {
				if( depth < 1200 ) {
					mapAccess.loadMapDistrict(mapGrid, x, y, district);
					applyDistrictToNeighbors(x, y, district, depth + 1);
				}
			}
		});
	}
}

function _correctSidewalkBuildingIDs(mapGrid) {
	let completed = true;

	mapGrid.eachPoint(function(point, x, y, thisGrid) {
		if( point ) {
			let dataPoint = thisGrid.getDataPoint(x, y);

			 if( dataPoint.type == 'sidewalk' && dataPoint.buildingID != 0 ) {
				 if( applyDistrictToNeighbors(x, y, dataPoint.buildingID) ) {
					 completed = false;
				 }
			 }
		}
	});

	function applyDistrictToNeighbors(x, y, buildingID, depth = 0) {
		let testPoints = mapGrid.getOrdinalNeighbors(x, y);
		let bailed = false;

		mapGrid.withPoints(testPoints, function(nghbrPoint, x, y) {
			if( !nghbrPoint ) {
				return;
			}

			let nghbrDataPoint = mapGrid.getDataPoint(x, y);

			if( nghbrDataPoint && nghbrDataPoint.type == 'sidewalk' && nghbrDataPoint.buildingID != buildingID ) {
				if( depth < 1300 ) {
					mapAccess.insertDataPointValue(mapGrid, x, y, 'buildingID', buildingID);
					applyDistrictToNeighbors(x, y, buildingID, depth + 1);
				} else {
					bailed = true;
				}
			}
		});

		return bailed;
	}

	return completed;
}

module.exports = function(mapGrid) {
	// Fill anything in that isn't a street
	mapGrid.eachPoint(function(point, x, y, self) {
		if( !point ) {
			mapAccess.loadMapType(mapGrid, x, y, 'sidewalk');
			mapGrid.setPoint(x, y, 1);
		}
	});

	// Apply district values
	const _MAP_TILE_SIZE_X		= Constants.MAP_BLOCK_WIDTH * Constants.MAP_BLOCK_SIZE;
	const _MAP_TILE_SIZE_Y		= Constants.MAP_BLOCK_HEIGHT * Constants.MAP_BLOCK_SIZE;
	const NUM_DISTRICTS			= 6;
	const DISTRICT_GRID_WIDTH	= 3;
	const DISTRICT_GRID_HEIGHT	= 3;
	const DISTRICT_WIDTH		= Math.floor(_MAP_TILE_SIZE_X / DISTRICT_GRID_WIDTH);
	const DISTRICT_HEIGHT		= Math.floor(_MAP_TILE_SIZE_Y / DISTRICT_GRID_HEIGHT);
	const EDGE_BUFFER			= 1;
	const NON_RANDOM_BUFFER		= 32;

	let districtGrid = [];

	for(let dy = 0; dy < DISTRICT_GRID_HEIGHT; dy++) {
		for(let dx = 0; dx < DISTRICT_GRID_WIDTH; dx++) {
			districtGrid.push({x: dx, y: dy});
		}
	}

	let densityQuadrants = [];

	// Determine density zone centers
	districtGrid.forEach(function(quadrant) {
		let quadrantCenter = {
			x:	quadrant.x * DISTRICT_WIDTH + Math.floor( Math.random() * DISTRICT_WIDTH ),
			y:	quadrant.y * DISTRICT_HEIGHT + Math.floor( Math.random() * DISTRICT_HEIGHT ),
		};

		densityQuadrants.push(quadrantCenter);
	});

	// Add medium density
	densityQuadrants.forEach(function(quadrantCenter) {
		let circlePoints = mapGrid.getCircle(quadrantCenter, 56);

		mapGrid.withPoints(circlePoints, function(circlePoint, x, y, self) {
			if( circlePoint ) {
				mapAccess.insertDataPointValue(self, x, y, 'density', 'medium');
			}
		});
	});

	// Add high density
	densityQuadrants.forEach(function(quadrantCenter) {
		let circlePoints = mapGrid.getCircle(quadrantCenter, 28);

		mapGrid.withPoints(circlePoints, function(circlePoint, x, y, self) {
			if( circlePoint ) {
				mapAccess.insertDataPointValue(self, x, y, 'density', 'high');
			}
		});
	});

	Utilities.shuffleArray(districtGrid);

	for(let d = 0; d < NUM_DISTRICTS; d++) {
		let coords = districtGrid.pop();

		let minBound = {
			x:	coords.x * DISTRICT_WIDTH + EDGE_BUFFER,
			y:	coords.y * DISTRICT_HEIGHT + EDGE_BUFFER,
		};
		let maxBound = {
			x:	Math.floor( (coords.x + 1) * _MAP_TILE_SIZE_X / DISTRICT_GRID_WIDTH) - EDGE_BUFFER,
			y:	Math.floor( (coords.y + 1) * _MAP_TILE_SIZE_Y / DISTRICT_GRID_HEIGHT) - EDGE_BUFFER,
		};

		let rectangleCoords = mapGrid.getRectangle(minBound, maxBound);

		Utilities.shuffleArray(rectangleCoords);

		let randomCoords = [];

		for(let i = 0; i < 16; i++) {
			randomCoords.push( rectangleCoords.pop() );
		}

		// Center zone
		minBound.x += NON_RANDOM_BUFFER;
		minBound.y += NON_RANDOM_BUFFER;
		maxBound.x -= NON_RANDOM_BUFFER;
		maxBound.y -= NON_RANDOM_BUFFER;

		let centerCoords = mapGrid.getRectangle(minBound, maxBound);

		mapGrid.withPoints([...randomCoords, ...centerCoords], function(point, x, y, self) {
			mapAccess.loadMapDistrict(self, x, y, d + 1);
		});
	}

	/*
	log('---districts added.');
	_correctSidewalkDistricts(mapGrid);
	_correctSidewalkDistricts(mapGrid);
	log('---districts corrected.');
	*/

	log('building IDs added');
	while( !_correctSidewalkBuildingIDs(mapGrid) ) {
		log('repeating building ID correction!');
	}
	log('building IDs corrected');

	mapGrid.addFilter(function(point, x, y) {
		if( point ) {
			let dataPoint = mapGrid.getDataPoint(x, y);

			if( dataPoint.type == 'sidewalk' ) {
				return point;
			}
		}

		return false;
	});

	/*
	// Purge certain unwanted sidewalk types and replace them with streets
	let allowTypes = ['bend', 'corner', 'edge', 'inside'];
	let search = true;

	while( search ) {
		let correctionMade = false;
		log('...performing sidewalk correction sweep');

		mapGrid.setHexValues(false, false).eachPoint(function(point, x, y, self) {
			if( point ) {
				let dataPoint = self.getDataPoint(x, y);
				let metaPoint = self.getMetaPoint(x, y);

				if( dataPoint.type == 'sidewalk' ) {
					if( allowTypes.indexOf(metaPoint.type) == -1 ) {
						mapAccess.loadMapType(self, x, y, 'guard-rail');
						mapAccess.loadMapSubType(self, x, y, false);
						mapAccess.loadMapDistrict(self, x, y, 0);
						correctionMade = true;
					}
				}
			}
		}, false);

		if( !correctionMade ) {
			search = false;
		}
	}

	// Seed actors
	mapGrid.setHexValues(false, false).eachPoint(function(point, x, y, self) {
		if( point ) {
			let dataPoint = self.getDataPoint(x, y);
			let metaPoint = self.getMetaPoint(x, y);

			if( dataPoint.type == 'sidewalk' ) {
				mapAccess.loadMapActorData(self, x, y, `sidewalk-${dataPoint.district}`, 'doodad', metaPoint);
			}
		}
	});

	//mapGrid.depopulate(100).populate(1.2).growPoints(false, 50).growPoints(false, 50).growPoints(false, 50);

	mapGrid.eachPoint(function(point, x, y, self) {
		if( point ) {
			let dataPoint = self.getDataPoint(x, y);
			let metaPoint = self.getMetaPoint(x, y);

			if( dataPoint.type == 'sidewalk' ) {
				mapAccess.insertDataPointValue(self, x, y, 'temp', true);
			}
		}
	});

	mapGrid.populate(100);
	mapGrid.addFilter(function(point, x, y) {
		if( point ) {
			let dataPoint = self.getDataPoint(x, y);

			if( dataPoint.type == 'sidewalk' ) {
				return point;
			}
		}

		return false;
	});
	*/

	/*
	mapGrid.setHexValues(false, false).eachPoint(function(point, x, y, self) {
		if( point ) {
			let dataPoint = self.getDataPoint(x, y);
			let metaPoint = self.getMetaPoint(x, y);

			if( metaPoint.type == 'inside' && dataPoint.temp ) {
				//_insertDataPointValue(self, x, y, 'type', 'test');
			}
		}
	});
	*/
	//mapGrid.setHexValues();

	// turn off all dataPoint.temp values


	log('done adding sidewalk actor data');


	mapGrid.clearFilter();
};
