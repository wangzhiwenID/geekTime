const css = require('css');
const EOF = Symbol('EOF')
let currnetToken = null
let currentAttribute = null
let currentTextNode = null
const stack = [{type: 'document', children: []}]
const idReg = /#([a-zA-Z0-9_-]+)/
const classReg = /(?<=\.)[a-z]+/g
const tagReg = /^[a-zA-Z0-9]+/g

let rules = []
function addCSSRules(text) {
  const ast = css.parse(text)
  rules.push(...ast.stylesheet.rules)
}

// 支持复合选择器与带空格的class选择器
function match(element, selector) {
  if (!element.attributes || !selector) {
    return false;
  }
  const at = element.attributes
  const idMatcher = idReg.exec(selector) 
  const id = idMatcher && idMatcher[1]
  const classes = selector.match(classReg)
  const tagMatcher = /^[a-zA-Z0-9]+/.exec(selector)
  const tag = tagMatcher && tagMatcher[0]

  if (tag && tag !== element.tagName) {
    return false
  }
  if (id) {
    const attr = at.find(r => r.name === 'id')
    return attr && id === attr.value
  }
  if (classes) {
    const attr = at.find(r => r.name === 'class')
    if (!attr) {
      return false
    }
    const elementClasses = attr.value.split(' ')
    if (classes.some(cl => !elementClasses.includes(cl))) {
      return false
    }
  }
  return true
}

function specificity(selector) {
  const p = [0, 0, 0, 0]
  const selectorParts = selector.split(' ')

  for (let part of selectorParts) {
    idReg.test(part) && (p[1] += 1)
    classReg.test(part) && (p[2] += 1)
    tagReg.test(part) && (p[3] += 1 )
  }

  return p
}

function compare(sp1, sp2) {
  if (!sp1) {
    return -1
  }
  if (sp1[0] - sp2[0]) {
    return sp1[0] - sp2[0]
  } else if (sp1[1] - sp2[1]) {
    return sp1[1] - sp2[1]
  } else if (sp1[2] - sp2[2]) {
    return sp1[2] - sp2[2]
  }
  return sp1[3] - sp2[3]
}

function computeCSS(element) {
  var elements = stack.slice().reverse()
  if (!element.computedStyle) {
    element.computedStyle = {}
  }

  for (let rule of rules) {
    const selectorPaths = rule.selectors[0].split(' ').reverse()
    if (!match(element, selectorPaths[0])) {
      continue
    }

    let matched = false

    let j = 1

    for (let i = 0;i < elements.length; i++) {
      if (match(elements[i], selectorPaths[j])) {
        j++
      }
      
    }
    if (j >= selectorPaths.length) {
      matched = true
    }

    if (matched) {
      // console.log('element match rule', rule)
      const computedStyle = element.computedStyle
      const sp = specificity(rule.selectors[0])
      for (let declaration of rule.declarations) {
        if (!computedStyle[declaration.property]) {
          computedStyle[declaration.property] = {}
        }

        if (compare(computedStyle[declaration.property].specificity, sp) < 0) {
          computedStyle[declaration.property].value = declaration.value
          computedStyle[declaration.property].specificity = sp
        }
      }

      console.log(element.computedStyle)
    }
  }

}

function emit(token) {
  let top = stack[stack.length -1]

  if (token.type === 'startTag') {
    let ele = {
      type: 'element',
      children: [],
      attributes: []
    }

    ele.tagName = token.tagName

    for (let p in token) { 
      if (p !== 'tagName' && p !== 'type') {
        ele.attributes.push({
          name: p,
          value: token[p]
        })
      }
    }
    computeCSS(ele)
    top.children.push(ele)
    ele.parent = top
    if (!token.isSelfClosing) {
      stack.push(ele)
    }

    currentTextNode = null
  } else if (token.type === 'endTag') {
    if (top.tagName !== token.tagName) {
      parseError()
    } else {
      if (top.tagName === 'style') {
        addCSSRules(top.children[0].content)
      }
      stack.pop()
    }
    currentTextNode = null
  }  else if (token.type === 'text') {
    if (!currentTextNode) {
      currentTextNode = {
        type: 'text',
        content: ''
      }
      top.children.push(currentTextNode)
    }
    currentTextNode.content += token.content
  }
}

function matchTagName(c) {
  return c.match(/^[a-zA-Z0-9]$/)
}

function matchSpace(c) {
  return c.match(/^[\t\n\f\s]$/)
}

function parseError() {
  throw new Error('parse error')
}

function updateCurrentTokenAttribute() {
  currnetToken[currentAttribute.name] = currentAttribute.value
}

function data(c) {
  if (c === '<') {
    return tagOpen
  } else if (c === EOF) {
    emit({
      type: 'EOF'
    })
    return ;
  } else {
    emit({
      type: 'text',
      content:c
    })
    return data
  }
}

function tagOpen(c) {
  if (c === '/') {
    return endTagOpen
  } else if (matchTagName(c)) {
    currnetToken = {
      type: 'startTag',
      tagName: ''
    }
    return tagName(c)
  } else {
    return ;
  }
}

function endTagOpen(c) {
  if (matchTagName(c)) {
    currnetToken = {
      type: 'endTag',
      tagName: ''
    }
    return tagName(c)
  } else if (c === '>') {
    parseError()
  } else if (c === EOF) {
    parseError()
  } else {

  }
}

function tagName(c) {
  if (matchSpace(c)) {
    return beforeAttributeName
  } else if (c === '/') {
    return selfClosingStartTag
  } else if (matchTagName(c)) {
    currnetToken.tagName += c
    return tagName
  } else if (c === '>') {
    emit(currnetToken)
    return data
  } else {
    return tagName
  }
}

function beforeAttributeName(c) {
  if (matchSpace(c)) {
    return beforeAttributeName
  } else if (c === '>' || c === '/' || c === EOF) {
    return afterAttributeName(c)
  } else if (c === '=') {
    return beforeAttributeName
  } else {
    currentAttribute = {
      name: '',
      value: ''
    }
    return attributeName(c)
  }
}

function attributeName(c) {
  if (matchSpace(c) || c === '/' || c === '>' || c === EOF) {
    return afterAttributeName(c)
  } else if (c === '=') {
    return beforeAttributeValue
  } else if (c === '\u0000') {

  } else if ( c === '/' || c === '\'' || c === '<') {

  } else {
    currentAttribute.name += c
    return attributeName
  }
}


function beforeAttributeValue(c) {
  if (matchSpace(c) || c === '/' || c === '>' || c === EOF) {
    return beforeAttributeValue
  } else if (c === '"') {
    return doubleQuotedAttributeValue
  } else if (c === '\'') {
    return singleQuotedAttributeValue
  } else if (c === '>') {
    return data
  } else {
    return UnquotedAttributeValue(c)
  }
}

function doubleQuotedAttributeValue(c) {
  if (c === '"') {
    updateCurrentTokenAttribute()
    return afterQuotedAttributeName
  } else if (c === '\u0000') {

  } else if (c === EOF) {

  } else {
    currentAttribute.value += c
    return doubleQuotedAttributeValue
  }
}


function singleQuotedAttributeValue(c) {
  if (c === '\'') {
    updateCurrentTokenAttribute()
    return afterQuotedAttributeName
  } else if (c === '\u0000') {

  } else if (c === EOF) {

  } else {
    currentAttribute.value += c
    return singleQuotedAttributeValue
  }
}

function UnquotedAttributeValue(c) {
  if (matchSpace(c)) {
    updateCurrentTokenAttribute()
    return beforeAttributeName
  } else if (c === '/') {
    updateCurrentTokenAttribute()
    return selfClosingStartTag
  } else if (c === '>') {
    updateCurrentTokenAttribute()
    emit(currnetToken)
    return data
  } else if (c === '\u0000') {

  } else if (c === '"' || c === '\'' || c === '<' || c === '=' || c === '`') {

  } else if (c === EOF) {

  } else {
    currentAttribute.value += c
    return UnquotedAttributeValue
  }
}

function afterQuotedAttributeName(c) {
  if (matchSpace(c)) {
    return beforeAttributeName
  } else if (c === '/') {
    return selfClosingStartTag
  } else if (c === '>') {
    updateCurrentTokenAttribute()
    emit(currnetToken)
    return data
  } else if (c === EOF) {

  } else {
    currentAttribute.value += c
    return 
  }
}


function afterAttributeName(c) {
  if (matchSpace(c)) {
    return afterAttributeName 
  } else if (c === '/') {
    return selfClosingStartTag
  } else if (c === '=') {
    return beforeAttributeValue
  } else if (c === '>') {
    updateCurrentTokenAttribute()
    emit(currnetToken)
    return data
  } else if (c === EOF) {

  } else {
    updateCurrentTokenAttribute()
    currnetToken = {
      value: '',
      name: ''
    }
    return attributeName(c)
  }
}

function selfClosingStartTag(c) {
  if (c === '>') {
    currnetToken.isSelfClosing = true
    emit(currnetToken)
    return data
  } else if (c === EOF) {
    parseError()
  } else {
    parseError()
  }
}

function parseHTML(html) {
  let state = data

  for (let c of html) {
    state = state(c)
  }

  state = state(EOF)
  return stack[0]
}



module.exports.parseHTML = parseHTML