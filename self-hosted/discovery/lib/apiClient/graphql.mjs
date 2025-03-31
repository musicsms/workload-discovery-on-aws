// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as R from 'ramda';
import {request} from 'undici';
import retry from 'async-retry';

import logger from '../logger.mjs';

async function sendQuery(opts, name, {query, variables = {}}) {
  return retry(async bail => {
    try {
      const response = await request(opts.graphgQlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Workload-Discovery-Requester': 'discovery-process'
        },
        body: JSON.stringify({
          query,
          variables
        })
      });

      const body = await response.body.json();
      const {errors} = body;
      if (errors != null) {
        logger.error('Error executing GraphQL request', {errors, query, variables});
        return bail(new Error(JSON.stringify(errors)));
      }
      return body.data[name];
    } catch (err) {
      logger.error(`Error sending GraphQL request: ${err.message}`);
      throw err;
    }
  }, {
    retries: 3,
    onRetry: (err, count) => {
      logger.error(`Retry attempt for ${name} no ${count}: ${err.message}`);
    }
  });
}

function createPaginator(operation, PAGE_SIZE) {
  return async function*(args) {
    let pageSize = PAGE_SIZE;
    let start = 0;
    let end = pageSize;
    let resources = null;

    do {
      try {
        resources = await operation({pagination: {start, end}, ...args});
        yield resources;
        if (R.isEmpty(resources)) break;
        start = start + pageSize;
        pageSize = PAGE_SIZE;
        end = end + pageSize;
      } catch(err) {
        if (err.message.includes('response size too large')) {
          pageSize = Math.floor(pageSize / 2);
          logger.debug(`Response size too large, reducing page size to ${pageSize}`);
          end = start + pageSize;
        } else {
          throw err;
        }
      }
    } while(true);
  }
}

const getAccounts = opts => async () => {
  const name = 'getAccounts';
  const query = `
    query ${name} {
      getAccounts {
        accountId
        lastCrawled
        name
        regions {
          name
        }
      }
    }`;
  return sendQuery(opts, name, {query});
};

const addRelationships = opts => async relationships => {
  const name = 'addRelationships';
  const query = `
  mutation ${name}($relationships: [RelationshipInput]!) {
    ${name}(relationships: $relationships) {
      id
    }
  }`;
  const variables = {relationships};
  return sendQuery(opts, name, {query, variables});
};

const addResources = opts => async resources => {
  const name = 'addResources';
  const query = `
  mutation ${name}($resources: [ResourceInput]!) {
    ${name}(resources: $resources) {
      id
      label
    }
  }`;
  const variables = {resources};
  return sendQuery(opts, name, {query, variables});
};

const getResources = opts => async ({pagination, resourceTypes, accounts}) => {
  const name = 'getResources';
  const query = `
  query ${name}(
  $pagination: Pagination
  $resourceTypes: [String]
  $accounts: [AccountInput]
) {
  getResources(
    pagination: $pagination
    resourceTypes: $resourceTypes
    accounts: $accounts
  ) {
    id
    label
    md5Hash
    properties {
      accountId
      arn
      availabilityZone
      awsRegion
      configuration
      configurationItemCaptureTime
      configurationStateId
      configurationItemStatus
      loggedInURL
      loginURL
      private
      resourceCreationTime
      resourceName
      resourceId
      resourceType
      resourceValue
      state
      supplementaryConfiguration
      subnetId
      subnetIds
      tags
      title
      version
      vpcId
      dBInstanceStatus
      statement
      instanceType
    }
  }
}`;
  const variables = {pagination, resourceTypes, accounts};
  return sendQuery(opts, name, {query, variables});
};

const getRelationships = opts => async ({pagination}) => {
  const name = 'getRelationships';
  const query = `
  query ${name}($pagination: Pagination) {
    getRelationships(pagination: $pagination) {
      target {
        id
        label
      }
      id
      label
      source {
        id
        label
      }
    }
  }`;
  const variables = {pagination};
  return sendQuery(opts, name, {query, variables});
};

const deleteResources = opts => async resources => {
  const name = 'deleteResources';
  const query = `
  mutation ${name}($resources: [ResourceDeleteInput]!) {
    deleteResources(resources: $resources) {
      id
    }
  }`;
  const variables = {resources};
  return sendQuery(opts, name, {query, variables});
};

const deleteRelationships = opts => async relationships => {
  const name = 'deleteRelationships';
  const query = `
  mutation ${name}($relationships: [RelationshipInput]!) {
    deleteRelationships(relationships: $relationships) {
      id
    }
  }`;
  const variables = {relationships};
  return sendQuery(opts, name, {query, variables});
};

export function createGraphQLClient(config) {
  const opts = {
    graphgQlUrl: config.graphgQlUrl
  };

  return {
    addRelationships: addRelationships(opts),
    addResources: addResources(opts),
    deleteRelationships: deleteRelationships(opts),
    deleteResources: deleteResources(opts),
    getAccounts: getAccounts(opts),
    getResources: getResources(opts),
    getRelationships: getRelationships(opts),
    createPaginator
  };
}