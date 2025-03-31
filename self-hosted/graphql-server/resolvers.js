export const resolvers = {
  Query: {
    async getResources(_, { pagination = { start: 0, end: 1000 }, resourceTypes, accounts }, context) {
      const session = context.driver.session();
      try {
        let query = `
          MATCH (r:Resource)
          WHERE r:Resource
        `;
        
        // Apply resourceTypes filter
        if (resourceTypes && resourceTypes.length > 0) {
          query += ` AND r.properties.resourceType IN $resourceTypes`;
        }
        
        // Apply accounts filter
        if (accounts && accounts.length > 0) {
          query += ` AND r.properties.accountId IN $accountIds`;
        }
        
        query += `
          RETURN r
          ORDER BY r.id
          SKIP $skip
          LIMIT $limit
        `;
        
        const params = {
          skip: pagination.start,
          limit: pagination.end - pagination.start,
          resourceTypes,
          accountIds: accounts?.map(a => a.accountId) || []
        };
        
        const result = await session.run(query, params);
        return result.records.map(record => {
          const node = record.get('r').properties;
          return {
            id: node.id,
            label: node.label,
            md5Hash: node.md5Hash,
            properties: node.properties
          };
        });
      } finally {
        await session.close();
      }
    },
    
    async getRelationships(_, { pagination = { start: 0, end: 1000 } }, context) {
      const session = context.driver.session();
      try {
        const query = `
          MATCH (s:Resource)-[r]->(t:Resource)
          RETURN s, r, t
          ORDER BY r.id
          SKIP $skip
          LIMIT $limit
        `;
        
        const params = {
          skip: pagination.start,
          limit: pagination.end - pagination.start
        };
        
        const result = await session.run(query, params);
        return result.records.map(record => {
          const source = record.get('s').properties;
          const target = record.get('t').properties;
          const rel = record.get('r').properties;
          
          return {
            id: rel.id,
            label: rel.label,
            source: {
              id: source.id,
              label: source.label,
              properties: source.properties
            },
            target: {
              id: target.id,
              label: target.label,
              properties: target.properties
            },
            relationships: rel.relationships || []
          };
        });
      } finally {
        await session.close();
      }
    },
    
    async getResourceGraph(_, { ids, pagination = { start: 0, end: 1000 } }, context) {
      const session = context.driver.session();
      try {
        // Step 1: Get all nodes that match the IDs
        const nodesQuery = `
          MATCH (n:Resource)
          WHERE n.id IN $ids
          RETURN DISTINCT n as node
        `;
        
        const nodesResult = await session.run(nodesQuery, { ids });
        const nodes = nodesResult.records.map(record => {
          const node = record.get('node').properties;
          return {
            id: node.id,
            label: node.label,
            md5Hash: node.md5Hash,
            properties: node.properties
          };
        });
        
        // Step 2: Get all relationships between these nodes
        const edgesQuery = `
          MATCH (s:Resource)-[r]->(t:Resource)
          WHERE s.id IN $ids AND t.id IN $ids
          RETURN DISTINCT r as edge, s.id as source, t.id as target
          SKIP $skip
          LIMIT $limit
        `;
        
        const edgesParams = {
          ids,
          skip: pagination.start,
          limit: pagination.end - pagination.start
        };
        
        const edgesResult = await session.run(edgesQuery, edgesParams);
        const edges = edgesResult.records.map(record => {
          const edge = record.get('edge').properties;
          return {
            id: edge.id,
            label: edge.label,
            source: record.get('source'),
            target: record.get('target')
          };
        });
        
        return { nodes, edges };
      } finally {
        await session.close();
      }
    },
    
    async getAccounts(_, __, context) {
      const session = context.driver.session();
      try {
        const query = `
          MATCH (a:Account)
          RETURN a
          ORDER BY a.accountId
        `;
        
        const result = await session.run(query);
        return result.records.map(record => record.get('a').properties);
      } finally {
        await session.close();
      }
    },
    
    async getAccount(_, { accountId }, context) {
      const session = context.driver.session();
      try {
        const query = `
          MATCH (a:Account {accountId: $accountId})
          RETURN a
        `;
        
        const result = await session.run(query, { accountId });
        return result.records.length > 0 ? result.records[0].get('a').properties : null;
      } finally {
        await session.close();
      }
    }
  },
  
  Mutation: {
    async addResources(_, { resources }, context) {
      const session = context.driver.session();
      try {
        const addedResources = [];
        
        for (const resource of resources) {
          const query = `
            MERGE (r:Resource {id: $id})
            ON CREATE SET r = $resource
            ON MATCH SET r = $resource
            RETURN r
          `;
          
          const result = await session.run(query, { 
            id: resource.id,
            resource
          });
          
          if (result.records.length > 0) {
            addedResources.push(result.records[0].get('r').properties);
          }
        }
        
        return addedResources;
      } finally {
        await session.close();
      }
    },
    
    async addRelationships(_, { relationships }, context) {
      const session = context.driver.session();
      try {
        const addedRelationships = [];
        
        for (const rel of relationships) {
          const query = `
            MATCH (s:Resource {id: $sourceId})
            MATCH (t:Resource {id: $targetId})
            MERGE (s)-[r:${rel.label} {id: $id}]->(t)
            ON CREATE SET r = $relationship
            ON MATCH SET r = $relationship
            RETURN r, s, t
          `;
          
          const relationship = {
            ...rel,
            id: `${rel.source}|${rel.label}|${rel.target}`
          };
          
          const result = await session.run(query, { 
            sourceId: rel.source,
            targetId: rel.target,
            id: relationship.id,
            relationship
          });
          
          if (result.records.length > 0) {
            const record = result.records[0];
            const r = record.get('r').properties;
            const s = record.get('s').properties;
            const t = record.get('t').properties;
            
            addedRelationships.push({
              id: r.id,
              label: r.label,
              source: s,
              target: t,
              relationships: r.relationships || []
            });
          }
        }
        
        return addedRelationships;
      } finally {
        await session.close();
      }
    },
    
    async deleteResources(_, { resources }, context) {
      const session = context.driver.session();
      try {
        const deletedResources = [];
        
        for (const resource of resources) {
          // First get the resource details before deleting
          const getQuery = `
            MATCH (r:Resource {id: $id})
            RETURN r
          `;
          
          const getResult = await session.run(getQuery, { id: resource.id });
          
          if (getResult.records.length > 0) {
            const resourceToDelete = getResult.records[0].get('r').properties;
            
            // Delete the resource
            const deleteQuery = `
              MATCH (r:Resource {id: $id})
              DETACH DELETE r
            `;
            
            await session.run(deleteQuery, { id: resource.id });
            deletedResources.push(resourceToDelete);
          }
        }
        
        return deletedResources;
      } finally {
        await session.close();
      }
    },
    
    async addAccounts(_, { accounts }, context) {
      const session = context.driver.session();
      try {
        const addedAccounts = [];
        
        for (const account of accounts) {
          const query = `
            MERGE (a:Account {accountId: $accountId})
            ON CREATE SET a = $account
            ON MATCH SET a = $account
            RETURN a
          `;
          
          const result = await session.run(query, { 
            accountId: account.accountId,
            account: {
              ...account,
              isIamRoleDeployed: true, // For self-hosted, we assume this is always true
              regions: account.regions || []
            }
          });
          
          if (result.records.length > 0) {
            addedAccounts.push(result.records[0].get('a').properties);
          }
        }
        
        return addedAccounts;
      } finally {
        await session.close();
      }
    }
  }
}; 