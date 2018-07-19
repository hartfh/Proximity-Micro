var Matter		= require('matter-js');
var electron		= require('electron');
var ipc			= electron.ipcRenderer;
const fs				= require('fs');
const Datastore		= require('nedb');
const MaxRectsPacker	= require('maxrects-packer');
const THREE			= require('three');

// NOTE: Temp, but don't move
var log = function(data) {
	ipc.send('display', data);
};

var Constants		= require('./js/constants');
var Utilities		= require('./js/utilities/utilities');
var Data			= require('./js/data/data');
var List			= require('./js/classes/List');
var Grid			= require('./js/classes/Grid');
var Compass		= require('./js/classes/Compass');
var AsynchChecker	= require('./js/classes/AsynchTasksChecker');

var RenderLayer	= require('./js/classes/RenderLayer');

var Game			= require('./js/components/game');

var ItemFactory	= require('./js/classes/ItemFactory');
var TerrainFactory	= require('./js/classes/TerrainFactory');
var DoodadFactory	= require('./js/classes/DoodadFactory');
var Troupe		= require('./js/classes/Troupe');
var TroupeFactory	= require('./js/classes/TroupeFactory');
var Actor			= require('./js/classes/Actor');
var ActorFactory	= require('./js/classes/ActorFactory');
var EffectsFactory	= require('./js/classes/EffectsFactory');
var TextFactory	= require('./js/classes/TextFactory');

/////// TEMPORARY for map testing ///////
var MapFactory	= require('./js/classes/MapFactory');
var TilesetFilters = require('./js/data/tileset-filters');
var Tilesets = require('./js/data/tilesets');
/////// TEMPORARY ///////


setInterval(function() {
	log('-tick-');
}, 1000);
setTimeout(function() {
	setInterval(function() {
		log('-tock-');
		if( Game.Player.getTroupe() ) {
			//log(Game.Player.getTroupe().getLead().spriteMode)
			//log(Game.Player.getTroupe().getSpriteModes());
			log('---------------');
			log( Game.Player.getTroupe().eachActor(function(actor) {
				log(actor.body.actorType + ': ' + actor.spriteMode);
				log(actor.attackingAlt);
				log(actor.movingAlt);
				log('--');
			}) );
		}
	}, 1000);
}, 500);


//Game.ImageConverter.encode();
Game.start();
