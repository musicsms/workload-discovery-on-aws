// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { createConfigService } from './lib/aws/configService.mjs';
import { createScheduler } from './lib/scheduler.mjs';
import { createStorage } from './lib/storage/index.mjs';
import { createDataPublisher } from './lib/dataPublisher/index.mjs';
import { createCostPipeline } from './lib/cost/pipeline.mjs';
import * as Config from './lib/config.mjs';
import logger from './lib/logger.mjs';
import { createAwsClient } from './lib/awsClient.mjs';
import { createGraphQLClient } from './lib/apiClient/graphql.mjs';
import { discoverResources } from './lib/index.mjs';
import { AggregatorNotFoundError, OrgAggregatorValidationError } from './lib/errors.mjs';
import { AWS_ORGANIZATIONS } from './lib/constants.mjs';
import neo4j from 'neo4j-driver';

// Create a Neo4j driver
const driver = neo4j.driver(
  `neo4j://${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '7687'}`,
  neo4j.auth.basic(process.env.DB_USER || 'neo4j', process.env.DB_PASS || 'password')
);

// Create AWS client
const awsClient = createAwsClient();

// Create GraphQL client
const graphQLClient = createGraphQLClient(Config);

// Using the config from the environment variables exported in config.mjs
const config = {
    aggregatorName: Config.configAggregator,
    crossAccountDiscovery: Config.crossAccountDiscovery,
    customUserAgent: Config.customUserAgent,
    graphApiUrl: Config.graphgQlUrl,
    isUsingOrganizations: Config.isUsingOrganizations,
    organizationUnitId: Config.organizationUnitId,
    region: Config.region,
    rootAccountId: Config.rootAccountId,
    rootAccountRole: Config.rootAccountRole,
    vpcId: Config.vpcId,
};

// Dynamically get the account ID at runtime and then run discovery
async function initialize() {
    try {
        // Get the current identity to determine the AWS account ID
        const identity = await awsClient.getCurrentIdentity(config.region);
        logger.info('Current AWS identity', { 
            accountId: identity.accountId,
            arn: identity.arn 
        });
        
        // Dynamically set the rootAccountId if not already set
        if (!config.rootAccountId) {
            config.rootAccountId = identity.accountId;
            Config.rootAccountId = identity.accountId;
            logger.info('Setting AWS account ID from current identity', { accountId: identity.accountId });
        }
        
        // Initialize services
        const configService = createConfigService(config);
        const storage = createStorage();
        const dataPublisher = createDataPublisher(config, storage);
        const scheduler = createScheduler(config, configService, dataPublisher);
        const costPipeline = createCostPipeline(storage);

        // Start the discovery process
        await discover();
        
        // Start scheduled jobs
        await Promise.all([scheduler.start(), costPipeline.start()]);
    } catch (error) {
        logger.error('Failed to initialize discovery service', { error: error.message });
        process.exit(1);
    }
}

// Discovery function
const discover = async () => {
  logger.profile('Discovery of resources complete.');

  try {
    // Initialize database schema
    const session = driver.session();
    try {
      // Create constraints for uniqueness
      await session.run('CREATE CONSTRAINT IF NOT EXISTS FOR (r:Resource) REQUIRE r.id IS UNIQUE');
      await session.run('CREATE CONSTRAINT IF NOT EXISTS FOR (a:Account) REQUIRE a.accountId IS UNIQUE');
      logger.info('Database schema initialized');
    } catch (error) {
      logger.error('Error initializing database schema:', error);
    } finally {
      await session.close();
    }

    // Run discovery process
    await discoverResources(graphQLClient, awsClient, config, driver);
  } catch (err) {
    if (err.message === 'Discovery process is already running') {
      logger.info(err.message);
    } else {
      throw err;
    }
  }

  logger.profile('Discovery of resources complete.');
};

// Start the application
initialize().catch(err => {
  if (err instanceof AggregatorNotFoundError) {
    logger.error(`${err.message}. Ensure the name of the supplied aggregator is correct.`);
  } else if (err instanceof OrgAggregatorValidationError) {
    logger.error(`${err.message}. You cannot use an individual accounts aggregator when cross account discovery is set to ${AWS_ORGANIZATIONS}.`, {
      aggregator: err.aggregator
    });
  } else {
    logger.error('Unexpected error in Discovery process.', {
      msg: err.message,
      stack: err.stack
    });
  }
  
  // Close the Neo4j driver
  driver.close();
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('Process interrupted. Closing database connection...');
  await driver.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Process terminated. Closing database connection...');
  await driver.close();
  process.exit(0);
}); 