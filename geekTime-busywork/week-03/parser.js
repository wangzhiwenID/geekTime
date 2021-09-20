const css = require('css');

const EOF = Symbol('EOF');

const layout = require("./layout.js");

let currentToken = null;

let currentAttribute = null;

let stack = [{
    type: "document",
    children: []
}];

let currentTexNode = null;

let rules = [];
function addCssRules(text) {
    var ast = css.parse(text);
    rules.push(...ast.stylesheet.rules);
}

function match(element, selector) {
    if (!selector || !element.attributes) {
        return false;
    }

    if (selector.charAt(0) == "#") {
        var attr = element.attributes.filter(attr => attr.name === "id")[0];
        if (attr && attr.value === selector.replace("#", ''))
            return true;
    } else if (selector.charAt(0) == ".") {
        var attr = element.attributes.filter(attr => attr.name === "class")[0];
        if (attr && attr.value === selector.replace(".", ''))
            return true;
    } else {
        if (element.tagName === selector) {
            return true;
        }
    }
}



