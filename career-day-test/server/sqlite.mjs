import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';

// The same SQL/API code runs on Cloudflare D1 and local Node SQLite.
export async function openDatabase(filename = ':memory:') {
  const sqlite = new DatabaseSync(filename);
  sqlite.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  sqlite.exec(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
  const prepare = sql => {
    const statement = sqlite.prepare(sql); let args = [];
    const prepared = {
      bind(...values) { args = values; return prepared; },
      async first() { return statement.get(...args) || null; },
      async all() { return { results: statement.all(...args), meta: { changes: 0 } }; },
      async run() { const info = statement.run(...args); return { results: [], meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) } }; },
      execute() {
        if (statement.columns().length) return { results: statement.all(...args), meta: { changes: 0 } };
        const info = statement.run(...args); return { results: [], meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) } };
      },
    };
    return prepared;
  };
  return {
    prepare,
    async batch(statements) {
      sqlite.exec('BEGIN IMMEDIATE');
      try { const results = statements.map(statement => statement.execute()); sqlite.exec('COMMIT'); return results; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
    close() { sqlite.close(); },
  };
}
