/**
 * Sum Test v2.0
 * 
 * Example test demonstrating basic test patterns.
 * 
 * @version 2.0.0
 */

import { expect, test } from 'vitest'

function sum(a, b) {
  return a + b
}

test('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3)
})
