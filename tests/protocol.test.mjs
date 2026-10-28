import test from 'node:test';import assert from 'node:assert/strict';import {blocked,validateCases} from '../src/protocol.js';import {cases} from '../src/fixtures.js';
test('ambiguity never passes an expected binary or void outcome',()=>assert.deepEqual(blocked([{actual:'YES'},{actual:'AMBIGUOUS'},{actual:'NO'}],cases),['C2']));
test('matching all expected outcomes passes',()=>assert.deepEqual(blocked(cases.map(c=>({actual:c.expected})),cases),[]));
test('rejects malformed case count and unsupported expected answer',()=>{assert.throws(()=>validateCases('[]'));assert.throws(()=>validateCases(JSON.stringify(cases.map(c=>({...c,expected:'AMBIGUOUS'})))));});
test('valid suite accepted',()=>assert.equal(validateCases(JSON.stringify(cases)).length,3));
