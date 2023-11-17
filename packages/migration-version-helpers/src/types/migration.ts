export interface MigrateHandlerResponse {
  status: 'SUCCEEDED' | 'FAILED';
  targetVersion: number;
}

export type MigrationFunction<T = unknown> = () => Promise<T>;

export type MigrationOperator<T = unknown> = {
  id: number;
  handler: MigrationFunction<T>;
  direction: 'up' | 'down';
};

export interface Migration<T = unknown> {
  id: number;
  description?: string;
  up: MigrationFunction<T> | undefined;
  down: MigrationFunction<T> | undefined;
}
