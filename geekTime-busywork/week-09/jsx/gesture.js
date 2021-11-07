// let element = document.documentElement;
export class Dispatch {
    constructor(element) {
        this.element = element;
    }
    dispatch(type, properties) {
        let event = new Event(type);
        for(let name in properties) {
            event[name] = properties[name];
        }
        this.element.dispatchEvent(event);
    }
}



export class Listener {
    constructor(element, recognizer) {

        let isListeningMouse = false;

        let contexts = new Map();

        element.addEventListener("mousedown", event => {
        
            let context = Object.create(null);
            contexts.set("mouse" + (1 << event.button), context);
            // console.log("start", (1 << event.button));
            recognizer.start(event, context);
        
            let mousemove = event => {
                // console.log(event.clientX, event.clientY);
                let button = 1;
        
                while(button <= event.buttons) {
                    if (button & event.buttons) {
                        // order of buttons & button property is not same   buttons顺序有误，调整
                        let key;
                        if(button === 2)
                            key = 4;
                        else if(button === 4) 
                            key = 2;
                        else 
                            key = button;
                        let context = contexts.get("mouse" + key);
                        // console.log("move", (button));
                        recognizer.move(event, context);
                    }
                   button = button << 1;
                }
            }
            let mouseup = event => {
                let context = contexts.get("mouse" + (1 << event.button));
                recognizer.end(event, context);
                contexts.delete("mouse" + (1 << event.button));
        
                if(event.buttons === 0) {
                    document.removeEventListener("mousemove", mousemove);
                    document.removeEventListener("mouseup", mouseup);
                    isListeningMouse = false;
                }
            }
            if(!isListeningMouse) {
                document.addEventListener("mousemove", mousemove);
                document.addEventListener("mouseup", mouseup);
                isListeningMouse = true;
            }
        } )

        element.addEventListener("touchstart", event => {
            // console.log(event.changedTouches);
            for (let touch of event.changedTouches) {
                let context = Object.create(null);
                contexts.set(touch.identifier, context);
                recognizer.start(touch, context);
                
            }
        })

        element.addEventListener("touchmove", event => {
            // console.log(event.changedTouches);
            for (let touch of event.changedTouches) {
                let context = contexts.get(touch.identifier);
                recognizer.move(touch, context);
                
            }
        })

        element.addEventListener("touchend", event => {
            // console.log(event.changedTouches);
            for (let touch of event.changedTouches) {
                let context = contexts.get(touch.identifier);
                recognizer.end(touch, context);
                contexts.delete(touch.identifier);
                
            }
        })

        element.addEventListener("touchcancel", event => {
            // console.log(event.changedTouches);
            for (let touch of event.changedTouches) {
                let context = contexts.get(touch.identifier);
                recognizer.cancel(touch);
                contexts.delete(touch.identifier);
            }
        })
    }
}

export class Recognizer {
    constructor(dispatcher) {
        this.dispatcher = dispatcher;
    }
    start(point, context) {
        // console.log("start", point.clientX, point.clientY);
        context.startX = point.clientX, context.startY = point.clientY;
        context.points = [{
            t: Date.now(),
            x: point.clientX,
            y: point.clientY
        }];
    
        context.isTap = true;
        context.isPan = false;
        context.isPress = false;
    
        context.handler = setTimeout(() => {
            context.isTap = false;
            context.isPan = false;
            context.isPress = true;
            context.handler = null;
            this.dispatcher.dispatch("press", {});
            // console.log("press")
        }, 500)
    }

    move(point, context) {
        let dx = point.clientX - context.startX,  dy = point.clientY - context.startY;
    
        if (!context.isPan && dx ** 2 + dy ** 2 > 100) {
            context.isTap = false;
            context.isPan = true;
            context.isPress = false;
            context.isVertical = Math.abs(dx) < Math.abs(dy);
            // console.log("panstart");
            this.dispatcher.dispatch("panstart", {
                startX: context.startX,
                startY: context.startY,
                clientX: point.clientX,
                clientY: point.clientY,
                isVertical: context.isVertical
            });
            clearTimeout(context.handler);
        }
        if (context.isPan) {
            this.dispatcher.dispatch("pan", {
                startX: context.startX,
                startY: context.startY,
                clientX: point.clientX,
                clientY: point.clientY,
                isVertical: context.isVertical
            });
            // console.log(dx, dx);
            // console.log("pan");
        }
    
        context.points = context.points.filter(point => Date.now() - point.t < 500);
    
        context.points.push({
            t: Date.now(),
            x: point.clientX,
            y: point.clientY
        });
        // console.log("move", point.clientX, point.clientY);
    }

    end(point, context) {
        if (context.isTap) {
            // console.log("tap");
            this.dispatcher.dispatch("top", {});
            clearTimeout(context.handler);
    
        }
       
        if (context.isPress) {
            this.dispatcher.dispatch("pressend", {});
            console.log("pressend");
        }
        context.points = context.points.filter(point => Date.now() - point.t < 500);
        let d, v ; 
        if (!context.points.length) {
            v = 0;
        } else {
            d = Math.sqrt((point.clientX - context.points[0].x) ** 2 + (point.clientY - context.points[0].y) ** 2) ;  //距离计算，平方
            v = d / (Date.now() - context.points[0].t);     //时间计算
        }
    
        if(v > 1.5) {
            // console.log("flick");
            this.dispatcher.dispatch("flick", {
                startX: context.startX,
                startY: context.startY,
                clientX: point.clientX,
                clientY: point.clientY,
                isVertical: context.isVertical,
                isFlick: context.isFlick,
                velocity: v
            });
            context.isFlick = true;
        } else {
            context.isFlick = false;
        }

        if (context.isPan) {
            this.dispatcher.dispatch("panend", {
                startX: context.startX,
                startY: context.startY,
                clientX: point.clientX,
                clientY: point.clientY,
                isVertical: context.isVertical,
                isFlick: context.isFlick
            });
            // console.log("panend");
        }

        // console.log(v);
    
        // console.log("end", point.clientX, point.clientY);
    }
    cancel(point, context) {
        clearTimeout(context.handler);
        this.dispatcher.dispatch("cancel", {});
        // console.log("cancel", point.clientX, point.clientY);
        
    }
}

export function enableGesture(element) {
    new Listener(element, new Recognizer(new Dispatch(element)));
}