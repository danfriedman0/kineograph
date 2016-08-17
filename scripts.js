/**
 * Scripts
 */

/*************************************************************************************************/
/* KGraph ****************************************************************************************/
/*************************************************************************************************/

function KGraph($kgraph, templates) {
	this.$kgraph = $kgraph;
	this.$canvasWrapper = $kgraph.find('#canvas-wrapper');
	this.$frameNumber = $kgraph.find('#frame-number');
	this.$playhead = $kgraph.find('#playhead');
	this.$ruler = $kgraph.find('#ruler');

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

	this.templates = templates;
	this.gridLength = templates.$timelineLayerTemplate.find('td').length;
	
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
	
	this.timelineLayers = [];
	this.activeLayer = null;
	this.currentLayerIndex = 0;
	this.currentFrameIndex = 0;
	this.lastFrameIndex = 0;

	this.onionSkins = [];

	/* Events */
	var me = this;

	$(document).on('keydown', function(e) {
		if (document.activeElement.tagName.toUpperCase() !== 'INPUT') {
			me.handleKeypress(e.metaKey, e.shiftKey, e.which);
		}
	});

	/*** Brush settings */

	me.$kgraph.find('.color').on('click', function(e) {
		var color = $(this).css('background-color');
		me.changeColor(color);
	});

	me.$canvasWrapper.on('mousewheel DOMMouseScroll', function(e) {
		if (e.originalEvent.wheelDelta > 0 || e.originalEvent.detail < 0) {
			me.changeBrushSize(me.brushNo + 1);
		}
		else {
			me.changeBrushSize(me.brushNo - 1);
		}
	});

	/*** Layer navigation */

	var $layerNavbar = me.$kgraph.find('#layer-navbar');

	$layerNavbar.find('.layer-name').on('click', function() {
		// the array index is the inverse of the DOM index
		var layerIndex = me.timelineLayers.length - $(this).closest('.layer-nav').index();
		me.changeLayer(layerIndex);
	});

	$layerNavbar.find('#add-layer').on('click', function() {
		me.newLayer();
	});

	$layerNavbar.find('.toggle-layer-menu').on('click', function() {
		$(this)
			.toggleClass('open')
			.next('.layer-button-dropdown').toggle();
	});

	/*** Layer operations */

	$layerNavbar.find('.delete-layer').on('click', function() {
		if (confirm('Delete layer?')) {
			var layerIndex = $(this).closest('.layer-nav').index() - 1;
			me.deleteLayer(layerIndex);		
		}
	});

	$layerNavbar.find('.layer-up').on('click', function(e) {
		var domIndex = $(this).closest('.layer-nav').index() - 1;
		if (domIndex > 0) {
			var layerIndex = me.timelineLayers.length - domIndex - 1;
			var $timelineLayer = me.timelineLayers[layerIndex];
			me.moveLayer($timelineLayer, layerIndex, layerIndex + 1);
		}
	});

	$layerNavbar.find('.layer-down').on('click', function(e) {
		var domIndex = $(this).closest('.layer-nav').index() - 1;;
		if (domIndex < me.timelineLayers.length - 1) {
			var layerIndex = me.timelineLayers.length - domIndex - 1;
			var $timelineLayer = me.timelineLayers[layerIndex];
			me.moveLayer($timelineLayer, layerIndex, layerIndex - 1);
		}
	});

	/*** Frame navigation */

	$(document).on('click', '.cel', function() {
		var newFrameIndex = parseInt($(this).index());
		me.changeFrame(newFrameIndex);
	});

	me.$frameNumber.on('change', function() {
		var newFrameIndex = parseInt(this.value) - 1;
		if (newFrameIndex >= 0 && newFrameIndex < me.gridLength) {
			me.changeFrame(newFrameIndex);
		}
		else {
			this.value = me.currentFrameIndex + 1;
		}
	});

	$(document).on('click', '.mark', function() {
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
			this.activeLayer.removeCel(currentFrameIndex, true);

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
			this.activeLayer.removeCel(currentFrameIndex, false);
		}
	}

	else if (shiftKey) {

		// shift + f: insert duplicate frame (i.e., copy forward)
		if (key === 70) {
			this.duplicateFrame(currentFrameIndex, currentFrameIndex + 1);

			// extend timeline grid if we're at the end
			if (currentFrameIndex === this.gridLength) {
				this.extendTimelines();
			}
		}
	}



	// f: insert frame
	else if (key === 70) {
		this.insertFrame(currentFrameIndex);
	}

	// left arrow or a: move left one frame
	else if ((key === 37 || key === 65) && currentFrameIndex > 0) {
		this.changeFrame(currentFrameIndex - 1);
	}

	// right arrow or d: move right one frame
	else if (key === 39 || key === 68) {
		if (currentFrameIndex < this.activeLayer.cels.length) {
			this.changeFrame(currentFrameIndex + 1);
		}

		// extend timeline grid if we're at the end
		else if (currentFrameIndex === this.gridLength) {
			this.extendTimelines();
		}
	}


	// down arrow or s: move down one layer
	else if (key === 40 || key === 83) {
		if (this.currentLayerIndex > 0) {
			this.changeLayer(this.currentLayerIndex - 1);
		}
	}

	// up arrow or w: move up one layer
	else if (key === 87 || key === 38) {
		if (this.currentLayerIndex < this.timelineLayers.length - 1) {
			this.changeLayer(this.currentLayerIndex + 1);
		}
	}


}

/*** Brush settings */

KGraph.prototype.changeColor = function(color) {
	if (color === 'transparent') {
		console.log('eraser');
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

KGraph.prototype.newLayer = function() {
	var templates = this.templates;
	var layers = this.timelineLayers;
	var layerIndex = layers.length;
	var newLayerName = 'Layer ' + (layerIndex + 1);
	var $playheadLine = this.$playhead.find('#playhead-line');

	// add canvas
	var $newCanvas = templates.$canvasTemplate.clone(true).removeClass('template');
	templates.$canvasTemplate.before($newCanvas);

	// add timeline layer
	var $timelineLayerTemplate = templates.$timelineLayerTemplate;
	var $newLayer = $timelineLayerTemplate.clone(true).removeClass('template');
	$timelineLayerTemplate.after($newLayer);

	// add layer navigation
	var $layerNavTemplate = templates.$layerNavTemplate;
	var $newLayerNav = $layerNavTemplate.clone(true).removeClass('template');
	$newLayerNav.find('.layer-name').text(newLayerName);
	$newLayerNav.find('.layer-name-input').val(newLayerName);
	$layerNavTemplate.after($newLayerNav);

	// resize playhead
	var currentHeight = parseInt($playheadLine.css('height'));
	var newLayerHeight = $timelineLayerTemplate.height();
	$playheadLine.css('height', currentHeight + newLayerHeight);

	var newLayer = new KGraph.TimelineLayer($newCanvas, $newLayer, $newLayerNav, newLayerName, this.settings);

	layers.push(newLayer);
	this.changeLayer(layerIndex);
}

KGraph.prototype.changeLayer = function(layerIndex) {
	if (this.activeLayer) {
		this.activeLayer.deactivate();
	}
	this.activeLayer = this.timelineLayers[layerIndex];
	this.activeLayer.activate();
	this.activeLayer.refreshSettings(this.settings);
	this.currentLayerIndex = layerIndex;
};

/*** Layer operations */

KGraph.prototype.deleteLayer = function(layerIndex) {
	var $kgraph = this.$kgraph
	var $playheadLine = this.$playhead.find('#playhead-line');

	// delete timeline layer
	$kgraph.find('.cel-layer').eq(layerIndex + 1).remove();		// add one to skip the template layer

	// delete layer navigation
	$kgraph.find('.layer-nav').eq(layerIndex + 1).remove();

	// the canvas index and the index in the timelineLayers array are the inverse of the
	// DOM index
	layerIndex = this.timelineLayers.length - layerIndex - 1;

	// delete canvas
	$kgraph.find('.canvas').eq(layerIndex).remove();

	// delete layer
	this.timelineLayers.splice(layerIndex, 1);

	// resize playhead
	var currentHeight = parseInt($playheadLine.css('height'));
	var layerHeight = this.templates.$timelineLayerTemplate.height();
	$playheadLine.css('height', currentHeight - layerHeight);

	// add a new, blank layer if there are none left
	if (this.timelineLayers.length === 0) {
		this.newLayer();
		this.changeFrame(0);
	}

	// change layers
	if (layerIndex > 0) {
		this.changeLayer(layerIndex - 1);
	}
	else {
		this.changeLayer(0);
	}
}

KGraph.prototype.moveLayer = function($timelineLayer, currentIndex, newIndex) {
	var $kgraph = this.$kgraph;

	// the DOM index is the inverse of the actual layer index
	var domIndex = this.timelineLayers.length - newIndex - 1;

	// move layer navigation
	var $targetLayerNav = $kgraph.find('.layer-nav').eq(domIndex + 1)	// add 1 to skip the template

	// move cel layer
	var $targetCelLayer = $kgraph.find('.cel-layer').eq(domIndex + 1); 	// add 1 to skip the template

	// move canvas
	var $targetCanvas = $kgraph.find('.canvas').eq(newIndex);

	if (currentIndex < newIndex) {
		$timelineLayer.$layerNav.insertBefore($targetLayerNav);
		$timelineLayer.$layer.insertBefore($targetCelLayer);
		$timelineLayer.$canvas.insertAfter($targetCanvas);	
	}
	else {
		$timelineLayer.$layerNav.insertAfter($targetLayerNav);
		$timelineLayer.$layer.insertAfter($targetCelLayer);
		$timelineLayer.$canvas.insertBefore($targetCanvas);		
	}


	// move the layer in the array
	var timelineLayers = this.timelineLayers;
	timelineLayers.splice(newIndex, 0, timelineLayers.splice(currentIndex, 1)[0]);
}

/*** Frame navigation */

KGraph.prototype.changeFrame = function(newFrameIndex, bLeavePlayhead) {
	this.timelineLayers.forEach(function(layer) {
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
	this.activeLayer.insertCel(frameIndex, null, true);
	this.changeFrame(frameIndex);

	if (frameIndex > this.lastFrameIndex) {
		this.lastFrameIndex = frameIndex;
	}
}

KGraph.prototype.duplicateFrame = function(sourceFrameIndex, newFrameIndex) {
	this.activeLayer.duplicateCel(sourceFrameIndex, newFrameIndex);
	this.changeFrame(newFrameIndex);
}


/*** Timeline display */

KGraph.prototype.extendTimelines = function(n) {

	var templates = this.templates;
	var $timelineLayerTemplate = templates.$timelineLayerTemplate;
	var numberMark = templates.numberMark;
	var dotMark = templates.dotMark;

	if (!n) {
		n = 21;
	}

	var newCels = templates.cel.repeat(n);

	// extend timeline layers
	this.timelineLayers.forEach(function(layer) {
		layer.extendTimeline(newCels);
	});

	// extend timeline layer template
	$timelineLayerTemplate.find('.cel').last().after(newCels);

	// extend timeline ruler
	var currentLength = this.$ruler.find('td').length;
	var newRulerCels = '';



	for (var i = currentLength, l = currentLength + n; i < l; i++) {
		if ((i + 1) % 4 === 0) {
			newRulerCels += numberMark[0] + (i + 1) + numberMark[1];
		} 
		else {
			newRulerCels += dotMark;
		}
	}

	this.$ruler.append(newRulerCels);

	this.gridLength += n;
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

/*************************************************************************************************/
/* KGraph.KCanvas ********************************************************************************/
/*************************************************************************************************/

KGraph.KCanvas = function($canvas, settings) {
	this.$canvas = $canvas;
	this.offset = $canvas ? $canvas.offset() : null;
	this.canvas = $canvas ? $canvas[0] : null;
	this.ctx = this.canvas ? $.extend(this.canvas.getContext('2d'), settings) : null;
}

KGraph.KCanvas.prototype.clear = function() {
	this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
};

KGraph.KCanvas.prototype.drawCel = function(imageData) {
	this.ctx.putImageData(imageData, 0, 0);
};

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

/*************************************************************************************************/
/* KGraph.TimelineLayer **************************************************************************/
/*************************************************************************************************/

KGraph.TimelineLayer = function($canvas, $layer, $layerNav, layerName, settings) {
	KGraph.KCanvas.call(this, $canvas, settings);
	this.cels = [];
	this.$layer = $layer;		// DOM cel layer
	this.$layerNav = $layerNav;
	this.layerName = layerName || '';
	this.currentCelIndex = 0;
	this.visible = true;
	this.brushDown = false;
	this.cachedStates = [];
	this.drag = {
		state: null
	};
	this.clipboard = {
		pasted: false
	};
	this.active = false;

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
		.on('dblclick mouseleave', function() {
			me.closeStroke();
		});

	me.$layerNav.find('.toggle-visibility').on('click', function() {
		me.toggleVisibility();
	});

	me.$layerNav.find('.layer-name').on('dblclick', function() {
		$(this).hide();
		$(this).siblings('.layer-name-input').show().select();
	});

	me.$layerNav.find('.layer-name-input').on('change blur', function() {
		var newLayerName = this.value;
		me.renameLayer(newLayerName);
		$(this).hide();
		$(this).siblings('.layer-name').show();
	});
}

KGraph.TimelineLayer.prototype = new KGraph.KCanvas();


/*** Cel memory */

KGraph.TimelineLayer.prototype.saveCel = function() {
	var cel = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
	this.cels[this.currentCelIndex] = cel;
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

/*** Layer navigation */

KGraph.TimelineLayer.prototype.deactivate = function() {
	if (this.active) {
		this.active = false;
		this.$canvas.removeClass('active').addClass('inactive');
		this.$layerNav.removeClass('active');
		this.$layer.find('.cel').eq(this.currentCelIndex).removeClass('active');
	}
}

KGraph.TimelineLayer.prototype.activate = function() {
	if (!this.active) {
		this.active = true;
		this.$canvas.addClass('active').removeClass('inactive');
		this.$layerNav.addClass('active');
		if (this.cels[this.currentCelIndex]) {
			this.$layer.find('.cel').eq(this.currentCelIndex).addClass('active');
		}
	}
}

/*** Layer operations */

KGraph.TimelineLayer.prototype.toggleVisibility = function() {
	if (this.visible) {
		this.$layerNav.find('.eye').removeClass('fa-eye').addClass('fa-eye-slash');
		this.$canvas.hide();
		this.visible = false;
	}
	else {
		this.$layerNav.find('.eye').removeClass('fa-eye-slash').addClass('fa-eye');
		this.$canvas.show();
		this.visible = true;
		this.drawCel(this.cels[this.currentCelIndex]);
	}
}

KGraph.TimelineLayer.prototype.renameLayer = function(newLayerName) {
	if (newLayerName) {
		this.layerName = newLayerName;
		this.$layerNav.find('.layer-name').text(newLayerName);
	}
}

/*** Timeline navigation */

KGraph.TimelineLayer.prototype.switchCel = function(newCelIndex) {
	if (this.visible) {

		// Look for the new cel in memory and draw it if it exists
		var newCel = this.cels[newCelIndex];
		if (newCel) {
			this.drawCel(this.cels[newCelIndex]);
		}
		else {
			this.clear();
		}		
	}

	// De-hilight the old cel if this is the active layer
	if (this.active) {
		var $cels = this.$layer.find('.cel');
		$cels.eq(this.currentCelIndex).removeClass('active');

		// Hilight the new cel if it's not blank
		if ($cels.eq(newCelIndex).hasClass('filled')) {
			$cels.eq(newCelIndex).addClass('active');
		}
	}

	// clear cache
	this.clearCache();

	this.currentCelIndex = newCelIndex;
};

/*** Adding and removing cels */

KGraph.TimelineLayer.prototype.insertCel = function(newCelIndex, newCel, bInsert) {
	if (!newCel) {
		newCel = null;
	}

	if (newCelIndex > this.cels.length) {
		this.cels.length = newCelIndex + 1;
	}

	if (bInsert) {
		this.cels.splice(newCelIndex, 0, newCel);
	}
	else {
		this.cels[newCelIndex] = newCel;		
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

		if (celIndex === this.currentCelIndex) {
			this.clear();
		}
	}
}

KGraph.TimelineLayer.prototype.duplicateCel = function(sourceCelIndex, newCelIndex) {
	var newCel = this.copyImageData(this.cels[sourceCelIndex]);
	this.insertCel(newCelIndex, newCel, true);
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
	this.$layer.find('.cel').eq(celIndex).removeClass('blank').addClass('filled active');
}
KGraph.TimelineLayer.prototype.clearCel = function(celIndex) {
	this.$layer.find('.cel').eq(celIndex).removeClass('filled').addClass('blank');
}

KGraph.TimelineLayer.prototype.extendTimeline = function(newCels) {
	this.$layer.find('.cel').last().after(newCels);
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

		var currentCelIndex = this.currentCelIndex;
		// create a cel if none exists at this index
		if (!this.cels[currentCelIndex]) {
			if (currentCelIndex === this.cels.length) {
				this.insertCel(currentCelIndex)
				this.switchCel(currentCelIndex);				
			}	
			this.fillCel(currentCelIndex);
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
	if (this.brushDown) {
		this.ctx.stroke();
		this.cachedStates.splice(-2, 2);
		this.brushDown = false;
		this.saveCel();		
	}
};

KGraph.TimelineLayer.prototype.refreshSettings = function(settings) {
	$.extend(this.ctx, settings);
};


/***************************************************************************************************/
/*************************************    . .    ***************************************************/
/*************************************     -     ***************************************************/
/***************************************************************************************************/

function objToHtmlString($obj)  {
	return $('<div>').append($obj.clone()).remove().html();
}

function initializeCanvas() {
	"use strict";

	// Get timeline templates
	var $cel = $('.cel').eq(1);
	var $dotMark = $('.ruler-cel').eq(0);
	var $numberMark = $('.ruler-cel').eq(3);
	var $timelineLayerTemplate = $('.cel-layer.template');
	var $canvasTemplate = $('.canvas.template');
	var $layerNavTemplate = $('.layer-nav.template');

	var templates = {
		cel: objToHtmlString($cel),
		dotMark: objToHtmlString($dotMark),
		numberMark: objToHtmlString($numberMark).split(/\d+/),
		$layerNavTemplate: $layerNavTemplate,
		$timelineLayerTemplate: $timelineLayerTemplate,
		$canvasTemplate: $canvasTemplate
	};

	// Initialize new KGraph object and add the first layer
	var $kgraph = $('#kgraph');
	var kg = new KGraph($kgraph, templates);
	kg.newLayer();

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

$(document).ready(function() {

	initializeCanvas();

});










