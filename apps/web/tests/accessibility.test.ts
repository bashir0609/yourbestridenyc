import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

for (const [component, prefix, count] of [
  ['ContactForm', 'contact', 4],
  ['TransportationInquiryForm', 'transportation-inquiry', 9],
  ['DriverApplicationForm', 'driver-application', 8],
] as const) {
  test(`${component}: all validated controls associate active errors and clear resolved errors`, () => {
    const source = readFileSync(
      new URL(`../src/components/forms/${component}.tsx`, import.meta.url),
      'utf8',
    );
    const tree = ts.createSourceFile(
      'form.tsx',
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const controls: ts.JsxAttributes[] = [];
    const messages = new Map<string, ts.JsxAttributes>();
    const attr = (attrs: ts.JsxAttributes, name: string) =>
      attrs.properties.find(
        (p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText(tree) === name,
      )?.initializer;
    const text = (attrs: ts.JsxAttributes, name: string) => {
      const value = attr(attrs, name);
      return value && ts.isStringLiteral(value) ? value.text : undefined;
    };
    const visit = (node: ts.Node) => {
      if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
        if (
          ['input', 'textarea', 'select'].includes(node.tagName.getText(tree)) &&
          /errors\./.test(attr(node.attributes, 'className')?.getText(tree) ?? '')
        )
          controls.push(node.attributes);
        if (text(node.attributes, 'className') === 'field-error')
          messages.set(text(node.attributes, 'id') ?? '', node.attributes);
      }
      ts.forEachChild(node, visit);
    };
    visit(tree);
    assert.equal(controls.length, count);
    assert.equal(messages.size, count);
    for (const attrs of controls) {
      const field = text(attrs, 'name');
      assert.ok(field);
      const errorId = `${prefix}-${field}-error`;
      assert.ok(messages.has(errorId));
      assert.equal(text(messages.get(errorId)!, 'role'), 'alert');
      const evaluate = (name: string, errors: Record<string, string>) => {
        const value = attr(attrs, name);
        assert.ok(value && ts.isJsxExpression(value) && value.expression);
        return runInNewContext(value.expression.getText(tree), { errors });
      };
      assert.equal(evaluate('aria-invalid', { [field]: 'Invalid value' }), true);
      assert.equal(evaluate('aria-describedby', { [field]: 'Invalid value' }), errorId);
      assert.equal(evaluate('aria-invalid', {}), undefined);
      assert.equal(evaluate('aria-describedby', {}), undefined);
      assert.equal(evaluate('aria-invalid', { unrelated: 'Other error' }), undefined);
    }
  });
}

test('booking readiness assigns a missing title and preserves meaningful vendor titles', () => {
  const source = readFileSync(
    new URL('../src/components/limo-anywhere-booking.tsx', import.meta.url),
    'utf8',
  );
  const statement = source.match(/if \(!iframe\.title\.trim\(\)\) iframe\.title = '[^']+';/)?.[0];
  assert.ok(statement);
  assert.ok(source.indexOf(statement) > source.indexOf('const markReady ='));
  assert.ok(source.indexOf(statement) < source.indexOf('const observer ='));
  for (const title of ['', '  \n ', 'Vendor reservation portal', '  Vendor supplied title  ']) {
    const iframe = { title };
    runInNewContext(statement, { iframe });
    assert.equal(iframe.title, title.trim() ? title : 'Your Best Ride secure reservation form');
  }
});
