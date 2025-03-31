# Self-Hosted Workload Discovery on AWS

This directory contains the necessary files to run a self-hosted version of Workload Discovery on AWS. This setup replaces the AWS managed services with local equivalents:

- Neo4j instead of Amazon Neptune
- Custom GraphQL server instead of AWS AppSync 
- MinIO instead of Amazon S3
- Docker containers instead of ECS/Fargate

## Prerequisites

1. Docker and Docker Compose
2. Node.js (for building the UI)
3. AWS credentials with sufficient permissions
4. AWS Config set up in your account(s)

## Quick Start

1. Configure AWS credentials using one of these methods:

   **Option A: AWS CLI configuration (Recommended for short-lived credentials)**
   ```bash
   # Configure your AWS CLI credentials
   aws configure
   # or for a specific profile
   aws configure --profile my-profile
   ```

   **Option B: Set up AWS credentials file manually**
   Create or edit `~/.aws/credentials`:
   ```
   [default]
   aws_access_key_id = your_access_key
   aws_secret_access_key = your_secret_access_key
   aws_session_token = your_session_token  # if using temporary credentials
   ```

2. Copy the `.env.template` to `.env` and configure:

   ```bash
   cp .env.template .env
   # Edit .env to set AWS_PROFILE if not using default
   ```

3. Build the frontend:

```bash
cd ../source/frontend
npm install
npm run build
mkdir -p ../../self-hosted/web-ui/html
cp -r build/* ../../self-hosted/web-ui/html/
```

4. Start the containers:

```bash
cd ../../self-hosted
docker-compose up -d
```

5. Access the UI at http://localhost:3000

## Managing AWS Credentials

### For Short-lived Session Credentials

The application uses the AWS SDK credential provider chain, which automatically looks for credentials in the following order:

1. Environment variables (if present)
2. AWS shared credentials file (`~/.aws/credentials`)
3. AWS configuration file (`~/.aws/config`)
4. Instance profile credentials (for EC2)

When your credentials expire:

1. Refresh your AWS credentials using your organization's method (AWS SSO, STS assume-role, etc.)
2. Update your local AWS credential file
3. No need to restart containers - the AWS SDK automatically refreshes credentials

### Using AWS SSO

If using AWS SSO for authentication:

```bash
# Login to AWS SSO
aws sso login --profile your-sso-profile

# Set the profile in .env or when starting containers
AWS_PROFILE=your-sso-profile docker-compose up -d
```

## Components

### Neo4j Graph Database

Replaces Amazon Neptune to store resources and their relationships as a graph. Access the Neo4j browser at http://localhost:7474 (username: neo4j, password: password).

### GraphQL API

Custom implementation using Apollo Server and Neo4j integration to replace AWS AppSync. Provides the same GraphQL schema as the original app.

### MinIO

Provides S3-compatible storage for diagrams and UI assets. Access the MinIO console at http://localhost:9001 (username: minioadmin, password: minioadmin).

### Discovery Container 

Modified version of the original discovery process to work with local Neo4j instead of Neptune. Runs periodically to discover AWS resources using the AWS SDK and AWS Config.

### Web UI

Serves the frontend React application using Nginx. The UI is configured to connect to the local GraphQL API and MinIO storage.

## Authentication

This self-hosted version doesn't implement user authentication. For production use, consider adding user authentication by:

1. Adding a reverse proxy with basic authentication
2. Implementing a custom auth service
3. Using OAuth/OIDC with a provider like Auth0, Okta or Keycloak

## AWS Requirements

The discovery component still requires:

1. AWS credentials with sufficient permissions to call AWS services
2. AWS Config set up in the target account(s)
3. If using cross-account discovery, IAM roles in each target account

## Limitations

1. No user authentication
2. No cost data integration (AWS Cost Explorer is not supported)
3. Discovery must be manually triggered or set up as a cron job
4. Performance may be slower than the AWS-managed version

## Troubleshooting

- Check the logs: `docker-compose logs -f`
- Check Neo4j connection: Access the Neo4j browser at http://localhost:7474
- Check GraphQL API: Try accessing the GraphQL playground at http://localhost:4000
- Verify AWS credentials: `docker-compose exec discovery aws sts get-caller-identity`
- If using AWS SSO, ensure your credentials haven't expired with `aws sts get-caller-identity --profile your-profile` 

## Environment Variables

You need to provide your AWS credentials to the application via environment variables. Create a `.env` file in the `self-hosted` directory:

```
AWS_REGION=us-east-1
CROSS_ACCOUNT_DISCOVERY=SAME_ACCOUNT
```

AWS credentials can be provided in several ways:
1. Using AWS profile (recommended)
   ```
   AWS_PROFILE=your-profile-name
   ```
   
2. Using the AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_SESSION_TOKEN directly:
   ```
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_SESSION_TOKEN=your_session_token  # if using temporary credentials
   ```

Note: The AWS Account ID is now automatically detected from your AWS credentials at runtime. 