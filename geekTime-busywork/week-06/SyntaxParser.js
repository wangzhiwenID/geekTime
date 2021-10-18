import {scan} from "./LexParser.js" ;

let syntax = {
    Program: [
        ["StatementList", "EOF"]
    ],
    StatementList: [
        ["Statement"],
        ["StatementList", "Statement"]
    ],
    Statement: [
        ["ExpressionStatement"],
        ["IfStatement"],
        ["WhileStatement"],
        ["VariableDeclaration"],
        ["FunctionDeclarstion"],
        ["Block"],
        ["BreakStatement"],
        ["ContinueStatement"],
        ["FunctionDeclaration"]
    ],
    FunctionDeclaration: [
        ["function", "Identifier", "(", ")", "{", "StatementList", "}"]
    ],
    BreakStatement: [
        ["break", ";"]
    ],
    ContinueStatement: [
        ["continue", ","]
    ],
    Block: [
        ["{", "StatementList", "}"],
        ["{", "}"]
    ],
    WhileStatement: [
        ["while", "(", "Expression", ")", "Sttatement"]
    ],
    IfStatement: [
        ["if", "(", "Expression", ")", "Statement" ]
    ],
    VariableDeclaration: [
        // ["var", "Identifier", ";"],
        ["let", "Identifier", ";"]
    ],
    FunctionDeclarstion: [
        ["function", "Identifier", "(", ")", "{", "StatementList", "}"]
    ],
    ExpressionStatement: [
        ["Expression", ";"]
    ],
    Expression: [
        ["AdditiveExpression"]
    ],
    AssignmentExpression: [
        ["LeftHandSideExpression", "=", "LogicalORExpression"],
        ["LogicalORExpression"]
    ],
    LogicalORExpression: [
        ["LogicalANDExpression"],
        ["LogicalORExpression", "|", "LogicalANDExpression"]
    ],
    LogicalANDExpression: [
        ["AdditiveExpression"],
        ["LogicalANDExpression", "&&", "LogicalANDExpression"]
    ],
    AdditiveExpression: [
        ["MultiplicativeExpression"],
        ["AdditiveExpression", "+", "MultiplicativeExpression"],
        ["AdditiveExpression", "-", "MultiplicativeExpression"]
    ],
    MultiplicativeExpression: [
        ["PrimaryExpression"],
        ["MultiplicativeExpression", "*", "PrimaryExpression"],
        ["MultiplicativeExpression", "/", "PrimaryExpression"]
    ],
    LeftHandSideExpression: [
        ["CallExpression"],
        ["NewExpression"]
    ],
    CallExpression: [
        ["MemberExpression", "Arguments"],
        ["CallExpression", "Arguments"]
    ],
    Arguments: [
        ["(", ")"],
        ["(", "ArgumentList", ")"]
    ],
    ArgumentList: [
        ["AssignmentExpression"],
        ["ArgumentList", "AssignmentExpression"]
    ],
    NewExpression: [
        ["MemberExpression"],
        ["new", "NewExpression"]
    ],
    MemberExpression: [
        ["PrimaryExpression"],
        ["PrimaryExpression", ".", "Identifier"],
        ["PrimaryExpression", "[", "Expression", "]"]
    ],
    PrimaryExpression: [
        ["(", "expression", ")"],
        ["Literal"],
        ["Identifier"]
    ],
    Literal: [
        ["NumericLiteral"]
        ["StringLiteral"],
        ["BooleanLiteral"],
        ["NullLiteral"],
        ["RegularExpressionLiteral"],
        ["ObjectLiteral"],
        ["ArrayLiteral"]
    ],
    ObjectLiteral: [
        ["{", "}"],
        ["{", "PropertyList", "}"]
    ],
    PropertyList: [
        ["Property"],
        ["PropertyList", ",", "Property"]
    ],
    Property: [
        ["StringLiteral", ":", "AdditiveExpression"],
        ["Identifier", ":", "AdditiveExpression"]
    ]
}

let hash = {

}

function closure(state) {
    hash[JSON.stringify(state)] = state;
    let queue = [];
    for (let symbol in state) {
        if (symbol.match(/^$/)) {
            return;
        }
        queue.push(symbol);
    }
    while(queue.length) {
        let symbol = queue.shift();

        if (syntax[symbol]) {
            for (let rule of syntax[symbol]) {
                if (!state[rule[0]]) {
                    queue.push(rule[0]);
                }
                let current = state;
                for (let part of rule) {
                    if(!current[part]) {
                        current[part] = {}
                    }
                    current = current[part];
                }
                current.$reduceType = symbol;
                current.$reduceLength = rule.length;
            }
        }
    }
    for (let symbol in state) {
        if (symbol.match(/^$/)) {
            return;
        }
        if (hash[JSON.stringify(state[symbol])]) {
            state[symbol] = hash[JSON.stringify(state[symbol])];
        } else {
            closure(state[symbol]);
        }
    }
}

let end = {
    $isEnd: true
}

let start = {
    "Program": end
}

closure(start);

//00000000000000000000000000000
let source = `
    var a;
`

export function parse(source) {
    let stack = [start]
    let symbolStack = [];
    function reduce() {
        let state = stack[stack.length -1];

        if (state.$reduceType) {
            let children = [];
            for (let i; i < state.$reduceLength; i++) {
                stack.pop();
                children.push(stack.pop());
            }

            return{
                type: state.$reduceType,
                children: children.reverse()
            };
        } else {
            throw new Error("unexpected token");
        }
    }
     function shift(symbol) {
         let state = stack[stack.length -1];

         if (symbol.type in state) {
            stack.push(state[symbol.type]);
            symbolStack.push(symbol);
         } else {

            shift(reduce());
            shift(symbol)
         }
     }
     for (let symbol of scan(source)) {
        shift(symbol);
     }

     return reduce();
}

