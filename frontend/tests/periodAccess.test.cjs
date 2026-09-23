const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { StaticRouter } = require('react-router-dom/server')

const source = fs.readFileSync(path.join(__dirname, '../src/features/period/PeriodAccess.tsx'), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
const context = { exports: {}, require }
vm.runInNewContext(compiled, context)
const { PeriodAccess } = context.exports

function render(props) {
  return renderToStaticMarkup(React.createElement(StaticRouter, { location: '/profile' },
    React.createElement(PeriodAccess, { payday: null, loading: false, error: '', onRetry() {}, ...props },
      React.createElement('main', null, 'Profil dan pencatatan tetap dapat diakses'))))
}

test('users without payday retain access and can navigate to settings', () => {
  const html = render({})
  assert.match(html, /<main>Profil dan pencatatan tetap dapat diakses<\/main>/)
  assert.match(html, /href="\/profile#periode-gaji"/)
  assert.match(html, /mulai tanggal 1/)
})

test('failed settings request shows retry alongside application content', () => {
  const html = render({ error: 'Pengaturan belum dapat dimuat' })
  assert.match(html, /<main>/)
  assert.match(html, /Coba lagi/)
  assert.match(html, /Atur tanggal gajian/)
})

test('loading and retrying never replace the application with a blocking screen', () => {
  assert.match(render({ loading: true }), /<main>/)
  const html = render({ loading: true, error: 'Pengaturan belum dapat dimuat' })
  assert.match(html, /<main>/)
  assert.match(html, /disabled=""/)
})

test('configured payday survives a load failure without claiming calendar fallback', () => {
  const html = render({ payday: 8, error: 'Pengaturan belum dapat dimuat' })
  assert.match(html, /<main>/)
  assert.doesNotMatch(html, /mulai tanggal 1/)
  assert.doesNotMatch(render({ payday: 8 }), /<aside/)
})
