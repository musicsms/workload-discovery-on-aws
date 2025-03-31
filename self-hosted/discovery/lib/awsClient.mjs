// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { ConfiguredRetryStrategy } from '@smithy/util-retry';
import logger from './logger.mjs';

export function createAwsClient() {
    // Use credential provider chain (environment, shared ini files, etc.)
    const getCredentials = () => {
        return fromNodeProviderChain();
    };

    // For the rest of the AWS SDK clients, we need to wrap them in a 
    // function that provides credentials from the provider chain
    return {
        createApiGatewayClient: async (_, region) => {
            const { APIGateway } = await import('@aws-sdk/client-api-gateway');
            const credentials = await getCredentials();
            return new APIGateway({ 
                region, 
                credentials,
                retryStrategy: new ConfiguredRetryStrategy(3, () => false)
            });
        },
        
        createAppSyncClient: async (_, region) => {
            const { AppSync } = await import('@aws-sdk/client-appsync');
            const credentials = await getCredentials();
            return new AppSync({ 
                region, 
                credentials,
                retryStrategy: new ConfiguredRetryStrategy(3, () => false)
            });
        },
        
        // Add other AWS service clients with similar pattern
        createConfigServiceClient: async (region) => {
            const { ConfigService } = await import('@aws-sdk/client-config-service');
            const credentials = await getCredentials();
            return new ConfigService({ 
                region, 
                credentials,
                retryStrategy: new ConfiguredRetryStrategy(3, () => false)
            });
        },
        
        createStsClient: async (region) => {
            const { STS } = await import('@aws-sdk/client-sts');
            const credentials = await getCredentials();
            return new STS({ 
                region, 
                credentials,
                retryStrategy: new ConfiguredRetryStrategy(3, () => false)
            });
        },
        
        // Get current credentials and identity info
        getCurrentIdentity: async (region) => {
            try {
                const { STS } = await import('@aws-sdk/client-sts');
                const credentials = await getCredentials();
                const stsClient = new STS({ 
                    region, 
                    credentials,
                    retryStrategy: new ConfiguredRetryStrategy(3, () => false)
                });
                
                const response = await stsClient.getCallerIdentity({});
                return {
                    accountId: response.Account,
                    arn: response.Arn,
                    userId: response.UserId
                };
            } catch (error) {
                logger.error('Failed to get caller identity', { error: error.message });
                throw error;
            }
        }
    };
} 