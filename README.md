# CS203 Project: Tariff-fic

## Overview

This repository contains the source code and documentation for the CS203 Software Engineering project - Tariff-fic, developed by Group G1-1.

## Project Description

Tariff-fic is a [brief description of what the application does - to be updated as project develops].

## Team Members - Group G1-1

- [Team Member 1]
- [Team Member 2]
- [Team Member 3]
- [Team Member 4]
- [Team Member 5]

## Getting Started

### Prerequisites

- [List any software requirements, e.g., Java JDK, Node.js, etc.]
- [Database requirements if any]
- [Other dependencies]

### Installation

1. Fork the repository

   ```bash
   git clone https://github.com/BenjaminLohDW/CS203-Project-Tariff-fic-G1-1.git
   cd CS203-Project-Tariff-fic-G1-1
   ```

2. [Add installation steps as project develops]

### Running the Application LOCALLY

```bash
# Add commands to run the application
```


## Deploying the applicaiton to run on AWS
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
alert_email = "jiangqianchen2002@gmail.com" # IMPORTANT: change this to your own email address

# ===== OPTIONAL: Custom Domain for Frontend =====
# frontend_domain  = "myapp.example.com"
# frontend_acm_arn = "arn:
```

### 3. Deploy Infrastructure
```bash
cd infra/
tofu init
tofu apply
```

### 3. Establish codestar connection
Go to your AWS account -> Developer Tools -> Settings -> Connections; here you should see the new connection titled '' being created, with a 'pending status' 
- Click 

### 4. Release changes
Click on release change to get the pipline started; the pipeline will build the services and subsequently deploy them



## Placeholder
CS203-Project-Tariff-fic-G1-1/
├── src/                    # Source code
├── docs/                   # Documentation
├── tests/                  # Test files
├── README.md              # This file
└── [other directories as needed]


## Features

- [Feature 1]
- [Feature 2]
- [Feature 3]

## Technologies Used

- [Programming Language]
- [Framework]
- [Database]
- [Other tools/libraries]

## Development Guidelines

- Follow the coding standards outlined in the project documentation
- Write comprehensive tests for new features
- Update documentation when making changes
- Create pull requests for code reviews

## Testing

```bash
# Add testing commands when available
```

## Documentation

Additional project documentation can be found in the `docs/` directory.

## Contributing

This is an academic project for CS203. All contributions should follow the course guidelines and be approved by team members.

## License

This project is for educational purposes as part of the CS203 Software Engineering course.

## Contact

For questions or issues, please contact the development team or refer to the course materials.

---

**Course**: CS203 - Software Engineering  
**Institution**: Singapore Management University  
**Academic Year**: 2024/2025
