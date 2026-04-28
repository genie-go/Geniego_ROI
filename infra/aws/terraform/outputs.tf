output "alb_dns_name" {
  description = "Public ALB DNS name for API"
  value       = aws_lb.api.dns_name
}

output "frontend_bucket" {
  value = aws_s3_bucket.frontend.bucket
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.frontend.domain_name
}

output "rds_endpoint" {
  value = aws_db_instance.postgres.address
}

output "sqs_queue_url" {
  value = aws_sqs_queue.jobs.url
}
