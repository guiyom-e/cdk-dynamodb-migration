export interface MigrateActionResponseProps {
  status: string;
  targetVersion: number;
}

export type MigrationHandler = () => Promise<{ status: string }>;

export interface Migration {
  id: number;
  description?: string;
  up: MigrationHandler | undefined;
  down: MigrationHandler | undefined;
}
