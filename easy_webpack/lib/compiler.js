const path = require('path');
const fs = require('fs');
const Parser = require('./parser');

class Compiler {
	constructor(options) {
		const { entry, output } = options;
		this.entry = entry;
		this.output = output;
		this.modules = [];
	}

	run() {
		const info = this.build(this.entry);
		this.modules.push(info);
		this.modules.forEach(({ dependecies }) => {
			if (dependecies) {
				for (const dependency in dependecies) {
					this.modules.push(this.build(dependecies[dependency]));
				}
			}
		});
		const dependencyGraph = this.modules.reduce(
			(graph, item) => ({
				...graph,
				[item.filename]: {
					dependecies: item.dependecies,
					code: item.code,
				},
			}),
			{}
		);

		this.generate(dependencyGraph);
	}

	build(filename) {
		const { getAst, getCode, getDependecies } = Parser;
		const ast = getAst(filename);
		const dependecies = getDependecies(ast, filename);
		const code = getCode(ast);
		return {
			dependecies,
			code,
			filename,
		};
	}

	generate(code) {
		const filePath = path.join(this.output.path, this.output.filename);
		const bundle = `(function(graph){
			function require(moduleId){ 
			  function localRequire(relativePath){
				return require(graph[moduleId].dependecies[relativePath])
			  }
			  var exports = {};
			  (function(require,exports,code){
				eval(code)
			  })(localRequire,exports,graph[moduleId].code);
			  return exports;
			}
			require('${this.entry}')
		  })(${JSON.stringify(code)})`;
		fs.writeFileSync(filePath, bundle, 'utf-8');
	}
}

module.exports = Compiler;
