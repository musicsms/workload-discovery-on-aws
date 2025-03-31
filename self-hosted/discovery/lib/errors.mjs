// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export class AggregatorNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AggregatorNotFoundError';
  }
}

export class OrgAggregatorValidationError extends Error {
  constructor(message, aggregator) {
    super(message);
    this.name = 'OrgAggregatorValidationError';
    this.aggregator = aggregator;
  }
}