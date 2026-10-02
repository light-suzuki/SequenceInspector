import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

// Exercise the shipped inline script without copying its analysis algorithms.
// These small DOM stand-ins do not replace real-browser or launcher smoke tests.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function app(language = 'en') {
  const elements = Object.fromEntries(
    [...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => [id, {
      textContent: '', innerHTML: '', value: '', hidden: id === 'result',
    }]),
  );
  elements.enz.value = 'EcoRI,BamHI,HindIII';
  const context = vm.createContext({
    ...elements,
    localStorage: { lang: language },
    navigator: { language },
    document: {
      documentElement: {},
      querySelector: selector => elements[selector.slice(1)],
    },
  });
  vm.runInContext(script, context, { timeout: 1000 });
  return {
    elements,
    analyze(sequence) {
      elements.seq.value = sequence;
      vm.runInContext('analyze.onclick()', context, { timeout: 1000 });
      return elements;
    },
    orfs(sequence) {
      // Convert the VM result to ordinary objects for cross-context assertions.
      context.inputSequence = sequence;
      return JSON.parse(vm.runInContext('JSON.stringify(findOrfs(inputSequence))', context));
    },
  };
}

test('normalizes raw DNA and one multiline FASTA record', () => {
  for (const sequence of ['ga at\ttc\n', '>record\r\ngaa\r\nttc\r\n']) {
    const result = app().analyze(sequence);
    assert.equal(result.error.textContent, '');
    assert.equal(result.result.hidden, false);
    assert.equal(result.summary.textContent, 'Length: 6 bp · GC: 33.33%');
    assert.match(result.cuts.innerHTML, /<td>EcoRI<\/td><td>1<\/td>/);
  }
});

for (const stop of ['TAA', 'TAG', 'TGA', 'TAR', 'TRA']) {
  for (let offset = 0; offset < 3; offset++) {
    test(`30-aa minimum excludes stop codon: ${stop}, frame ${offset + 1}`, () => {
      const inspector = app();
      const prefix = 'C'.repeat(offset);
      assert.deepEqual(inspector.orfs(prefix + 'ATG' + 'AAA'.repeat(28) + stop), []);
      assert.deepEqual(inspector.orfs(prefix + 'ATG' + 'AAA'.repeat(29) + stop), [
        { f: offset + 1, s: offset + 1, e: offset + 93, l: 30 },
      ]);
      assert.deepEqual(inspector.orfs(prefix + 'ATG' + 'AAA'.repeat(30) + stop), [
        { f: offset + 1, s: offset + 1, e: offset + 96, l: 31 },
      ]);
    });
  }
}

test('29-aa ORF is not rendered under the 30-aa heading', () => {
  const result = app().analyze('ATG' + 'AAA'.repeat(28) + 'TAA');
  assert.match(result.orfTitle.textContent, /30 aa/);
  assert.equal(result.orfs.innerHTML, 'None');
});

test('requires an in-frame stop and stops at the first one', () => {
  const inspector = app();
  assert.deepEqual(inspector.orfs('ATG' + 'AAA'.repeat(30)), []);
  assert.deepEqual(inspector.orfs('ATGAAATAA' + 'AAA'.repeat(30) + 'TAA'), []);
});

for (const language of ['en', 'ja']) {
  test(`rejects multiple FASTA records without a synthetic junction (${language})`, () => {
    const result = app(language).analyze('>one\r\nGAA\r\n>two\r\nTTC');
    assert.equal(result.error.textContent, language === 'ja'
      ? 'FASTAは1レコードずつ入力してください。'
      : 'Enter only one FASTA record at a time.');
    assert.equal(result.result.hidden, true);
    assert.equal(result.cuts.innerHTML, '');
  });
}

test('invalid submissions hide prior results and a later valid submission recovers', () => {
  const inspector = app();
  for (const invalid of ['', 'ACGT!', '>one\nGAA\n>two\nTTC']) {
    assert.equal(inspector.analyze('GAATTC').result.hidden, false);
    const rejected = inspector.analyze(invalid);
    assert.notEqual(rejected.error.textContent, '');
    assert.equal(rejected.result.hidden, true);
    const recovered = inspector.analyze('GGATCC');
    assert.equal(recovered.error.textContent, '');
    assert.equal(recovered.result.hidden, false);
    assert.match(recovered.cuts.innerHTML, /<td>BamHI<\/td><td>1<\/td>/);
  }
});

test('accepts the documented IUPAC DNA alphabet', () => {
  const result = app().analyze('ACGTRYSWKMBDHVN');
  assert.equal(result.error.textContent, '');
  assert.equal(result.result.hidden, false);
});

test('certain ambiguous stops terminate candidates before the minimum', () => {
  for (const stop of ['TAR', 'TRA']) {
    assert.deepEqual(app().orfs('ATG' + stop + 'AAA'.repeat(29) + 'TAA'), []);
  }
});

test('mixed sense/stop ambiguity does not imply a certain stop', () => {
  for (const codon of ['TGR', 'TRR', 'NNN', 'GCN', 'ATH']) {
    assert.deepEqual(app().orfs('ATG' + codon + 'AAA'.repeat(28) + 'TAA'), [
      { f: 1, s: 1, e: 93, l: 30 },
    ]);
  }
});

test('nested starts and partial trailing codons preserve candidate coordinates', () => {
  const sequence = 'ATGATG' + 'AAA'.repeat(29) + 'TAA';
  const expected = [{ f: 1, s: 1, e: 96, l: 31 }, { f: 1, s: 4, e: 96, l: 30 }];
  for (const suffix of ['', 'A', 'AT']) assert.deepEqual(app().orfs(sequence + suffix), expected);
  assert.deepEqual(app().orfs('ATG' + 'AAA'.repeat(29) + 'TA'), []);
});

test('normalizes BOM, line endings and surrounding FASTA whitespace', () => {
  for (const separator of ['\n', '\r\n', '\r']) {
    const result = app().analyze('\ufeff  >record' + separator + '  gaa ' + separator + '\tttc\t');
    assert.equal(result.error.textContent, '');
    assert.equal(result.summary.textContent, 'Length: 6 bp · GC: 33.33%');
  }
});

test('rejects sequence data before a FASTA header and indented multiple headers', () => {
  for (const raw of ['GAA\n>record\nTTC', 'GAA\r>record\rTTC', '\ufeff>one\r\nGAA\r\n  >two\r\nTTC']) {
    const result = app().analyze(raw);
    assert.equal(result.error.textContent, 'Enter only one FASTA record at a time.');
    assert.equal(result.result.hidden, true);
    assert.equal(result.cuts.innerHTML, '');
  }
});
