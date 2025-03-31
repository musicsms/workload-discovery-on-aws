#!/bin/bash
# Helper script for refreshing AWS credentials and restarting the discovery container

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Default profile is 'default'
PROFILE=${1:-default}

echo "Refreshing AWS credentials for profile: $PROFILE"

# Option 1: If using AWS SSO
# Uncomment the line below if using AWS SSO
# aws sso login --profile $PROFILE

# Option 2: If using AWS STS assume role 
# Uncomment and modify the lines below if using STS assume role
# ROLE_ARN="arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME"
# aws sts assume-role --role-arn $ROLE_ARN --role-session-name "discovery-session" --profile $PROFILE > /tmp/assumed-role.json
# export AWS_ACCESS_KEY_ID=$(jq -r .Credentials.AccessKeyId /tmp/assumed-role.json)
# export AWS_SECRET_ACCESS_KEY=$(jq -r .Credentials.SecretAccessKey /tmp/assumed-role.json)
# export AWS_SESSION_TOKEN=$(jq -r .Credentials.SessionToken /tmp/assumed-role.json)
# aws configure set aws_access_key_id $AWS_ACCESS_KEY_ID --profile $PROFILE
# aws configure set aws_secret_access_key $AWS_SECRET_ACCESS_KEY --profile $PROFILE
# aws configure set aws_session_token $AWS_SESSION_TOKEN --profile $PROFILE
# rm /tmp/assumed-role.json

# Verify the credentials
echo "Verifying credentials..."
aws sts get-caller-identity --profile $PROFILE

if [ $? -ne 0 ]; then
    echo "Failed to verify credentials. Please check your AWS configuration."
    exit 1
fi

# Export the profile for docker-compose
export AWS_PROFILE=$PROFILE

# Update .env file if it exists
if [ -f .env ]; then
    # Check if AWS_PROFILE exists in .env
    if grep -q "AWS_PROFILE=" .env; then
        # Replace AWS_PROFILE line
        sed -i.bak "s/AWS_PROFILE=.*/AWS_PROFILE=$PROFILE/" .env
    else
        # Add AWS_PROFILE line
        echo "AWS_PROFILE=$PROFILE" >> .env
    fi
fi

# Restart the discovery container
echo "Restarting discovery container..."
docker-compose up -d --no-deps discovery

echo "Done! Discovery container is using refreshed credentials for profile: $PROFILE" 