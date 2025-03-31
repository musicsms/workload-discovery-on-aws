import { gql } from 'apollo-server';

export const typeDefs = gql`
  scalar JSON

  type Resource @exclude(operations: [CREATE, UPDATE, DELETE]) {
    id: ID!
    label: String
    md5Hash: String
    properties: ResourceProperties
  }

  type ResourceProperties {
    accountId: String
    arn: String
    availabilityZone: String
    awsRegion: String
    configuration: JSON
    configurationItemCaptureTime: String
    configurationStateId: String
    configurationItemStatus: String
    loggedInURL: String
    loginURL: String
    private: Boolean
    resourceCreationTime: String
    resourceName: String
    resourceId: String
    resourceType: String
    resourceValue: String
    state: String
    supplementaryConfiguration: JSON
    subnetId: String
    subnetIds: [String]
    tags: JSON
    title: String
    version: String
    vpcId: String
    dBInstanceStatus: String
    statement: String
    instanceType: String
  }

  type Relationship @exclude(operations: [CREATE, UPDATE, DELETE]) {
    id: ID!
    label: String
    source: Resource
    target: Resource
    relationships: [JSON]
  }

  input Pagination {
    start: Int
    end: Int
  }

  input AccountInput {
    accountId: String
    regions: [String]
  }

  type ResourceGraphItem {
    id: String
    label: String
    md5Hash: String
    properties: ResourceProperties
  }

  type RelationshipGraphItem {
    id: String
    label: String
    source: String
    target: String
  }

  type getResourceGraphResponse {
    nodes: [ResourceGraphItem]
    edges: [RelationshipGraphItem]
  }

  type ResourcesMetadata {
    accounts: [Account]
    resourceTypeCounts: [ResourceTypeCount]
  }

  type ResourcesAccountMetadata {
    accountId: String
    accountName: String
    isIamRoleDeployed: Boolean
    toDelete: Boolean
    resourceCount: Int
    resourceTypeCounts: [ResourceTypeCount]
  }

  type ResourcesRegionMetadata {
    accountId: String
    accountName: String
    regions: [RegionMetadata]
  }

  type RegionMetadata {
    name: String
    resourceCount: Int
    resourceTypeCounts: [ResourceTypeCount]
  }

  type ResourceTypeCount {
    name: String
    count: Int
  }

  type Region {
    name: String
    resourceCount: Int
    resourceTypes: [ResourceTypeCount]
  }

  type Account {
    accountId: String
    name: String
    regions: [Region]
    isIamRoleDeployed: Boolean
    toDelete: Boolean
    lastCrawled: String
  }

  input RelationshipInput {
    source: String!
    target: String!
    label: String!
    relationships: [JSON]
  }

  input ResourceInput {
    id: String!
    label: String!
    md5Hash: String
    properties: JSON
  }

  input ResourceDeleteInput {
    id: String!
  }

  input AccountInput {
    accountId: String!
    name: String
  }

  input S3Query {
    bucket: String!
    key: String!
  }

  type Cost {
    cost: JSON
  }

  type Query {
    getResources(
      pagination: Pagination
      resourceTypes: [String]
      accounts: [AccountInput]
    ): [Resource]
    getRelationships(pagination: Pagination): [Relationship]
    getResourceGraph(ids: [String]!, pagination: Pagination): getResourceGraphResponse
    getResourcesMetadata: ResourcesMetadata
    getResourcesAccountMetadata(accounts: [AccountInput]): [ResourcesAccountMetadata]
    getResourcesRegionMetadata(accounts: [AccountInput]): [ResourcesRegionMetadata]
    getAccount(accountId: String!): Account
    getAccounts: [Account]
    readResultsFromS3(s3Query: S3Query): Cost
  }

  type Mutation {
    addRelationships(relationships: [RelationshipInput]!): [Relationship]
    addResources(resources: [ResourceInput]!): [Resource]
    updateResources(resources: [ResourceInput]!): [Resource]
    deleteResources(resources: [ResourceDeleteInput]!): [Resource]
    deleteRelationships(relationships: [RelationshipInput]!): [Relationship]
    addAccounts(accounts: [AccountInput]!): [Account]
    updateAccount(account: AccountInput!): Account
    deleteAccounts(accounts: [AccountInput]!): [Account]
    addRegions(accountId: String!, regions: [String]!): Account
    updateRegions(accountId: String!, regions: [String]!): Account
    deleteRegions(accountId: String!, regions: [String]!): Account
  }
`; 