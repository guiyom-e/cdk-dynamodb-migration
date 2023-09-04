#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';

import { ExampleStack } from '../lib/exampleStack';

const app = new cdk.App();
new ExampleStack(app, 'ExampleStack', {});
