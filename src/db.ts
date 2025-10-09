import { Connection, Request, TYPES } from 'tedious';

type TediousType = typeof TYPES[keyof typeof TYPES];

export interface DbConfig {
  server: string;
  database: string;
  user: string;
  password: string;
}

export class Database {
  private config: DbConfig;

  constructor(config: DbConfig) {
    this.config = config;
  }

  private async connect(): Promise<Connection> {
    return new Promise((resolve, reject) => {
      const connection = new Connection({
        server: this.config.server,
        authentication: {
          type: 'default',
          options: {
            userName: this.config.user,
            password: this.config.password,
          },
        },
        options: {
          database: this.config.database,
          encrypt: true,
          trustServerCertificate: false,
        },
      });

      connection.on('connect', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(connection);
        }
      });

      connection.connect();
    });
  }

  async executeQuery<T = any>(
    query: string,
    parameters: Array<{ name: string; type: TediousType; value: any }>
  ): Promise<T[]> {
    const connection = await this.connect();

    return new Promise((resolve, reject) => {
      const results: T[] = [];

      const request = new Request(query, (err) => {
        connection.close();
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });

      // Add parameters
      for (const param of parameters) {
        request.addParameter(param.name, param.type, param.value);
      }

      // Handle rows
      request.on('row', (columns: any) => {
        const row: any = {};
        columns.forEach((column: any) => {
          row[column.metadata.colName] = column.value;
        });
        results.push(row);
      });

      connection.execSql(request);
    });
  }

  async executeProcedure(
    procedureName: string,
    parameters: Array<{ name: string; type: TediousType; value: any }>,
    outputParameters?: Array<{ name: string; type: TediousType }>
  ): Promise<any> {
    const connection = await this.connect();

    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const outputValues: any = {};

      const request = new Request(procedureName, (err) => {
        connection.close();
        if (err) {
          reject(err);
        } else {
          resolve({
            results,
            output: outputValues,
          });
        }
      });

      // Add input parameters
      for (const param of parameters) {
        request.addParameter(param.name, param.type, param.value);
      }

      // Add output parameters
      if (outputParameters) {
        for (const param of outputParameters) {
          request.addOutputParameter(param.name, param.type);
        }
      }

      // Handle rows
      request.on('row', (columns: any) => {
        const row: any = {};
        columns.forEach((column: any) => {
          row[column.metadata.colName] = column.value;
        });
        results.push(row);
      });

      // Handle return status and output parameters
      request.on('returnValue', (parameterName, value) => {
        outputValues[parameterName] = value;
      });

      connection.callProcedure(request);
    });
  }
}
