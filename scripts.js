/**
 * Scripts
 */


/* KGraph */

function KGraph($kgraph, useOnionSkin, onionSkinDepth) {
	this.$kgraph = $kgraph;
	this.$canvasWrapper = $kgraph.find('#canvas-wrapper');
	this.$color = $kgraph.find('.color');

	this.useOnionSkin = useOnionSkin;
	this.onionSkinDepth = onionSkinDepth;
	
	this.settings = {
		strokeStyle: '#000',
		lineWidth: 1,
		lineCap: 'round',
		globalCompositeOperation: 'source-over'
	};

	this.brushes = [
		[1, 'url(images/brushes/4.png) 2 2, pointer'],
		[2, 'url(images/brushes/8.png) 4 4, pointer'],
		[3, 'url(images/brushes/12.png) 6 6, pointer'],
		[4, 'url(images/brushes/16.png) 8 8, pointer'],
		[6, 'url(images/brushes/24.png) 12 12, pointer'],
		[8, 'url(images/brushes/32.png) 16 16, pointer'],
		[12, 'url(images/brushes/48.png) 24 24, pointer'],
		[16, 'url(images/brushes/64.png) 32 32, pointer'],
		[24, 'url(images/brushes/96.png) 48 48, pointer']
	];

	this.brushNo = 0;
	
	this.layers = [];
	this.activeLayer = null;
	this.frameIndex = 0;

	this.onionSkinLayers = [];


	/* Events */
	var me = this;

	me.$color.on('click', function(e) {
		var color = $(this).css('background-color');
		if (color) {
			me.changeColor(color);
		}
		else {
			me.changeColor('eraser');
		}
	});

	me.$canvasWrapper.on('mousewheel DOMMouseScroll', function(e) {
		if (e.originalEvent.wheelDelta > 0 || e.originalEvent.detail < 0) {
			me.changeBrushSize(me.brushNo + 1);
		}
		else {
			me.changeBrushSize(me.brushNo - 1);
		}
	});

	$(document).on('keydown', function(e) {
		me.handleKeypress(e.metaKey, e.which);
	});

	$(document).on('click', '.add-cel', function() {
		var layerIndex = $(this).index('.add-cel');
		me.addFrame(layerIndex);
	});

	$(document).on('click', '.cel', function() {
		var frameIndex = $(this).index();
		me.changeFrame(frameIndex);
	});
}

KGraph.prototype.addLayer = function(index, $canvas, $layer) {
	var newLayer = new KGraph.TimelineLayer(index, $canvas, $layer, this.settings);
	this.layers.push(newLayer);
	this.changeLayer(index);
};

KGraph.prototype.changeLayer = function(index) {
	if (this.activeLayer) {
		this.activeLayer.deactivate();
		this.activeLayer.refreshSettings(this.settings);
	}
	this.activeLayer = this.layers[index];
};

KGraph.prototype.changeColor = function(color) {
	if (color === 'eraser') {
		this.settings.globalCompositeOperation = 'destination-out';
	}
	else {
		this.settings.globalCompositeOperation = 'source-over';
		this.settings.strokeStyle = color;
	}
	this.activeLayer.refreshSettings(this.settings);
};

KGraph.prototype.changeBrushSize = function(n) {
	if (n >= 0 && n < this.brushes.length) {
		this.brushNo = n;
		var brush = this.brushes[n];

		this.settings.lineWidth = brush[0];
		this.activeLayer.refreshSettings(this.settings);

		this.$canvasWrapper.css('cursor', brush[1]);
	}
};

KGraph.prototype.handleKeypress = function(metaKey, key) {
	if (metaKey) {
		// ctrl + z
		if (key === 90) {
			this.activeLayer.brushDown = false;
			this.activeLayer.undo();
		}

		// ctrl + x
		else if (key === 88) {
			this.activeLayer.clear();
		}
	}

	// left arrow
	if (key === 37 && this.frameIndex > 0) {
		this.changeFrame(this.frameIndex - 1);
	}

	// right arrow
	else if (key === 39 && this.frameIndex < this.activeLayer.cels.length - 1) {
		this.changeFrame(this.frameIndex + 1);
	}
}

KGraph.prototype.changeFrame = function(frameIndex) {
	this.layers.forEach(function(layer) {
		layer.switchCel(frameIndex);
	});
	this.frameIndex = frameIndex;
}

KGraph.prototype.addFrame = function(layerIndex) {
	var layer = this.layers[layerIndex];
	layer.addCel();
	this.frameIndex = layer.cels.length - 1;
	this.changeFrame(this.frameIndex);
}


/* KGraph.KCanvas */

KGraph.KCanvas = function(index, $canvas, settings) {
	this.index = index;
	this.$canvas = $canvas;
	this.offset = $canvas ? $canvas.offset() : null;
	this.canvas = $canvas ? $canvas[0] : null;
	this.ctx = $.extend(canvas.getContext('2d'), settings);
	this.active = true;
}

KGraph.KCanvas.prototype.clear = function() {
	this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
};

KGraph.KCanvas.prototype.drawCel = function(imageData) {
	this.clear();
	this.ctx.putImageData(imageData, 0, 0);
};

KGraph.KCanvas.prototype.deactivate = function() {
	if (this.active) {
		this.active = false;
		this.$canvas.removeClass('active');
	}
}

KGraph.KCanvas.prototype.activate = function() {
	if (!this.active) {
		this.active = true;
		this.$canvas.addClass('active');
	}
}

/* KGraph.TimelineLayer */

KGraph.TimelineLayer = function(index, $canvas, $layer, settings) {
	KGraph.KCanvas.call(this, index, $canvas, settings);
	this.cels = [];
	this.$layer = $layer;		// DOM cels
	this.celIndex = 0;
	this.hidden = false;
	this.brushDown = false;
	this.cachedStates = [];

	// add first cel
	var firstCel = this.ctx.createImageData(this.canvas.width, this.canvas.height);
	this.cels.push(firstCel);

	// Events
	var me = this;

	this.$canvas
		.on('click', function(e) {
			me.startStroke(e.pageX, e.pageY);
		})
		.on('mousemove', function(e) {
			me.strokeSegment(e.pageX, e.pageY);
		})
		.on('dblclick', function() {
			me.closeStroke();
		});
}

KGraph.TimelineLayer.prototype = new KGraph.KCanvas();

KGraph.TimelineLayer.prototype.switchCel = function(targetIndex) {
	// Look for the target cel in memory and draw it if it exists
	var targetCel = this.cels[targetIndex];
	if (targetCel) {
		this.drawCel(this.cels[targetIndex]);
	}
	else {
		this.clear();
	}

	// Highlight the new cel if this is the active layer
	if (this.active) {
		var $cels = this.$layer.find('.cel');
		$cels.eq(this.celIndex).removeClass('active');
		$cels.eq(targetIndex).addClass('active');
	}

	this.celIndex = targetIndex;
};

KGraph.TimelineLayer.prototype.addCel = function() {
	var newCel = this.ctx.createImageData(this.canvas.width, this.canvas.height);
	this.cels.push(newCel);

	var $lastCel = this.$layer.find('.cel').last();
	var $newCel = $lastCel.clone(true);
	$lastCel.after($newCel);
}

KGraph.TimelineLayer.prototype.cacheState = function() {
	this.cachedStates.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
};

KGraph.TimelineLayer.prototype.clearCache = function() {
	this.cachedStates = [];
}

KGraph.TimelineLayer.prototype.undo = function() {
	if (this.cachedStates.length > 0) {
		var state = this.cachedStates.pop();
		this.ctx.putImageData(state, 0, 0);	
	}
}

KGraph.TimelineLayer.prototype.startStroke = function(pageX, pageY) {
	if (!this.brushDown) {
		this.brushDown = true;
		this.ctx.beginPath();
		this.ctx.moveTo(pageX - this.offset.left, pageY - this.offset.top);
	}
	this.cacheState();
};

KGraph.TimelineLayer.prototype.strokeSegment = function(pageX, pageY) {
	if (this.brushDown) {
		var x = pageX - this.offset.left;
		var y = pageY - this.offset.top;
		this.ctx.lineTo(x, y);
		this.ctx.stroke();
	}
};

KGraph.TimelineLayer.prototype.closeStroke = function() {
	this.ctx.stroke();
	this.cachedStates.splice(-2, 2);
	this.brushDown = false;
	this.saveCel();	
};

KGraph.TimelineLayer.prototype.refreshSettings = function(settings) {
	$.extend(this.ctx, settings);
};

KGraph.TimelineLayer.prototype.saveCel = function() {
	var cel = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
	this.cels[this.celIndex] = cel;
}




$(document).ready(function() {

	initializeCanvas();

});


function initializeCanvas() {
	"use strict";

	// Read onion skin settings from page
	if ($('#onion-skin')[0].checked) {
		var useOnionSkin = true;
	}
	else {
		var useOnionSkin = false;
	}

	var onionSkinDepth = 1;

	// Initialize new KGraph object and add canvas layers 
	var $kgraph = $('#kgraph');
	var kg = new KGraph($kgraph, useOnionSkin, onionSkinDepth);

	var $canvas = $('#canvas');
	var $layer = $('.layer').first();
	kg.addLayer(0, $canvas, $layer);
}










