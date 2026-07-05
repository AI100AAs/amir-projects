import type { Language, TranslationResult } from '../types';

export type TranslationMode = 'regex' | 'llm';

interface Rule {
  pattern: RegExp;
  replacement: (...args: any[]) => string;
  explanation: string;
}

export async function translate(
  code: string,
  from: Language,
  to: Language,
  mode: TranslationMode = 'regex'
): Promise<TranslationResult> {
  if (mode === 'llm') {
    const { translateWithLLM } = await import('../services/llmService');
    return translateWithLLM(code, from, to);
  }
  const rules = getRules(from, to);
  let result = code;
  const comments: string[] = [];

  for (const rule of rules) {
    if (rule.pattern.test(code)) {
      result = result.replace(rule.pattern, (...args) => {
        return rule.replacement(...args);
      });
      comments.push(rule.explanation);
    }
  }

  const uniqueComments = [...new Set(comments)];
  const matchedRules = rules.filter(r => r.pattern.test(code)).length;
  const confidence = Math.min(0.95, matchedRules / Math.max(rules.length * 0.1, 1));

  return {
    translatedCode: result,
    comments: uniqueComments,
    confidence,
  };
}

function getRules(from: Language, to: Language): Rule[] {
  const key = `${from.slice(0, 2)}${to.slice(0, 2)}`;
  return RULES[key] || [];
}

const RULES: Record<string, Rule[]> = {
  py2cpp: [
    { pattern: /^def\s+(\w+)\s*\(([^)]*)\)\s*:/gm, replacement: (_, n, p) => `auto ${n}(${p.split(',').map((x: string) => 'auto ' + x.trim().split(':')[0].trim()).filter(Boolean).join(', ')})`, explanation: 'Python `def` with dynamic typing becomes C++ function with `auto` parameters.' },
    { pattern: /^(\s*)return\s+([^\n]+)/gm, replacement: (_, i, v) => `${i}return ${v};`, explanation: 'C++ requires semicolons after return.' },
    { pattern: /^(\s*)if\s+(.+):\s*$/gm, replacement: (_, i, c) => `${i}if (${c}) {`, explanation: 'C++ uses parentheses and curly braces for if.' },
    { pattern: /^(\s*)else\s*:?\s*$/gm, replacement: (_, i) => `${i}} else {`, explanation: 'C++ closes if block before else with curly braces.' },
    { pattern: /^(\s*)for\s+(\w+)\s+in\s+([^\n:]+?)\s*:\s*$/gm, replacement: (_, i, v, it) => `${i}for (const auto& ${v} : ${it.trim()}) {`, explanation: 'Python `for x in iterable` becomes C++ range-based for loop.' },
    { pattern: /^(\s*)while\s+(.+):\s*$/gm, replacement: (_, i, c) => `${i}while (${c}) {`, explanation: 'C++ uses parentheses and curly braces for while.' },
    { pattern: /^(\s*)print\((.+)\)\s*$/gm, replacement: (_, i, a) => `${i}std::cout << ${a} << std::endl;`, explanation: 'Python `print()` becomes C++ `std::cout`.' },
    { pattern: /^(\s*)# (.+)$/gm, replacement: (_, i, c) => `${i}// ${c}`, explanation: 'Python # comments become C++ // comments.' },
    { pattern: /\bNone\b/g, replacement: () => 'nullptr', explanation: 'Python `None` becomes C++ `nullptr`.' },
    { pattern: /\bTrue\b/g, replacement: () => 'true', explanation: 'Python `True` becomes C++ `true` (lowercase).' },
    { pattern: /\bFalse\b/g, replacement: () => 'false', explanation: 'Python `False` becomes C++ `false` (lowercase).' },
    { pattern: /\blen\(([^)]+)\)/g, replacement: (_, t) => `${t}.size()`, explanation: 'Python `len()` becomes C++ `.size()`.' },
    { pattern: /\.append\(/g, replacement: () => '.push_back(', explanation: 'Python `list.append()` becomes C++ `vector.push_back()`.' },
    { pattern: /\.pop\(\)/g, replacement: () => '.pop_back()', explanation: 'Python `list.pop()` becomes C++ `vector.pop_back()`.' },
    { pattern: /\bimport\s+(\w+)/g, replacement: (_, m) => `// #include <${m}>`, explanation: 'Python `import` becomes C++ `#include`.' },
    { pattern: /\blambda\s+(.+?)\s*:\s*(.+?)(?=\n|$)/g, replacement: (_, p, b) => `[](auto ${p}) { return ${b}; }`, explanation: 'Python lambda becomes C++ lambda.' },
    { pattern: /\braise\s+(\w+)(?:\(([^)]*)\))?/g, replacement: (_, t, a) => `throw ${t}${a ? '(' + a + ')' : '()'};`, explanation: 'Python `raise` becomes C++ `throw`.' },
    { pattern: /\bself\./g, replacement: () => 'this->', explanation: 'Python `self.` becomes C++ `this->`.' },
    { pattern: /\bclass\s+(\w+)(?:\(([^)]+)\))?\s*:/gm, replacement: (_, n, b) => b ? `class ${n} : public ${b} {` : `class ${n} {`, explanation: 'Python class inheritance becomes C++ class with `public` base.' },
    { pattern: /\b__init__\b/g, replacement: () => '// Constructor', explanation: 'Python `__init__` becomes C++ constructor.' },
    { pattern: /\bstr\b/g, replacement: () => 'std::string', explanation: 'Python `str` becomes C++ `std::string`.' },
    { pattern: /\blist\b/g, replacement: () => 'std::vector', explanation: 'Python `list` becomes C++ `std::vector`.' },
    { pattern: /\bdict\b/g, replacement: () => 'std::map', explanation: 'Python `dict` becomes C++ `std::map`.' },
    { pattern: /\bfloat\b/g, replacement: () => 'double', explanation: 'Python `float` becomes C++ `double`.' },
    { pattern: /\.strip\(\)/g, replacement: () => '.trim()', explanation: 'Python `.strip()` becomes C++ `.trim()`.' },
    { pattern: /\.lower\(\)/g, replacement: () => '.c_str() (use std::transform for lowercase)', explanation: 'Python `.lower()` has no direct C++ equivalent.' },
    { pattern: /\.upper\(\)/g, replacement: () => '.c_str() (use std::transform for uppercase)', explanation: 'Python `.upper()` has no direct C++ equivalent.' },
    { pattern: /\.sort\(\)/g, replacement: () => 'std::sort(', explanation: 'Python `.sort()` becomes C++ `std::sort()`.' },
    { pattern: /\.reverse\(\)/g, replacement: () => 'std::reverse(', explanation: 'Python `.reverse()` becomes C++ `std::reverse()`.' },
    { pattern: /\basync\s+def\b/g, replacement: () => 'auto', explanation: 'Python `async def` becomes C++ coroutines (std::future).' },
    { pattern: /\bawait\b/g, replacement: () => '.get()', explanation: 'Python `await` becomes C++ `.get()` on std::future.' },
    { pattern: /\byield\b/g, replacement: () => '// return (use C++20 std::generator)', explanation: 'Python `yield` becomes C++20 coroutines.' },
    { pattern: /\bwith\s+(.+?)\s+as\s+(\w+)\s*:/g, replacement: (_, r, v) => `// RAII: ${r} ${v}; // Resource auto-cleaned`, explanation: 'Python `with` becomes RAII in C++.' },
    { pattern: /\[([^\]]+?)\s+for\s+(\w+)\s+in\s+([^\]]+?)\]/g, replacement: (_, e, v, it) => `// std::vector result;\\n// for (const auto& ${v} : ${it}) { result.push_back(${e}); }`, explanation: 'Python list comprehensions become explicit loops in C++.' },
    { pattern: /\btry\s*:$/gm, replacement: () => 'try {', explanation: 'Python `try:` becomes C++ `try {`.' },
    { pattern: /^(\s*)except\s*(\w+)?\s*(?:\(([^)]+)\))?\s*:$/gm, replacement: (_, i, t, v) => t ? `${i}} catch (const ${t}& ${v || 'e'}) {` : `${i}} catch (...) {`, explanation: 'Python `except` becomes C++ `catch`.' },
  ],
  py2js: [
    { pattern: /^def\s+(\w+)\s*\(([^)]*)\)\s*:/gm, replacement: (_, n, p) => `function ${n}(${p.split(',').map((x: string) => x.trim().split(':')[0].trim()).filter(Boolean).join(', ')}) {`, explanation: 'Python `def` becomes JavaScript `function`.' },
    { pattern: /^(\s*)return\s+([^\n]+)/gm, replacement: (_, i, v) => `${i}return ${v};`, explanation: 'JavaScript requires semicolons after return.' },
    { pattern: /^(\s*)if\s+(.+):\s*$/gm, replacement: (_, i, c) => `${i}if (${c}) {`, explanation: 'JavaScript uses parentheses and curly braces.' },
    { pattern: /^(\s*)else\s*:?\s*$/gm, replacement: (_, i) => `${i}} else {`, explanation: 'JavaScript uses curly braces for else.' },
    { pattern: /^(\s*)for\s+(\w+)\s+in\s+([^\n:]+?)\s*:\s*$/gm, replacement: (_, i, v, it) => { const x = it.trim(); if (x.includes('.keys()')) return `${i}for (const ${v} of Object.keys(${x.replace('.keys()', '')})) {`; if (x.includes('.values()')) return `${i}for (const ${v} of Object.values(${x.replace('.values()', '')})) {`; if (x.includes('.items()')) return `${i}for (const [${v}Key, ${v}Val] of Object.entries(${x.replace('.items()', '')})) {`; return `${i}for (const ${v} of ${x}) {`; }, explanation: 'Python `for x in iterable` becomes `for...of`.' },
    { pattern: /^(\s*)while\s+(.+):\s*$/gm, replacement: (_, i, c) => `${i}while (${c}) {`, explanation: 'JavaScript uses parentheses and curly braces for while.' },
    { pattern: /^(\s*)print\((.+)\)\s*$/gm, replacement: (_, i, a) => `${i}console.log(${a});`, explanation: 'Python `print()` becomes JavaScript `console.log()`.' },
    { pattern: /^(\s*)# (.+)$/gm, replacement: (_, i, c) => `${i}// ${c}`, explanation: 'Python # comments become JavaScript // comments.' },
    { pattern: /\bNone\b/g, replacement: () => 'null', explanation: 'Python `None` becomes JavaScript `null`.' },
    { pattern: /\bTrue\b/g, replacement: () => 'true', explanation: 'Python `True` is already lowercase in JavaScript.' },
    { pattern: /\bFalse\b/g, replacement: () => 'false', explanation: 'Python `False` is already lowercase in JavaScript.' },
    { pattern: /\blen\(([^)]+)\)/g, replacement: (_, t) => `${t}.length`, explanation: 'Python `len()` becomes JavaScript `.length`.' },
    { pattern: /\.append\(/g, replacement: () => '.push(', explanation: 'Python `list.append()` becomes JavaScript `array.push()`.' },
    { pattern: /\.pop\(\)/g, replacement: () => '.pop()', explanation: 'Python `list.pop()` is the same as JavaScript `array.pop()`.' },
    { pattern: /\.keys\(\)/g, replacement: () => 'Object.keys(', explanation: 'Python `dict.keys()` becomes JavaScript `Object.keys()`.' },
    { pattern: /\.values\(\)/g, replacement: () => 'Object.values(', explanation: 'Python `dict.values()` becomes JavaScript `Object.values()`.' },
    { pattern: /\.items\(\)/g, replacement: () => 'Object.entries(', explanation: 'Python `dict.items()` becomes JavaScript `Object.entries()`.' },
    { pattern: /\bimport\s+(\w+)/g, replacement: (_, m) => `import * as ${m} from '${m}';`, explanation: 'Python `import` becomes JavaScript `import`.' },
    { pattern: /\bfrom\s+(\w+)\s+import\s+(\w+)/g, replacement: (_, m, i) => `import { ${i} } from '${m}';`, explanation: 'Python `from X import Y` becomes JavaScript named import.' },
    { pattern: /\[([^\]]+?)\s+for\s+(\w+)\s+in\s+([^\]]+?)\]/g, replacement: (_, e, v, it) => `[${it}.map(${v} => ${e})]`, explanation: 'Python list comprehensions become JavaScript `Array.map()`.' },
    { pattern: /\blambda\s+(.+?)\s*:\s*(.+?)(?=\n|$)/g, replacement: (_, p, b) => `(${p}) => ${b}`, explanation: 'Python lambda becomes JavaScript arrow function.' },
    { pattern: /\braise\s+(\w+)(?:\(([^)]*)\))?/g, replacement: (_, t, a) => `throw new ${t}${a ? '(' + a + ')' : '("Error")'};`, explanation: 'Python `raise` becomes JavaScript `throw new Error()`.' },
    { pattern: /\bself\b/g, replacement: () => 'this', explanation: 'Python `self` becomes JavaScript `this`.' },
    { pattern: /\bclass\s+(\w+)(?:\(([^)]+)\))?\s*:/gm, replacement: (_, n, b) => b ? `class ${n} extends ${b} {` : `class ${n} {`, explanation: 'Python class becomes JavaScript class.' },
    { pattern: /\b__init__\b/g, replacement: () => 'constructor', explanation: 'Python `__init__` becomes JavaScript `constructor`.' },
    { pattern: /\.strip\(\)/g, replacement: () => '.trim()', explanation: 'Python `.strip()` becomes JavaScript `.trim()`.' },
    { pattern: /\.lower\(\)/g, replacement: () => '.toLowerCase()', explanation: 'Python `.lower()` becomes JavaScript `.toLowerCase()`.' },
    { pattern: /\.upper\(\)/g, replacement: () => '.toUpperCase()', explanation: 'Python `.upper()` becomes JavaScript `.toUpperCase()`.' },
    { pattern: /\.replace\(/g, replacement: () => '.replace(', explanation: 'Python `.replace()` is similar to JavaScript.' },
    { pattern: /\.split\(/g, replacement: () => '.split(', explanation: 'Python `.split()` is the same as JavaScript.' },
    { pattern: /\.join\(/g, replacement: () => '.join(', explanation: 'Python `str.join()` becomes JavaScript `array.join()`.' },
    { pattern: /\.find\(/g, replacement: () => '.indexOf(', explanation: 'Python `.find()` becomes JavaScript `.indexOf()`.' },
    { pattern: /\.startswith\(/g, replacement: () => '.startsWith(', explanation: 'Python `.startswith()` becomes JavaScript `.startsWith()`.' },
    { pattern: /\.endswith\(/g, replacement: () => '.endsWith(', explanation: 'Python `.endswith()` becomes JavaScript `.endsWith()`.' },
    { pattern: /\.reverse\(\)/g, replacement: () => '.reverse()', explanation: 'Python `.reverse()` is the same as JavaScript.' },
    { pattern: /\.sort\(\)/g, replacement: () => '.sort()', explanation: 'Python `.sort()` is the same as JavaScript.' },
    { pattern: /\.copy\(\)/g, replacement: () => '[...]', explanation: 'Python `.copy()` becomes JavaScript spread `[...arr]`.' },
    { pattern: /\.clear\(\)/g, replacement: () => '.length = 0', explanation: 'Python `.clear()` becomes JavaScript `array.length = 0`.' },
    { pattern: /\basync\s+def\b/g, replacement: () => 'async function', explanation: 'Python `async def` becomes JavaScript `async function`.' },
    { pattern: /\byield\b/g, replacement: () => 'yield', explanation: 'Python `yield` is the same in JavaScript generators.' },
    { pattern: /\bawait\b/g, replacement: () => 'await', explanation: 'Python `await` is the same in JavaScript async functions.' },
    { pattern: /\bmap\((\w+),\s*(.+?)\)/g, replacement: (_, f, it) => `${it}.map(${f})`, explanation: 'Python `map()` becomes JavaScript `array.map()`.' },
    { pattern: /\bfilter\((\w+),\s*(.+?)\)/g, replacement: (_, f, it) => `${it}.filter(${f})`, explanation: 'Python `filter()` becomes JavaScript `array.filter()`.' },
    { pattern: /\breduce\((\w+),\s*(.+?),\s*(.+?)\)/g, replacement: (_, f, it, init) => `${it}.reduce(${f}, ${init})`, explanation: 'Python `reduce()` becomes JavaScript `array.reduce()`.' },
    { pattern: /\benumerate\(([^)]+)\)/g, replacement: (_, it) => `${it}.entries()`, explanation: 'Python `enumerate()` becomes JavaScript `array.entries()`.' },
    { pattern: /\btry\s*:$/gm, replacement: () => 'try {', explanation: 'Python `try:` becomes JavaScript `try {`.' },
    { pattern: /^(\s*)except\s*(\w+)?\s*(?:\(([^)]+)\))?\s*:$/gm, replacement: (_, i, t) => `${i}} catch (${t || 'e'}) {`, explanation: 'Python `except` becomes JavaScript `catch`.' },
    { pattern: /\b__name__\s*==\s*['"]__main__['"]/g, replacement: () => '// Check if module is entry point', explanation: 'Python `__name__ == "__main__"` has no JS equivalent.' },
  ],
  cpp2py: [
    { pattern: /^(\s*)(auto|void|int|double|float|std::string|std::vector|std::map|std::set|bool|long|short|char|unsigned)\s+/gm, replacement: (_, i) => `${i}`, explanation: 'C++ requires explicit types. Python uses dynamic typing.' },
    { pattern: /^(\s*)if\s*\(([^)]+)\)\s*\{/gm, replacement: (_, i, c) => `${i}if ${c}:`, explanation: 'C++ `if (cond) {` becomes Python `if cond:`.' },
    { pattern: /^(\s*)\}\s*else\s*\{/gm, replacement: (_, i) => `${i}else:`, explanation: 'C++ `} else {` becomes Python `else:`.' },
    { pattern: /^(\s*)for\s*\(\s*int\s+(\w+)\s*=\s*(\d+);\s*(\w+)\s*<\s*([^;]+);\s*\2\+\+\s*\)\s*\{/gm, replacement: (_, i, v, s, _vc, e) => `${i}for ${v} in range(${s}, ${e}):`, explanation: 'C++ for loops become Python `for x in range()`.' },
    { pattern: /^(\s*)for\s*\(\s*auto\s+&?\s*(\w+)\s*:\s*([^;]+)\)\s*\{/gm, replacement: (_, i, v, it) => `${i}for ${v} in ${it.trim()}:`, explanation: 'C++ range-based for becomes Python `for x in iterable:`.' },
    { pattern: /^(\s*)while\s*\(([^)]+)\)\s*\{/gm, replacement: (_, i, c) => `${i}while ${c}:`, explanation: 'C++ `while (cond) {` becomes Python `while cond:`.' },
    { pattern: /^(\s*)std::cout\s*<<\s*(.+?)\s*<<\s*std::endl;\s*$/gm, replacement: (_, i, a) => `${i}print(${a})`, explanation: 'C++ `std::cout << ... << std::endl` becomes Python `print()`.' },
    { pattern: /^(\s*)\/\/\s*(.+)$/gm, replacement: (_, i, c) => `${i}# ${c}`, explanation: 'C++ // comments become Python # comments.' },
    { pattern: /\bnullptr\b/g, replacement: () => 'None', explanation: 'C++ `nullptr` becomes Python `None`.' },
    { pattern: /\btrue\b/g, replacement: () => 'True', explanation: 'C++ `true` becomes Python `True`.' },
    { pattern: /\bfalse\b/g, replacement: () => 'False', explanation: 'C++ `false` becomes Python `False`.' },
    { pattern: /\bstd::string\b/g, replacement: () => 'str', explanation: 'C++ `std::string` becomes Python `str`.' },
    { pattern: /\bstd::vector\b/g, replacement: () => 'list', explanation: 'C++ `std::vector` becomes Python `list`.' },
    { pattern: /\bstd::map\b/g, replacement: () => 'dict', explanation: 'C++ `std::map` becomes Python `dict`.' },
    { pattern: /\bstd::set\b/g, replacement: () => 'set', explanation: 'C++ `std::set` becomes Python `set`.' },
    { pattern: /\.size\(\)/g, replacement: () => 'len(', explanation: 'C++ `.size()` becomes Python `len()`.' },
    { pattern: /\.push_back\(/g, replacement: () => '.append(', explanation: 'C++ `vector.push_back()` becomes Python `list.append()`.' },
    { pattern: /\.pop_back\(\)/g, replacement: () => '.pop()', explanation: 'C++ `vector.pop_back()` becomes Python `list.pop()`.' },
    { pattern: /\bthrow\s+(.+?);/g, replacement: (_, e) => `raise ${e}`, explanation: 'C++ `throw` becomes Python `raise`.' },
    { pattern: /^(\s*)try\s*\{/gm, replacement: (_, i) => `${i}try:`, explanation: 'C++ `try {` becomes Python `try:`.' },
    { pattern: /^(\s*)\}\s*catch\s*\((.+?)\)\s*\{/gm, replacement: (_, i, e) => `${i}except ${e}:`, explanation: 'C++ `} catch (e) {` becomes Python `except e:`.' },
    { pattern: /\b#include\s*[<"](.+?)[>"]/g, replacement: (_, m) => `import ${m.replace('.h', '').replace('/', '.')}`, explanation: 'C++ `#include` becomes Python `import`.' },
    { pattern: /\bthis->/g, replacement: () => 'self.', explanation: 'C++ `this->` becomes Python `self.`.' },
    { pattern: /\bvoid\s+(\w+)\s*\(([^)]*)\)\s*\{/gm, replacement: (_, n, p) => `def ${n}(${p.split(',').map((x: string) => x.trim().split(' ')[1] || 'arg').join(', ')}):`, explanation: 'C++ function declarations become Python `def`.' },
    { pattern: /\breturn\s+([^(;]+);\s*$/gm, replacement: (_, v) => v.trim() === ';' ? 'return' : `return ${v.trim()}`, explanation: 'C++ `return` is similar in Python without semicolons.' },
    { pattern: /\bnew\s+(\w+)/g, replacement: (_, t) => t.toLowerCase(), explanation: 'C++ `new` is not used in Python.' },
    { pattern: /\bdelete\s+(\w+)/g, replacement: (_, v) => `# ${v} - garbage collected`, explanation: 'C++ `delete` is not used in Python.' },
    { pattern: /\bconst\b/g, replacement: () => '', explanation: 'C++ `const` has no direct Python equivalent.' },
    { pattern: /\bstatic\b/g, replacement: () => '@staticmethod', explanation: 'C++ `static` becomes Python `@staticmethod`.' },
    { pattern: /\bclass\s+(\w+)\s*:\s*public\s*(\w+)\s*\{/gm, replacement: (_, n, b) => `class ${n}(${b}):`, explanation: 'C++ class inheritance becomes Python class inheritance.' },
    { pattern: /\bclass\s+(\w+)\s*\{/gm, replacement: (_, n) => `class ${n}:`, explanation: 'C++ class declaration becomes Python class declaration.' },
    { pattern: /\bstd::endl/g, replacement: () => '', explanation: 'C++ `std::endl` is implicit in Python `print()`.' },
    { pattern: /\busing\s+namespace\s+\w+;/g, replacement: () => '# No namespace in Python', explanation: 'C++ namespaces don\'t exist in Python.' },
    { pattern: /\bstd::make_shared\b/g, replacement: () => '', explanation: 'C++ `std::make_shared` has no Python equivalent.' },
    { pattern: /\bstd::unique_ptr\b/g, replacement: () => '', explanation: 'C++ `std::unique_ptr` has no Python equivalent.' },
  ],
  js2py: [
    { pattern: /^(\s*)function\s+(\w+)\s*\(([^)]*)\)\s*\{/gm, replacement: (_, i, n, p) => `${i}def ${n}(${p.split(',').map((x: string) => x.trim().split('=')[0].trim()).filter(Boolean).join(', ')}):`, explanation: 'JavaScript `function` becomes Python `def`.' },
    { pattern: /^(\s*)return\s+([^\n]+)/gm, replacement: (_, i, v) => `${i}return ${v}`, explanation: 'Python does not require semicolons after return.' },
    { pattern: /^(\s*)if\s*\(([^)]+)\)\s*\{/gm, replacement: (_, i, c) => `${i}if ${c}:`, explanation: 'JavaScript `if (cond) {` becomes Python `if cond:`.' },
    { pattern: /^(\s*)\}\s*else\s*\{/gm, replacement: (_, i) => `${i}else:`, explanation: 'JavaScript `} else {` becomes Python `else:`.' },
    { pattern: /^(\s*)for\s*\(\s*const\s+(\w+)\s+of\s+([^;]+)\)\s*\{/gm, replacement: (_, i, v, it) => `${i}for ${v} in ${it.trim()}:`, explanation: 'JavaScript `for...of` becomes Python `for x in iterable:`.' },
    { pattern: /^(\s*)for\s*\(\s*let\s+(\w+)\s*=\s*(\d+);\s*(\w+)\s*<\s*([^;]+);\s*\2\+\+\s*\)\s*\{/gm, replacement: (_, i, v, s, _vc, e) => `${i}for ${v} in range(${s}, ${e}):`, explanation: 'JavaScript for loops become Python `for x in range()`.' },
    { pattern: /^(\s*)while\s*\(([^)]+)\)\s*\{/gm, replacement: (_, i, c) => `${i}while ${c}:`, explanation: 'JavaScript `while (cond) {` becomes Python `while cond:`.' },
    { pattern: /^(\s*)console\.log\((.+)\)\s*$/gm, replacement: (_, i, a) => `${i}print(${a})`, explanation: 'JavaScript `console.log()` becomes Python `print()`.' },
    { pattern: /^(\s*)\/\/\s*(.+)$/gm, replacement: (_, i, c) => `${i}# ${c}`, explanation: 'JavaScript // comments become Python # comments.' },
    { pattern: /\bnull\b/g, replacement: () => 'None', explanation: 'JavaScript `null` becomes Python `None`.' },
    { pattern: /\btrue\b/g, replacement: () => 'True', explanation: 'JavaScript `true` becomes Python `True`.' },
    { pattern: /\bfalse\b/g, replacement: () => 'False', explanation: 'JavaScript `false` becomes Python `False`.' },
    { pattern: /\.length\b/g, replacement: () => 'len(', explanation: 'JavaScript `.length` becomes Python `len()`.' },
    { pattern: /\.push\(/g, replacement: () => '.append(', explanation: 'JavaScript `array.push()` becomes Python `list.append()`.' },
    { pattern: /\.pop\(\)/g, replacement: () => '.pop()', explanation: 'JavaScript `array.pop()` is the same as Python.' },
    { pattern: /\bObject\.keys\(/g, replacement: () => '', explanation: 'JavaScript `Object.keys()` has no direct Python equivalent.' },
    { pattern: /\bObject\.values\(/g, replacement: () => '', explanation: 'JavaScript `Object.values()` has no direct Python equivalent.' },
    { pattern: /\bObject\.entries\(/g, replacement: () => '', explanation: 'JavaScript `Object.entries()` has no direct Python equivalent.' },
    { pattern: /\bimport\s+\*\s+as\s+(\w+)\s+from\s+['"](.+?)['"]/g, replacement: (_, n, m) => `import ${m} as ${n}`, explanation: 'JavaScript `import * as` becomes Python `import ... as ...`.' },
    { pattern: /\bimport\s+\{\s*(\w+)\s*\}\s+from\s+['"](.+?)['"]/g, replacement: (_, n, m) => `from ${m} import ${n}`, explanation: 'JavaScript named import becomes Python `from ... import ...`.' },
    { pattern: /\[([^\]]+?)\.map\(([^)]+?)\)\]/g, replacement: (_, arr, fn) => `# List comprehension: [${fn} for item in ${arr}]`, explanation: 'JavaScript `Array.map()` becomes Python list comprehension.' },
    { pattern: /\b(\w+)\s*=>\s*([^;]+)/g, replacement: (_, p, b) => `lambda ${p}: ${b}`, explanation: 'JavaScript arrow function becomes Python `lambda`.' },
    { pattern: /\bthrow\s+new\s+(\w+)(?:\(([^)]*)\))?;/g, replacement: (_, t, a) => `raise ${t}(${a || '""'})`, explanation: 'JavaScript `throw new Error()` becomes Python `raise Exception()`.' },
    { pattern: /\bthis\b/g, replacement: () => 'self', explanation: 'JavaScript `this` becomes Python `self`.' },
    { pattern: /\bclass\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{/gm, replacement: (_, n, b) => b ? `class ${n}(${b}):` : `class ${n}:`, explanation: 'JavaScript class becomes Python class.' },
    { pattern: /\bconstructor\s*\(([^)]*)\)\s*\{/gm, replacement: (_, p) => `def __init__(self${p ? ', ' + p.split(',').map((x: string) => x.trim()).join(', ') : ''}):`, explanation: 'JavaScript `constructor` becomes Python `__init__`.' },
    { pattern: /\.trim\(\)/g, replacement: () => '.strip()', explanation: 'JavaScript `.trim()` becomes Python `.strip()`.' },
    { pattern: /\.toLowerCase\(\)/g, replacement: () => '.lower()', explanation: 'JavaScript `.toLowerCase()` becomes Python `.lower()`.' },
    { pattern: /\.toUpperCase\(\)/g, replacement: () => '.upper()', explanation: 'JavaScript `.toUpperCase()` becomes Python `.upper()`.' },
    { pattern: /\.replace\(/g, replacement: () => '.replace(', explanation: 'JavaScript `.replace()` is similar to Python.' },
    { pattern: /\.split\(/g, replacement: () => '.split(', explanation: 'JavaScript `.split()` is the same as Python.' },
    { pattern: /\.join\(/g, replacement: () => '\'\' .join(', explanation: 'JavaScript `array.join()` becomes Python `str.join()`.' },
    { pattern: /\.indexOf\(/g, replacement: () => '.index(', explanation: 'JavaScript `.indexOf()` becomes Python `.index()`.' },
    { pattern: /\.startsWith\(/g, replacement: () => '.startswith(', explanation: 'JavaScript `.startsWith()` becomes Python `.startswith()`.' },
    { pattern: /\.endsWith\(/g, replacement: () => '.endswith(', explanation: 'JavaScript `.endsWith()` becomes Python `.endswith()`.' },
    { pattern: /\.reverse\(\)/g, replacement: () => '.reverse()', explanation: 'JavaScript `.reverse()` is the same as Python.' },
    { pattern: /\.sort\(/g, replacement: () => '.sort(', explanation: 'JavaScript `.sort()` is the same as Python.' },
    { pattern: /\[\.\.\.(\w+)\]/g, replacement: (_, v) => `${v}.copy()`, explanation: 'JavaScript spread `[...arr]` becomes Python `.copy()`.' },
    { pattern: /\basync\s+function\s+(\w+)/g, replacement: (_, n) => `async def ${n}`, explanation: 'JavaScript `async function` becomes Python `async def`.' },
    { pattern: /\byield\b/g, replacement: () => 'yield', explanation: 'JavaScript `yield` is the same in Python generators.' },
    { pattern: /\bawait\b/g, replacement: () => 'await', explanation: 'JavaScript `await` is the same in Python async functions.' },
    { pattern: /\.filter\(/g, replacement: () => '# Use list comprehension with condition', explanation: 'JavaScript `array.filter()` becomes Python list comprehension.' },
    { pattern: /\.map\(/g, replacement: () => '# Use list comprehension or map()', explanation: 'JavaScript `array.map()` becomes Python list comprehension.' },
    { pattern: /\.reduce\(/g, replacement: () => '# Use functools.reduce()', explanation: 'JavaScript `array.reduce()` becomes Python `functools.reduce()`.' },
    { pattern: /\.entries\(\)/g, replacement: () => '.items()', explanation: 'JavaScript `array.entries()` becomes Python `.items()`.' },
    { pattern: /\btry\s*\{/gm, replacement: () => 'try:', explanation: 'JavaScript `try {` becomes Python `try:`.' },
    { pattern: /\}\s*catch\s*\((\w+)\)\s*\{/gm, replacement: (_, e) => `except Exception as ${e}:`, explanation: 'JavaScript `catch (e) {` becomes Python `except Exception as e:`.' },
    { pattern: /\b__name__\s*==\s*['"]__main__['"]/g, replacement: () => '// This check is implicit in Python scripts', explanation: 'JavaScript has no equivalent to Python `__name__ == "__main__"`.' },
  ],
};
