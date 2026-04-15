# CS203 Project: Tariff-fic

## Overview

This repository contains the source code and documentation for the CS203 Software Engineering project - Tariff-fic, developed by Group G1-1.

## Project Description

Tariff-fic is a comprehensive tariff calculation application that consolidates import tariffs to calculate them against different industries/products between different countries at any given point in time.

## Team Members - Group G1-1

- Archer Ngan
- Benjamin Loh
- Brian Lim
- Jiang Qianchen
- Quek De Wang
- Rainer Tan

## Features

### Core Functionality
- **Real-time Tariff Calculation**: Calculate import tariffs between any two countries for specific products
- **Historical Tariff Tracking**: Track and visualize tariff changes over time
- **Tariff Forecasting**: Predict future tariff rates using weighted graph algorithms
- **Bulk Tariff Management**: Upload and manage multiple tariff entries via CSV
- **Trade Agreement Integration**: Automatically apply preferential rates based on bilateral agreements

### Advanced Features
- **Natural Language Processing (NLP)**: Convert product descriptions to HS codes using AI
- **Multi-country Comparison**: Compare tariff rates across multiple countries simultaneously
- **Cost Breakdown Visualization**: Interactive pie charts showing tariff composition
- **Admin Management Portal**: Comprehensive admin interface for tariff, country, and agreement management
- **Authentication & Authorization**: Secure Firebase-based authentication with role-based access control

### Technical Highlights
- **Microservices Architecture**: 7 independent services for scalability and maintainability
- **Cloud-Native Deployment**: Full AWS infrastructure with auto-scaling and load balancing
- **CI/CD Pipeline**: Automated build, test, and deployment using AWS CodePipeline
- **Infrastructure as Code**: Complete infrastructure defined using OpenTofu/Terraform
- **Caching Layer**: Redis integration for improved performance
- **Database Management**: PostgreSQL with read replicas and connection pooling

## Technologies Used

### Frontend
- **React 18** with TypeScript for type-safe component development
- **Vite** for fast builds and hot module replacement
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** for accessible, customizable UI components
- **Recharts** for data visualization
- **React Router** for client-side routing
- **Firebase Authentication** for user management

### Backend
- **Python Flask** - Microservices (User, History, Country, Agreement, Forecast)
- **Java Spring Boot** - Tariff service for complex calculations
- **PostgreSQL** - Primary relational database
- **Redis** - In-memory caching
- **SQLAlchemy** - Python ORM
- **Alembic** - Database migrations

### NLP & Machine Learning
- **spaCy** - Natural language processing
- **scikit-learn** - Machine learning algorithms
- **Custom HS Code Classifier** - Product classification engine

### Infrastructure & DevOps
- **AWS Services**: ECS Fargate, RDS, ElastiCache, S3, CloudFront, ALB, VPC
- **OpenTofu/Terraform** - Infrastructure as Code
- **Docker** - Containerization
- **AWS CodePipeline** - CI/CD automation
- **AWS CodeBuild** - Build and test automation
- **CloudWatch** - Logging and monitoring

### Security
- **AWS WAF** - Web application firewall
- **AWS GuardDuty** - Threat detection
- **AWS CloudTrail** - Audit logging
- **Firebase JWT** - Token-based authentication
- **SSL/TLS** - Encrypted communications

## Getting Started

### Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/BenjaminLohDW/CS203-Project-Tariff-fic-G1-1.git
   cd CS203-Project-Tariff-fic-G1-1
   ```

2. **Choose Your Deployment Method**
   - For local development, see [Running the Application Locally](#running-the-application-locally)
   - For AWS deployment, see [Deploying the Application to AWS](#deploying-the-application-to-aws)

2. Running the project

### Running the Application LOCALLY

#### Prerequisites for Local Development

- Docker Desktop installed and running
- Node.js (v18 or higher) and npm installed
- Git for cloning the repository
- A Firebase account for authentication

#### Step 1: Firebase Configuration Setup

Before running the application, you need to configure Firebase Authentication:

##### 1.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable Authentication → Email/Password provider

##### 1.2 Get Firebase Configuration
1. In Firebase Console, go to Project Settings → General
2. Scroll down to "Your apps" section
3. Click on the Web app icon (`</>`) to create a web app
4. Copy the Firebase configuration object

##### 1.3 Configure Frontend Environment Variables
Create a `.env` file in the `csd-project-frontend/` directory:

```bash
cd csd-project-frontend
```

Create `.env` file with the following content:
```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# API URLs for local development
VITE_USER_API_URL=http://localhost:5001
VITE_PRODUCT_API_URL=http://localhost:5002
VITE_HISTORY_API_URL=http://localhost:5003
VITE_TARIFF_API_URL=http://localhost:5004
VITE_COUNTRY_API_URL=http://localhost:5005
VITE_AGREEMENT_API_URL=http://localhost:5006
VITE_FORECAST_API_URL=http://localhost:5007
```

Replace the `your_*_here` placeholders with actual values from your Firebase configuration.

##### 1.4 Configure Backend Firebase Credentials (Optional - for token verification)
If you want backend services to verify Firebase tokens:

1. In Firebase Console, go to Project Settings → Service Accounts
2. Click "Generate new private key" and download the JSON file
3. Rename it to `firebase-credentials.json`
4. Place it in the `tariff/` directory (or other backend services as needed)

#### Step 2: Start Backend Services

The backend consists of 7 microservices that run in Docker containers:

```bash
# From the project root directory
docker compose up --build
```

This will start the following services:
- **User Service** (Port 5001): User authentication and profile management
- **Product Service** (Port 5002): Product and HS code management
- **History Service** (Port 5003): Calculation history tracking
- **Tariff Service** (Port 5004): Tariff rates and calculations
- **Country Service** (Port 5005): Country data management
- **Agreement Service** (Port 5006): Trade agreement management
- **Forecast Service** (Port 5007): Tariff forecasting
- **PostgreSQL Database** (Port 5432): Shared database for all services

Wait for all services to be healthy. You should see logs indicating each service is running.

To run in detached mode (background):
```bash
docker compose up -d --build
```

To stop all services:
```bash
docker compose down
```

To view logs:
```bash
docker compose logs -f [service_name]
# Example: docker compose logs -f tariff
```

#### Step 3: Start Frontend Development Server

In a new terminal window:

```bash
# Navigate to frontend directory
cd csd-project-frontend

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173` (or another port if 5173 is in use).

#### Step 4: Access the Application

1. Open your browser and navigate to `http://localhost:5173`
2. You should see the Tariff-fic application
3. Create a new account using the Signup page
4. Log in with your credentials
5. Start using the tariff calculation features!

#### Troubleshooting Local Development

**Backend Services Not Starting:**
- Ensure Docker Desktop is running
- Check if ports 5001-5007, 5432, 6379 are not already in use
- Run `docker compose logs [service_name]` to check specific service errors

**Frontend Not Connecting to Backend:**
- Verify all backend services are running: `docker compose ps`
- Check that `.env` file has correct API URLs pointing to `localhost:500X`
- Clear browser cache and restart dev server

**Firebase Authentication Errors:**
- Verify `.env` file has correct Firebase configuration
- Ensure Email/Password authentication is enabled in Firebase Console
- Check browser console for specific Firebase error messages

**Database Connection Issues:**
- Ensure PostgreSQL container is healthy: `docker compose ps`
- Check database logs: `docker compose logs db`
- Verify database credentials in `compose.yml` match service configurations


## Deploying the Application to AWS
This project utilises OpenTofu to package the infrastructure as versioned code; this allows you deploy the application on your desired cloud platform. Currently, he project is configured to run on AWS. 

### 1. AWS credentials setup
You will require an AWS account/ credentials to deploy the infrastructure; Obtain the following information:
- AWS Access Key ID
- AWS Secret Access Key

Then configure:
```bash
# Option 1: Using AWS CLI
aws configure
# Enter your Access Key ID
# Enter your Secret Access Key  
# Default region: ap-southeast-1
# Default output format: json

# Option 2: Manual setup
mkdir -p ~/.aws
cat > ~/.aws/credentials <<EOF
[default]
aws_access_key_id = YOUR_ACCESS_KEY_ID
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY
EOF
```

### 2. Configure Infrastructre Credentials
Create a new terraform.tfvars file to configure the environment variables for the infrastructured code; unless stated explicitly to change the vairable, you may leave the defualt variables or configure the vairables to your preference

```hcl
# ===== PROJECT CONFIGURATION =====
project_name = "cs203g1t1"
env          = "dev"
owner        = "team"
aws_region   = "ap-southeast-1" # change this if you wish to deploy in other regions

# ===== DATABASE CONFIGURATION =====
db_password = "cs203g1t1" # IMPORTANT: change the password
db_name     = "appdb"
db_username = "appuser"
db_port     = 5432
db_sslmode  = "require"

# ===== INFRASTRUCTURE OPTIONS =====
# Cost vs Performance tradeoffs
single_nat_gateway  = true   # false = more expensive but higher availability
enable_redis        = true   # Set to false to save ~$12/month
enable_rds_proxy    = true   # Set to false to save ~$15/month
enable_read_replica = true   # Set to false to save ~$50/month
enable_endpoints    = true   # Recommended: reduces NAT costs
enable_cloud_map    = true  # enable services to call each other internally

# ===== SSL/TLS (OPTIONAL) =====
# Leave empty for HTTP-only, or add your ACM certificate ARN for HTTPS
acm_certificate_arn = ""

# ===== FARGATE CONFIGURATION =====
fargate_cpu    = 256  # 0.25 vCPU
fargate_memory = 512  # 512 MB
desired_count  = 1    # Tasks per service
min_count      = 1    # Minimum for autoscaling
max_count      = 3    # Maximum for autoscaling

# ===== CI/CD CONFIGURATION =====
github_owner  = "" # IMPORTANT: configure this to the account owner which forked the repository!
github_repo   = "CS203-Project-Tariff-fic-G1-1"
github_branch = "main"
services      = ["user", "product","history","tariff", "country","agreement", "forecast"]

# ===== SECURITY CONFIGURATION =====
enable_guardduty    = true   # $2/month
enable_waf          = true   # $5/month + $1 per million requests
enable_cloudtrail   = true   # $2/month
alert_email = "abc@gmail.com" # IMPORTANT: change this to your own email address

# ===== OPTIONAL: Custom Domain for Frontend =====
# frontend_domain  = "myapp.example.com"
# frontend_acm_arn = "arn:

# ===== FIREBASE CONFIGURATION =====
# Get these values from Firebase Console > Project Settings > Your apps > Web app
# IMPORTANT: Replace with your actual Firebase project values
firebase_api_key                = ""
firebase_auth_domain            = ""
firebase_project_id             = ""
firebase_storage_bucket         = ""    # follow local deployment steps 1.3; insert firebase keys and configs
firebase_messaging_sender_id    = ""
firebase_app_id                 = ""
firebase_measurement_id         = """
```

### 3. Configure Firebase for AWS Deployment

The Firebase configuration is already included in `terraform.tfvars` (from step 2). When you run `tofu apply`, these values will be automatically injected into the frontend build process via CodeBuild environment variables.

### 4. Create BuildSpec Files

Create two buildspec files in the project root directory to configure the CI/CD pipeline:

#### 4.1 Create `buildspec.yml` (Backend Services)

Create a file named `buildspec.yml` in the project root:
```yml
version: 0.2

phases:
  pre_build:
    commands:
      - echo "Pre-Build Phase - ECR Login"
      - aws --version
      - docker --version

      # NEW: Check if this service has changes
      - echo "Checking if $SERVICE has changes..."
      - |
        # Get changed files in this commit
        CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "")
        
        if [ -z "$CHANGED_FILES" ]; then
          echo "⚠️  Cannot detect file changes, will build to be safe"
          export SHOULD_BUILD="true"
        else
          echo "📝 Changed files:"
          echo "$CHANGED_FILES"
          
          # Check if this specific service directory has changes
          if echo "$CHANGED_FILES" | grep -q "^${SERVICE}/"; then
            echo "✅ Service $SERVICE has changes - will build"
            export SHOULD_BUILD="true"
          # Also rebuild if shared files changed (buildspec, Dockerfiles, etc)
          elif echo "$CHANGED_FILES" | grep -qE "^(buildspec\.yml|\.dockerignore)$"; then
            echo "✅ Build files changed - will rebuild $SERVICE"
            export SHOULD_BUILD="true"
          else
            echo "⏭️  Service $SERVICE unchanged - skipping build"
            export SHOULD_BUILD="false"
          fi
        fi
      
      # NEW: If service unchanged, create imagedefinitions with existing image and exit
      - |
        if [ "$SHOULD_BUILD" = "false" ]; then
          echo "📦 Using existing image for $SERVICE (no changes detected)"
          
          # Create imagedefinitions.json pointing to existing latest image
          printf '[{"name":"%s","imageUri":"%s:%s-latest"}]\n' \
            "$SERVICE" \
            "$ECR_REPO" \
            "$SERVICE" \
            > imagedefinitions-${SERVICE}.json
          
          echo "✅ Imagedefinitions created (build skipped):"
          cat imagedefinitions-${SERVICE}.json
          
          # Exit early - skip build and post_build phases
          exit 0
        fi
      
      # Only log in to ECR if we're actually building
      - echo "Building $SERVICE (changes detected)..."
      - echo "Logging in to Amazon ECR..."
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $ECR_REPO
  
  
  build:
    commands:
      - echo "Building service - $SERVICE"
      - |
        if [ ! -d "./$SERVICE" ]; then
          echo "ERROR: Directory ./$SERVICE not found!"
          ls -la ./
          exit 1
        fi
        
        if [ ! -f "./$SERVICE/Dockerfile" ]; then
          echo "ERROR: Dockerfile not found in ./$SERVICE/"
          exit 1
        fi
        
        echo "Building Docker image: $ECR_REPO:${SERVICE}-${IMAGE_TAG}"
        docker build -t $ECR_REPO:${SERVICE}-${IMAGE_TAG} ./${SERVICE}
        
        echo "Pushing image to ECR..."
        docker push $ECR_REPO:${SERVICE}-${IMAGE_TAG}
        
        echo "Successfully built and pushed $SERVICE"
  
  post_build:
    commands:
      - |
        echo "Creating imagedefinitions-${SERVICE}.json"
        printf '[{"name":"%s","imageUri":"%s"}]\n' "$SERVICE" "$ECR_REPO:${SERVICE}-${IMAGE_TAG}" > imagedefinitions-${SERVICE}.json
        cat imagedefinitions-${SERVICE}.json
      - echo "Build completed"

artifacts:
  files:
    - imagedefinitions-*.json
```

#### 4.2 Create `buildspec-frontend.yml` (Frontend)

Create a file named `buildspec-frontend.yml` in the project root:
```yml
version: 0.2

phases:
  pre_build:
    commands:
      - echo "Installing Node.js dependencies..."
      - cd csd-project-frontend
      
      # Use npm ci for faster, deterministic installs (requires package-lock.json)
      - npm ci
      
      - echo "Creating environment file for production..."
      - |
        cat > .env.production << EOF
        # Use relative URLs - CloudFront will proxy to ALB
        VITE_API_BASE_URL=/api
        VITE_USER_API_URL=/api
        VITE_TARIFF_API_URL=/api
        VITE_COUNTRY_API_URL=/api
        VITE_AGREEMENT_API_URL=/api
        VITE_HISTORY_API_URL=/api
        VITE_FORECAST_API_URL=/api
        # Firebase configuration
        VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
        VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
        VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
        VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
        VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
        VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
        VITE_FIREBASE_MEASUREMENT_ID=$VITE_FIREBASE_MEASUREMENT_ID
        EOF
      
      - echo "Environment configuration (Firebase values hidden):"
      - cat .env.production | grep -v "FIREBASE"

  build:
    commands:
      - echo "Building frontend for production..."
      - npm run build
      - ls -la dist/
      - echo "Build completed!"

  post_build:
    commands:
      - echo "Deploying to S3..."
      - |
        aws s3 sync dist/ s3://$FRONTEND_BUCKET/ \
          --delete \
          --cache-control "public, max-age=31536000, immutable" \
          --exclude "index.html" \
          --region $AWS_DEFAULT_REGION
      
      - |
        aws s3 cp dist/index.html s3://$FRONTEND_BUCKET/index.html \
          --cache-control "public, max-age=0, must-revalidate" \
          --region $AWS_DEFAULT_REGION
      
      - echo "Creating CloudFront invalidation..."
      - |
        aws cloudfront create-invalidation \
          --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
          --paths "/*" \
          --region $AWS_DEFAULT_REGION
      
      - echo "Frontend deployment completed!"

artifacts:
  files:
    - '**/*'
  base-directory: csd-project-frontend/dist
  name: frontend-build

cache:
  paths:
    - 'csd-project-frontend/node_modules/**/*'
```

### 5. Deploy Infrastructure

Navigate to the infrastructure directory and initialize OpenTofu:

```bash
cd infra/
tofu init
```

Review the planned changes:
```bash
tofu plan
```

Apply the infrastructure (this will take 10-15 minutes):
```bash
tofu apply
```

Type `yes` when prompted to confirm the deployment.

**What gets created:**
- VPC with public/private subnets across 2 availability zones
- Application Load Balancer (ALB) for traffic routing
- ECS Fargate cluster with 7 microservices
- RDS PostgreSQL database with optional read replica
- ElastiCache Redis cluster (if enabled)
- S3 bucket for frontend hosting
- CloudFront distribution for global content delivery
- CodePipeline for CI/CD automation
- IAM roles and security groups
- CloudWatch log groups for monitoring

### 6. Establish CodeStar Connection

After the infrastructure is deployed, you need to authorize GitHub access:

1. Go to AWS Console → **Developer Tools** → **Settings** → **Connections**
2. Find the connection named `cs203g1t1-dev-github` (or your configured name) with status **Pending**
3. Click on the connection name
4. Click **Update pending connection**
5. Click **Install a new app** (if first time) or **Connect to GitHub**
6. Authorize AWS to access your GitHub repository
7. Select the `CS203-Project-Tariff-fic-G1-1` repository
8. Click **Connect**
9. Wait for status to change to **Available** (may take 1-2 minutes)

### 7. Commit and Push BuildSpec Files

If you created the buildspec files locally, commit and push them:

```bash
git add buildspec.yml buildspec-frontend.yml
git commit -m "Add buildspec files for CI/CD pipeline"
git push origin main
```

### 8. Trigger Initial Deployment

1. Go to AWS Console → **CodePipeline** → **Pipelines**
2. You should see two pipelines:
   - `cs203g1t1-dev-backend-pipeline` - Builds and deploys all 7 microservices
   - `cs203g1t1-dev-frontend-pipeline` - Builds and deploys React frontend
3. Click on each pipeline
4. Click **Release change** to start the initial build

**Pipeline Stages:**
- **Source**: Pulls code from GitHub
- **Build**: Builds Docker images (backend) or npm build (frontend)
- **Deploy**: Pushes to ECR and updates ECS services (backend) or uploads to S3 and invalidates CloudFront (frontend)

**Build Time:**
- Backend: ~8-12 minutes (first build)
- Frontend: ~3-5 minutes

### 9. Access Your Deployed Application

After both pipelines complete successfully:

1. Go to AWS Console → **CloudFront** → **Distributions**
2. Find your distribution (should be **Enabled**)
3. Copy the **Distribution domain name** (e.g., `d1lhkxetp9s05x.cloudfront.net`)
4. Open in browser: `https://your-distribution-domain.cloudfront.net`

**Testing the Deployment:**
- Create a new user account via Signup page
- Log in with your credentials
- Try calculating a tariff between two countries
- Upload tariffs via CSV (admin feature)
- View calculation history

### 10. Monitoring and Logs

**View Service Logs:**
```bash
# Install AWS CLI if not already installed
aws configure  # Use your credentials

# View ECS service logs
aws logs tail /ecs/cs203g1t1-dev-user --follow
aws logs tail /ecs/cs203g1t1-dev-tariff --follow
aws logs tail /ecs/cs203g1t1-dev-history --follow
```

**Check Service Health:**
- Go to AWS Console → **ECS** → **Clusters** → `cs203g1t1-dev-cluster`
- Click on each service to see running tasks
- All services should show "RUNNING" status with desired count = running count

**CloudWatch Dashboards:**
- Go to AWS Console → **CloudWatch** → **Log groups**
- Filter by `/ecs/cs203g1t1-dev-*`
- Click on any log group to view service logs

### Updating the Application

After the initial deployment, any changes pushed to the `main` branch will automatically trigger the pipeline:

```bash
# Make your code changes
git add .
git commit -m "Your commit message"
git push origin main

# Pipeline will automatically:
# 1. Detect the changes
# 2. Build only the changed services
# 3. Deploy the updates
# 4. Invalidate CloudFront cache (for frontend changes)
```

### Cost Management

**Monthly Cost Estimate (with default settings):**
- ECS Fargate (7 services × 1 task): ~$20-30/month
- RDS PostgreSQL (db.t3.micro): ~$15-20/month
- ElastiCache Redis (cache.t3.micro): ~$12/month
- ALB: ~$20/month
- NAT Gateway: ~$35/month
- Data Transfer: ~$5-10/month
- **Total: ~$107-127/month**

**Cost Optimization Tips:**
- Set `enable_redis = false` to save ~$12/month
- Set `enable_rds_proxy = false` to save ~$15/month
- Set `enable_read_replica = false` to save ~$50/month
- Set `single_nat_gateway = true` (already default)
- Stop services when not in use: `aws ecs update-service --desired-count 0`

### Cleanup

To destroy all AWS resources and avoid charges:

```bash
cd infra/
tofu destroy
```

Type `yes` when prompted. This will remove all resources created by OpenTofu.

**Note:** The S3 bucket with frontend files may need to be emptied manually before destruction:
```bash
aws s3 rm s3://your-bucket-name --recursive
```

## Project Structure

```
CS203-Project-Tariff-fic-G1-1/
├── agreement/              # Trade agreement microservice (Python Flask)
│   ├── app.py
│   ├── Dockerfile
│   └── requirements.txt
├── country/                # Country data microservice (Python Flask)
│   ├── app.py
│   ├── countries_full.csv
│   ├── country_relations_all.csv
│   └── Dockerfile
├── csd-project-frontend/   # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── lib/           # API services and utilities
│   │   ├── pages/         # Page components
│   │   └── App.tsx
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── forecast/               # Tariff forecasting microservice (Python Flask)
│   ├── app.py
│   ├── model.py
│   └── Dockerfile
├── history/                # Calculation history microservice (Python Flask)
│   ├── app.py
│   ├── Dockerfile
│   └── migrations/
├── infra/                  # Infrastructure as Code (OpenTofu/Terraform)
│   ├── alb.tf             # Application Load Balancer
│   ├── ecs.tf             # ECS Cluster and services
│   ├── rds.tf             # PostgreSQL database
│   ├── frontend.tf        # CloudFront and S3
│   ├── pipeline.tf        # CI/CD pipelines
│   ├── vpc.tf             # Network infrastructure
│   ├── variables.tf       # Input variables
│   └── terraform.tfvars   # Configuration values
├── product/                # Product/HS code microservice (Python Flask)
│   ├── src/
│   ├── hs_nomenclature/
│   └── Dockerfile
├── tariff/                 # Tariff calculation microservice (Java Spring Boot)
│   ├── src/
│   ├── pom.xml
│   └── Dockerfile
├── user/                   # User management microservice (Python Flask)
│   ├── app.py
│   ├── Dockerfile
│   └── migrations/
├── buildspec.yml           # Backend CI/CD build specification
├── buildspec-frontend.yml  # Frontend CI/CD build specification
├── compose.yml             # Docker Compose for local development
└── README.md               # This file
```

## Architecture Overview

### System Architecture
![alt text](image.png)

### Microservices Architecture

Each service is independently deployable and scalable:

1. **User Service** (Port 5001)
   - User registration and authentication
   - Profile management
   - JWT token validation

2. **Product Service** (Port 5002)
   - HS code management
   - NLP-based product classification
   - Product search and lookup

3. **History Service** (Port 5003)
   - Calculation history tracking
   - User activity logs
   - Historical data retrieval

4. **Tariff Service** (Port 5004)
   - Tariff rate calculations
   - Multi-tariff type support (Ad Valorem, Specific, Compound)
   - Bulk tariff upload via CSV

5. **Country Service** (Port 5005)
   - Country data management
   - Country relationship mapping
   - Trade bloc information

6. **Agreement Service** (Port 5006)
   - Bilateral trade agreements
   - Preferential tariff rates
   - Agreement date ranges

7. **Forecast Service** (Port 5007)
   - Tariff rate prediction
   - Weighted graph algorithms
   - Historical trend analysis


### Git Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes and Commit**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```
   
   Use conventional commit messages:
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `refactor:` Code refactoring
   - `test:` Test additions
   - `chore:` Maintenance tasks

3. **Push and Create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```
   
4. **Code Review**
   - At least one team member must review
   - Address all comments
   - Ensure CI/CD pipeline passes

5. **Merge to Main**
   - Squash commits if needed
   - Delete feature branch after merge

### Testing

**Backend Unit Tests:**
```bash
# Python services
cd user/  # or any service directory
pytest tests/ -v

# Java service
cd tariff/
./mvnw test
```

**Frontend Tests:**
```bash
cd csd-project-frontend/
npm run test
```

**Integration Tests:**
```bash
# Ensure all services are running
docker compose up -d

# Run integration tests
pytest integration_tests/ -v
```

**API Testing with curl:**
```bash
# Test tariff endpoint
curl http://localhost:5004/api/tariffs/by-hs/847130

# Test with authentication
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:5001/api/user/12345
```

### Adding a New Microservice

1. **Create Service Directory**
   ```bash
   mkdir new-service
   cd new-service
   ```

2. **Add Application Code**
   - Create `app.py` (Python) or main application file
   - Add `requirements.txt` or `pom.xml`
   - Implement health check endpoint: `/health`

3. **Create Dockerfile**
   ```dockerfile
   FROM python:3.11-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   COPY . .
   CMD ["python", "app.py"]
   ```

4. **Add to Docker Compose**
   ```yaml
   new-service:
     build: ./new-service
     ports:
       - "5008:5008"
     environment:
       - DATABASE_URL=${DATABASE_URL}
   ```

5. **Update Infrastructure**
   - Add service to `infra/local.tf`
   - Update `infra/ecs_service.tf` with new service definition
   - Add to pipeline in `infra/pipeline.tf`

6. **Deploy**
   ```bash
   cd infra/
   tofu apply
   ```

## Documentation

Additional documentation can be found in the repository:

- **[CORS_FIX_INSTRUCTIONS.md](CORS_FIX_INSTRUCTIONS.md)** - CORS configuration guide
- **[FIREBASE_SETUP_BACKEND.md](FIREBASE_SETUP_BACKEND.md)** - Backend Firebase integration
- **[FORECAST_INTEGRATION_GUIDE.md](FORECAST_INTEGRATION_GUIDE.md)** - Forecast service integration
- **[JWT_IMPLEMENTATION.md](JWT_IMPLEMENTATION.md)** - JWT authentication implementation
- **[SECURITY_CONFIGURATION.md](SECURITY_CONFIGURATION.md)** - Security best practices
- **[CSV_BULK_UPLOAD_SUMMARY.md](csd-project-frontend/CSV_BULK_UPLOAD_SUMMARY.md)** - CSV upload feature guide

## Troubleshooting

### Common Issues

#### "Failed to load tariffs" Error
**Symptom**: Frontend shows error when loading admin panel or tariff data

**Solutions:**
1. Check if backend services are running: `docker compose ps` or check ECS service status
2. Verify API endpoints are accessible: `curl http://localhost:5004/api/tariffs/health`
3. Check browser console for specific error messages
4. Clear browser cache and CloudFront cache (AWS deployment)

#### Database Connection Errors
**Symptom**: Services log "Connection refused" or "Cannot connect to database"

**Solutions:**
1. Ensure PostgreSQL container is running: `docker compose ps db`
2. Check database credentials in `compose.yml` or Terraform variables
3. Verify database migrations ran successfully: `docker compose logs user | grep migration`
4. For AWS: Check RDS security group allows ECS security group access

#### Port Already in Use
**Symptom**: `Error starting userland proxy: listen tcp 0.0.0.0:5001: bind: address already in use`

**Solutions:**
```bash
# Find process using the port
netstat -ano | findstr :5001  # Windows
lsof -i :5001                 # macOS/Linux

# Kill the process or change port in compose.yml
```

#### Frontend Build Fails
**Symptom**: `npm run build` errors or white screen after deployment

**Solutions:**
1. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
2. Check `.env` file has all required variables
3. Verify Firebase credentials are correct
4. Check for TypeScript errors: `npm run type-check`

#### AWS Deployment Issues

**Pipeline Stuck:**
- Check CodeStar connection status (must be "Available")
- Verify GitHub repository permissions
- Check CloudWatch logs for build errors

**Services Not Starting:**
- Check ECS task logs in CloudWatch
- Verify ECR images were pushed successfully
- Check security group rules allow ALB → ECS traffic
- Ensure IAM roles have correct permissions

**504 Gateway Timeout:**
- Check if ECS tasks are healthy: ECS Console → Cluster → Service → Tasks
- Verify health check endpoints return 200: `/health` or `/api/tariffs/health`
- Check CloudWatch logs for application errors

## Performance Optimization

### Frontend
- **Code Splitting**: Lazy load routes and components
- **Image Optimization**: Use WebP format and responsive images
- **Bundle Analysis**: Run `npm run build -- --mode production` and analyze chunks
- **CDN Caching**: CloudFront caches static assets for 1 year

### Backend
- **Database Indexing**: Add indexes on frequently queried columns
- **Redis Caching**: Enable Redis for frequently accessed data
- **Connection Pooling**: Use RDS Proxy for better connection management
- **Query Optimization**: Use JOINs efficiently, avoid N+1 queries

### Infrastructure
- **Auto-scaling**: Configure target tracking scaling policies
- **Read Replicas**: Enable RDS read replicas for read-heavy workloads
- **Multi-AZ**: Deploy across multiple availability zones for high availability
- **CloudFront**: Use edge locations for global low-latency access

## Security Best Practices

### Application Security
- ✅ All passwords hashed with bcrypt
- ✅ JWT tokens for API authentication
- ✅ Firebase Authentication for frontend
- ✅ Input validation on all endpoints
- ✅ SQL injection prevention via ORM
- ✅ CORS configured for allowed origins
- ✅ Rate limiting on public endpoints
- ✅ HTTPS enforced for all traffic

### Infrastructure Security
- ✅ VPC with private subnets for services
- ✅ Security groups with least privilege
- ✅ Database not publicly accessible
- ✅ Secrets stored in AWS Secrets Manager
- ✅ IAM roles with minimal permissions
- ✅ WAF rules for common attacks
- ✅ GuardDuty for threat detection
- ✅ CloudTrail for audit logging


## Contributing

This is an academic project for CS203 Software Engineering. Contributions are limited to team members.

### Team Collaboration Guidelines

1. **Communication**: Use team chat/meetings for coordination
2. **Task Management**: Track tasks in project management tool
3. **Code Reviews**: All PRs require at least one approval
4. **Documentation**: Update relevant docs with code changes
5. **Testing**: Write tests for new features
6. **Deployment**: Test locally before pushing to main

### Reporting Issues

When reporting bugs or issues:
1. Describe the expected behavior
2. Describe the actual behavior
3. Provide steps to reproduce
4. Include error messages/logs
5. Specify environment (local/AWS)

## Acknowledgments

- **Singapore Management University** - CS203 Software Engineering Course
- **Teaching Staff** - Guidance and support throughout the project
- **Open Source Community** - Libraries and tools that made this possible

## License

This project is for educational purposes as part of the CS203 Software Engineering course at Singapore Management University.

**Restrictions:**
- For academic use only
- Not for commercial use
- Code may not be redistributed without permission

## Contact & Support

**Team G1-1 Members:**
- Archer Ngan
- Benjamin Loh - Project Lead
- Brian Lim - Backend Development
- Jiang Qianchen - Frontend Development
- Quek De Wang - DevOps & Infrastructure
- Rainer Tan - Full Stack Development



---

**Course**: CS203 - Software Engineering  
**Institution**: Singapore Management University  
**Academic Year**: 2024/2025




# Technical Documentation

## 1. Introduction

This document describes the technical architecture and operating model of the AI-enabled internal developer platform built on top of `bolt.diy`. The platform is designed for prompt-driven web content generation, visual refinement, controlled deployment, and post-deployment analytics within a governed environment.

At a high level, the system combines a browser-based authoring experience with a server-side orchestration layer for large language model (LLM) interactions, deployment automation, and telemetry ingestion. Users can generate pages from natural language prompts, refine the output through a drag-and-drop editor, preview the generated application, and deploy the resulting site through a one-click workflow.

This documentation focuses on four technical concerns:

- End-to-end prompt-to-preview orchestration
- LLM provider abstraction and prompt enforcement
- Visual editing through GrapeJS
- Deployment and analytics architecture

## 2. Feature Overview

The platform currently provides the following core capabilities:

- Prompt-to-preview generation for web pages and application scaffolds
- Provider-agnostic LLM orchestration for build and discuss workflows
- Incremental parsing and execution of generated file and shell actions
- Browser-based visual editing with drag-and-drop composition
- One-click deployment using generated Docker artifacts and Fly.io automation
- Analytics tracking for deployed pages through an injected tracker and server-side ingestion endpoint

These features are intentionally connected as one continuous workflow: the user begins in chat, iterates in preview, refines visually if needed, deploys the generated project, and then monitors usage through deployment analytics.

## 3. Installation and Configuration

### 3.1 Prerequisites

To run the platform locally or through Docker, the following prerequisites are recommended:

- Docker Desktop installed and running
- Git for cloning the repository
- Node.js 22 or higher for local non-container workflows
- A valid LLM API configuration, depending on the selected provider

### 3.2 Repository Setup

Clone the repository and move into the project root:

```bash
git clone <repository-url>
cd bolt.diy
```

### 3.3 Environment Configuration

Create a `.env.local` file in the repository root. The exact values depend on the chosen deployment mode and provider configuration, but the following categories are typically required:

- LLM provider settings such as `LLM_PROVIDER`, `LLM_MODEL`, `LLM_API_KEY`, and optional base URL values
- Authentication settings such as `BOLT_AUTH_REQUIRED`, `BOLT_ADMIN_EMAIL`, `BOLT_ADMIN_PASSWORD`, and `BOLT_SESSION_SECRET`
- Deployment settings such as `FLY_API_TOKEN`
- Optional email configuration for account verification and password recovery

Where Docker is used, the application also consumes environment variables through `docker-compose.yaml` and passes them into the container runtime.

### 3.4 Running the Platform

For containerized execution, the recommended command is:

```bash
docker compose --profile production up --build
```

This approach provides the most consistent runtime behavior across Windows and macOS hosts because the production environment runs inside a Linux container with a stable Node runtime and deployment tooling.

## 4. System Architecture Overview

The platform follows a split-runtime model with three major execution domains.

### 4.1 Browser Runtime

The browser is responsible for the interactive user experience and local orchestration concerns, including:

- Chat UI and message composition
- Incremental parsing of streamed model responses
- Preview iframe updates
- Visual editing through GrapeJS
- WebContainer-backed project interaction

Relevant files include:

- `app/components/chat/Chat.client.tsx`
- `app/lib/hooks/useMessageParser.ts`
- `app/components/workbench/Preview.tsx`
- `app/components/workbench/VisualEditor.client.tsx`

### 4.2 Server Runtime

The server runtime is responsible for orchestration, deployment, and ingestion workflows that should not be handled directly in the browser. These include:

- LLM request handling through `/api/chat`
- Deployment preparation and Fly execution through `/api/deploy-docker`
- Analytics event ingestion through `/api/stats`
- Authentication and session validation

Relevant files include:

- `app/routes/api.chat.ts`
- `app/routes/api.deploy-docker.ts`
- `app/routes/api.stats.ts`
- `app/lib/auth/*`

### 4.3 WebContainer Runtime

The WebContainer layer acts as the isolated project execution environment used during generation and refinement. It supports:

- Filesystem writes generated by model actions
- Shell command execution for build/start tasks
- Local preview hosting for generated applications

This allows the platform to simulate a development workflow in-browser while keeping orchestration logic in the server layer.

## 5. End-to-End Prompt-to-Preview Workflow

### 5.1 Prompt Submission

The user enters a prompt through the chat interface implemented in `app/components/chat/Chat.client.tsx`. The client sends a request to `/api/chat` with:

- Prompt text and prior messages
- Active prompt variant
- Chat mode such as `build` or `discuss`
- Current project files and context state
- Optional metadata such as Supabase connectivity

### 5.2 Chat API Handling

The main server entry point is `app/routes/api.chat.ts`. This route:

1. Validates the requesting user
2. Parses the request payload
3. Initializes stream lifecycle infrastructure
4. Processes MCP tool invocations where applicable
5. Delegates the actual provider call to `stream-text.ts`
6. Returns progress, usage, and response annotations to the UI

### 5.3 LLM Stream Orchestration

`app/lib/.server/llm/stream-text.ts` is the runtime orchestration layer for LLM calls. It is responsible for:

- Resolving the provider and model
- Building the final system prompt
- Injecting runtime constraints such as context files and locked files
- Applying mode-specific behavior for build and discuss workflows
- Streaming the model response through the AI SDK

This file is not simply a prompt repository. Instead, it converts prompt templates plus request-time context into the actual provider request.

### 5.4 Provider-Abstraction Layer

`app/lib/.server/llm/model-factory.ts` provides a provider-agnostic abstraction for model selection. It resolves the correct adapter based on runtime configuration variables such as:

- `LLM_PROVIDER`
- `LLM_MODEL`
- `LLM_BASE_URL`
- `LLM_API_KEY`

Because this abstraction sits between the API routes and provider-specific SDKs, the rest of the application can remain stable when switching providers.

### 5.5 Prompt Policy Layer

Prompt behavior is defined through:

- `app/lib/common/prompt-library.ts`
- `app/lib/common/prompts/prompts.ts`
- `app/lib/common/prompts/new-prompt.ts`
- `app/lib/common/prompts/discuss-prompt.ts`

The prompt library selects the appropriate base prompt by `promptId` and chat mode. `stream-text.ts` then merges these base instructions with runtime constraints before the provider request is sent.

### 5.6 Parsing and Action Execution

Model output is consumed incrementally by the parser layer:

- `app/lib/hooks/useMessageParser.ts`
- `app/lib/runtime/message-parser.ts`
- `app/lib/runtime/enhanced-message-parser.ts`
- `app/lib/runtime/action-runner.ts`

The parser extracts artifacts and actions from the streamed response, while `ActionRunner` executes those actions against the WebContainer-backed project. This is how generated file updates, shell commands, and build/start steps become visible in the workbench before the assistant response fully completes.

### 5.7 Preview Refresh

Preview behavior is coordinated through:

- `app/lib/stores/workbench.ts`
- `app/lib/stores/previews.ts`
- `app/components/workbench/Preview.tsx`

Whenever actions mutate files or runtime state, the preview store emits a refresh signal. The preview iframe then reloads, allowing the user to observe the generated application in near real time.

## 6. Visual Editing with GrapeJS

### 6.1 Integration Layer

The visual editor is primarily implemented through:

- `app/components/workbench/VisualEditor.client.tsx`
- `app/components/workbench/BlocksPanel.client.tsx`
- `app/lib/stores/visualEditorStore.ts`

`VisualEditor.client.tsx` dynamically loads GrapeJS on the client and initializes the editor canvas, while `BlocksPanel.client.tsx` exposes the block manager and related UI controls.

### 6.2 Block and Component Model

Custom visual elements are defined in the `BLOCKS` array inside `VisualEditor.client.tsx`. New blocks can be introduced by:

1. Adding a new block definition
2. Registering it through `editor.Blocks.add(...)`
3. Optionally adding a custom component type through `editor.Components.addType(...)`

This makes the visual editing layer extensible without requiring changes to the rest of the orchestration pipeline.

### 6.3 Drag-and-Drop Behavior

Drag-and-drop interaction is governed by component defaults such as:

- `draggable`
- `droppable`
- `resizable`

The implementation also differentiates between structural layout blocks and leaf content nodes, allowing the editor to provide stronger placement constraints and more useful resize behavior.

### 6.4 Synchronization with Project Files

The visual editor is not an isolated canvas. It synchronizes with the actual project files in the WebContainer environment. When the user edits visually, the corresponding HTML and CSS are written back to the project; when the LLM updates those files, the editor can resynchronize the canvas state.

This synchronization is coordinated through shared atoms and update signals to avoid write-loop conflicts.

## 7. Deployment Architecture

### 7.1 Deployment UI and Flow

The deployment flow begins from:

- `app/components/deploy/DeployButton.tsx`
- `app/components/deploy/DockerDeploy.client.tsx`
- `app/components/deploy/DockerDeploymentDialog.tsx`

The process is:

1. The user triggers deployment from the UI
2. Project files are collected from WebContainer
3. The project type is detected
4. Docker artifacts are generated
5. A request is sent to `/api/deploy-docker`

### 7.2 Generated Deployment Artifacts

The deployment layer can generate:

- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- `fly.toml` when needed

The client-side generator prepares the project package, while the server-side route finalizes deployment-specific configuration.

### 7.3 Fly.io Execution

`app/routes/api.deploy-docker.ts` performs the server-side deployment workflow. Its responsibilities include:

- Preparing a temporary build directory
- Generating `fly.toml` if not already present
- Creating or reusing the Fly application
- Running `flyctl deploy --remote-only`
- Streaming deployment logs back to the client

This route is also where deployment-time analytics instrumentation is added to the generated project.

### 7.4 Runtime vs Generated Project Containerization

It is important to distinguish between two containerization concerns:

- The root-level `Dockerfile` and `docker-compose.yaml` are used to run `bolt.diy` itself
- The one-click deployment flow generates Docker artifacts for the user-created project

This distinction matters for troubleshooting because runtime issues with the platform container are separate from deployment issues in generated applications.

## 8. Analytics Architecture

### 8.1 Purpose

The analytics layer provides lightweight usage visibility for deployed pages without requiring the generated application author to manually integrate a third-party analytics SDK. It is designed to capture page visits and route transitions for applications deployed through the one-click deployment flow.

### 8.2 Deployment-Time Injection

Analytics instrumentation is injected during deployment preparation in `app/routes/api.deploy-docker.ts`.

At deployment time, the server modifies the generated `index.html` and inserts a tracker script before the closing `</body>` tag, with a fallback to `</html>` if necessary. This means the deployed application is analytics-enabled as part of the deployment workflow rather than through post-deployment manual edits.

### 8.3 Tracker Behavior

The injected tracker performs the following functions:

- Creates or reuses a browser-scoped session identifier stored in `sessionStorage`
- Sends an initial pageview event when the page loads
- Hooks `history.pushState` and the `popstate` event to observe single-page application navigation
- Uses `navigator.sendBeacon(...)` when available
- Falls back to `fetch(..., { keepalive: true })` or an image beacon when necessary

This design improves reliability while keeping the tracker implementation lightweight and self-contained.

### 8.4 Event Ingestion

Analytics events are received by `app/routes/api.stats.ts`.

The tracker sends the application identifier, path, session ID, and timestamp-related parameters to this route. The route acts as the ingestion layer for deployment analytics and can be used to aggregate route-level activity per deployed application.

### 8.5 Data Flow Summary

The analytics data path is:

1. User visits a deployed page
2. Injected tracker detects page load or client-side navigation
3. Tracker sends a request to `/api/stats`
4. The server records the event in the analytics ingestion layer

This gives the system a deployment-aware telemetry path that is tightly integrated with the generated application lifecycle.

### 8.6 Architectural Benefits

The analytics approach provides several benefits:

- No manual analytics integration is required for generated applications
- The tracker is consistent across deployments
- Initial page loads and SPA navigation are both captured
- Instrumentation is injected only when the deployment workflow is used
- Analytics remains under platform control, which aligns with governed deployment environments

## 9. Key File Reference Map

### Prompt and LLM orchestration

- `app/components/chat/Chat.client.tsx`
- `app/routes/api.chat.ts`
- `app/lib/.server/llm/stream-text.ts`
- `app/lib/.server/llm/model-factory.ts`
- `app/lib/common/prompt-library.ts`
- `app/lib/common/prompts/*.ts`

### Parsing, actions, and preview

- `app/lib/hooks/useMessageParser.ts`
- `app/lib/runtime/*.ts`
- `app/lib/stores/workbench.ts`
- `app/lib/stores/previews.ts`
- `app/components/workbench/Preview.tsx`

### Visual editor

- `app/components/workbench/VisualEditor.client.tsx`
- `app/components/workbench/BlocksPanel.client.tsx`
- `app/lib/stores/visualEditorStore.ts`

### Deployment and analytics

- `app/components/deploy/DeployButton.tsx`
- `app/components/deploy/DockerDeploy.client.tsx`
- `app/components/deploy/DockerDeploymentDialog.tsx`
- `app/routes/api.deploy-docker.ts`
- `app/routes/api.stats.ts`
- `Dockerfile`
- `docker-compose.yaml`

## 10. Conclusion

The platform is best understood as a coordinated workflow engine rather than a single-page generator. Chat-driven generation, streaming action execution, visual editing, deployment automation, and analytics instrumentation are all part of one integrated system. The architecture intentionally separates browser interaction, server orchestration, and WebContainer execution so that the platform can remain interactive for users while still supporting deployment and telemetry workflows that belong on the server.

For future iterations, this document can be extended with sequence diagrams, environment-variable reference tables, and operational deployment guides for production hosting.

