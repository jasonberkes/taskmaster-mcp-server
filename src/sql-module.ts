import { Connection, Request, TYPES } from 'tedious';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';

export interface SqlConfig { server: string; database: string; user: string; password: string; }
export interface QueryResult { columns: string[]; rows: any[]; rowCount: number; }
export interface TableInfo { tableName: string; schema: string; rowCount?: number; }
export interface ColumnInfo { columnName: string; dataType: string; maxLength?: number; isNullable: boolean; isPrimaryKey: boolean; isForeignKey: boolean; }
export interface BatchResult { batchNumber: number; success: boolean; rowsAffected?: number; error?: string; sqlPreview?: string; }
export interface SchemaApplicationResult { success: boolean; totalBatches: number; successfulBatches: number; failedBatches: number; batchResults: BatchResult[]; error?: string; }

class SqlConnection {
  private config: SqlConfig;
  constructor(config: SqlConfig) { this.config = config; }
  async connect(): Promise<Connection> {
    return new Promise((resolve, reject) => {
      const connection = new Connection({
        server: this.config.server,
        authentication: { type: 'default', options: { userName: this.config.user, password: this.config.password } },
        options: { database: this.config.database, encrypt: true, trustServerCertificate: false, requestTimeout: 30000 },
      });
      connection.on('connect', (err) => err ? reject(new Error('Database connection failed')) : resolve(connection));
      connection.connect();
    });
  }
}

export async function executeQuery(config: SqlConfig, query: string, readOnly: boolean = false): Promise<QueryResult> {
  if (readOnly && ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE'].some(k => query.trim().toUpperCase().startsWith(k))) {
    throw new Error('Query rejected: Destructive operations not allowed in read-only mode');
  }
  const sqlConn = new SqlConnection(config);
  const connection = await sqlConn.connect();
  return new Promise((resolve, reject) => {
    const columns: string[] = [];
    const rows: any[] = [];
    const request = new Request(query, (err, rowCount) => {
      connection.close();
      if (err) reject(new Error('Query execution failed: ' + (err.message || 'Unknown error')));
      else resolve({ columns, rows, rowCount: rowCount || 0 });
    });
    request.on('columnMetadata', (columnsMetadata: any) => columnsMetadata.forEach((column: any) => columns.push(column.colName)));
    request.on('row', (columnsData: any) => {
      const row: any = {};
      columnsData.forEach((column: any) => { row[column.metadata.colName] = column.value; });
      rows.push(row);
    });
    connection.execSql(request);
  });
}

export async function listTables(config: SqlConfig): Promise<TableInfo[]> {
  const result = await executeQuery(config, 'SELECT t.TABLE_SCHEMA as [schema], t.TABLE_NAME as tableName, ISNULL(p.rows, 0) as [rowCount] FROM INFORMATION_SCHEMA.TABLES t LEFT JOIN sys.tables st ON t.TABLE_NAME = st.name LEFT JOIN sys.partitions p ON st.object_id = p.object_id AND p.index_id IN (0,1) WHERE t.TABLE_TYPE = \'BASE TABLE\' ORDER BY t.TABLE_SCHEMA, t.TABLE_NAME', true);
  return result.rows.map(row => ({ tableName: row.tableName, schema: row.schema, rowCount: row.rowCount || 0 }));
}

export async function tableExists(config: SqlConfig, tableName: string, schema: string = 'dbo'): Promise<boolean> {
  const sqlConn = new SqlConnection(config);
  const connection = await sqlConn.connect();
  return new Promise((resolve, reject) => {
    const request = new Request('SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @tableName', (err) => {
      connection.close();
      if (err) reject(new Error('Table existence check failed'));
    });
    request.addParameter('schema', TYPES.NVarChar, schema);
    request.addParameter('tableName', TYPES.NVarChar, tableName);
    request.on('row', (columns: any) => resolve(columns[0].value > 0));
    connection.execSql(request);
  });
}

export async function getTableSchema(config: SqlConfig, tableName: string, schema: string = 'dbo'): Promise<ColumnInfo[]> {
  const sqlConn = new SqlConnection(config);
  const connection = await sqlConn.connect();
  return new Promise((resolve, reject) => {
    const columns: ColumnInfo[] = [];
    const request = new Request('SELECT c.COLUMN_NAME as columnName, c.DATA_TYPE as dataType, c.CHARACTER_MAXIMUM_LENGTH as maxLength, c.IS_NULLABLE as isNullable, CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END as isPrimaryKey, CASE WHEN fk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END as isForeignKey FROM INFORMATION_SCHEMA.COLUMNS c LEFT JOIN (SELECT ku.TABLE_SCHEMA, ku.TABLE_NAME, ku.COLUMN_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku ON tc.CONSTRAINT_TYPE = \'PRIMARY KEY\' AND tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME) pk ON c.TABLE_SCHEMA = pk.TABLE_SCHEMA AND c.TABLE_NAME = pk.TABLE_NAME AND c.COLUMN_NAME = pk.COLUMN_NAME LEFT JOIN (SELECT ku.TABLE_SCHEMA, ku.TABLE_NAME, ku.COLUMN_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku ON tc.CONSTRAINT_TYPE = \'FOREIGN KEY\' AND tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME) fk ON c.TABLE_SCHEMA = fk.TABLE_SCHEMA AND c.TABLE_NAME = fk.TABLE_NAME AND c.COLUMN_NAME = fk.COLUMN_NAME WHERE c.TABLE_SCHEMA = @schema AND c.TABLE_NAME = @tableName ORDER BY c.ORDINAL_POSITION', (err) => {
      connection.close();
      if (err) reject(new Error('Failed to get table schema'));
      else resolve(columns);
    });
    request.addParameter('schema', TYPES.NVarChar, schema);
    request.addParameter('tableName', TYPES.NVarChar, tableName);
    request.on('row', (columnsData: any) => {
      const row: any = {};
      columnsData.forEach((column: any) => { row[column.metadata.colName] = column.value; });
      columns.push({ columnName: row.columnName, dataType: row.dataType, maxLength: row.maxLength, isNullable: row.isNullable === 'YES', isPrimaryKey: row.isPrimaryKey === 1, isForeignKey: row.isForeignKey === 1 });
    });
    connection.execSql(request);
  });
}

export async function dropTable(config: SqlConfig, tableName: string, schema: string = 'dbo', confirm: boolean = false): Promise<void> {
  if (!confirm) throw new Error('Table drop requires confirmation');
  if (!(await tableExists(config, tableName, schema))) throw new Error('Table does not exist');
  await executeQuery(config, 'DROP TABLE [' + schema + '].[' + tableName + ']', false);
}

function parseSqlBatches(sql: string): string[] {
  return sql.split(/^\s*GO\s*$/gmi).map(b => b.trim()).filter(b => b && b.split('\n').some(line => line.trim() && !line.trim().startsWith('--')));
}

async function executeBatch(connection: Connection, batch: string, batchNumber: number): Promise<BatchResult> {
  return new Promise((resolve) => {
    const request = new Request(batch, (err, rowCount) => {
      if (err) resolve({ batchNumber, success: false, error: err.message || 'Unknown error', sqlPreview: batch.substring(0, 200) });
      else resolve({ batchNumber, success: true, rowsAffected: rowCount || 0 });
    });
    connection.execSql(request);
  });
}

export async function applySchemaFile(config: SqlConfig, filePath: string, useTransaction: boolean = true): Promise<SchemaApplicationResult> {
  if (!existsSync(filePath)) throw new Error('Schema file not found: ' + filePath);
  const sql = await fs.readFile(filePath, 'utf-8');
  const batches = parseSqlBatches(sql);
  if (!batches.length) throw new Error('No executable SQL found');
  console.error('\n📄 Applying: ' + filePath + ' (' + batches.length + ' batches, transaction: ' + useTransaction + ')\n');
  const sqlConn = new SqlConnection(config);
  const connection = await sqlConn.connect();
  const batchResults: BatchResult[] = [];
  let successfulBatches = 0;
  let failedBatches = 0;
  try {
    if (useTransaction) {
      await new Promise<void>((resolve, reject) => connection.execSql(new Request('BEGIN TRANSACTION', (err) => err ? reject(err) : resolve())));
      console.error('✅ Transaction started\n');
    }
    for (let i = 0; i < batches.length; i++) {
      const result = await executeBatch(connection, batches[i], i + 1);
      batchResults.push(result);
      if (result.success) {
        successfulBatches++;
        console.error('✅ Batch ' + (i + 1) + '/' + batches.length);
      } else {
        failedBatches++;
        console.error('❌ Batch ' + (i + 1) + '/' + batches.length + ': ' + result.error);
        if (useTransaction) {
          console.error('\n⚠️  Rolling back...');
          await new Promise<void>((resolve, reject) => connection.execSql(new Request('ROLLBACK TRANSACTION', (err) => err ? reject(err) : resolve())));
          connection.close();
          return { success: false, totalBatches: batches.length, successfulBatches, failedBatches, batchResults, error: 'Rolled back at batch ' + (i + 1) };
        }
      }
    }
    if (useTransaction && !failedBatches) {
      await new Promise<void>((resolve, reject) => connection.execSql(new Request('COMMIT TRANSACTION', (err) => err ? reject(err) : resolve())));
      console.error('\n✅ Transaction committed');
    }
    connection.close();
    console.error('\n' + (failedBatches ? '⚠️  COMPLETED WITH ERRORS' : '✅ SUCCESS') + ' - Total: ' + batches.length + ', Success: ' + successfulBatches + ', Failed: ' + failedBatches + '\n');
    return { success: !failedBatches, totalBatches: batches.length, successfulBatches, failedBatches, batchResults };
  } catch (err) {
    connection.close();
    return { success: false, totalBatches: batches.length, successfulBatches, failedBatches, batchResults, error: (err as Error).message };
  }
}
