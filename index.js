/*
 * @Des: 页面、组件说明
 * @Author: ur name
 * @Date: 2020-08-27 19:07:00
 * @query: {string} p1  内容ID
 * @props: {string} p1  数据源
 * @event: {string} p1  des
 */
const loaderUtils = require('loader-utils')
const parser = require('@babel/parser')
const t = require('@babel/types')
const core = require('@babel/core')
const traverse = require('@babel/traverse').default

const DEFAULT = {
  catchCode: identifier => `console.error(${identifier})`,
  identifier: 'e',
  finallyCode: null
}

const isAsyncFuncNode = node =>
  t.isFunctionDeclaration(node, {
    async: true
  }) || t.isArrowFunctionExpression(node, {
    async: true
  }) || t.isFunctionExpression(node, {
    async: true
  }) || t.isObjectMethod(node, {
    async: true
  })

module.exports = function(source) {
  let options = loaderUtils.getOptions(this)
  let ast = parser.parse(source, {
    sourceType: 'module',
    plugins: ["dynamiImport"]
  })
  options = {
    ...DEFAULT,
    ...options
  }

  if (typeof options.catchCode === 'function') {
    options.catchCode = options.catchCode(options.identifier)
  }

  let catchNode = parser.parse(options.catchCode).program.body
  let finallyNode = options.finallyCode && parser.parse(options.finallyCode).program.body

  traverse(ast, {
    AwaitExpression(path) {
      while (path && path.node) {
        let parentPath = path.parentPath
        if (t.isBlockStatement(path.node) && isAsyncFuncNode(parentPath.node)) {
          let tryCatchAst =  t.tryStatement(
            path.node,
            t.catchClause(
              t.identifier(options.identifier),
              t.blockStatement(catchNode)
            ),
            finallyNode && t.blockStatement(finallyNode)
          )
          path.replaceWithMultiple([replaceWithMultiple])
          return
        } else if (t.isBlockStatement(path.node) && t.isTryStatement(parentPath.node)) {
          return
        }
        path = parentPath
      }
    }
  })
  return core.transformFromAstSync(ast, null, {
    configFile: false
  }).code
}
