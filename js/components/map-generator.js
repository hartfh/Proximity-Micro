let fs = require('fs');
let Tilesets = require('../data/tilesets');
let Building = require('../classes/Building');
let setupIntersections = require('./map-generator/setupIntersections');
let applyStreets = require('./map-generator/applyStreets');
let applySidewalks = require('./map-generator/applySidewalks');
let applyBuildings = require('./map-generator/applyBuildings');
let extractBuildingFootprints = require('./map-generator/extractBuildingFootprints');
let seedBuildings = require('./map-generator/seedBuildings');
let seedSidewalks = require('./map-generator/seedSidewalks');

module.exports = new function() {
	let _self = this;

	this.createMap = function(type) {
		log('initiating Map Generator map');
		let map;
		let mapArgs;
		let mapWidth	= Constants.MAP_BLOCK_WIDTH * Constants.MAP_BLOCK_SIZE;
		let mapHeight	= Constants.MAP_BLOCK_HEIGHT * Constants.MAP_BLOCK_SIZE;

		if( type == 'blank' ) {
			mapArgs = {scratch: false, meta: false};
		}

		map = new Grid(mapWidth, mapHeight, mapArgs);

		_setupActorData(map); log('Actor data setup.');

		if( type != 'blank' ) {
			_populateShell(map); log('populations done');
			_printMap(map);
		}

		_finalizeActorData(map); log('Actor data finalized.');

		return map;
	};

	function _populateShell(map) {
		let intersectionGrid = new Grid(Constants.MAP_BLOCK_WIDTH + 2, Constants.MAP_BLOCK_HEIGHT + 2, {scratch: false, meta: false});

		setupIntersections(intersectionGrid); log('Intersections setup.');
		//setupIntersections(trussGrid, {range: 0.85, zones: false});
		applyStreets(intersectionGrid, map); log('Streets applied');
		applySidewalks(map); log('Sidewalks applied.');
		seedBuildings(extractBuildingFootprints(map), map); log('Buildings seeded.');
		seedSidewalks(map); log('Sidewalks seeded.');
		/*
		applyBuildings(map); log('Buidings seeded.');
		_seedCrosswalksV7(map); log('Crosswalks seeded.');
		_seedStreetsV7(map); log('Streets seeded.');
		_seedStreetInfrastructureV7(map); log('Street infrastructure seeded.');
		_seedFencingV7(map); log('Fencing added.');
		_seedShantytownsV7(map);
		_seedBlockadesV7(map); log('Bockades added.')
		_seedSidewalkInfrastructure(map); log('Sidewalk infrastructure added.');
		*/
	}

	function _getDataPointExemplar(x, y) {
		return {
			actorData:	{
				'x':		x,	// area X coordinate
				'y':		y,	// area Y coordinate
				't':		[],	// terrain
				'c':		[],	// characters
				'd':		[],	// doodads
				'o':		[],	// obstacles
			},
			buildingID:	false,
			density:		'low',
			district:		0,
			solid:		false,
			subtype:		false,
			temp:		false,
			truss:		false,
			type:		false,
			zone:		false,
		};
	}

	function _setupActorData(grid) {
		// Stores data about actors, terrain and tile coordinates
		grid.eachDataPoint(function(dataPoint, x, y) {
			if( !dataPoint ) {
				dataPoint = _getDataPointExemplar(x, y);
			}

			grid.setDataPoint(x, y, dataPoint);
		});

		return grid;
	}

	// Copies actor data from a property of a data point into the primary point value
	function _finalizeActorData(grid) {
		grid.eachDataPoint(function(data, x, y) {
			// Setup finalized data to be loaded into the saved map grid
			var finalized = {
				x:		x,
				y:		y,
				t:		data.actorData.t,
				c:		data.actorData.c,
				d:		data.actorData.d,
				o:		data.actorData.o,
				dist:	data.district,
				type:	data.type,
				subtype:	data.subtype,
			};

			grid.setPoint(x, y, finalized);
			grid.setDataPoint(x, y, null);
			grid.setMetaPoint(x, y, null);
		});

		return grid;
	}

	function _seedCrosswalksV7(mapGrid) {
		mapGrid.addFilter(function(point, x, y) {
			if( point ) {
				let dataPoint = mapGrid.getDataPoint(x, y);

				if( dataPoint.type == 'street' && dataPoint.subtype == 'intersection' ) {
					return point;
				}
			}

			return false;
		});

		log('preparing to add traffic sign locations');
		mapGrid.setHexValues(false, false).eachPoint(function(point, x, y, self) {
			if( point ) {
				let metaPoint = self.getMetaPoint(x, y);
				let neighbors = self.getOrdinalNeighbors(x, y);

				// Load small signs around island intersections
				if( metaPoint.type == 'island' ) {
					let diagNeighbors = self.getDiagonalNeighbors(x, y);

					self.withPoints(diagNeighbors, function(diagNeighbor, diagX, diagY) {
						_loadMapSubType(self, diagX, diagY, 'small-traffic-sign');
						// TODO: load actor data.
					});
				} else if( metaPoint.type == 'end' ) {
					let seedCoords = [];

					if( metaPoint.rotations == 0 ) {
						seedCoords.push({x: -1, y: 1});
						seedCoords.push({x: 1, y: 1});
					} else if( metaPoint.rotations == 1 ) {
						seedCoords.push({x: -1, y: -1});
						seedCoords.push({x: -1, y: 1});
					} else if( metaPoint.rotations == 2 ) {
						seedCoords.push({x: -1, y: -1});
						seedCoords.push({x: 1, y: -1});
					} else {
						seedCoords.push({x: 1, y: -1});
						seedCoords.push({x: 1, y: 1});
					}

					seedCoords.forEach(function(coord) {
						_loadMapSubType(self, x + coord.x, y + coord.y, 'small-traffic-sign');
						// TODO: load small traffic sign actor data.
					});
				} else if( metaPoint.type == 'corner' ) {
					let counter		= 0;
					let diagNeighbors	= self.getDiagonalNeighbors(x, y);
					let actorMap		= [0, 2, 1, 3]; // maps light orientations to correct corners
					let edgeCheck		= [
						{x: 0, y: -1},
						{x: 1, y: 0},
						{x: 0, y: 1},
						{x: -1, y: 0},
					];

					self.withPoints(diagNeighbors, function(diagNeighbor, diagX, diagY) {
						if( metaPoint.rotations == counter - 1 || (metaPoint.rotations == 3 && counter == 0) ) {
							let lightIndex		= actorMap[metaPoint.rotations];
							let edgeCoords		= edgeCheck[metaPoint.rotations];
							let edgeMetaPoint	= self.getMetaPoint(x + edgeCoords.x, y + edgeCoords.y);

							if( edgeMetaPoint.type == 'edge' ) {
								_loadMapSubType(self, diagX, diagY, 'large-traffic-sign');
								_loadMapActorData(self, diagX, diagY, `placeholder-traffic-light-${lightIndex}`, 'obstacle');
							} else {
								_loadMapSubType(self, diagX, diagY, 'medium-traffic-sign');
								_loadMapActorData(self, diagX, diagY, `placeholder-traffic-light-${lightIndex}`, 'obstacle');
							}

							return true;
						}

						counter++;
					});
				}

				self.withPoints(neighbors, function(nghbrPoint, nghbrX, nghbrY) {
					let nghbrDataPoint = self.getDataPoint(nghbrX, nghbrY);

					if( nghbrDataPoint.type == 'street' && nghbrDataPoint.subtype != 'intersection' ) {
						_loadMapSubType(self, nghbrX, nghbrY, 'crosswalk');
					}
				});
			}
		});

		mapGrid.addFilter(function(point, x, y) {
			if( point ) {
				var dataPoint = mapGrid.getDataPoint(x, y);

				if( dataPoint.type == 'street' && dataPoint.subtype == 'crosswalk' ) {
					return point;
				}
			}

			return false;
		});

		log('preparing to add crosswalk doodad');
		mapGrid.setHexValues(false, false).eachPoint(function(point, x, y, self) {
			if( point ) {
				let metaPoint = self.getMetaPoint(x, y);

				if( metaPoint.type != 'island' ) {
					_loadMapActorData(mapGrid, x, y, 'crosswalk', 'doodad', metaPoint);
				} else {
					_loadMapSubType(self, x, y, false);
				}
			}
		});
	}

	function _seedStreetsV7(mapGrid) {
		mapGrid.addFilter(function(point, x, y) {
			if( point ) {
				let dataPoint = mapGrid.getDataPoint(x, y);

				if( dataPoint.type == 'street' ) {
					return point;
				}
			}

			return false;
		});

		mapGrid.setHexValues(false, false).eachPoint(function(point, x, y, self) {
			if( point ) {
				let dataPoint = mapGrid.getDataPoint(x, y);

				if( dataPoint.subtype == 'crosswalk' ) {
					let neighbors = self.getOrdinalNeighbors(x, y);

					self.withPoints(neighbors, function(neighborPoint, neighborX, neighborY) {
						let neighborDataPoint = self.getDataPoint(neighborX, neighborY);

						if( neighborDataPoint.type == 'street' && neighborDataPoint.subtype == false ) {
							_loadMapSubType(self, neighborX, neighborY, 'yield');
						}
					});
				}
			}
		}, false);

		mapGrid.eachPoint(function(point, x, y, self) {
			if( point ) {
				let dataPoint = self.getDataPoint(x, y);
				let metaPoint = self.getMetaPoint(x, y);

				if( !dataPoint || !metaPoint ) {
					return;
				}

				if( dataPoint.subtype == false ) {
					if( metaPoint.type == 'corner' || metaPoint.type == 'edge' || metaPoint.type == 'bend' ) {
						_loadMapActorData(mapGrid, x, y, 'street-markings', 'doodad', metaPoint);
					}
				} else if( dataPoint.subtype == 'yield' && metaPoint.type == 'edge' ) {
					let checkCoords = {x: 0, y: 0};

					if( metaPoint.rotations == 0 ) {
						checkCoords.x = -1;
					} else if( metaPoint.rotations == 1 ) {
						checkCoords.y = -1;
					} else if( metaPoint.rotations == 2 ) {
						checkCoords.x = 1;
					} else {
						checkCoords.y = 1;
					}

					let checkDataPoint = self.getDataPoint(x + checkCoords.x, y + checkCoords.y);

					if( checkDataPoint.subtype == 'crosswalk' ) {
						metaPoint.type = 'edgetee';
					}

					_loadMapActorData(mapGrid, x, y, 'street-markings-yield', 'doodad', metaPoint);
				}
			}
		});
	}

	function _seedStreetInfrastructureV7(mapGrid) {
		// Medians and median objects
		mapGrid.addFilter(function(point, x, y) {
			if( point ) {
				let dataPoint = mapGrid.getDataPoint(x, y);

				if( dataPoint.type == 'street' && dataPoint.subtype == false ) {
					return point;
				}
			}

			return false;
		});

		mapGrid.setHexValues(false, false).eachPoint(function(point, x, y, self) {
			if( point ) {
				let metaPoint = mapGrid.getMetaPoint(x, y);

				if( metaPoint.type == 'inside' ) {
					_loadMapSubType(self, x, y, 'median');
				}
			}
		});

		mapGrid.addFilter(function(point, x, y) {
			if( point ) {
				let dataPoint = mapGrid.getDataPoint(x, y);

				if( dataPoint.type == 'street' && dataPoint.subtype == 'median' ) {
					return point;
				}
			}

			return false;
		});

		// Simplify what medians can occur
		mapGrid.setHexValues(false, false).eachPoint(function(point, x, y, self) {
			if( point ) {
				let metaPoint = self.getMetaPoint(x, y);

				if( metaPoint.type != 'pipe' && metaPoint.type != 'end' && metaPoint.type != 'elbow' ) {
					_loadMapSubType(self, x, y, '');
				}
			}
		}, false);

		// Swap in guard rails for some medians
		mapGrid.setHexValues(false, false).eachPoint(function(point, x, y, self) {
			if( point ) {
				let dataPoint = self.getDataPoint(x, y);
				let metaPoint = self.getMetaPoint(x, y);

				if( metaPoint.type == 'pipe' && Math.random() > 0.92 ) {
					const MAX_LENGTH = Math.floor(Math.random() * 4) + 3;
					let seedPoints	= [{x: x, y: y}];
					let seedable	= true;
					let scanDirs	= {x: 0, y: 0};

					if( metaPoint.rotations == 0 ) {
						scanDirs.y = 1;
					} else {
						scanDirs.x = 1;
					}

					for(let i = 1; i <= MAX_LENGTH; i++) {
						let testCoords = {x: x + scanDirs.x * i, y: y + scanDirs.y * i};
						let testPoint = self.getPoint(testCoords.x, testCoords.y);
						let testMetaPoint = self.getMetaPoint(testCoords.x, testCoords.y);

						if( testPoint && testMetaPoint.type == 'pipe' ) {
							seedPoints.push(testCoords);
						} else {
							break;
						}
					}

					if( seedPoints.length > 1 ) {
						seedPoints.forEach(function(seedPoint) {
							_loadMapType(self, seedPoint.x, seedPoint.y, 'guard-rail');
							_loadMapSubType(self, seedPoint.x, seedPoint.y, false);
						});
					}
				}
			}
		}, false);

		mapGrid.setHexValues(false, false).eachPoint(function(point, x, y, self) {
			if( point ) {
				let metaPoint = self.getMetaPoint(x, y);

				if( metaPoint.type == 'island' ) {
					_loadMapSubType(self, x, y, '');
				} else {
					_loadMapActorData(self, x, y, 'street-median', 'doodad', metaPoint);
				}

				if( metaPoint.type == 'pipe' ) {
					let adjacent = false;

					if( metaPoint.rotations == 0 ) {
						if( _mapDataPointHasSolid(self, x, y - 1) || _mapDataPointHasSolid(self, x, y - 2) ) {
							adjacent = true;
						}
					} else {
						if( _mapDataPointHasSolid(self, x - 1, y) || _mapDataPointHasSolid(self, x - 2, y) ) {
							adjacent = true;
						}
					}

					if( !adjacent ) {
						// TODO: seed. orientation based on rotations
						// TODO: possibly seed items at random (signs, lights, etc.);
						_setMapDataPointAsSolid(self, x, y);
						_loadMapSubType(self, x, y, 'median-object');
					}
				}
			}
		});


		// Filter for guard rails
		mapGrid.addFilter(function(point, x, y) {
			if( point ) {
				let dataPoint = mapGrid.getDataPoint(x, y);

				if( dataPoint.type == 'guard-rail' ) {
					return point;
				}
			}

			return false;
		});

		mapGrid.setHexValues('linear6', false).eachPoint(function(point, x, y, self) {
			if( point ) {
				let metaPoint	= self.getMetaPoint(x, y);
				let name		= '';

				if( metaPoint.type == 'pipe' ) {
					if( metaPoint.rotations == 0 ) {
						name = 'vert-1';
					} else {
						name = 'horz-1';
					}
				} else if( metaPoint.type == 'end' ) {
					if( metaPoint.rotations == 0 ) {
						name = 'vert-2';
					} else if( metaPoint.rotations == 1 ) {
						name = 'horz-0';
					} else if( metaPoint.rotations == 2 ) {
						name = 'vert-0';
					} else {
						name = 'horz-2';
					}
				}

				_loadMapActorData(self, x, y, `guard-rail-${name}`, 'obstacle');
			}
		});

		// TODO: large intersection paint/stripes


		// Vents/Plates/Manholes

	}

	function _seedSidewalkInfrastructure(mapGrid) {
		mapGrid.addFilter(function(point, x, y) {
			if( point ) {
				let dataPoint = mapGrid.getDataPoint(x, y);

				if( dataPoint.type == 'sidewalk' ) {
					return point;
				}
			}

			return false;
		});

		function scanArea(grid, baseX, baseY) {
			const MAX_LENGTH = 3;

			let areaData = {
				basePoint:	{x: baseX, y: baseY},
				facing:		'',
				points:		[],
				height:		1,
				width:		1,
			};
			let metaPoint	= grid.getMetaPoint(baseX, baseX);
			let scanDir	= {x: 0, y: 0};

			if( metaPoint.type != 'edge' ) {
				return false;
			}

			if( metaPoint.rotations == 0 ) {
				scanDir.x = 1;
				areaData.facing = 'S';
			} else if( metaPoint.rotations == 1 ) {
				scanDir.y = 1;
				areaData.facing = 'W';
			} else if( metaPoint.rotations == 2 ) {
				scanDir.x = 1;
				areaData.facing = 'N';
			} else {
				scanDir.y = 1;
				areaData.facing = 'E';
			}

			scanLoop:
			for(let i = 0; i < MAX_LENGTH; i++) {
				let testCoords	= {x: baseX + scanDir.x * i, y: baseY + scanDir.y * i};
				let point		= grid.getPoint(testCoords.x, testCoords.y);

				if( !point ) {
					break scanLoop;
				}

				let dataPoint	= grid.getDataPoint(testCoords.x, testCoords.y);
				let metaPoint	= grid.getMetaPoint(testCoords.x, testCoords.y);

				if( dataPoint.temp || dataPoint.solid || metaPoint.type != 'edge' ) {
					break scanLoop;
				}

				areaData.width = (i * scanDir.x) + 1;
				areaData.height = (i * scanDir.y) + 1;
				areaData.points.push(testCoords);

				if( Math.random() > 0.5 ) {
					break scanLoop;
				}
			}

			if( areaData.points.length < 1 ) {
				return false;
			}

			return areaData;
		}

		mapGrid.setHexValues(false, false).eachPoint(function(point, x, y, self) {
			if( point ) {
				let areaData = scanArea(self, x, y);

				if( areaData ) {
					log(areaData);
					let dataPoint = self.getDataPoint(areaData.basePoint.x, areaData.basePoint.y);

					// Flag points as covered
					areaData.points.forEach(function(coord) {
						_insertDataPointValue(self, coord.x, coord.y, 'temp', true);
					});

					if( Math.random() > 0.65 ) {
						// TODO: include edge vs. inside in query?
						_seedSidewalkItem(areaData.width, areaData.height, {district: dataPoint.district}, areaData.basePoint, mapGrid);
					}
				}
			}
		}, false);

		// Reset "temp" values
		mapGrid.eachPoint(function(point, x, y, self) {
			if( point ) {
				_insertDataPointValue(self, x, y, 'temp', false);
			}
		});
	}

	function _seedSidewalkItem(width, height, config = {district: 0}, baseOffset = {x: 0 , y: 0}, mapGrid) {
		let queryArgs = {
			width:		width,
			height:		height,
			district:		config.district,
		};

		let matches	= _querySidewalkItems(queryArgs);
		let match		= matches.random();

		if( match ) {
			let itemData	= Data.sidewalkItems[match];
			let offset	= itemData.offset || {x: 0, y: 0};

			_loadMapActorData(mapGrid, baseOffset.x, baseOffset.y, itemData.name, 'obstacle', false, offset);

			for(let h = 0; h < height; h++) {
				for(let w = 0; w < width; w++) {
					if( w != 0 && h != 0 ) {
						_insertDataPointValue(baseOffset.x + w, baseOffset.y + h, 'solid', true, mapGrid);
					}
				}
			}
		}
	}

	function _querySidewalkItems(args = {}) {
		let matches = [];
		let query = {
			facing:		args.facing || 'S',
			name:		args.name || false,
			width:		args.width || 1,
			height:		args.height || 1,
			district:		args.district,
		};

		for(let name in Data.sidewalkItems) {
			let item = Data.sidewalkItems[name];

			if( query.name && query.name != name ) {
				continue;
			}
			if( query.width != item.width ) {
				continue;
			}
			if( query.height != item.height ) {
				continue;
			}
			if( query.facing && item.facing ) {
				let facingTests = ( typeof(item.facing) == 'string' ) ? [item.facing] : item.facing;
				let allowable = false;

				for(let test of facingTests) {
					if( query.facing == test ) {
						allowable = true;
					}
				}

				if( !allowable ) {
					continue;
				}
			}
			if( query.district && item.district ) {
				let facingTests = ( typeof(item.district) == 'number' ) ? [item.district] : item.district;
				let allowable = false;

				for(let test of facingTests) {
					if( query.district == test ) {
						allowable = true;
					}
				}

				if( !allowable ) {
					continue;
				}
			}

			matches.push(name);
		}

		return matches;
	}

	function _seedShantytownsV7(mapGrid) {
		// put seeds around building edges or sidewalk edges and grow. also add in inner-blocks
		// include barrels and car hulks with those buildings somehow
	}

	function _seedBlockadesV7(mapGrid) {
		// Barricaded streets (jersey barricades + barrels + car hulks + police barricades)
		// Street grid might be unnecessary. Just go off of street or sidewalk edges
		// form a snaking line or barricades, then add other items

		mapGrid.eachPoint(function(point, x, y, self) {
			if( point ) {
				let dataPoint = mapGrid.getDataPoint(x, y);

				if( dataPoint.zone != 'blockade' ) {
					self.setPoint(x, y, 0);
				}
			}
		});

		mapGrid.setHexValues(false, false).growPoints(false, 100).growPoints(false, 100).eachPoint(function(point, x, y, self) {
			if( point ) {
				_insertDataPointValue(self, x, y, 'zone', 'blockade');
			} else {
				self.setPoint(x, y, 1);
			}
		});

		mapGrid.addFilter(function(point, x, y) {
			if( point ) {
				let dataPoint = mapGrid.getDataPoint(x, y);

				if( dataPoint.zone == 'blockade' ) {
					return point;
				}
			}

			return false;
		});

		mapGrid.setHexValues(false, false).eachPoint(function(point, x, y, self) {
			if( point ) {
				const MAX_LENGTH = 9;
				let metaPoint = self.getMetaPoint(x, y);

				if( metaPoint.type == 'edge' && Math.random() > 0.975 ) {
					let scanDir = {x: 0, y: 0};

					if( metaPoint.rotations == 0 ) {
						scanDir.y = -1;
					} else if( metaPoint.rotations == 1 ) {
						scanDir.x = 1;
					} else if( metaPoint.rotations == 2 ) {
						scanDir.y = 1;
					} else {
						scanDir.x = -1;
					}

					self.setPoint(x, y, 0);

					let testLength	= 0;
					let seedPoints	= [];

					scanLoop:
					for(let i = 0; i < MAX_LENGTH; i++) {
						let testCoords		= {x: x + i * scanDir.x, y: y + i * scanDir.y};
						let testDataPoint	= self.getDataPoint(testCoords.x, testCoords.y);

						if( !testDataPoint.solid ) {
							seedPoints.push(testCoords);
						} else {
							break scanLoop;
						}

						// TODO: if more than halfway, chance to zig-zag a little
					}

					if( seedPoints.length > 1 ) {
						seedPoints.forEach(function(seedPoint) {
							_insertDataPointValue(self, seedPoint.x, seedPoint.y, 'temp', true);
						});
					}

					self.setPoint(x, y, 1);
				}
			}
		});

		mapGrid.addFilter(function(point, x, y) {
			if( point ) {
				let dataPoint = mapGrid.getDataPoint(x, y);

				if( dataPoint.temp ) {
					return point;
				}
			}

			return false;
		});

		mapGrid.setHexValues('barricades', false).eachPoint(function(point, x, y, self) {
			if( point ) {
				let metaPoint	= self.getMetaPoint(x, y);
				let dataPoint	= self.getDataPoint(x, y);
				let yAdjust	= dataPoint.type == 'sidewalk' ? -7 : 0;
				let nameAddon	= '';

				if( metaPoint.type == 'pipe' ) {
					let num = Math.floor( Math.random() * 3 ); // three variations

					nameAddon = '-v' + num;
				}

				_insertDataPointValue(self, x, y, 'temp', false);
				_loadMapActorData(self, x, y, `concrete-barricade-${metaPoint.type}-${metaPoint.rotations}${nameAddon}`, 'obstacle', null, {x: 0, y: yAdjust});
				_insertDataPointValue(self, x, y, 'marker', true);
			}
		});
	}

	function _seedTrussesV7(intersectionGrid, mapGrid) {
		let gridOffset = {x: -5, y: -5};

		intersectionGrid.eachPoint(function(point, x, y) {
			let data = intersectionGrid.getDataPoint(x, y);
			let basePoint = {
				x:	data.base.x,
				y:	data.base.y,
			};

			let leftNghbrData	= intersectionGrid.getDataPoint(x - 1, y);
			let rightNghbrData	= intersectionGrid.getDataPoint(x + 1, y);
			let upNghbrData	= intersectionGrid.getDataPoint(x, y - 1);
			let downNghbrData	= intersectionGrid.getDataPoint(x, y + 1);
			let rightDistX		= Constants.MAP_BLOCK_WIDTH - data.offset.x;
			let rightDistY		= 0;
			let downDistX		= 0;
			let downDistY		= Constants.MAP_BLOCK_HEIGHT - data.offset.y;

			if( rightNghbrData ) {
				rightDistX = rightNghbrData.base.x - data.base.x;
				rightDistY = rightNghbrData.base.y - data.base.y;

				// Connect nearby points if they'd be extremely close
				if( data.straight.x && Math.abs(rightDistY) < 4 ) {
					data.straight.x = false;
				}
			}
			if( downNghbrData ) {
				downDistX = downNghbrData.base.x - data.base.x;
				downDistY = downNghbrData.base.y - data.base.y;

				// Connect nearby points if they'd be extremely close
				if( data.straight.y && Math.abs(downDistX) < 4 ) {
					data.straight.y = false;
				}
			}
			if( !data.empty.x ) {
				let baseAdj = 0;

				if( data.straight.x ) {
					for(let i = 0 - baseAdj; i < rightDistX; i++) {
						_loadMapTruss(mapGrid, data.base.x + i + gridOffset.x, data.base.y + gridOffset.y, true);
					}
				} else if( rightNghbrData ) {
					let halfWayX = Math.round(rightDistX / 2);

					for(let i = 0 - baseAdj; i < rightDistX; i++) {
						let baseY = data.base.y;

						if( i > halfWayX ) {
							baseY = rightNghbrData.base.y;
						}

						_loadMapTruss(mapGrid, data.base.x + i + gridOffset.x, baseY + gridOffset.y, true);
					}

					let startY = ( data.base.y < rightNghbrData.base.y ) ? data.base.y : rightNghbrData.base.y;

					rightDistY = Math.abs(rightDistY);

					// Perpendicular section
					for(let i = 0; i <= rightDistY; i++) {
						_loadMapTruss(mapGrid, data.base.x + halfWayX + gridOffset.x, startY + i + gridOffset.y, true);
					}
				}
			}
			if( !data.empty.y ) {
				let baseAdj = 0;

				if( data.straight.y ) {
					for(let i = 0 - baseAdj; i < downDistY; i++) {
						_loadMapTruss(mapGrid, data.base.x + gridOffset.x, data.base.y + i + gridOffset.y, true);
					}
				} else if( downNghbrData ) {
					let halfWayY = Math.round(downDistY / 2);

					for(let i = 0 - baseAdj; i < downDistY; i++) {
						let baseX = data.base.x;

						if( i > halfWayY ) {
							baseX = downNghbrData.base.x;
						}

						_loadMapTruss(mapGrid, baseX + gridOffset.x, data.base.y + i + gridOffset.y, true);
					}

					let startX = ( data.base.x < downNghbrData.base.x ) ? data.base.x : downNghbrData.base.x;

					downDistX = Math.abs(downDistX);

					// Perpendicular section
					for(let i = 0; i <= downDistX; i++) {
						_loadMapTruss(mapGrid, startX + i + gridOffset.x, data.base.y + halfWayY + gridOffset.y, true);
					}
				}
			}
		});

		// make additions
		// some are cantilevered sections. some are offset portions connected to larger truss


		// seed shadows in place, then seed trusses at -2/-3 Y
	}

	function _seedFencingV7(mapGrid) {
		mapGrid.addFilter(function(point, x, y) {
			if( point ) {
				let dataPoint = mapGrid.getDataPoint(x, y);

				if( dataPoint.type == 'sidewalk' && dataPoint.subtype == 'building' ) {
					return point;
				}
			}

			return false;
		});

		mapGrid.setHexValues(false, false).eachPoint(function(point, x , y, self) {
			const MAX_LENGTH = 3;

			if( point ) {
				let metaPoint = self.getMetaPoint(x, y);

				if( metaPoint.type == 'edge' ) {
					let orientation;
					let extending	= true;
					let blocked	= false;
					let abort		= false;
					let seedPoints	= [];
					let scanDirs	= {x: 0, y: 0};

					if( metaPoint.rotations == 0 ) {
						scanDirs.y	= 1;
						orientation	= 'vertical';
					} else if( metaPoint.rotations == 1 ) {
						scanDirs.x	= -1;
						orientation	= 'horizontal';
					} else if( metaPoint.rotations == 2 ) {
						scanDirs.y	= -1;
						orientation	= 'vertical';
					} else {
						scanDirs.x	= 1;
						orientation	= 'horizontal';
					}

					while( extending && seedPoints.length <= MAX_LENGTH ) {
						let testLength	= seedPoints.length + 1;
						let testCoords	= {x: x + scanDirs.x * testLength, y: y + scanDirs.y * testLength};
						let testPoint	= self.getPoint(testCoords.x, testCoords.y);

						if( testPoint ) {
							let testDataPoint = self.getDataPoint(testCoords.x, testCoords.y);

							if( !testDataPoint.solid && testDataPoint.type == 'sidewalk' ) {
								// Check that adjacent tiles are free also
								let adjData1;
								let adjData2;

								if( orientation == 'vertical' ) {
									// Check left/right
									adjData1 = self.getDataPoint(testCoords.x - 1, testCoords.y);
									adjData2 = self.getDataPoint(testCoords.x + 1, testCoords.y);
								} else {
									// Check up/down
									adjData1 = self.getDataPoint(testCoords.x, testCoords.y - 1);
									adjData2 = self.getDataPoint(testCoords.x, testCoords.y + 1);
								}

								if( adjData1 && adjData2 && !adjData1.solid && !adjData2.solid ) {
									seedPoints.push(testCoords);
								} else {
									abort = true;
									extending = false;
								}
							} else {
								let testMetaPoint = self.getMetaPoint(testCoords.x, testCoords.y);

								if( testDataPoint.subtype == 'building' && testMetaPoint.type == 'edge' ) {
									blocked = true;
								} else {
									abort = true;
								}

								extending = false;
							}
						} else {
							abort = true;
							extending = false;
						}
					}

					if( seedPoints.length > 0 && blocked && !abort ) {
						if( Math.random() > 0.8 ) {
							// TODO: determine fencing type
							seedPoints.forEach(function(seedPoint) {
								_insertDataPointValue(self, seedPoint.x, seedPoint.y, 'subtype', 'fencing');
								_insertDataPointValue(self, seedPoint.x, seedPoint.y, 'solid', true);
								// TODO: utilize "orientation" to set correct fence pieces
								// TODO: Seed actor data
							});
						}
					}
				}
			}
		});
	}

	function _printMap(map) {
		let dims = map.getDimensions();
		let colorKey = {
			'crosswalk':		'#57b46b',
			'intersection':	'#593988',
			'street':			'#34386a',
			'default':		'#000000',
		};

		let htmlMap;

		if( !fs.existsSync('z_htmlMap.html') ) {
			fs.createWriteStream('z_htmlMap.html');
		}

		htmlMap = fs.openSync('z_htmlMap.html', 'w');

		fs.writeSync(htmlMap, '<html><header><title>Visual Map</title><style type="text/css">body { width: 3000px; } .box { width: 4px; height: 4px; float: left; }</style></header><body>');

		let output = '';

		map.eachPoint(function(point, x, y, thisGrid) {
			let hex = '';
			let dataPoint = thisGrid.getDataPoint(x, y);

			hex = colorKey['default'];

			if( !point ) {
				//log('---map rendering issue---');
			} else {
				if( dataPoint.type == 'building' && dataPoint.subtype == 'wall' ) {
					hex = '#ffffff';
				} else if( dataPoint.type == 'building' && dataPoint.subtype == 'roof-top' ) {
					hex = '#ff7722';
				} else if( dataPoint.type == 'building' && dataPoint.subtype == 'floor' ) {
					hex = '#997722';
				} else if( dataPoint.highbldg ) {
					hex = '#ff4433';
				} else if( dataPoint.medbldg ) {
					hex = '#ff8855';
				} else if( dataPoint.zone && false ) {
					hex = '#ffffbb';
				} else if( dataPoint.marker ) {
					hex = '#44ccaa';
				} else if( dataPoint.type == 'guard-rail' ) {
					hex = '#e272f3';
				} else if( dataPoint.type == 'sidewalk' ) {
					hex = '#66668f';

					if( dataPoint.district == 1 ) {
						hex = '#ff9999';
					}
					if( dataPoint.district == 2 ) {
						hex = '#ffce9f';
					}
					if( dataPoint.district == 3 ) {
						hex = '#e1ff9f';
					}
					if( dataPoint.district == 4 ) {
						hex = '#9fffaf';
					}
					if( dataPoint.district == 5 ) {
						hex = '#9ffff5';
					}
					if( dataPoint.district == 6 ) {
						hex = '#d19fff';
					}

					if( dataPoint.subtype == 'small-traffic-sign' ) {
						hex = '#bd6449';
					} else if( dataPoint.subtype == 'medium-traffic-sign' ) {
						hex = '#ff7e00';
					} else if( dataPoint.subtype == 'large-traffic-sign' ) {
						hex = '#ff3c00';
					} else if( dataPoint.subtype == 'building' ) {
						hex = '#9e867d';
					} else if( dataPoint.subtype == 'building-2' ) {
						hex = '#889aa0';
					} else if( dataPoint.subtype == 'building-3' ) {
						hex = '#85838b';
					} else if( dataPoint.subtype == 'fencing' ) {
						hex = '#d07733';
					}
				} else if( dataPoint.type == 'building' ) {
					hex = '#86a5b0';

					if( dataPoint.subtype == '2' ) {
						hex = '#889aa0';
					}
					if( dataPoint.subtype == '3' ) {
						hex = '#85838b';
					}
					if( dataPoint.subtype == '4' ) {
						hex = '#9e867d';
					}
					if( dataPoint.subtype == '5' ) {
						hex = '#84a499';
					}
				} else if( dataPoint.type == 'street' ) {
					if( dataPoint.subtype == 'intersection' ) {
						hex = colorKey['intersection'];
					} else if( dataPoint.subtype == 'crosswalk' ) {
						hex = colorKey['crosswalk'];
					} else if( dataPoint.subtype == 'yield' ) {
						hex = '#999900';
					} else if( dataPoint.subtype == 'median' ) {
						hex = '#464da2';
					} else if( dataPoint.subtype == 'median-object' ) {
						hex = '#4ae2d9';
					} else {
						hex = colorKey['street'];

						if( dataPoint.width == 1 ) {
							hex = '#615083';
						}
						if( dataPoint.width == 3 ) {
							hex = '#2c2f51';
						}
					}
				}
				if( dataPoint.truss ) {
					hex = '#282624'
				}
			}

			output += '<div class="box" style="background: ' + hex + ';"></div>';

			if( x == dims.width - 1 ) {
				fs.writeSync(htmlMap, output + '<div style="float:left;clear:both;height:0;width:0;"></div>');
				output = '';
			}
		});

		fs.writeSync(htmlMap, '</body></html>');
		fs.closeSync(htmlMap);
		log('HTML Visual Map written.');
	}
};
