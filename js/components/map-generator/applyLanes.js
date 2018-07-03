let mapAccess = require('./map-access');

module.exports = function(intersectionGrid, mapGrid) {
	const GRID_X_OFFSET = -Constants.MAP_BLOCK_SIZE;
	const GRID_Y_OFFSET = -Constants.MAP_BLOCK_SIZE;
	let bldgIndex = 0;

	intersectionGrid.eachPoint(function(point, x, y) {
		let data			= intersectionGrid.getDataPoint(x, y);
		let stamped		= false;
		let stampPointsX	= [];
		let stampPointsY	= [];

		// Find top-left corner to insert building ID value
		let cornerOffset = {x: 2, y: 2}; // {x: 1, y: 1}

		if( data.width.y > 1 ) {
			cornerOffset.x++;
		}
		if( data.width.x > 1 ) {
			cornerOffset.y++;
		}

		mapAccess.insertDataPointValue(mapGrid, data.base.x + cornerOffset.x + GRID_X_OFFSET, data.base.y + cornerOffset.y + GRID_Y_OFFSET, 'buildingID', bldgIndex++);

		while( !stamped ) {
			let basePoint = {
				x:	data.base.x,
				y:	data.base.y,
			};

			let leftNghbrData	= intersectionGrid.getDataPoint(x - 1, y);
			let rightNghbrData	= intersectionGrid.getDataPoint(x + 1, y);
			let upNghbrData	= intersectionGrid.getDataPoint(x, y - 1);
			let downNghbrData	= intersectionGrid.getDataPoint(x, y + 1);
			let rightDistX		= Constants.MAP_BLOCK_SIZE - data.offset.x;
			let rightDistY		= 0;
			let downDistX		= 0;
			let downDistY		= Constants.MAP_BLOCK_SIZE - data.offset.y;

			if( rightNghbrData ) {
				rightDistX = rightNghbrData.base.x - data.base.x;
				rightDistY = rightNghbrData.base.y - data.base.y;

				// Connect nearby points if they'd be extremely close
				/*
				if( data.straight.x && Math.abs(rightDistY) < 4 ) {
					data.straight.x = false;
				}
				*/
			}
			if( downNghbrData ) {
				downDistX = downNghbrData.base.x - data.base.x;
				downDistY = downNghbrData.base.y - data.base.y;

				// Connect nearby points if they'd be extremely close
				/*
				if( data.straight.y && Math.abs(downDistX) < 4 ) {
					data.straight.y = false;
				}
				*/
			}

			if( !data.empty.x ) {
				let baseAdj = 0;

				/*
				if( data.width.x > 2 ) {
					rightDistX++;

					if( (upNghbrData && upNghbrData.width.y > 2) || data.width.y > 2 ) {
						baseAdj = 1;
					}
					if( rightNghbrData && rightNghbrData.width.y > 1 ) {
						rightDistX++;
					}
				}
				*/
				if( data.straight.x ) {
					for(let i = 0 - baseAdj; i < rightDistX; i++) {
						stampPointsX.push({x: data.base.x + i, y: data.base.y});

						if( data.width.x > 1 ) {
							//stampPointsX.push({x: data.base.x + i, y: data.base.y + 1});
						}
						if( data.width.x > 2 ) {
							//stampPointsX.push({x: data.base.x + i, y: data.base.y - 1});
						}
					}
				} else if( rightNghbrData ) {
					let halfWayX = Math.round(rightDistX / 2);

					for(let i = 0 - baseAdj; i < rightDistX; i++) {
						let baseY = data.base.y;

						if( i > halfWayX ) {
							baseY = rightNghbrData.base.y;
						}

						stampPointsX.push({x: data.base.x + i, y: baseY});

						if( data.width.x > 1 ) {
							stampPointsX.push({x: data.base.x + i, y: baseY + 1});
						}
						if( data.width.x > 2 ) {
							stampPointsX.push({x: data.base.x + i, y: baseY - 1});
						}
					}

					let startY = ( data.base.y < rightNghbrData.base.y ) ? data.base.y : rightNghbrData.base.y;

					rightDistY = Math.abs(rightDistY);

					// Perpendicular section
					if( data.width.x > 1 ) {
						rightDistY += 1;
					}
					if( data.width.x > 2 ) {
						startY -= 1;
						rightDistY += 1;
					}

					for(let i = 0; i <= rightDistY; i++) {
						stampPointsX.push({x: data.base.x + halfWayX, y: startY + i});

						if( data.width.x > 1 ) {
							stampPointsX.push({x: data.base.x + halfWayX + 1, y: startY + i});
						}
						if( data.width.x > 2 ) {
							stampPointsX.push({x: data.base.x + halfWayX - 1, y: startY + i});
						}
					}
				}
			}

			if( !data.empty.y ) {
				let baseAdj = 0;

				/*
				if( data.width.y > 2 ) {
					downDistY++;
				}
				if( downNghbrData && downNghbrData.width.x > 1 ) {
					downDistY++;
				}
				*/
				if( data.straight.y ) {
					for(let i = 0 - baseAdj; i < downDistY; i++) {
						stampPointsY.push({x: data.base.x, y: data.base.y + i});

						if( data.width.y > 1 ) {
							//stampPointsY.push({x: data.base.x + 1, y: data.base.y + i});
						}
						if( data.width.y > 2 ) {
							//stampPointsY.push({x: data.base.x - 1, y: data.base.y + i});
						}
					}
				} else if( downNghbrData ) {
					let halfWayY = Math.round(downDistY / 2);

					for(let i = 0 - baseAdj; i < downDistY; i++) {
						let baseX = data.base.x;

						if( i > halfWayY ) {
							baseX = downNghbrData.base.x;
						}

						stampPointsY.push({x: baseX, y: data.base.y + i});

						if( data.width.y > 1 ) {
							stampPointsY.push({x: baseX + 1, y: data.base.y + i});
						}
						if( data.width.y > 2 ) {
							stampPointsY.push({x: baseX - 1, y: data.base.y + i});
						}
					}

					let startX = ( data.base.x < downNghbrData.base.x ) ? data.base.x : downNghbrData.base.x;

					downDistX = Math.abs(downDistX);

					// Perpendicular section
					if( data.width.y > 1 ) {
						downDistX += 1;
					}
					if( data.width.y > 2 ) {
						startX -= 1;
						downDistX += 1;
					}

					for(let i = 0; i <= downDistX; i++) {
						stampPointsY.push({x: startX + i, y: data.base.y + halfWayY});

						if( data.width.y > 1 ) {
							stampPointsY.push({x: startX + i, y: data.base.y + halfWayY + 1});
						}
						if( data.width.y > 2 ) {
							stampPointsY.push({x: startX + i, y: data.base.y + halfWayY - 1});
						}
					}
				}
			}


			let shouldStamp = true;

			// Set intersections
			/*
			if( upNghbrData && !upNghbrData.empty.y && leftNghbrData && !leftNghbrData.empty.x && !data.empty.x && !data.empty.y ) {
				let upGrid	= new Grid(3, 3, {data: false, meta: false, scratch: false});
				let downGrid	= new Grid(3, 3, {data: false, meta: false, scratch: false});
				let leftGrid	= new Grid(3, 3, {data: false, meta: false, scratch: false});
				let rightGrid	= new Grid(3, 3, {data: false, meta: false, scratch: false});

				if( upNghbrData && !upNghbrData.empty.y ) {
					upGrid.setPoint(1, 0, 1);
					upGrid.setPoint(1, 1, 1);

					if( upNghbrData.width.y > 1 ) {
						upGrid.setPoint(2, 0, 1);
						upGrid.setPoint(2, 1, 1);

						if( upNghbrData.width.y > 2 ) {
							upGrid.setPoint(0, 0, 1);
							upGrid.setPoint(0, 1, 1);
						}
					}
				}

				if( leftNghbrData && !leftNghbrData.empty.x ) {
					leftGrid.setPoint(0, 1, 1);
					leftGrid.setPoint(1, 1, 1);

					if( leftNghbrData.width.x > 1 ) {
						leftGrid.setPoint(0, 2, 1);
						leftGrid.setPoint(1, 2, 1);

						if( leftNghbrData.width.x > 2 ) {
							leftGrid.setPoint(0, 0, 1);
							leftGrid.setPoint(1, 0, 1);
						}
					}
				}

				if( !data.empty.x ) {
					rightGrid.setPoint(1, 1, 1);
					rightGrid.setPoint(2, 1, 1);

					if( data.width.x > 1 ) {
						rightGrid.setPoint(1, 2, 1);
						rightGrid.setPoint(2, 2, 1);

						if( data.width.x > 2 ) {
							rightGrid.setPoint(1, 0, 1);
							rightGrid.setPoint(2, 0, 1);
						}
					}
				}

				if( !data.empty.y ) {
					downGrid.setPoint(1, 1, 1);
					downGrid.setPoint(1, 2, 1);

					if( data.width.y > 1 ) {
						downGrid.setPoint(2, 1, 1);
						downGrid.setPoint(2, 2, 1);

						if( data.width.y > 2 ) {
							downGrid.setPoint(0, 1, 1);
							downGrid.setPoint(0, 2, 1);
						}
					}
				}

				// Check that all four corners of an intersection are actually sidewalks
				let finalIntersectionCoords	= [];
				let shouldSetIntersection	= true;
				let overlapGrid			= new Grid(3, 3);

				upGrid.eachPoint(function(point, x, y) {
					let hits = 0;

					[upGrid, downGrid, leftGrid, rightGrid].forEach(function(grid) {
						if( grid.getPoint(x, y) ) {
							hits++;
						}
					});

					if( hits >= 2 ) {
						let coords = {
							x:	basePoint.x + x - 1 + GRID_X_OFFSET,
							y:	basePoint.y + y - 1 + GRID_Y_OFFSET,
						}
						finalIntersectionCoords.push({x: coords.x, y: coords.y});

						overlapGrid.setPoint(x, y, 1);
						overlapGrid.setDataPoint(x, y, {x: coords.x, y: coords.y});
					}
				});

				overlapGrid.setHexValues().eachPoint(function(overlapPoint, x, y, self) {
					if( overlapPoint ) {
						let overlapMetaPoint = self.getMetaPoint(x, y);

						if( overlapMetaPoint.type == 'corner' ) {
							let testCoords = {x: 1, y: 1};
							let overlapDataPoint = self.getDataPoint(x, y);

							if( overlapMetaPoint.rotations == 0 ) {

							} else if( overlapMetaPoint.rotations == 1 ) {
								testCoords.y = -1;
							} else if( overlapMetaPoint.rotations == 2 ) {
								testCoords.x = -1;
								testCoords.y = -1;
							} else {
								testCoords.x = -1;
							}

							let testDataPoint = self.getDataPoint(overlapDataPoint.x + testCoords.x, overlapDataPoint.y + testCoords.y);

							if( testDataPoint.type != 'sidewalk' && testDataPoint.type != 'guard-rail' ) {
								shouldSetIntersection = true;

								return true;
							}
						}
					}
				});

				if( shouldSetIntersection ) {
					finalIntersectionCoords.forEach(function(coord) {
						//mapAccess.loadMapType(mapGrid, coord.x, coord.y, 'lane'); // 'street'
						//mapAccess.loadMapSubType(mapGrid, coord.x, coord.y, 'intersection');

						//mapAccess.insertDataPointValue(mapGrid, coord.x, coord.y, 'type', 'lane');
						//mapAccess.insertDataPointValue(mapGrid, coord.x, coord.y, 'laneType', 'street');
					})
				} else {
					log('intersection discarded');
				}
			}
			*/

			/*
			// Check if points and neighborpoints are not already streets
			stampPointsX.forEach(function(stampPoint) {
				var testDataPoint = mapGrid.getDataPoint(stampPoint.x, stampPoint.y);

				if( testDataPoint.type == 'street' && testDataPoint.subtype != 'intersection' ) {
					//shouldStamp = false;
				}
			});
			stampPointsY.forEach(function(stampPoint) {
				var testDataPoint = mapGrid.getDataPoint(stampPoint.x, stampPoint.y);

				if( testDataPoint.type == 'street' && testDataPoint.subtype != 'intersection' ) {
					//shouldStamp = false;
				}
			});
			*/

			if( shouldStamp ) {
				stampPointsX.forEach(function(stampPoint) {
					mapAccess.loadMapType(mapGrid, stampPoint.x + GRID_X_OFFSET, stampPoint.y + GRID_Y_OFFSET, 'lane'); // 'street'

					if( data.zone.x ) {
						mapAccess.insertDataPointValue(mapGrid, stampPoint.x + GRID_X_OFFSET, stampPoint.y + GRID_Y_OFFSET, 'zone', data.zone.x);
					}
					if( data.type.x ) {
						mapAccess.insertDataPointValue(mapGrid, stampPoint.x + GRID_X_OFFSET, stampPoint.y + GRID_Y_OFFSET, 'laneType', data.type.x);
					}
				});

				stampPointsY.forEach(function(stampPoint) {
					mapAccess.loadMapType(mapGrid, stampPoint.x + GRID_X_OFFSET, stampPoint.y + GRID_Y_OFFSET, 'lane'); // 'street'

					if( data.zone.y ) {
						mapAccess.insertDataPointValue(mapGrid, stampPoint.x + GRID_X_OFFSET, stampPoint.y + GRID_Y_OFFSET, 'zone', data.zone.y);
					}
					if( data.type.y ) {
						mapAccess.insertDataPointValue(mapGrid, stampPoint.x + GRID_X_OFFSET, stampPoint.y + GRID_Y_OFFSET, 'laneType', data.type.y);
					}
				});
				/*
				log('------------')
				log(stampPointsX);
				log('Y');
				log(stampPointsY);
				*/

				/*
				[...stampPointsX, ...stampPointsY].forEach(function(stampPoint) {
					_loadMapType(mapGrid, stampPoint.x + GRID_X_OFFSET, stampPoint.y + GRID_Y_OFFSET, 'street');
				});
				*/

				stamped = true;
			} else {
				/*
				stampPointsX = [];
				stampPointsY = [];

				// Adjust data
				data.base.x += -data.offset.x;
				data.base.y += -data.offset.y;

				data.offset.x = 0;
				data.offset.y = 0;

				//data.straight.x = true;
				//data.straight.y = true;

				//data.empty.x = true;
				//data.empty.y = true;
				*/
			}
		} // end while
	});
};
