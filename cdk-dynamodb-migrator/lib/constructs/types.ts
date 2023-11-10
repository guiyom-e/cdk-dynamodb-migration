import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { IFunction } from 'aws-cdk-lib/aws-lambda';

/** Base migration method */
interface GenericMigration {
  type: 'lambda';
  /** Lambda function to run migrations */
  migrationLambdaFunction: IFunction;
}

export type MigrationHandling = GenericMigration;

export type MigrationConfiguration = {
  /** Migration configuration id */
  id: string;
  /** Migration handling configuration */
  migrationHandling: MigrationHandling;
};

/** Versioning settings of MigrationConstruct */
export type VersioningSettings = {
  /** DynamoDB table to store migration state and versions */
  table: Table;
  /** Partition key name of the versioning table */
  partitionKeyName: string;
  /** Sort key name of the versioning table */
  sortKeyName: string;
  /** Partition key value to use for the versioning purpose */
  migrationPartitionKey: string;
  /** First version value */
  firstVersion: number;
};
