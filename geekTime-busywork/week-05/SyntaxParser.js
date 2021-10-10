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
        ["VariableDeclaration"],
        ["FunctionDeclarstion"]
    ],
    IfStatement: [
        ["if", "(", "Expression", ")", "Statement" ]
    ],
    VariableDeclaration: [
        ["var", "Identifier", ";"],
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
    PrimaryExpression: [
        ["(", "expression", ")"],
        ["Literal"],
        ["Identifier"]
    ],
    Literal: [
        ["Number"]
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

let source = `
    var a;
`

function parse(source) {
    let stack = [start]

    function reduce() {
        let state = stack[stack.length -1];

        if (state.$reduceType) {
            let children = [];
            for (let i; i < state.$reduceLength; i++) {
                children.push(stack.pop());
            }

            shift({
                type: state.$reduceType,
                children: children.reverse()
            });
        }
    }
     function shift(symbol) {
         let state = stack[stack.length -1];

         if (symbol.type in state) {
            stack.push(symbol);
         } else {

            reduce();
            shift(symbol)
         }
     }
     for (let symbol of scan(source)) {
        shift(synbol);
     }
}

parse(source);