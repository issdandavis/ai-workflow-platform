/**
 * Playwright Global Teardown
 * 
 * Generates coverage report after all E2E tests complete.
 */

import { generateCoverageReport, printCoverageReport } from '../fixtures/coverage';

async function globalTeardown() {
  console.log('\n📊 Generating endpoint coverage report...');
  const report = generateCoverageReport();
  printCoverageReport(report);
}

export default globalTeardown;
