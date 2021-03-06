/**
 * Scripts
 */

"use strict";

/*************************************************************************************************/
/* KGraph ****************************************************************************************/
/*************************************************************************************************/

function KGraph($kgraph, templates) {
	this.$kgraph = $kgraph;
	this.$canvasWrapper = $kgraph.find('#canvas-wrapper');
	this.$frameNumber = $kgraph.find('#frame-number');
	this.$playhead = $kgraph.find('#playhead');
	this.$playButton = $kgraph.find('#play-button i');
	this.$ruler = $kgraph.find('#ruler');
	this.$loader = $('#loader');
	this.$exportWindow = $('#export-window');

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

	this.playback = null;
	this.playing = false;

	this.exportGifUrl = null;

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

	// Read loop settings from page
	if ($('#loop-playback')[0].checked) {
		this.loopPlayback = true;
		this.$kgraph.find('#loop-depth').attr('disabled', false);
	}
	else {
		this.loopPlayback = false;
		this.$kgraph.find('#loop-depth').attr('disabled', true);
	}

	this.loopDepth = $('#loop-depth').val();

	// Read fps from page
	this.fps = parseInt($('#fps').val());

	// Identify the browser (http://stackoverflow.com/a/9851769)

	// At least Safari 3+: "[object HTMLElementConstructor]"
	this.isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
    // Internet Explorer 6-11
	this.isIE = /*@cc_on!@*/false || !!document.documentMode;

	// Safari and IE don't support the download attribute for anchor tags
	if (this.isSafari || this.isIE) {
		this.$exportWindow.find('#download-export').hide();
	}


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

	$layerNavbar.find('.toggle-layer-menu')
		.attr('title', 'Layer menu')
		.on('click', function() {
			$(this)
				.toggleClass('open')
				.next('.layer-button-dropdown').toggle();
		});

	/*** Layer operations */

	$layerNavbar.find('.delete-layer')
		.attr('title', 'Delete menu')
		.on('click', function() {
			if (confirm('Delete layer?')) {
				var layerIndex = $(this).closest('.layer-nav').index() - 1;
				me.deleteLayer(layerIndex);		
			}
		});

	$layerNavbar.find('.layer-up')
		.attr('title', 'Move layer up')
		.on('click', function(e) {
			var domIndex = $(this).closest('.layer-nav').index() - 1;
			if (domIndex > 0) {
				var layerIndex = me.timelineLayers.length - domIndex - 1;
				var $timelineLayer = me.timelineLayers[layerIndex];
				me.moveLayer($timelineLayer, layerIndex, layerIndex + 1);
			}
		});

	$layerNavbar.find('.layer-down')
		.attr('title', 'Move layer down')
		.on('click', function(e) {
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
		var domLayerIndex = parseInt($(this).closest('.cel-layer').index('.cel-layer'));
		var layerIndex = me.timelineLayers.length - domLayerIndex;
		if (layerIndex !== me.currentLayerIndex) {
			me.changeLayer(layerIndex);
		}
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

	/*** Playback */
	var $playbackButtons = me.$kgraph.find('#playback-buttons');

	// Add the titles now because otherwise it interferes with page loading
	$playbackButtons
		.attr('title', 'First frame (shift + left/a)')
		.find('#jump-back').on('click', function() {
			if (me.currentFrameIndex > 0) {
				me.changeFrame(0);
			}
		});

	$playbackButtons.find('#back-one')
		.attr('title', 'Back one frame (left/a)')
		.on('click', function() {
			if (me.currentFrameIndex > 0) {
				me.changeFrame(me.currentFrameIndex - 1);
			}
		});

	$playbackButtons.find('#forward-one')
		.attr('title', 'Forward one frame (right/d)')
		.on('click', function() {
			if (me.currentFrameIndex < me.gridLength) {
				me.changeFrame(me.currentFrameIndex + 1);
			}
		});

	$playbackButtons.find('#jump-forward')
		.attr('title', 'Last frame (shift + right/d)')
		.on('click', function() {
			if (me.currentFrameIndex < me.gridLength) {
				me.changeFrame(me.gridLength);
			}
		});

	me.$playButton.on('click', function() {
		me.togglePlayback();
	});

	me.$kgraph.find('#fps').on('change', function() {
		me.fps = parseInt(this.value);
	});

	// Loop playback

	me.$kgraph.find('#loop-playback').on('change', function() {
		if (this.checked) {
			me.loopPlayback = true;
			me.$kgraph.find('#loop-depth').attr('disabled', false);
		}
		else {
			me.loopPlayback = false;
			me.$kgraph.find('#loop-depth').attr('disabled', true);
		}
	});

	me.$kgraph.find('#loop-depth').on('change', function() {
		var newLoopDepth = parseInt(this.value);
		var lastFrameIndex = me.getLastFrameIndex();
		if (newLoopDepth >= 0 && (newLoopDepth <= lastFrameIndex || newLoopDepth <= me.loopDepth)) {
			me.loopDepth = newLoopDepth;
		}
		else if (lastFrameIndex >= 12) {
			me.loopDepth = lastFrameIndex;
			this.value = lastFrameIndex;
		}
		else {
			this.value = me.loopDepth;
		}
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

	/*** Loader */

	// prevent scrolling while loader is visible
	me.$loader.on('mousewheel DOMMouseScroll', function(e) {
		e.preventDefault();
	});

	/*** Export animation */
	me.$kgraph.find('#export').on('click', function() {
		me.exportAnimation();
	});

	me.$exportWindow.find('#open-export').on('click', function() {
	  	//window.open(URL.createObjectURL(blob));
	  	window.open(me.exportGifUrl);
	});

	me.$exportWindow.find('#close').on('click', function() {
		me.$exportWindow.hide();
	});

	/*** Resize */

	// Every KCanvas object stores its own offset because I had this idea that that would be faster than
	// calling the offset function all the time. But that means we have to reset the offsets whenever
	// the window is resized.
	$(window).on('resize', function() {
		me.timelineLayers.forEach(function(layer) {
			layer.recalculateOffset();
		});
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
			if (currentFrameIndex === this.gridLength - 1) {
				this.extendTimelines();
			}
		}

		// shift + left arrow or a: jump to first frame
		else if ((key === 37 || key === 65) && currentFrameIndex > 0) {
			this.changeFrame(0);
		}

		// shift + right arrow or d: jup to last frame
		else if ((key === 39 || key === 68) && currentFrameIndex < this.gridLength) {
			this.changeFrame(this.getLastFrameIndex());
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
		if (currentFrameIndex < this.gridLength) {
			this.changeFrame(currentFrameIndex + 1);
		}

		// extend timeline grid if we're at the end
		if (currentFrameIndex === this.gridLength - 1) {
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

	// space: play/pause animation
	else if (key === 32) {
		this.togglePlayback();
	}

	// m: change MOUSE MODE
	else if (key === 77) {
		this.timelineLayers.forEach(function(layer) {
			layer.toggleMouseMode();
		});
	}
}

/*** Brush settings */

KGraph.prototype.changeColor = function(color) {
	if (color === 'transparent') {
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
	this.activeLayer.closeStroke();

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

KGraph.prototype.getLastFrameIndex = function() {
	var maxLength = Math.max(...this.timelineLayers.map(function(layer) {
		return layer.cels.length;
	}));

	return maxLength ? maxLength - 1 : 0;
}

/*** Playback */

KGraph.prototype.stopPlayback = function() {
	this.playing = false;
	this.$playButton.removeClass('fa-pause').addClass('fa-play');
	clearInterval(this.playback);
}

KGraph.prototype.startPlayback = function() {
	var me = this;
	var lastFrameIndex = this.getLastFrameIndex();
	var startFrameIndex = this.currentFrameIndex;

	if (this.loopPlayback && startFrameIndex + this.loopDepth < lastFrameIndex) {
		lastFrameIndex = startFrameIndex + this.loopDepth;
	}

	me.playing = true;
	me.$playButton.removeClass('fa-play').addClass('fa-pause');
	
	me.playback = setInterval(function() {
		if (me.currentFrameIndex < lastFrameIndex) {
			me.changeFrame(me.currentFrameIndex + 1);
		}
		else if (me.loopPlayback) {
			me.changeFrame(startFrameIndex);
		}
		else {
			me.stopPlayback();
		}
	}, 1000/me.fps);
}

KGraph.prototype.togglePlayback = function() {
	if (!this.playing) {
		this.startPlayback();
	}
	else {
		this.stopPlayback();
	}
}


/*** Timeline display */

KGraph.prototype.extendTimelines = function(n) {

	var templates = this.templates;
	var $timelineLayerTemplate = templates.$timelineLayerTemplate;
	var numberMark = templates.numberMark;
	var dotMark = templates.dotMark;

	if (!n) {
		n = 29;
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
	var $playhead = this.$playhead;
	$playhead.css('left', newFrameIndex * 24);

	// scroll timeline if needed
	var offset = $playhead.offset().left - $playhead.parent().offset().left;
	if (offset < 0 || offset > 720) {
		$('#timeline-inner').animate({
			scrollLeft: offset
		});
	}
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

/*** Export animation */

// Take an array of cels and merge them into one cel (used for flattening layers)
KGraph.prototype.mergeCels = function(cels) {

	// the gif encoder doesn't handle transparency properly so get a solid white canvas and merge
	// all the cels down onto it
	var activeLayer = this.activeLayer;
	activeLayer.ctx.fillStyle = '#fff';
	activeLayer.ctx.fillRect(0, 0, activeLayer.canvas.width, activeLayer.canvas.height);

	var newCel = activeLayer.ctx.getImageData(0, 0, activeLayer.canvas.width, activeLayer.canvas.height),
		newData = newCel.data,
		me = this,
		data, i;

	cels.forEach(function(cel) {
		data = cel.data;
		for (i = 0; i < data.length; i += 4) {

			// TODO: really I should be averaging the cels if 0 < transparency < 255 but there are
			// aliasing problems.
			if (data[i+3] > 0) {
				newData[i] = data[i];
				newData[i+1] = data[i+1];
				newData[i+2] = data[i+2];
				newData[i+3] = data[i+3];
			}
		}
	});

	return newCel;
}

// Merge all of the timeline layers into one export layer
KGraph.prototype.mergeLayers = function() {
	var timelineLayers = this.timelineLayers,
		exportLayer = [],
		lastFrameIndex = this.getLastFrameIndex(),
		i, frameCels, frame;

	for (i = 0; i < lastFrameIndex + 1; i++) {
		frameCels = [];
		timelineLayers.forEach(function(layer) {
			if (layer.cels[i]) {
				frameCels.push(layer.cels[i]);
			}
		});
		
		frame = this.mergeCels(frameCels);

		exportLayer.push(frame);
	}

	return exportLayer;
}

KGraph.prototype.exportAnimation = function() {
	var me = this;
	me.$loader.show();

	// clear everything
	me.timelineLayers.forEach(function(layer) {
		layer.clear();
	});
	me.onionSkins.forEach(function(os) {
		os.clear();
	});

	// first merge all of the layers into one layer for export
	var exportLayer = me.mergeLayers();

	var gif = new GIF({
		workers: 2,
		quality: 10,
		width: 840,
		height: 480
	});

	// calculate the delay in milliseconds. Unfortunately this will round to the nearest multiple of 10
	// because delay is encoded in the gif in hundredths of a second. So there's no way to get exactly 12 fps.
	var delay = Math.round(1000/me.fps);

	// draw each frame on the active layer canvas and add it to the gif
	var activeLayer = me.activeLayer;
	for (var i = 0; i < exportLayer.length; i++) {
		activeLayer.drawCel(exportLayer[i]);
		gif.addFrame(activeLayer.ctx, {copy: true, delay: delay});
	}

	gif.on('finished', function(blob) {
		var exportGifUrl = URL.createObjectURL(blob);
		me.exportGifUrl = exportGifUrl;
		me.$exportWindow.find('#download-export')[0].href = exportGifUrl;
		me.$loader.hide();
	  	me.$exportWindow.show();
	});

	gif.render();
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

KGraph.KCanvas.prototype.recalculateOffset = function() {
	this.offset = this.$canvas.offset();
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
	this.mouseMode = {
		name: 'drag',
		brushDown: 'mousedown',
		brushUp: 'mouseup'
	}

	// Events
	var me = this;

	me.$canvas
		.on(me.mouseMode.brushDown, function(e) {
			me.startStroke(e.pageX, e.pageY);
		})
		.on('mousemove', function(e) {
			if (me.brushDown) {
				me.strokeSegment(e.pageX, e.pageY);		
			}
		})
		.on(me.mouseMode.brushUp, function() {
			me.closeStroke();
		})
		.on('mouseleave', function() {
			me.closeStroke(true);
		});

	me.$layerNav.find('.toggle-visibility')
		.attr('title', 'Toggle layer visibility')
		.on('click', function() {
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


/*** Brush events */
KGraph.TimelineLayer.prototype.bindBrushEvents = function() {
	var me = this,
		brush_down,
		brush_up;

	if (this.mouseMode === 'drag') {
		brush_down = 'mousedown';
		brush_up = 'mouseup';
	}
	else {
		brush_down = 'click';
		brush_up = 'dblclick';
	}

	me.$canvas
		.on(brush_down, function(e) {
			me.startStroke(e.pageX, e.pageY);
		})
		.on('mousemove', function(e) {
			if (me.brushDown) {
				me.strokeSegment(e.pageX, e.pageY);		
			}
		})
		.on(brush_up, function() {
			me.closeStroke();
		})
		.on('mouseleave', function() {
			me.closeStroke(true);
		});
}

KGraph.TimelineLayer.prototype.toggleMouseMode = function() {
	var me = this;

	// unbind old listeners
	me.$canvas.off(me.mouseMode.brushDown).off(me.mouseMode.brushUp);

	// reset mousemode
	if (me.mouseMode.name === 'drag') {
		me.mouseMode.name = 'click';
		me.mouseMode.brushDown = 'click';
		me.mouseMode.brushUp = 'dblclick';
	}
	else {
		me.mouseMode.name = 'drag';
		me.mouseMode.brushDown = 'mousedown';
		me.mouseMode.brushUp = 'mouseup';		
	}

	// bind new listeners
	me.$canvas
		.on(me.mouseMode.brushDown, function(e) {
			me.startStroke(e.pageX, e.pageY);
		})
		.on(me.mouseMode.brushUp, function() {
			me.closeStroke();
		});
}


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
		this.closeStroke();
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

KGraph.TimelineLayer.prototype.closeStroke = function(bAbort) {
	if (this.brushDown) {
		this.ctx.stroke();
		this.brushDown = false;
		this.saveCel();
		if (!bAbort && this.mouseMode.name !== 'drag') {
			this.cachedStates.splice(-2, 2);
		}
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










