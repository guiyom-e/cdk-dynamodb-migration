import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { MigrationConstruct, MigrationConstructProps } from './constructs';

/** MigrationStack props */
export type MigrationStackProps = MigrationConstructProps;

/** Stack with a migration construct */
export class MigrationStack extends Stack {
  public migrationConstruct: MigrationConstruct;

  constructor(scope: Construct, id: string, props: MigrationConstructProps) {
    super(scope, id, props);
    this.migrationConstruct = new MigrationConstruct(
      this,
      'MigrationConstruct',
      props,
    );
  }
}
