// Based on the design of castl.js

//TODO: Scope Variables
//TODO: Implement Variable Types
//TODO: Finish README
//TODO: Tidy this file up
const parser = require('esprima')
const fs = require('fs')
const data = fs.readFileSync('./example.js', 'utf8');
const ast = parser.parse(data, {})

const variableContext = {
    variables: {}
}

function compileExpression(expression, meta) {
    switch(expression.type) {
        case "ArrayExpression":
            return compileArrayExpression(expression, meta);
        case "CallExpression":
            return compileCallExpression(expression, meta);
        case "Identifier":
            return compileIdentifier(expression, meta);
        case "Literal":
            return compileLiteral(expression, meta);
        default:
            // @string
            throw new Error("Unknown Expression type: " + expression.type);
    }
}

function compileCallExpression(expression, meta) {
    var compiledCallExpression = [];
    var compiledCallee = compileExpression(expression.callee, {
        ignoreSub: true
    });
    var compiledArguments = compileCallArguments(expression.arguments);

    // If callee is method of an object
    if (expression.callee.type === "MemberExpression") {
        throw new Error("Functions For Memeber Objects Not Supported Yet")
    } else {
        compiledCallExpression.push(compiledCallee);
        compiledCallExpression.push(compiledArguments);
    }

    return compiledCallExpression.join(' ');
}

function compileCallArguments(args) {
    var compiledArguments = [];
    var i;

    // @number
    for (i = 0; i < args.length; ++i) {
        compiledArguments.push(compileExpression(args[i]));
    }

    return compiledArguments.join(' ');
}

function compileIdentifier(identifier, meta) {

    const context = variableContext.variables[identifier.name]

    if(context && context.type === 'ArrayExpression') {
        return '${' + identifier.name + '[@]}'
    } else if (meta && meta.ignoreSub) {
        return identifier.name
    } else {
        return "$" + identifier.name
    }
}

function compileArrayExpression(expression, meta) {
    var compiledArrayExpression = ["("];
    var compiledElements = [];
    var i, length = expression.elements.length;

    // @number
    for (i = 0; i < length; ++i) {
        if (expression.elements[i] !== null) {
            compiledElements.push(compileExpression(expression.elements[i]));
        } else {
            compiledElements.push("nil");
        }
    }

    compiledArrayExpression.push(compiledElements.join(" "));
    compiledArrayExpression.push(")");

    return compiledArrayExpression.join("");
}

function compileLiteral(literal, meta) {
    var ret = literal.raw;

    switch (typeof (literal.value)) {
        case "string":
            // @string
            ret = '"' + literal.value + '"';
    }

    return ret;
}

function compileListOfStatements(statementList) {

    var compiledStatements = [];
    var i, compiledStatement;

    // @number
    for (i = 0; i < statementList.length; ++i) {
        compiledStatement = compileStatement(statementList[i]);

        // After compilation some statements may become empty strings
        // or 'undefined' such as VariableDeclaration and FunctionDeclaration
        if (compiledStatement !== "" && compiledStatement !== undefined) {
            compiledStatements.push(compiledStatement);
        }
    }

    return compiledStatements.join("\n");
}

function compileStatement(statement) {
    switch (statement.type) { 
        case "BlockStatement":
        return compileListOfStatements(statement.body);
        break;
        case "FunctionDeclaration":
        return compileFunctionDeclaration(statement);
        break;
        case "ExpressionStatement":
        return compileExpressionStatement(statement.expression);
        break;
        case "VariableDeclaration":
        return compileVariableDeclaration(statement);
        break;
        case "ForInStatement":
        return compileIterationStatement(statement);
        break;
        case "ReturnStatement":
        return compileReturnStatement(statement);
        break;
        default:
        // @string
        throw new Error("Unknown Statement type: " + statement.type);
    }
}

function compileReturnStatement(statement) {
    var compiledStatements = [];
    return "RETURN=" + compileExpression(statement.argument)
}

function compileExpressionStatement(expression, meta) {
    switch (expression.type) {
        case "CallExpression":
            // @string
            return compileExpression(expression, meta);
        default:
            // @string
            throw new Error("Unknown expression type: " + expression.type);
    }
}

function compileFunctionDeclaration(declaration) {
    var compiledFunctionDeclaration = [];
    var compiledId = compileIdentifier(declaration.id, {
        ignoreSub: true
    });

    compiledFunctionDeclaration.push(compiledId + " () {");
    compiledFunctionDeclaration.push(compileFunction(declaration));
    compiledFunctionDeclaration.push("}");

    return compiledFunctionDeclaration.join('\n')
}

function compileFunction(fun) {
    
    var compiledFunction = [];
    var compiledBody = "";

    // Compile body of the function
    if (fun.body.type === "BlockStatement") {
        compiledBody = compileStatement(fun.body);
    } else if (fun.body.type === "Expression") {
        compiledBody = compileExpression(fun.body);
    }

    // Params
    // TODO: fun.defaults are ignored for now
    if (fun.defaults && fun.defaults.length > 0) {
        console.log('Warning: default parameters of functions are ignored');
    }

    var i;
    var params = fun.params;
    var compiledParams = [];
    // @number
    for (i = 0; i < params.length; ++i) {
        const pattern = compilePattern(params[i], {
            ignoreSub: true
        })
        const argIndex = i + 1

        compiledParams.push(pattern + '=$' + argIndex);
    }

    // TODO: arguments function isn't implemented for now
    // TODO: If a global and a funciton share same name then there is a conflict
    compiledFunction.push(compiledParams.join("\n"));

    // Append body and close function
    compiledFunction.push(compiledBody);

    return compiledFunction.join('\n');
}

function compileVariableDeclaration(variableDeclaration) {
    
    var compiledDeclarations = [];
    var declarations = variableDeclaration.declarations;
    var i, declarator, pattern, expression, compiledDeclarationInit;

    for (i = 0; i < declarations.length; ++i) {
        declarator = declarations[i];
        pattern = compilePattern(declarator.id, {
            ignoreSub: true
        });

        if (declarator.init !== null) {

            variableContext.variables[pattern] = {
                type: declarator.init.type
            }

            expression = compileExpression(declarator.init);

            if (declarator.init.type === 'CallExpression') {
                compiledDeclarations.push(expression);

                var compiledDeclarationInit = [];
                compiledDeclarationInit.push(pattern);
                compiledDeclarationInit.push("=$RETURN");
                compiledDeclarations.push(compiledDeclarationInit.join(''));
            } else {
                var compiledDeclarationInit = [];
                compiledDeclarationInit.push(pattern);
                compiledDeclarationInit.push("=");
                compiledDeclarationInit.push(expression);
                compiledDeclarations.push(compiledDeclarationInit.join(''));
            }
        }
    }

    return compiledDeclarations.join("\n");
}

function compileIterationStatement(statement, compiledLabel) {
    var compiledIterationStatement = "";
    // continueNoLabelTracker.push(false);
    // protectedCallManager.openIterationStatement();

    switch (statement.type) {
    // case "ForStatement":
    //     compiledIterationStatement = compileForStatement(statement, compiledLabel);
    //     break;
    // case "WhileStatement":
    //     compiledIterationStatement = compileWhileStatement(statement, compiledLabel);
    //     break;
    // case "DoWhileStatement":
    //     compiledIterationStatement = compileDoWhileStatement(statement, compiledLabel);
    //     break;
    case "ForInStatement":
        compiledIterationStatement = compileForInStatement(statement, compiledLabel);
        break;
    default:
        // @string
        throw new Error("Not an IterationStatement " + statement.type);
    }
    // protectedCallManager.closeIterationStatement();
    // continueNoLabelTracker.pop();

    return compiledIterationStatement;
}

function compileForInStatement(statement, compiledLabel) {
    var compiledForInStatement = [];
    var compiledLeft;

    if (statement.left.type === "VariableDeclaration") {
        compiledLeft = compilePattern(statement.left.declarations[0].id, {
            ignoreSub: true
        });
    } else {
        compiledLeft = compileExpression(statement.left, {
            ignoreSub: true
        });
    }

    var compiledRight = compileExpression(statement.right, {
        ignoreSub: true
    })

    compiledForInStatement.push("for " + compiledLeft + " in " + compiledRight);
    compiledForInStatement.push("do")
    compiledForInStatement.push(compileStatement(statement.body));
    compiledForInStatement.push("done");

    return compiledForInStatement.join("\n");
}

function compilePattern(pattern, meta) {
    switch (pattern.type) {
    case "Identifier":
        return compileIdentifier(pattern, meta);
    case "RestElement":
        throw new Error("Rest parameters (ES6) not supported yet.");
    default:
        // @string
        throw new Error("Unknwown Pattern type: " + pattern.type);
    }
}

var code = "#!/bin/sh\n"
code += compileListOfStatements(ast.body)

console.log(code)
