import test from 'node:test'
import assert from 'node:assert/strict'
import { parseReasoningEfforts } from '../lib/index.js'

test('parses reasoning_efforts array', () => {
  assert.deepEqual(parseReasoningEfforts({ reasoning_efforts: ['off', 'low', 'high'] }), { off: null, low: 'low', high: 'high' })
})

test('keeps gateway wire spellings', () => {
  assert.deepEqual(parseReasoningEfforts({ reasoning: { efforts: [
    { id: 'off' }, { id: 'high', wire: 'default' }, { id: 'max', value: 'ultra' },
  ] } }), { off: null, high: 'default', max: 'ultra' })
})

test('recognizes non-reasoning metadata', () => {
  assert.equal(parseReasoningEfforts({ reasoning: false }), false)
})

test('accepts object maps with explicit off wire values', () => {
  assert.deepEqual(parseReasoningEfforts({ reasoningEfforts: { off: 'none', high: 'default' } }), {
    off: 'none', high: 'default',
  })
})

test('uses null for off when an object entry omits a wire value', () => {
  assert.deepEqual(parseReasoningEfforts({ reasoning: { efforts: [{ id: 'off' }, { id: 'high' }] } }), {
    off: null, high: 'high',
  })
})