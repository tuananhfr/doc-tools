export function configuration() {
  const password = process.env.DB_PASSWORD
  const salt = process.env.VISIT_HASH_SECRET
  if (password === undefined || !salt) throw new Error('DB_PASSWORD and VISIT_HASH_SECRET must be configured')
  return {
    port: Number(process.env.PORT ?? 3003), host: process.env.HOST ?? '127.0.0.1',
    visitHashSecret: salt,
    database: { host: process.env.DB_HOST ?? '127.0.0.1', port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? 'doc_tools', password, database: process.env.DB_NAME ?? 'doc_tools',
      connectionLimit: 10, charset: 'utf8mb4', supportBigNumbers: true, bigNumberStrings: true },
  }
}
