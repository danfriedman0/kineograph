# Kineograph

Kineograph is a JavaScript web app for making flipbook-style animations in the browser. Try it out at [danfriedman0.github.io/kineograph](http://danfriedman0.github.io/kineograph).

## How to use it

Kineograph is designed to let you make frame-by-frame animations in your browser. You draw a series of pictures, each one a little bit different from the previous one, and when you flip through them you create *the illusion of movement*.

### Drawing

Click and drag your mouse to draw on the canvas. You can change the color of your line by clicking on one of the colors in the color palette above the canvas. You can change the size of your brush by scrolling your mousewheel up or down. `ctrl + z` undoes a stroke (unless you're using Safari) and the rightmost swatch in the color palette is an eraser.


### Changing frames

Use the `left and right arrow keys`--or the `a and d keys`--to change from one frame to another. You can also `drag the playhead` or enter a frame number in the frame number box. Use `shift+left/a` or `shift+right/d` to jump to the start or end of the timeline.

You don't need to do anything special to add a frame. Just move to the end of the timeline and start drawing.


### Onion skinning

Onion skinning is a key tool for making animations. When you turn onion skinning on you can see the previous frame "through" the frame you're working on, as if you were drawing on semi-transparent onion skins. You can set the depth of the onion skin with the drop downs next to the onion skin checkbox. The negative depth is the number of prior frames you can see and the positive depth is the number of subsequent frames you can see.


### Inserting and deleting frames

You can insert a new frame in between to frames by pressing the `f` key. Pressing `shift+f` will *duplicate the previous frame** and insert it before the next one.

Press `ctrl + x` to clear the current frame. Click `shift + ctrl + x` to remove the frame from the timeline. (This will make all subsequent frames shift backwards by one frame).


### Moving frames

You can `drag and drop` frames on the timeline. This feature is a little bit buggy but it basically works. Clicking a frame and dragging it somewhere else deletes it from the original location and pastes it in the new location. If you `shift + click` you **duplicate** the frame. It will remain where it is and you'll paste a copy of it in the new location.


### Layers

Kineograph supports layers, believe it or not! Add a new layer by clicking the "New layer" link. You can navigate between layers with the arrow keys (up/down or w/s) or by clicking the name of the layer you want to go to. You can toggle layer visibility by clicking the eyeball next to the layer name and you can rename a layer by double clicking its current name. The little arrow to the right of the layer name opens the layer menu, where you can delete a layer or move it up or down.


### Playback

Play your animation by clicking the play button or by pressing the `space bar`. You can set Kineograph to loop your animation (or any number of frames) and you can adjust the frame rate (or frames-per-second, fps).


### Exporting

When you're done with your animation, click the `export` button to export it as a gif. After the gif is done rendering you have the option to either download it directly or open it in a new tab. If you are using Safari or Internet Explorer, you will only have the option to open it in a new tab. If you want to save your gif, open it in a new tab, right-click it and click "Save link as...".


## The state of the project

Kineograph is currently a functional client-side animation platform, but there are still some more features I would like to add.

* Drawing tools
  * Primitives: straight lines, circles, rectangles, polygons
  * A paint bucket tool
  * Color picker
* Selection
  * You should be able to select a section of your canvas and move it around, or copy it and paste it somewhere else.
* Importing images

It would be nice if you could save your works-in-progress somewhere and load them later. I plan to do this at some point but it will mean developing Kineograph into a full-stack web application, which will take some time. Stay tuned!







