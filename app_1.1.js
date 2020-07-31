var width = 1024; 
var height = 1024; 
      
var roiKey = false;
var roiMenu = false;    
var startPos = {x:0,y:0};
var roiValues = {x:0,y:0,width:0,height:0};    
      
        
var initialStagescale = 8;
var brushSize = initialStagescale/2;    
var initialStagepos = {x:0,y:0};    
var stagescale = 8;
var stage = new Konva.Stage({
          container: 'container',
          width: window.innerWidth,
          height: window.innerHeight - 25,
          scale: { x: stagescale, y: stagescale }    
      });

      
var background = new Konva.Layer({listening:false});

function init_backgroundImage(bgPath) 
      {
        var img = new Image();
        img.onload = function(){
             background.add(new Konva.Image({
                x:0,
                y:0,
                width: width,
                height: height,
                image: img,
                draggable: false,
                opacity: 1, //current_opacity
                name:'tile_image'
              }));
              background.draw();            
        };
        
        img.src = bgPath;
      }
      
var drawlayer = new Konva.Layer(); //{clearBeforeDraw:false}); 

var canvas = document.createElement('canvas');
var nativedrawcontext = canvas.getContext('2d');

function loadMsk(path){
          //https://konvajs.org/docs/sandbox/Native_Context_Access.html
        
        var kimg = new Konva.Image({
          image: canvas,
          draggable: false,
          name:'msk_process_firstpass'
        });
        drawlayer.add(kimg);
          
        var mskImage2 = new Image();
        mskImage2.onload = function(){
            // drawlayer.add( new Konva.Image({
            //   x:0,
            //   y:0,
            //   width: width,
            //   height: height,
            //   image: mskImage2,
            //   draggable: false,
            //   opacity: 1, //current_opacity
            //   name:'msk_process_firstpass'
            // }));
            // drawlayer.draw();
            
            nativedrawcontext.drawImage(mskImage2,0,0,width,height);
            drawlayer.batchDraw();
            nativedrawcontext.scale(1/stagescale,1/stagescale);
          };
               
        mskImage2.src = path;
        
        var rect = new Konva.Rect({
                        x: 0,
                        y: 0,
                        width: 00,
                        height: 00,
                        fillEnabled: false,
                        stroke: 'black',
                        strokeWidth: 1,
                        name: "roiRect"
                    });
        drawlayer.add(rect);  
          
}
      
function currentPixel(){
        var pointerPos = stage.getPointerPosition(); //Pointer position on the image. Left-top of the container(background) is the [0 0].
        var stgposition = stage.position(); // The distance of the stage from the left-top of the container.
        var ImPix_x = Math.floor((pointerPos.x - stgposition.x) / stagescale); // X coordinate of the pixel of the image where the cursor is on. Top-left is 0.
        var ImPix_y = Math.floor((pointerPos.y - stgposition.y) / stagescale);

        return {x:ImPix_x, y:ImPix_y};
}

function pixelToStage(pixel){
        
        var stgposition = stage.position();
        return {
          x: (pixel.x+0.5)*initialStagescale + initialStagepos.x, // Left-top Impix is [0, 0]. So, add 0.5 to point the center of the pixel.
          y: (pixel.y+0.5)*initialStagescale + initialStagepos.y
        };
}

function pixelToLinear(pixel) {
        return pixel.y*width + pixel.x;
}

function linearToPixel(idx) {
        return {x: idx%width, y: Math.floor(idx/width)};
}
      
function scrollbounds(v){
      //limit from 0.5 to 8 for scroll
           return Math.min(8,Math.max(0.5,v));
}    

var session_edits = {brush:new Set(),eraser:new Set()}; 

function addInteractions() {

        var isPaint = false;

        var mode = 'brush';

        nativedrawcontext.strokeStyle = '#FF0000';
        nativedrawcontext.fillStyle = "#FF0000";
        nativedrawcontext.globalCompositeOperation = 'source-over';


        var select = document.getElementById('tool');
        select.addEventListener('change', function() {
            mode = select.value;
        });        
        
        stage.on('mousedown touchstart', function() {
          isPaint = true;
          if(roiKey == true){
              let pix = currentPixel();
              var localEndPos = pixelToStage(pix);
              let hs = parseInt(stagescale/2);
              var rect = drawlayer.children[1];
              startPos = {x:pix.x,y:pix.y};
              rect.x(startPos.x);
              rect.y(startPos.y);
          }    
        });
 
        stage.on('mouseup touchend', function() {
            isPaint = false;
            if(roiKey == true){
              roiKey = false;
              var rect = drawlayer.children[1];
              roiValues = {x:rect.x(),y:rect.y(),width:rect.width(),height:rect.height()};    
              roiMenu = true;
              console.log(roiMenu);
        
          }
        });

        stage.on('mousemove touchmove', function(e) {
            
            if (!isPaint) {
                return;
            }

            let pix = currentPixel();
            var localEndPos = pixelToStage(pix);
            let hs = parseInt(stagescale/2);   
            
            if(roiKey == true){
                var rect = drawlayer.children[1];
                let width = pix.x - startPos.x;
                let height = pix.y - startPos.y;
                rect.width(width);
                rect.height(height);
                drawlayer.draw();
            }
            else{
                
            if(mode=="brush") {  
              for(i = 0; i<3;i++){  
                nativedrawcontext.fillRect(localEndPos.x-hs+2, localEndPos.y-hs+2, brushSize,brushSize);
              }
              
            }
            else if(mode=="eraser") {
              // nativedrawcontext.globalCompositeOperation = 'destination-out';
              nativedrawcontext.clearRect(localEndPos.x-hs+2, localEndPos.y-hs+2, brushSize,brushSize);
                  
            }

            drawlayer.draw();

            session_edits[mode].add(pixelToLinear(pix));
            //FIXME: brush can draw on first pass pixels also
            //FIXME: eraser would be adding too many (as we don't have visual feedback at non- firstpass non-drawn pixels)
            }
        });
        
        // var mskOpacity = 1;
        $(document).keyup(function(ev){
          let mskOpacity = drawlayer.children[0].opacity();
          // console.log(mskOpacity);
          var scaleIncrement = 0.5;    
          let opacities = [1,0.8,0.5,0.3,0];
          let idx = opacities.indexOf(mskOpacity);
          let newidx = (idx+1)%opacities.length;
          mskOpacity = opacities[newidx];

          if(ev.key=='m'){  
              
            drawlayer.children[0].setOpacity(mskOpacity);
            // nativedrawcontext.globalCompositeOperation = 'source-over';
            // nativedrawcontext.globalAlpha = mskOpacity;
            
            drawlayer.draw();            
          }  
           
        if(ev.key=='+'||ev.key=='-'){  
            var oldScale = stage.scaleX();
            var mousePointTo = {
                x: stage.getPointerPosition().x / oldScale - stage.x() / oldScale,
                y: stage.getPointerPosition().y / oldScale - stage.y() / oldScale
            };  
          if(ev.key=='+'){  
              //console.log("presed + "+stagescale); 
              newScale = scrollbounds(oldScale+scaleIncrement); 
              stage.scale({ x: newScale, y: newScale });
              var newPos = {
                  x: -(mousePointTo.x - stage.getPointerPosition().x / newScale) * newScale,
                  y: -(mousePointTo.y - stage.getPointerPosition().y / newScale) * newScale
              };
              if(newScale>0.5 && newScale<=4 && brushSize>=4)
                  {
                      brushSize = brushSize - 1;
                  }
             brushSize = newScale>=4?4:brushSize; 
              //stage.position(newPos);
          }    
          if(ev.key=='-'){  
              //console.log("presed - "+stagescale); 
              newScale = scrollbounds(oldScale-scaleIncrement); 
              stage.scale({ x: newScale, y: newScale });
              var newPos = {
                  x: -(mousePointTo.x - stage.getPointerPosition().x / newScale) * newScale,
                  y: -(mousePointTo.y - stage.getPointerPosition().y / newScale) * newScale
              };
              //stage.position(newPos);
              
              if(newScale>=0.5 && newScale<4 && brushSize<=11)
                  {
                      brushSize = brushSize + 1;
                  }
              brushSize = newScale>=4?4:brushSize;
          }
         stage.batchDraw();
         stagescale = newScale;   
        }
        if(ev.key=='w'||ev.key=='a'||ev.key=='s'||ev.key=='d')
            {
                var currPosition = stage.position();
                if(ev.key=='w'){
                    
                  stage.position({x:currPosition.x,y:currPosition.y+10*stagescale})
                }
                if(ev.key=='a'){
                  stage.position({x:currPosition.x+10*stagescale,y:currPosition.y})
                    
                }
                if(ev.key=='s'){
                  stage.position({x:currPosition.x,y:currPosition.y-10*stagescale})
                    
                }
                if(ev.key=='d'){
                  stage.position({x:currPosition.x-10*stagescale,y:currPosition.y})
                    
                    //drawlayer.add(rect2);
                    //background.draw();
                    
                }
                stage.draw();
            }
               
        if (ev.key=="h") {
          stage.position({x:100, y:100});
			    stage.batchDraw();
        }  
        if (ev.key == "c") {
          stage.position({x:-width/2, y:-height/2});
          stage.batchDraw();
        }
            
            
	    }); 
        
        $(document).keydown(function(ev){
            if(ev.key == "Shift"){
                roiKey = true;
            }
        });  
    
            
            var menuNode = document.getElementById('menu');
            stage.on('contextmenu', function (e) {
        // prevent default behavior
            e.evt.preventDefault();
            if (e.target === stage) {
          // if we are on empty place of the stage we will do nothing
                    return;
            }
            if (roiMenu == true){    
            console.log("inside")    
            currentShape = e.target;
        // show menu
            menuNode.style.display = 'initial';
            var containerRect = stage.container().getBoundingClientRect();
            menuNode.style.top =
            containerRect.top + stage.getPointerPosition().y + 4 + 'px';
            menuNode.style.left =
            containerRect.left + stage.getPointerPosition().x + 4 + 'px';
            }
        });
        window.addEventListener('click', () => {
        // hide menu
            if (roiMenu == true){
                menuNode.style.display = 'none';
           
            }
        });
        document.getElementById('cancel-button').addEventListener('click', () => {
         var rect = drawlayer.children[1];
            menuNode.style.display = 'none';
            roiMenu = false;
            rect.x(0);
            rect.y(0);
            rect.width(0);
            rect.height(0);
            drawlayer.draw();    
       
      });  
        
}    

function pixelate(layer){
        const nativeCtx = layer.getContext()._context; //https://github.com/konvajs/konva/issues/306
        nativeCtx.webkitImageSmoothingEnabled = false;
        nativeCtx.mozImageSmoothingEnabled = false;
        nativeCtx.imageSmoothingEnabled = false;
        nativeCtx.msImageSmoothingEnabled = false;
}    
      
function main(bgPath, path){
        init_backgroundImage(bgPath);
        stage.add(background);

        loadMsk(path);
        stage.add(drawlayer);

        pixelate(drawlayer);
        pixelate(background);

        addInteractions();
        stage.draw();
}



