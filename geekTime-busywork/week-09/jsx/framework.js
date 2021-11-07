export function createElement(type, attributes, ...children) {
    let element;
    
    if (typeof type === "string") 
    //    element = document.createElement(type);
       element = new ElementWrapper(type);
    else 
        element = new type;
    for(let name in attributes) {
        element.setAttribute(name,attributes[name]);
    }
    for(let child of children) {
        //解决报错：类型 Failed to execute 'appendChild' on 'Node': parameter 1 is not of type 'Node'.
        if (typeof child ===  "string") {
            // child = document.createTextNode(child);
            child = new TextWrapper(child);
        }
        element.appendChild(child);
    }
    return element ;
}

export class Component {
    constructor(type) {
        // this.root = this.render();
    }
    setAttribute(name, value) {
        this.root.setAttribute(name, value);
    }
    appendChild(child) {
        // this.root.appendChild(child);
        child.mountTo(this.root)
    }
    mountTo(parent) {
        parent.appendChild(this.root)
    }
}

class ElementWrapper extends Component {
    constructor(type) {
        this.root = document.createElement(type);
    }
}

class TextWrapper extends Component {
    constructor(content) {
        this.root = document.createTextNode(content);
    }
}