// The integration tests use their own database, next to the one in
// DATABASE_URL, so they never touch development data. The imports in
// particular apply whole files, and close every unit and person that isn't
// in them.
export const testDatabaseURL = (url: string): URL => {
  const test = new URL(url)
  test.pathname = `${test.pathname}_test`
  return test
}
