# S3 bucket (private; served via CloudFront)

resource "aws_s3_bucket" "frontend" {
  bucket = "${local.name_prefix}-frontend"
  tags   = local.tags
}

resource "aws_s3_bucket_ownership_controls" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  rule { object_ownership = "BucketOwnerEnforced" }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront OAC (Origin Access Control) to read S3
# CloudFront Function to rewrite /api/* paths for backend services
resource "aws_cloudfront_function" "api_rewrite" {
  name    = "${local.name_prefix}-api-rewrite"
  runtime = "cloudfront-js-1.0"
  comment = "Rewrite /api prefix for backend microservices"
  publish = true
  code    = <<-EOT
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    
    // Rewrite /api/user/* to /user/*
    if (uri.startsWith('/api/user/')) {
        request.uri = uri.replace('/api/user/', '/user/');
    }
    // Rewrite /api/history/* to /history/*
    else if (uri.startsWith('/api/history/')) {
        request.uri = uri.replace('/api/history/', '/history/');
    }
    // Rewrite /api/countries/* to /countries/*
    else if (uri.startsWith('/api/countries/')) {
        request.uri = uri.replace('/api/countries/', '/countries/');
    }
    // Rewrite /api/agreements/* to /agreements/*
    else if (uri.startsWith('/api/agreements/')) {
        request.uri = uri.replace('/api/agreements/', '/agreements/');
    }
    // Rewrite /api/forecast/* to /forecast/*
    else if (uri.startsWith('/api/forecast/')) {
        request.uri = uri.replace('/api/forecast/', '/forecast/');
    }
    // /api/tariffs/* stays as-is (tariff service expects /api/tariffs/*)
    
    return request;
}
EOT
}

resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${local.name_prefix}-oac"
  description                       = "OAC for ${aws_s3_bucket.frontend.bucket}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  default_root_object = "index.html"

  # Origin 1: S3 bucket for static frontend files
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "s3-frontend"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  # Origin 2: ALB for API requests
  origin {
    domain_name = aws_lb.public.dns_name
    origin_id   = "alb-backend"
    
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"  # ALB doesn't have HTTPS configured
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default behavior: serve static files from S3
  default_cache_behavior {
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods  = ["GET", "HEAD", "OPTIONS"]
    compress        = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
  }

  # API behavior: proxy /api/* requests to ALB
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    target_origin_id = "alb-backend"
    
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    compress               = true
    
    # Forward everything to backend
    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type", "Accept", "Origin", "Referer"]
      
      cookies {
        forward = "all"
      }
    }
    
    # Attach path rewrite function
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.api_rewrite.arn
    }
    
    # Don't cache API responses
    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  price_class = "PriceClass_200"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  # Custom error responses for SPA routing
  # These primarily handle S3 403/404 for non-existent HTML pages
  # APIs should return proper status codes (200, 400, 401, 500) to avoid triggering these
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  tags = local.tags
}

# data "aws_caller_identity" "current" {} # Defined in pipeline.tf

# Bucket policy to allow CloudFront OAC to read
data "aws_iam_policy_document" "frontend_s3" {
  statement {
    sid     = "AllowCloudFrontOAC"
    actions = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.frontend.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.frontend.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}


resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = data.aws_iam_policy_document.frontend_s3.json
}
