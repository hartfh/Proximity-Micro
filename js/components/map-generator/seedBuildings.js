let mapAccess = require('./map-access');

module.exports = function(bldgList, mapGrid) {
	for(let i in bldgList) {
		let data = bldgList[i];
		seedBuilding(data);
	}
	log('done seed all buildings');

	function seedBuilding(data) {
		let bldgGrid = new Grid(data.width, data.height, {scratch: false});

		data.points.forEach(function(point, index) {
			bldgGrid.setPoint(point.x - data.min.x, point.y - data.min.y, 1);
		});

		//seedWalls();
		//seedInterior();

		// facade
		// roof
	}

	function seedWalls() {
		bldgGrid.setHexValues().addFilter(function(point, x, y) {
			let metaPoint = mapGrid.getMetaPoint(x, y);

			if( metaPoint.type == 'inside' ) {
				return false;
			}

			return point;
		});

		// TODO: seed partitions and room walls

		bldgGrid.setHexValues(false, false).eachPoint(function(point, x, y, self) {
			if( point ) {
				let metaPoint = self.getMetaPoint(x, y);

				// wall
			}
		});
	}

	function seedInterior() {
		bldgGrid.addFilter(function(point, x, y) {
			let metaPoint = mapGrid.getMetaPoint(x, y);

			if( metaPoint.type == 'inside' ) {
				return point;
			}

			return false;
		});

		bldgGrid.setHexValues(false, false).eachPoint(function(point, x, y, self) {
			if( point ) {
				let metaPoint = self.getMetaPoint(x, y);

				// floorspace
			}
		});
	}
};
