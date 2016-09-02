# Kineograph

Kineograph is a simple web app for making animated flipbooks in the browser. It's written in Javascript/JQuery and it's built on the HTML Canvas API. These are the project specifications as of 7/31/2016.


## Specifications

My idea for kineograph is to make an extremely simple but still powerful program for doing frame-by-frame animation. The interface is simple and intuitive, so anyone should be able to make flipbooks with minimal or no instruction. At the same time, kineograph will expose all the functionality of the Canvas API so that you can produce fairly sophisticated drawings. In a sense, kineograph is just a "skin" for the Canvas API with additional functionality for animating.

### Drawing and compositing

Anything you can do with the HTML Canvas you should be able to do in kineograph. You can:

* set line color and line weight
* undo an action (ctrl+z)
* import external images
* select sections of the drawing (rectangle select or polygon select)
* delete a selection
* copy and paste a selection
* you might be able to change the brush style (e.g. airbrush, fill bucket), but I'm not sure about that--it might be more involved
* use layers

#### Note on drawing mode

I'm currently developing kinograph on my laptop and I set up the drawing style with that in mind. It's a pain in the ass to draw with a trackpad (it's hard to drag lines), so I replaced "drag mode" with something more agreeable: clicking on the canvas begins a stroke and double clicking ends it. Clicking while a stroke is still open "saves" that segment of the stroke, so if you press ctrl+z before you close the stroke it will revert to that saved segment.

This drawing mode works well for me on my laptop, but obviously a "drag mode" makes much more sense if you're using a mouse or a tablet. Users will have access to both modes, and drag will probably be the default.

### Animation

Kineograph is designed for frame-by-frame animation. Cels are organized in a timeline. You can add a cel to the end of the timeline or insert it between existing cels. You can drag a cel to another position in the timeline and you can duplicate cels.

You can adjust the "width" of a cel so that it occupies multiple frames in the timeline. Kineograph supports **layers**, so, for example, you might have a background layer that stays the same throughout the animation. You only need to draw the background once and set it to fill the whole timeline. (This simplifies the interface and also reduces "space complexity," because the cel only needs to be saved once.)

Kineograph also supports multi-frame **onion skinning**. You can specify the *depth* of the onion skin to some reasonable limit as well as the *direction*.

#### More on layers

You should be able to view or hide a layer, lock a layer, and adjust the layer's opacity in your viewport. When you add a cel, it should be possible to add a cel to one layer or to multiple layers at once.

It might be a good idea to add a higher level of organization, depending on the performance constraints, so that layers can be grouped together and adjusted accordingly. (See Flash, for example.)

### Playback

You'll be able to play back the animation at any point and pause playback. You can also loop playback, over every frame in the animation or over a selection.

You can **export** your animation as a video file (format to be determined). You can set frame rate and video resolution (i.e. canvas size).


## Future plans

Once the animation app is completed my plan is to build a website around it so that people can create an account and publish their animations to the website's gallery or to other social media sites (Facebook, Tumblr, Reddit, whatever). 