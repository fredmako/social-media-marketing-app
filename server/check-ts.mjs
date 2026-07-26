const ts = require('typescript');
const program = ts.createProgram(['src/server.ts'], {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  esModuleInterop: true,
  strict: true,
  skipLibCheck: true,
  outDir: 'dist',
  rootDir: 'src',
  sourceMap: true,
});
const result = program.emit();
ts.flattenDiagnosticMessageText(result.diagnostics ? '' : ts.getTsEmitDiagnostics(program).map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n'), '\n');
console.log('emit exit:', result.emitSkipped ? 'skipped' : 'ok');
