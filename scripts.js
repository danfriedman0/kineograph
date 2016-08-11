/**
 * Scripts
 */


/* KGraph */

function KGraph($kgraph) {
	this.$kgraph = $kgraph;
	this.$canvasWrapper = $kgraph.find('#canvas-wrapper');
	this.$frameNumber = $kgraph.find('#frame-number');
	this.$playhead = $kgraph.find('#playhead');

	// Reset frameNumber
	this.$frameNumber.val('1');

	// Read onion skin settings from page
	if ($('#use-onion-skin')[0].checked) {
		this.useOnionSkin = true;
		this.$kgraph.find('.onion-skin-depth').attr('disabled', false);
	}
	else {
		this.useOnionSkin = false;
		this.$kgraph.find('.onion-skin-depth').attr('disabled', true);
	}

	var $osDepth = $('.onion-skin-depth');
	this.osDepthBack = $osDepth.first().val() * -1;
	this.osDepthForward = $osDepth.last().val();
	
	this.settings = {
		strokeStyle: '#000',
		lineWidth: 1,
		lineCap: 'round',
		globalCompositeOperation: 'source-over'
	};

	this.brushes = [
		[1, 'url(images/cursors/brushes/4.png) 2 2, pointer'],
		[2, 'url(images/cursors/brushes/8.png) 4 4, pointer'],
		[3, 'url(images/cursors/brushes/12.png) 6 6, pointer'],
		[4, 'url(images/cursors/brushes/16.png) 8 8, pointer'],
		[6, 'url(images/cursors/brushes/24.png) 12 12, pointer'],
		[8, 'url(images/cursors/brushes/32.png) 16 16, pointer'],
		[12, 'url(images/cursors/brushes/48.png) 24 24, pointer'],
		[16, 'url(images/cursors/brushes/64.png) 32 32, pointer'],
		[24, 'url(images/cursors/brushes/96.png) 48 48, pointer']
	];

	this.brushNo = 0;
	
	this.layers = [];
	this.activeLayer = null;
	this.currentFrameIndex = 0;
	this.lastFrameIndex = 0;

	this.onionSkins = [];


	/* Events */
	var me = this;

	$(document).on('keydown', function(e) {
		me.handleKeypress(e.metaKey, e.shiftKey, e.which);
	});

	/*** Brush settings */

	me.$kgraph.find('.color').on('click', function(e) {
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

	/*** Frame navigation */

	$(document).on('click', '.cel', function() {
		var newFrameIndex = $(this).index();
		me.changeFrame(newFrameIndex);
	});

	me.$frameNumber.on('change', function() {
		var newFrameIndex = this.value;
		me.changeFrame(newFrameIndex - 1);
	});

	me.$kgraph.find('.mark').on('click', function() {
		var newFrameIndex = $(this).index('.mark');
		me.changeFrame(newFrameIndex);
	});

	$(document).on('pasteCel', function(e, newFrameIndex) {
		me.changeFrame(newFrameIndex);
	});

	/*** Drag and drop */

	$(document).on('mousedown', '.cel.filled', function(e) {
		var celIndex = $(this).index();
		$('.cel').css('cursor', 'url(images/cursors/grab_cel.png) 10 10, pointer')

		// shift + click duplicates the cel (copy and paste)
		if (e.shiftKey) {
			me.activeLayer.drag = {
				state: 'copy',
				celIndex: celIndex
			};
		}

		// simple click moves it (cut and paste)
		else {
			me.activeLayer.drag = {
				state: 'cut',
				celIndex: celIndex
			}
		}
	});

	$(document).on('mousemove', '.cel', function() {
		if (me.activeLayer.drag.state === 'copy') {
			me.activeLayer.copyCel(me.activeLayer.drag.celIndex, false);
		}
		else if (me.activeLayer.drag.state === 'cut') {
			me.activeLayer.copyCel(me.activeLayer.drag.celIndex, true);
		}
	});

	$(document).on('mouseup', '.cel', function(e) {
		if (me.activeLayer.drag.state === 'dragging' && !me.activeLayer.clipboard.pasted) {
			var newCelIndex = $(this).index();
			if (newCelIndex !== me.activeLayer.clipboard.celIndex) {
				me.activeLayer.pasteCel(newCelIndex);		
			}
		}

		$('.cel').css('cursor', 'pointer');		
		me.activeLayer.drag.state = null;
	});

	$(document).on('mouseleave', '#cel-table', function() {
		$('.cel').css('cursor', 'pointer');
		me.activeLayer.cancelPaste();
	});

	/*** Onion skin */

	me.$kgraph.find('#use-onion-skin').on('change', function() {
		if (this.checked) {
			me.useOnionSkin = true;
			me.$kgraph.find('.onion-skin-depth').attr('disabled', false);
			me.renderOnionSkin();
		}
		else {
			me.useOnionSkin = false;
			me.$kgraph.find('.onion-skin-depth').attr('disabled', true);
			me.onionSkins.forEach(function(onionSkin) {
				onionSkin.clear();
			});
		}
	});

	me.$kgraph.find('.onion-skin-depth').on('change', function() {
		if ($(this).hasClass('back')) {
			me.osDepthBack = $(this).val() * -1;
		}
		else {
			me.osDepthForward = $(this).val();
		}
		me.onionSkins.forEach(function(onionSkin) {
			onionSkin.clear();
		});
		me.renderOnionSkin();
	});
}

KGraph.prototype.handleKeypress = function(metaKey, shiftKey, key) {
	var currentFrameIndex = this.currentFrameIndex;

	if (metaKey && shiftKey) {

		// shift + ctrl + x: delete frame
		if (key === 88) {
			this.layers.forEach(function(layer) {
				layer.removeCel(currentFrameIndex, true);				
			});

			this.changeFrame(currentFrameIndex);
		}
	}

	else if (metaKey) {

		// ctrl + z
		if (key === 90) {
			this.activeLayer.brushDown = false;
			this.activeLayer.undo();
			this.activeLayer.saveCel();
		}

		// ctrl + x: delete cel
		else if (key === 88) {
			this.layers.forEach(function(layer) {
				layer.removeCel(currentFrameIndex, false);				
			});
		}
	}

	else if (shiftKey) {

		// shift + f: insert duplicate frame (i.e., copy forward)
		if (key === 70) {
			this.duplicateFrame(currentFrameIndex, currentFrameIndex + 1);
		}
	}



	// insert (f)rame
	else if (key === 70) {
		this.insertFrame(currentFrameIndex);
	}

	// left arrow or a
	else if ((key === 37 || key === 65) && currentFrameIndex > 0) {
		this.changeFrame(currentFrameIndex - 1);
	}

	// right arrow or d
	else if ((key === 39 || key === 68) && currentFrameIndex < this.activeLayer.cels.length) {
		this.changeFrame(currentFrameIndex + 1);
	}


}

/*** Brush settings */

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

/*** Layer navigation */

KGraph.prototype.addLayer = function($canvas, $layer) {
	var newLayer = new KGraph.TimelineLayer($canvas, $layer, this.settings);
	this.layers.push(newLayer);
	this.changeLayer(this.layers.length - 1);
};

KGraph.prototype.changeLayer = function(index) {
	if (this.activeLayer) {
		this.activeLayer.deactivate();
		this.activeLayer.refreshSettings(this.settings);
	}
	this.activeLayer = this.layers[index];
};


/*** Frame navigation */

KGraph.prototype.changeFrame = function(newFrameIndex, bLeavePlayhead) {
	this.layers.forEach(function(layer) {
		layer.switchCel(newFrameIndex);
	});
	this.currentFrameIndex = newFrameIndex;

	// Update frame number display
	this.$frameNumber.val(newFrameIndex + 1);

	if (!bLeavePlayhead) {
		this.movePlayhead(newFrameIndex);
	}

	if (this.useOnionSkin) {
		this.renderOnionSkin();
	}
}

KGraph.prototype.insertFrame = function(frameIndex) {
	this.layers.forEach(function(layer) {
		layer.insertCel(frameIndex);
	});
	this.changeFrame(frameIndex);

	if (frameIndex > this.lastFrameIndex) {
		this.lastFrameIndex = frameIndex;
	}
}

KGraph.prototype.duplicateFrame = function(sourceFrameIndex, newFrameIndex) {
	this.activeLayer.duplicateCel(sourceFrameIndex, newFrameIndex);
	this.changeFrame(newFrameIndex);
}


/*** Playback */

KGraph.prototype.movePlayhead = function(newFrameIndex) {
	this.$playhead.css('left', newFrameIndex * 24);
}


/*** Onion skin */

KGraph.prototype.addOnionSkin = function($onionSkin) {
	var onionSkin = new KGraph.KCanvas($onionSkin, {});
	this.onionSkins.push(onionSkin);
}

KGraph.prototype.renderOnionSkin = function() {
	
	/* Render onion skins from previous cels (osDepthBack) and future cels (osDepthForward).
	 * osLayerIndex keeps track of the HTML canvas layers */
	for (var depth = this.osDepthBack, osLayerIndex = 0; depth <= this.osDepthForward; depth++, osLayerIndex++) {

		// Only render the onion skin if depth !== 0 (i.e., don't onion skin the current cel)
		if (depth !== 0) {

			// Get a KCanvas object to draw the onion skin on
			var os = this.onionSkins[osLayerIndex];
			os.clear();

			// Find the cel to onion skin
			var celIndex = this.currentFrameIndex + depth;
			if (celIndex >= 0 && celIndex < this.activeLayer.cels.length) {

				// Make a copy of the cel and lower the alpha channel
				var imageData = this.activeLayer.cels[celIndex];

				if (imageData) {
					var osImageData = os.ctx.createImageData(imageData.width, imageData.height);
					osImageData.data.set(imageData.data);

					os.setAlpha(osImageData.data, 0.5/(Math.abs(depth)));

					os.drawCel(osImageData);
				}
			}			
		}
		else {
			// Decrement osLayerIndex when depth === 0; otherwise we'll skip a KCanvas object and get
			// an index error later
			osLayerIndex--;
		}

	}
}


/* KGraph.KCanvas */

KGraph.KCanvas = function($canvas, settings) {
	this.$canvas = $canvas;
	this.offset = $canvas ? $canvas.offset() : null;
	this.canvas = $canvas ? $canvas[0] : null;
	this.ctx = this.canvas ? $.extend(this.canvas.getContext('2d'), settings) : null;
	this.active = true;
}

KGraph.KCanvas.prototype.clear = function() {
	this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
};

KGraph.KCanvas.prototype.drawCel = function(imageData) {
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

KGraph.KCanvas.prototype.setAlpha = function(data, alpha) {
	for (var i = 3, l = data.length; i < l; i += 4) {
		data[i] *= alpha;
	}
}

KGraph.KCanvas.prototype.copyImageData = function(imageData) {
	var copy = this.ctx.createImageData(imageData.width, imageData.height);
	copy.data.set(imageData.data);
	return copy;
}

/* KGraph.TimelineLayer */

KGraph.TimelineLayer = function($canvas, $layer, settings) {
	KGraph.KCanvas.call(this, $canvas, settings);
	this.cels = [];
	this.$layer = $layer;		// DOM cel layer
	this.celIndex = 0;
	this.hidden = false;
	this.brushDown = false;
	this.cachedStates = [];
	this.drag = {
		state: null
	};
	this.clipboard = {
		pasted: false
	};

	// add first cel
	var firstCel = this.ctx.createImageData(this.canvas.width, this.canvas.height);
	this.cels.push(firstCel);

	// Events
	var me = this;

	me.$canvas
		.on('click', function(e) {
			me.startStroke(e.pageX, e.pageY);
		})
		.on('mousemove', function(e) {
			if (me.brushDown) {
				me.strokeSegment(e.pageX, e.pageY);		
			}
		})
		.on('dblclick', function() {
			me.closeStroke();
		});
}

KGraph.TimelineLayer.prototype = new KGraph.KCanvas();


/*** Cel memory */

KGraph.TimelineLayer.prototype.saveCel = function() {
	var cel = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
	this.cels[this.celIndex] = cel;
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


/*** Timeline navigation */

KGraph.TimelineLayer.prototype.switchCel = function(newCelIndex) {
	// Look for the new cel in memory and draw it if it exists
	var newCel = this.cels[newCelIndex];
	if (newCel) {
		this.drawCel(this.cels[newCelIndex]);
	}
	else {
		this.clear();
	}

	// clear cache
	this.clearCache();

	// De-hilight the old cel if this is the active layer
	if (this.active) {
		var $cels = this.$layer.find('.cel');
		$cels.eq(this.celIndex).removeClass('active');

		// Hilight the new cel if it's not blank
		if ($cels.eq(newCelIndex).hasClass('filled')) {
			$cels.eq(newCelIndex).addClass('active');
		}
	}

	this.celIndex = newCelIndex;
};

/*** Adding and removing cels */

KGraph.TimelineLayer.prototype.insertCel = function(newCelIndex, newCel, insertOver) {
	if (!newCel) {
		newCel = null;
	}

	if (newCelIndex > this.cels.length) {
		this.cels.length = newCelIndex + 1;
		insertOver = true;
	}

	if (insertOver) {
		this.cels[newCelIndex] = newCel;
	}
	else {
		this.cels.splice(newCelIndex, 0, newCel);		
	}

	if (newCelIndex < this.cels.length - 1) {
		this.refreshTimeline(newCelIndex);
	}

	if (newCel) {
		this.fillCel(newCelIndex);
	}
}

KGraph.TimelineLayer.prototype.removeCel = function(celIndex, bDelete) {
	if (celIndex < this.cels.length) {

		// delete the cel from the timeline or just clear it (set it to null)
		if (bDelete) {
			this.cels.splice(celIndex, 1);
			this.$layer.find('.cel.filled').last().removeClass('filled').addClass('blank');
			this.refreshTimeline(celIndex);
		}
		else {
			this.cels[celIndex] = null;
			this.$layer.find('.cel').eq(celIndex).removeClass('filled active').addClass('blank');
		}

		if (celIndex === this.celIndex) {
			this.clear();
		}
	}
}

KGraph.TimelineLayer.prototype.duplicateCel = function(sourceCelIndex, newCelIndex) {
	var newCel = this.copyImageData(this.cels[sourceCelIndex]);
	this.insertCel(newCelIndex, newCel);
	this.refreshTimeline();
}

/*** Updating the timeline display */

KGraph.TimelineLayer.prototype.refreshTimeline = function(start, stop) {
	if (!start) {
		start = 0;
	}
	if (!stop) {
		stop = this.cels.length;
	}

	var $cels = this.$layer.find('.cel');

	for (var i = start; i < stop; i++) {
		if (this.cels[i]) {
			$cels.eq(i).removeClass('blank').addClass('filled');
		}
		else {
			$cels.eq(i).removeClass('filled').addClass('blank');
		}
	}
}

// Only call these for filling or clearing one cel at a time
KGraph.TimelineLayer.prototype.fillCel = function(celIndex) {
	this.$layer.find('.cel').eq(celIndex).removeClass('blank').addClass('filled');
}
KGraph.TimelineLayer.prototype.clearCel = function(celIndex) {
	this.$layer.find('.cel').eq(celIndex).removeClass('filled').addClass('blank');
}

/*** Copying and pasting cels */

KGraph.TimelineLayer.prototype.copyCel = function(celIndex, bCut) {
	this.clipboard = {
		celIndex: celIndex,
		cel: this.cels[celIndex],
		cut: bCut,
		pasted: false
	};

	if (bCut) {
		this.removeCel(celIndex);
	}

	this.drag.state = 'dragging';
}

KGraph.TimelineLayer.prototype.pasteCel = function(newCelIndex) {
	var cel = this.clipboard.cel;
	this.insertCel(newCelIndex, cel);
	this.clipboard.pasted = true;
	this.drag.state = null;

	$(document).trigger('pasteCel', newCelIndex);
}

KGraph.TimelineLayer.prototype.cancelPaste = function() {
	if (this.clipboard && !this.clipboard.pasted && this.clipboard.cut) {
		this.pasteCel(this.clipboard.celIndex);
	}
}

/*** Drawing functions */

KGraph.TimelineLayer.prototype.startStroke = function(pageX, pageY) {
	if (!this.brushDown) {

		// create a cel if none exists at this index
		if (!this.cels[this.celIndex]) {
			if (this.celIndex === this.cels.length) {
				this.insertCel(this.celIndex)
				this.switchCel(this.celIndex);				
			}	
			this.fillCel(this.celIndex);
		}

		this.brushDown = true;
		this.ctx.beginPath();
		this.ctx.moveTo(pageX - this.offset.left, pageY - this.offset.top);
	}
	this.cacheState();
};

KGraph.TimelineLayer.prototype.strokeSegment = function(pageX, pageY) {
	this.ctx.lineTo(pageX - this.offset.left, pageY - this.offset.top);
	this.ctx.stroke();
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


/***************************************************************************************************/
/*************************************    . .    ***************************************************/
/*************************************     -     ***************************************************/
/***************************************************************************************************/


$(document).ready(function() {

	initializeCanvas();

});


function initializeCanvas() {
	"use strict";

	// Read onion skin settings from page
	if ($('#use-onion-skin')[0].checked) {
		var useOnionSkin = true;
	}
	else {
		var useOnionSkin = false;
	}

	var onionSkinDepth = 1;

	// Initialize new KGraph object and add canvas layers 
	var $kgraph = $('#kgraph');
	var kg = new KGraph($kgraph, useOnionSkin);

	var $canvas = $('.canvas');
	var $layer = $('.cel-layer').first();
	kg.addLayer($canvas, $layer);

	$('.onion-skin').each(function() {
		kg.addOnionSkin($(this));
	});

	var CEL_WIDTH = $('.ruler-cel').outerWidth();

	// initialize timeline UI
	$('#playhead').draggable({
		handle: '#playhead-grip',
		axis: 'x',
		scroll: true,
		containment: '#timeline-inner',
		cursor: 'grabbing',
		grid: [CEL_WIDTH, 0],
		stop: function() {
			var frameIndex = parseInt($(this).css('left')) / CEL_WIDTH;
			kg.changeFrame(frameIndex, true);
		}
	});

}










