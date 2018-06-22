let mapAccess = require('./map-access');

module.exports = function(mapGrid) {
	///// TEMPORARY
	mapGrid.eachPoint(function(point, x, y, self) {
		if( point ) {
			let dataPoint = self.getDataPoint(x, y);

			if( dataPoint.type == 'street' ) {
				mapAccess.insertDataPointValue(self, x, y, 'type', 'sidewalk');
			}
		}
	});

	// Seed actors
	mapGrid.addFilter(function(point, x, y) {
		if( point ) {
			let dataPoint = mapGrid.getDataPoint(x, y);

			if( dataPoint.type == 'sidewalk' ) {
				return point;
			}
		}

		return false;
	});

	mapGrid.setHexValues('simple13', false).eachPoint(function(point, x, y, self) {
		if( point ) {
			let dataPoint = self.getDataPoint(x, y);
			let metaPoint = self.getMetaPoint(x, y);

			// NOTE: need to deal with sidewalk tiles that don't yet exist

			mapAccess.loadMapActorData(self, x, y, `sidewalk-${dataPoint.district}`, 'doodad', metaPoint);
		}
	});

	mapGrid.clearFilter();
};
