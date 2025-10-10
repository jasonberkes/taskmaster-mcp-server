import * as SQL from '../sql-module.js';

export interface SqlConfig {
  server: string;
  database: string;
  user: string;
  password: string;
}

export async function handleSqlExecuteQuery(
  args: any,
  sqlConfig: SqlConfig
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { query, readOnly } = args as { query: string; readOnly?: boolean };
  console.error(`Executing SQL query (readOnly: ${readOnly ?? false})`);
  
  const result = await SQL.executeQuery(sqlConfig, query, readOnly ?? false);
  
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}

export async function handleSqlListTables(
  sqlConfig: SqlConfig
): Promise<{ content: Array<{ type: string; text: string }> }> {
  console.error('Listing database tables');
  
  const result = await SQL.listTables(sqlConfig);
  
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}

export async function handleSqlTableExists(
  args: any,
  sqlConfig: SqlConfig
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { tableName, schema } = args as { tableName: string; schema?: string };
  console.error(`Checking if table exists: [${schema || 'dbo'}].[${tableName}]`);
  
  const exists = await SQL.tableExists(sqlConfig, tableName, schema);
  
  return {
    content: [{ type: 'text', text: JSON.stringify({ exists }, null, 2) }],
  };
}

export async function handleSqlGetTableSchema(
  args: any,
  sqlConfig: SqlConfig
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { tableName, schema } = args as { tableName: string; schema?: string };
  console.error(`Getting table schema: [${schema || 'dbo'}].[${tableName}]`);
  
  const result = await SQL.getTableSchema(sqlConfig, tableName, schema);
  
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}

export async function handleSqlDropTable(
  args: any,
  sqlConfig: SqlConfig
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { tableName, schema, confirm } = args as {
    tableName: string;
    schema?: string;
    confirm: boolean;
  };
  console.error(`Dropping table: [${schema || 'dbo'}].[${tableName}] (confirm: ${confirm})`);
  
  await SQL.dropTable(sqlConfig, tableName, schema, confirm);
  
  return {
    content: [
      {
        type: 'text',
        text: `Table [${schema || 'dbo'}].[${tableName}] dropped successfully`,
      },
    ],
  };
}

export async function handleSqlApplySchemaFile(
  args: any,
  sqlConfig: SqlConfig
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { filePath, useTransaction } = args as {
    filePath: string;
    useTransaction?: boolean;
  };
  console.error(`Applying schema file: ${filePath}`);
  
  const result = await SQL.applySchemaFile(sqlConfig, filePath, useTransaction ?? true);
  
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}
