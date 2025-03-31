import { ApolloServer } from 'apollo-server';
import { Neo4jGraphQL } from '@neo4j/graphql';
import neo4j from 'neo4j-driver';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';

// Connect to Neo4j
const driver = neo4j.driver(
  `neo4j://${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '7687'}`,
  neo4j.auth.basic(process.env.DB_USER || 'neo4j', process.env.DB_PASS || 'password')
);

// Initialize the database schema
async function initializeDatabase() {
  const session = driver.session();
  try {
    // Create constraints for uniqueness
    await session.run('CREATE CONSTRAINT IF NOT EXISTS FOR (r:Resource) REQUIRE r.id IS UNIQUE');
    await session.run('CREATE CONSTRAINT IF NOT EXISTS FOR (a:Account) REQUIRE a.accountId IS UNIQUE');
    console.log('Database schema initialized');
  } catch (error) {
    console.error('Error initializing database schema:', error);
  } finally {
    await session.close();
  }
}

// Create Neo4j GraphQL instance
async function startServer() {
  await initializeDatabase();
  
  const neoSchema = new Neo4jGraphQL({
    typeDefs,
    resolvers,
    driver,
  });

  const schema = await neoSchema.getSchema();
  
  const server = new ApolloServer({
    schema,
    context: ({ req }) => ({ 
      req,
      driver,
      neo4jDatabase: process.env.NEO4J_DATABASE || 'neo4j'
    })
  });
  
  const { url } = await server.listen(process.env.PORT || 4000);
  console.log(`🚀 GraphQL API ready at ${url}`);
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
}); 