export interface MigrateActionResponseProps {
  version: number;
  status: string;
}

export interface MigrateActionInputProps {
  version: number;
}

export type MigrationHandler = (props: MigrateActionInputProps) => Promise<MigrateActionResponseProps>;

export interface Migration {
  up: MigrationHandler
  down: MigrationHandler
}
