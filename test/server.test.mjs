import test from 'node:test';
import assert from 'node:assert/strict';
import {applyReplacement,validateEdit} from '../server.mjs';

test('replacement changes only selected source interval',()=>{
  assert.equal(applyReplacement('# Title\n\nOld paragraph\n\n# Next',9,22,'New paragraph'), '# Title\n\nNew paragraph\n\n# Next');
});
test('replacement can delete a block',()=>{
  assert.equal(applyReplacement('abcXYZdef',3,6,''),'abcdef');
});
test('reject malformed intervals',()=>{
  assert.throws(()=>applyReplacement('abc',0,99,'z'));
  assert.throws(()=>applyReplacement('abc',1,1,'z'));
});
test('accept valid edit instruction and reject invalid',()=>{
  assert.doesNotThrow(()=>validateEdit({content:'hello',start:0,end:5,instruction:'Verkort',selectedText:'hello'}));
  assert.throws(()=>validateEdit({content:'hello',start:0,end:6,instruction:'Verkort',selectedText:'hello'}));
});
