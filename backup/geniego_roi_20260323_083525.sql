-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: geniego_roi
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `action_request`
--

DROP TABLE IF EXISTS `action_request`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `action_request` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `policy_id` int(11) DEFAULT NULL,
  `status` varchar(50) NOT NULL,
  `action_json` mediumtext DEFAULT NULL,
  `approvals_json` mediumtext DEFAULT NULL,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `action_request`
--

LOCK TABLES `action_request` WRITE;
/*!40000 ALTER TABLE `action_request` DISABLE KEYS */;
/*!40000 ALTER TABLE `action_request` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `activity_rollup`
--

DROP TABLE IF EXISTS `activity_rollup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `activity_rollup` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `window` varchar(50) NOT NULL,
  `dimension` varchar(100) NOT NULL,
  `key` varchar(500) NOT NULL,
  `metrics_json` mediumtext DEFAULT NULL,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activity_rollup`
--

LOCK TABLES `activity_rollup` WRITE;
/*!40000 ALTER TABLE `activity_rollup` DISABLE KEYS */;
/*!40000 ALTER TABLE `activity_rollup` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ad_insight_agg`
--

DROP TABLE IF EXISTS `ad_insight_agg`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ad_insight_agg` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(100) NOT NULL,
  `platform` varchar(100) NOT NULL,
  `date` varchar(10) NOT NULL,
  `campaign_id` varchar(255) DEFAULT NULL,
  `adset_id` varchar(255) DEFAULT NULL,
  `ad_id` varchar(255) DEFAULT NULL,
  `sku` varchar(255) DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `age_range` varchar(50) DEFAULT NULL,
  `region` varchar(50) DEFAULT NULL,
  `impressions` int(11) NOT NULL DEFAULT 0,
  `clicks` int(11) NOT NULL DEFAULT 0,
  `spend` double NOT NULL DEFAULT 0,
  `conversions` int(11) NOT NULL DEFAULT 0,
  `revenue` double NOT NULL DEFAULT 0,
  `extra_json` mediumtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ad_insight_agg_tenant_date` (`tenant_id`,`date`),
  KEY `idx_ad_insight_agg_segment` (`tenant_id`,`platform`,`gender`,`age_range`,`region`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ad_insight_agg`
--

LOCK TABLES `ad_insight_agg` WRITE;
/*!40000 ALTER TABLE `ad_insight_agg` DISABLE KEYS */;
/*!40000 ALTER TABLE `ad_insight_agg` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ads_mapping`
--

DROP TABLE IF EXISTS `ads_mapping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ads_mapping` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `platform` varchar(100) NOT NULL,
  `field` varchar(255) NOT NULL,
  `raw_value` varchar(500) NOT NULL,
  `canonical_value` varchar(500) NOT NULL,
  `note` text DEFAULT NULL,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ads_mapping`
--

LOCK TABLES `ads_mapping` WRITE;
/*!40000 ALTER TABLE `ads_mapping` DISABLE KEYS */;
/*!40000 ALTER TABLE `ads_mapping` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `alert_instance`
--

DROP TABLE IF EXISTS `alert_instance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `alert_instance` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `policy_id` int(11) NOT NULL,
  `window` varchar(100) NOT NULL,
  `status` varchar(50) NOT NULL,
  `payload_json` mediumtext DEFAULT NULL,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alert_instance`
--

LOCK TABLES `alert_instance` WRITE;
/*!40000 ALTER TABLE `alert_instance` DISABLE KEYS */;
/*!40000 ALTER TABLE `alert_instance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `alert_policy`
--

DROP TABLE IF EXISTS `alert_policy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `alert_policy` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `dimension` varchar(100) DEFAULT NULL,
  `severity` varchar(50) DEFAULT NULL,
  `metric` varchar(100) DEFAULT NULL,
  `operator` varchar(20) DEFAULT NULL,
  `threshold` double DEFAULT NULL,
  `policy_json` mediumtext DEFAULT NULL,
  `notify_slack` tinyint(1) NOT NULL DEFAULT 0,
  `slack_channel` varchar(255) DEFAULT NULL,
  `slack_webhook_url` varchar(500) DEFAULT NULL,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alert_policy`
--

LOCK TABLES `alert_policy` WRITE;
/*!40000 ALTER TABLE `alert_policy` DISABLE KEYS */;
/*!40000 ALTER TABLE `alert_policy` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `api_key`
--

DROP TABLE IF EXISTS `api_key`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `api_key` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(100) NOT NULL,
  `key_prefix` varchar(50) NOT NULL,
  `key_hash` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'viewer',
  `scopes_json` mediumtext DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `last_used_at` varchar(32) DEFAULT NULL,
  `expires_at` varchar(32) DEFAULT NULL,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_api_key_tenant` (`tenant_id`,`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `api_key`
--

LOCK TABLES `api_key` WRITE;
/*!40000 ALTER TABLE `api_key` DISABLE KEYS */;
INSERT INTO `api_key` VALUES (1,'demo','genie_live_','0d4df370efb19b8325f7fee11016e18fa699f67591fc428102ce628531656061','Demo Admin Key','admin','[\"read:*\",\"write:*\",\"admin:keys\"]',1,NULL,NULL,'2026-03-19T01:12:07+00:00'),(2,'demo','genie_read_','24fa4274e78d372ebf615334b2a83a433995e388f22c8aadf95d9d12639bfc93','Demo Analyst Key','analyst','[\"read:*\"]',1,NULL,NULL,'2026-03-19T01:12:07+00:00');
/*!40000 ALTER TABLE `api_key` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `app_user`
--

DROP TABLE IF EXISTS `app_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `app_user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(191) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `password_hashs` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `plan` varchar(20) NOT NULL DEFAULT 'demo',
  `plans` varchar(20) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `subscription_expires_at` varchar(32) DEFAULT NULL,
  `subscription_cycle` varchar(20) DEFAULT NULL,
  `created_at` varchar(32) NOT NULL,
  `representative` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `subscription_started_at` varchar(32) DEFAULT NULL,
  `subscription_renewed_at` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_app_user_plan` (`plan`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `app_user`
--

LOCK TABLES `app_user` WRITE;
/*!40000 ALTER TABLE `app_user` DISABLE KEYS */;
INSERT INTO `app_user` VALUES (1,'ceo@ociell.com','$2y$10$4CU1MhX8K.Ep7Oi/Bcv2kOfWYIRKwE0OdVMUH76nJ5R7D1s16CPsa','$2y$10$4CU1MhX8K.Ep7Oi/Bcv2kOfWYIRKwE0OdVMUH76nJ5R7D1s16CPsa','CEO Admin','admin','admin','Geniego',1,NULL,NULL,'2026-03-19T00:56:27Z',NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `app_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attribution_coupon`
--

DROP TABLE IF EXISTS `attribution_coupon`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `attribution_coupon` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(100) NOT NULL,
  `code` varchar(255) NOT NULL,
  `channel` varchar(100) NOT NULL,
  `campaign` varchar(255) DEFAULT NULL,
  `discount_type` varchar(50) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attribution_coupon`
--

LOCK TABLES `attribution_coupon` WRITE;
/*!40000 ALTER TABLE `attribution_coupon` DISABLE KEYS */;
/*!40000 ALTER TABLE `attribution_coupon` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attribution_deeplink`
--

DROP TABLE IF EXISTS `attribution_deeplink`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `attribution_deeplink` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(100) NOT NULL,
  `template` varchar(500) NOT NULL,
  `channel` varchar(100) NOT NULL,
  `campaign` varchar(255) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attribution_deeplink`
--

LOCK TABLES `attribution_deeplink` WRITE;
/*!40000 ALTER TABLE `attribution_deeplink` DISABLE KEYS */;
/*!40000 ALTER TABLE `attribution_deeplink` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attribution_result`
--

DROP TABLE IF EXISTS `attribution_result`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `attribution_result` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(100) NOT NULL,
  `order_id` varchar(255) NOT NULL,
  `attributed_channel` varchar(100) DEFAULT NULL,
  `confidence_score` double NOT NULL DEFAULT 0,
  `evidence_json` mediumtext DEFAULT NULL,
  `model` varchar(100) NOT NULL DEFAULT 'semi_rule_v1',
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_attr_result_order` (`tenant_id`,`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attribution_result`
--

LOCK TABLES `attribution_result` WRITE;
/*!40000 ALTER TABLE `attribution_result` DISABLE KEYS */;
/*!40000 ALTER TABLE `attribution_result` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attribution_touch`
--

DROP TABLE IF EXISTS `attribution_touch`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `attribution_touch` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(100) NOT NULL,
  `session_id` varchar(255) DEFAULT NULL,
  `order_id` varchar(255) DEFAULT NULL,
  `channel` varchar(100) DEFAULT NULL,
  `utm_source` varchar(255) DEFAULT NULL,
  `utm_medium` varchar(100) DEFAULT NULL,
  `utm_campaign` varchar(255) DEFAULT NULL,
  `utm_content` varchar(255) DEFAULT NULL,
  `utm_term` varchar(255) DEFAULT NULL,
  `coupon_code` varchar(255) DEFAULT NULL,
  `deeplink` varchar(500) DEFAULT NULL,
  `touched_at` varchar(32) NOT NULL,
  `extra_json` mediumtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_attr_touch_order` (`tenant_id`,`order_id`),
  KEY `idx_attr_touch_session` (`tenant_id`,`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attribution_touch`
--

LOCK TABLES `attribution_touch` WRITE;
/*!40000 ALTER TABLE `attribution_touch` DISABLE KEYS */;
/*!40000 ALTER TABLE `attribution_touch` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_log`
--

DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `actor` varchar(255) NOT NULL,
  `action` varchar(255) NOT NULL,
  `details_json` mediumtext DEFAULT NULL,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_log`
--

LOCK TABLES `audit_log` WRITE;
/*!40000 ALTER TABLE `audit_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `billing_plan`
--

DROP TABLE IF EXISTS `billing_plan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `billing_plan` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `limits_json` mediumtext DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `billing_plan`
--

LOCK TABLES `billing_plan` WRITE;
/*!40000 ALTER TABLE `billing_plan` DISABLE KEYS */;
INSERT INTO `billing_plan` VALUES (1,'demo','Demo Plan','{\"users\":5,\"connectors\":3,\"reports\":10}',1,'2026-03-19T01:12:07+00:00'),(2,'pro','Pro Plan','{\"users\":50,\"connectors\":20,\"reports\":1000}',1,'2026-03-19T01:12:07+00:00');
/*!40000 ALTER TABLE `billing_plan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `channel_credential`
--

DROP TABLE IF EXISTS `channel_credential`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `channel_credential` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(100) NOT NULL,
  `channel` varchar(100) NOT NULL,
  `cred_type` varchar(50) NOT NULL DEFAULT 'api_key',
  `label` varchar(255) NOT NULL DEFAULT '',
  `key_name` varchar(100) NOT NULL,
  `key_value` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `note` text DEFAULT NULL,
  `last_tested_at` varchar(32) DEFAULT NULL,
  `test_status` varchar(20) DEFAULT NULL,
  `updated_at` varchar(32) NOT NULL,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cred_tenant_channel_key` (`tenant_id`,`channel`,`key_name`),
  KEY `idx_cred_tenant_channel` (`tenant_id`,`channel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `channel_credential`
--

LOCK TABLES `channel_credential` WRITE;
/*!40000 ALTER TABLE `channel_credential` DISABLE KEYS */;
/*!40000 ALTER TABLE `channel_credential` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `commerce_sku_day`
--

DROP TABLE IF EXISTS `commerce_sku_day`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `commerce_sku_day` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(100) NOT NULL,
  `channel` varchar(100) NOT NULL,
  `date` varchar(10) NOT NULL,
  `sku` varchar(255) NOT NULL,
  `orders` int(11) NOT NULL DEFAULT 0,
  `units` int(11) NOT NULL DEFAULT 0,
  `revenue` double NOT NULL DEFAULT 0,
  `refunds` double NOT NULL DEFAULT 0,
  `extra_json` mediumtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_commerce_sku_day_tenant_date` (`tenant_id`,`date`),
  KEY `idx_commerce_sku_day_sku` (`tenant_id`,`sku`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `commerce_sku_day`
--

LOCK TABLES `commerce_sku_day` WRITE;
/*!40000 ALTER TABLE `commerce_sku_day` DISABLE KEYS */;
/*!40000 ALTER TABLE `commerce_sku_day` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `connector_config`
--

DROP TABLE IF EXISTS `connector_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `connector_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(100) NOT NULL,
  `connector` varchar(100) NOT NULL,
  `config_json` mediumtext DEFAULT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `connector_config`
--

LOCK TABLES `connector_config` WRITE;
/*!40000 ALTER TABLE `connector_config` DISABLE KEYS */;
/*!40000 ALTER TABLE `connector_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `connector_health`
--

DROP TABLE IF EXISTS `connector_health`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `connector_health` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(100) NOT NULL,
  `connector` varchar(100) NOT NULL,
  `status` varchar(50) NOT NULL,
  `last_run_at` varchar(32) DEFAULT NULL,
  `failed_runs_24h` int(11) NOT NULL DEFAULT 0,
  `details_json` mediumtext DEFAULT NULL,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `connector_health`
--

LOCK TABLES `connector_health` WRITE;
/*!40000 ALTER TABLE `connector_health` DISABLE KEYS */;
/*!40000 ALTER TABLE `connector_health` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `connector_token`
--

DROP TABLE IF EXISTS `connector_token`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `connector_token` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(100) NOT NULL,
  `provider` varchar(100) NOT NULL,
  `access_token` text DEFAULT NULL,
  `refresh_token` text DEFAULT NULL,
  `token_type` varchar(50) NOT NULL DEFAULT 'Bearer',
  `expires_at` varchar(32) DEFAULT NULL,
  `scopes` text DEFAULT NULL,
  `meta_json` mediumtext DEFAULT NULL,
  `updated_at` varchar(32) NOT NULL,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `connector_token`
--

LOCK TABLES `connector_token` WRITE;
/*!40000 ALTER TABLE `connector_token` DISABLE KEYS */;
/*!40000 ALTER TABLE `connector_token` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `graph_edge`
--

DROP TABLE IF EXISTS `graph_edge`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `graph_edge` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(100) NOT NULL,
  `src_type` varchar(100) NOT NULL,
  `src_id` varchar(255) NOT NULL,
  `dst_type` varchar(100) NOT NULL,
  `dst_id` varchar(255) NOT NULL,
  `edge_weight` double NOT NULL DEFAULT 1,
  `edge_label` varchar(100) DEFAULT NULL,
  `meta_json` mediumtext DEFAULT NULL,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_graph_edge_src` (`tenant_id`,`src_type`,`src_id`),
  KEY `idx_graph_edge_dst` (`tenant_id`,`dst_type`,`dst_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `graph_edge`
--

LOCK TABLES `graph_edge` WRITE;
/*!40000 ALTER TABLE `graph_edge` DISABLE KEYS */;
/*!40000 ALTER TABLE `graph_edge` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `graph_node`
--

DROP TABLE IF EXISTS `graph_node`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `graph_node` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(100) NOT NULL,
  `node_type` varchar(100) NOT NULL,
  `node_id` varchar(255) NOT NULL,
  `label` varchar(500) DEFAULT NULL,
  `meta_json` mediumtext DEFAULT NULL,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `graph_node`
--

LOCK TABLES `graph_node` WRITE;
/*!40000 ALTER TABLE `graph_node` DISABLE KEYS */;
/*!40000 ALTER TABLE `graph_node` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `influencer_audience_agg`
--

DROP TABLE IF EXISTS `influencer_audience_agg`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `influencer_audience_agg` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(100) NOT NULL,
  `platform` varchar(100) NOT NULL,
  `creator_id` varchar(255) NOT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `age_range` varchar(50) DEFAULT NULL,
  `region` varchar(50) DEFAULT NULL,
  `followers` int(11) NOT NULL DEFAULT 0,
  `engagement_rate` double DEFAULT NULL,
  `updated_at` varchar(32) NOT NULL,
  `extra_json` mediumtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_influencer_audience_agg_tenant` (`tenant_id`,`platform`,`creator_id`),
  KEY `idx_influencer_audience_agg_segment` (`tenant_id`,`platform`,`gender`,`age_range`,`region`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `influencer_audience_agg`
--

LOCK TABLES `influencer_audience_agg` WRITE;
/*!40000 ALTER TABLE `influencer_audience_agg` DISABLE KEYS */;
/*!40000 ALTER TABLE `influencer_audience_agg` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ingestion_run_log`
--

DROP TABLE IF EXISTS `ingestion_run_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ingestion_run_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(100) NOT NULL,
  `connector` varchar(100) NOT NULL,
  `status` varchar(50) NOT NULL,
  `started_at` varchar(32) DEFAULT NULL,
  `ended_at` varchar(32) DEFAULT NULL,
  `rows_ingested` int(11) DEFAULT 0,
  `error` text DEFAULT NULL,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ingestion_run_log`
--

LOCK TABLES `ingestion_run_log` WRITE;
/*!40000 ALTER TABLE `ingestion_run_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `ingestion_run_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kr_channel`
--

DROP TABLE IF EXISTS `kr_channel`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `kr_channel` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `channel_key` varchar(100) NOT NULL,
  `display_name` varchar(255) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'KRW',
  `settlement_cycle` varchar(50) NOT NULL DEFAULT 'monthly',
  `fee_schema_json` mediumtext DEFAULT NULL,
  `vat_rate` double NOT NULL DEFAULT 0.1,
  `note` text DEFAULT NULL,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kr_channel`
--

LOCK TABLES `kr_channel` WRITE;
/*!40000 ALTER TABLE `kr_channel` DISABLE KEYS */;
/*!40000 ALTER TABLE `kr_channel` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kr_fee_rule`
--

DROP TABLE IF EXISTS `kr_fee_rule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `kr_fee_rule` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(100) NOT NULL,
  `channel_key` varchar(100) NOT NULL,
  `category` varchar(100) NOT NULL DEFAULT '*',
  `platform_fee_rate` double NOT NULL DEFAULT 0,
  `ad_fee_rate` double NOT NULL DEFAULT 0,
  `shipping_standard` double NOT NULL DEFAULT 0,
  `return_fee_standard` double NOT NULL DEFAULT 0,
  `vat_rate` double NOT NULL DEFAULT 0.1,
  `note` text DEFAULT NULL,
  `effective_from` varchar(32) NOT NULL,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_kr_fee_rule` (`tenant_id`,`channel_key`,`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kr_fee_rule`
--

LOCK TABLES `kr_fee_rule` WRITE;
/*!40000 ALTER TABLE `kr_fee_rule` DISABLE KEYS */;
/*!40000 ALTER TABLE `kr_fee_rule` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kr_recon_report`
--

DROP TABLE IF EXISTS `kr_recon_report`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `kr_recon_report` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(100) NOT NULL,
  `channel_key` varchar(100) NOT NULL,
  `period_start` varchar(10) NOT NULL,
  `period_end` varchar(10) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'draft',
  `total_orders` int(11) NOT NULL DEFAULT 0,
  `matched` int(11) NOT NULL DEFAULT 0,
  `mismatch` int(11) NOT NULL DEFAULT 0,
  `missing_settlement` int(11) NOT NULL DEFAULT 0,
  `missing_order` int(11) NOT NULL DEFAULT 0,
  `gross_diff` double NOT NULL DEFAULT 0,
  `fee_diff` double NOT NULL DEFAULT 0,
  `net_diff` double NOT NULL DEFAULT 0,
  `summary_json` mediumtext DEFAULT NULL,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_kr_recon_report` (`tenant_id`,`channel_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kr_recon_report`
--

LOCK TABLES `kr_recon_report` WRITE;
/*!40000 ALTER TABLE `kr_recon_report` DISABLE KEYS */;
/*!40000 ALTER TABLE `kr_recon_report` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kr_recon_ticket`
--

DROP TABLE IF EXISTS `kr_recon_ticket`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `kr_recon_ticket` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(100) NOT NULL,
  `report_id` int(11) NOT NULL,
  `order_id` varchar(255) DEFAULT NULL,
  `channel_key` varchar(100) NOT NULL,
  `category` varchar(100) NOT NULL DEFAULT 'variance',
  `severity` varchar(50) NOT NULL DEFAULT 'medium',
  `status` varchar(50) NOT NULL DEFAULT 'open',
  `gross_diff` double DEFAULT NULL,
  `fee_diff` double DEFAULT NULL,
  `net_diff` double DEFAULT NULL,
  `title` varchar(500) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_kr_recon_ticket` (`tenant_id`,`report_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kr_recon_ticket`
--

LOCK TABLES `kr_recon_ticket` WRITE;
/*!40000 ALTER TABLE `kr_recon_ticket` DISABLE KEYS */;
/*!40000 ALTER TABLE `kr_recon_ticket` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kr_settlement_line`
--

DROP TABLE IF EXISTS `kr_settlement_line`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `kr_settlement_line` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(100) NOT NULL,
  `channel_key` varchar(100) NOT NULL,
  `settlement_id` varchar(255) DEFAULT NULL,
  `period_start` varchar(10) NOT NULL,
  `period_end` varchar(10) NOT NULL,
  `order_id` varchar(255) DEFAULT NULL,
  `product_id` varchar(255) DEFAULT NULL,
  `sku` varchar(255) DEFAULT NULL,
  `product_name` varchar(500) DEFAULT NULL,
  `qty` int(11) NOT NULL DEFAULT 1,
  `sell_price` double NOT NULL DEFAULT 0,
  `gross_sales` double NOT NULL DEFAULT 0,
  `platform_fee` double NOT NULL DEFAULT 0,
  `ad_fee` double NOT NULL DEFAULT 0,
  `shipping_fee` double NOT NULL DEFAULT 0,
  `return_fee` double NOT NULL DEFAULT 0,
  `vat` double NOT NULL DEFAULT 0,
  `coupon_discount` double NOT NULL DEFAULT 0,
  `point_discount` double NOT NULL DEFAULT 0,
  `other_deductions` double NOT NULL DEFAULT 0,
  `net_payout` double NOT NULL DEFAULT 0,
  `currency` varchar(10) NOT NULL DEFAULT 'KRW',
  `status` varchar(50) NOT NULL DEFAULT 'settled',
  `raw_json` mediumtext DEFAULT NULL,
  `ingested_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_kr_settle_tenant` (`tenant_id`,`channel_key`),
  KEY `idx_kr_settle_period` (`tenant_id`,`channel_key`,`period_start`),
  KEY `idx_kr_settle_order` (`tenant_id`,`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kr_settlement_line`
--

LOCK TABLES `kr_settlement_line` WRITE;
/*!40000 ALTER TABLE `kr_settlement_line` DISABLE KEYS */;
/*!40000 ALTER TABLE `kr_settlement_line` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mapping_change_request`
--

DROP TABLE IF EXISTS `mapping_change_request`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mapping_change_request` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `platform` varchar(100) NOT NULL,
  `field` varchar(255) NOT NULL,
  `raw_value` varchar(500) NOT NULL,
  `canonical_value` varchar(500) NOT NULL,
  `note` text DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `requested_by` varchar(255) NOT NULL,
  `approvals_json` mediumtext DEFAULT NULL,
  `required_approvals` int(11) NOT NULL DEFAULT 2,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mapping_change_request`
--

LOCK TABLES `mapping_change_request` WRITE;
/*!40000 ALTER TABLE `mapping_change_request` DISABLE KEYS */;
/*!40000 ALTER TABLE `mapping_change_request` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mapping_entry`
--

DROP TABLE IF EXISTS `mapping_entry`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mapping_entry` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `platform` varchar(100) NOT NULL,
  `field` varchar(255) NOT NULL,
  `raw_value` varchar(500) NOT NULL,
  `canonical_value` varchar(500) NOT NULL,
  `note` text DEFAULT NULL,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mapping_entry`
--

LOCK TABLES `mapping_entry` WRITE;
/*!40000 ALTER TABLE `mapping_entry` DISABLE KEYS */;
/*!40000 ALTER TABLE `mapping_entry` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mapping_validation_rule`
--

DROP TABLE IF EXISTS `mapping_validation_rule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mapping_validation_rule` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `field` varchar(255) NOT NULL,
  `rule_type` varchar(100) NOT NULL,
  `allowed_values_json` mediumtext DEFAULT NULL,
  `regex_pattern` varchar(500) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mapping_validation_rule`
--

LOCK TABLES `mapping_validation_rule` WRITE;
/*!40000 ALTER TABLE `mapping_validation_rule` DISABLE KEYS */;
/*!40000 ALTER TABLE `mapping_validation_rule` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `normalized_activity_event`
--

DROP TABLE IF EXISTS `normalized_activity_event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `normalized_activity_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `raw_event_id` int(11) DEFAULT NULL,
  `tenant_id` varchar(100) NOT NULL DEFAULT 'demo',
  `event_date` varchar(10) NOT NULL,
  `event_type` varchar(100) NOT NULL,
  `domain` varchar(30) NOT NULL,
  `account_id` varchar(255) DEFAULT NULL,
  `campaign_id` varchar(255) DEFAULT NULL,
  `campaign_name` varchar(500) DEFAULT NULL,
  `adset_id` varchar(255) DEFAULT NULL,
  `adset_name` varchar(500) DEFAULT NULL,
  `ad_id` varchar(255) DEFAULT NULL,
  `creative_id` varchar(255) DEFAULT NULL,
  `creative_type` varchar(50) DEFAULT NULL,
  `keyword` varchar(500) DEFAULT NULL,
  `match_type` varchar(20) DEFAULT NULL,
  `audience_segment` varchar(255) DEFAULT NULL,
  `impressions` int(11) DEFAULT 0,
  `clicks` int(11) DEFAULT 0,
  `spend` double DEFAULT 0,
  `conversions` int(11) DEFAULT 0,
  `attributed_revenue` double DEFAULT 0,
  `order_id` varchar(255) DEFAULT NULL,
  `sku` varchar(255) DEFAULT NULL,
  `product_title` varchar(500) DEFAULT NULL,
  `qty` int(11) DEFAULT 0,
  `gross_sales` double DEFAULT 0,
  `platform_fee` double DEFAULT 0,
  `ad_fee` double DEFAULT 0,
  `shipping_fee` double DEFAULT 0,
  `return_fee` double DEFAULT 0,
  `coupon_discount` double DEFAULT 0,
  `point_discount` double DEFAULT 0,
  `settlement_deduction_type` varchar(100) DEFAULT NULL,
  `settlement_deduction_amount` double DEFAULT 0,
  `net_payout` double DEFAULT 0,
  `is_return` tinyint(1) DEFAULT 0,
  `creator_handle` varchar(255) DEFAULT NULL,
  `ugc_content_id` varchar(255) DEFAULT NULL,
  `ugc_platform` varchar(50) DEFAULT NULL,
  `ugc_rights_status` varchar(50) DEFAULT NULL,
  `ugc_whitelist_status` varchar(50) DEFAULT NULL,
  `ugc_branded_content` tinyint(1) DEFAULT 0,
  `currency` varchar(10) NOT NULL DEFAULT 'KRW',
  `region` varchar(10) DEFAULT NULL,
  `normalized_at` varchar(32) NOT NULL,
  `normalizer_version` varchar(50) DEFAULT 'v423_rule_v1',
  `extra_json` mediumtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_nae_tenant_date` (`tenant_id`,`event_date`),
  KEY `idx_nae_tenant_domain` (`tenant_id`,`domain`),
  KEY `idx_nae_tenant_type` (`tenant_id`,`event_type`),
  KEY `idx_nae_tenant_sku` (`tenant_id`,`sku`),
  KEY `idx_nae_raw_event` (`raw_event_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `normalized_activity_event`
--

LOCK TABLES `normalized_activity_event` WRITE;
/*!40000 ALTER TABLE `normalized_activity_event` DISABLE KEYS */;
/*!40000 ALTER TABLE `normalized_activity_event` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_history`
--

DROP TABLE IF EXISTS `payment_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payment_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `payment_key` varchar(200) NOT NULL,
  `order_id` varchar(200) NOT NULL,
  `amount` int(11) NOT NULL,
  `plan` varchar(50) NOT NULL DEFAULT 'pro',
  `cycle` varchar(20) NOT NULL DEFAULT 'monthly',
  `status` varchar(50) NOT NULL DEFAULT 'success',
  `paid_at` varchar(32) NOT NULL,
  `expires_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_payment_history_user` (`user_id`),
  KEY `idx_payment_history_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_history`
--

LOCK TABLES `payment_history` WRITE;
/*!40000 ALTER TABLE `payment_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pg_config`
--

DROP TABLE IF EXISTS `pg_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pg_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `provider` varchar(50) NOT NULL,
  `client_key` varchar(300) NOT NULL,
  `secret_key_enc` varchar(300) NOT NULL DEFAULT '',
  `is_test` tinyint(1) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_pg_config_provider` (`provider`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pg_config`
--

LOCK TABLES `pg_config` WRITE;
/*!40000 ALTER TABLE `pg_config` DISABLE KEYS */;
INSERT INTO `pg_config` VALUES (1,'toss','test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq','test_sk_zXLkKEypNArWmo50nX3lmeaxYZ2M',1,1,'2026-03-19T01:12:07+00:00');
/*!40000 ALTER TABLE `pg_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plan_pricing`
--

DROP TABLE IF EXISTS `plan_pricing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `plan_pricing` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `plan` varchar(50) NOT NULL,
  `cycle` varchar(20) NOT NULL,
  `base_price` int(11) NOT NULL DEFAULT 99000,
  `discount_pct` decimal(5,2) NOT NULL DEFAULT 0.00,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` varchar(32) NOT NULL,
  `updated_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_plan_pricing_pk` (`plan`,`cycle`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plan_pricing`
--

LOCK TABLES `plan_pricing` WRITE;
/*!40000 ALTER TABLE `plan_pricing` DISABLE KEYS */;
INSERT INTO `plan_pricing` VALUES (1,'pro','monthly',99000,0.00,1,'2026-03-19T01:12:07+00:00','2026-03-19T01:12:07+00:00'),(2,'pro','quarterly',99000,20.00,1,'2026-03-19T01:12:07+00:00','2026-03-19T01:12:07+00:00'),(3,'pro','yearly',99000,40.00,1,'2026-03-19T01:12:07+00:00','2026-03-19T01:12:07+00:00');
/*!40000 ALTER TABLE `plan_pricing` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `raw_vendor_event`
--

DROP TABLE IF EXISTS `raw_vendor_event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `raw_vendor_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(100) NOT NULL DEFAULT 'demo',
  `vendor` varchar(100) NOT NULL,
  `source_system` varchar(50) NOT NULL,
  `event_type` varchar(100) NOT NULL,
  `dedup_key` varchar(255) DEFAULT NULL,
  `raw_payload` mediumtext NOT NULL,
  `received_at` varchar(32) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `error_msg` text DEFAULT NULL,
  `normalized_event_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rve_dedup` (`tenant_id`,`vendor`,`dedup_key`),
  KEY `idx_rve_tenant_vendor` (`tenant_id`,`vendor`),
  KEY `idx_rve_tenant_status` (`tenant_id`,`status`),
  KEY `idx_rve_tenant_type` (`tenant_id`,`event_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `raw_vendor_event`
--

LOCK TABLES `raw_vendor_event` WRITE;
/*!40000 ALTER TABLE `raw_vendor_event` DISABLE KEYS */;
/*!40000 ALTER TABLE `raw_vendor_event` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `risk_model_registry`
--

DROP TABLE IF EXISTS `risk_model_registry`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `risk_model_registry` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `model_name` varchar(255) NOT NULL,
  `model_version` varchar(100) NOT NULL,
  `is_deployed` tinyint(1) NOT NULL DEFAULT 0,
  `metrics_json` mediumtext DEFAULT NULL,
  `training_range_json` mediumtext DEFAULT NULL,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `risk_model_registry`
--

LOCK TABLES `risk_model_registry` WRITE;
/*!40000 ALTER TABLE `risk_model_registry` DISABLE KEYS */;
/*!40000 ALTER TABLE `risk_model_registry` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `risk_prediction`
--

DROP TABLE IF EXISTS `risk_prediction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `risk_prediction` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(100) NOT NULL,
  `entity_type` varchar(100) NOT NULL,
  `entity_id` varchar(255) NOT NULL,
  `model_version` varchar(100) NOT NULL,
  `probability` double NOT NULL,
  `drivers_json` mediumtext DEFAULT NULL,
  `predicted_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `risk_prediction`
--

LOCK TABLES `risk_prediction` WRITE;
/*!40000 ALTER TABLE `risk_prediction` DISABLE KEYS */;
/*!40000 ALTER TABLE `risk_prediction` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settlement`
--

DROP TABLE IF EXISTS `settlement`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `settlement` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(100) NOT NULL,
  `source` varchar(100) NOT NULL,
  `period` varchar(50) NOT NULL,
  `amount` double NOT NULL DEFAULT 0,
  `currency` varchar(10) NOT NULL DEFAULT 'USD',
  `payload_json` mediumtext DEFAULT NULL,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settlement`
--

LOCK TABLES `settlement` WRITE;
/*!40000 ALTER TABLE `settlement` DISABLE KEYS */;
/*!40000 ALTER TABLE `settlement` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscription_coupon`
--

DROP TABLE IF EXISTS `subscription_coupon`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `subscription_coupon` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(64) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `months` int(11) NOT NULL DEFAULT 1,
  `reason` varchar(500) NOT NULL DEFAULT '',
  `trigger_type` varchar(30) NOT NULL DEFAULT 'manual',
  `granted_by` varchar(100) NOT NULL DEFAULT 'admin',
  `granted_at` varchar(32) NOT NULL,
  `applied_at` varchar(32) DEFAULT NULL,
  `expires_at` varchar(32) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_coupon_code` (`code`),
  KEY `idx_coupon_user` (`user_id`),
  KEY `idx_coupon_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscription_coupon`
--

LOCK TABLES `subscription_coupon` WRITE;
/*!40000 ALTER TABLE `subscription_coupon` DISABLE KEYS */;
/*!40000 ALTER TABLE `subscription_coupon` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenant_subscription`
--

DROP TABLE IF EXISTS `tenant_subscription`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tenant_subscription` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(100) NOT NULL,
  `plan_code` varchar(100) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'active',
  `started_at` varchar(32) NOT NULL,
  `ends_at` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenant_subscription`
--

LOCK TABLES `tenant_subscription` WRITE;
/*!40000 ALTER TABLE `tenant_subscription` DISABLE KEYS */;
/*!40000 ALTER TABLE `tenant_subscription` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_session`
--

DROP TABLE IF EXISTS `user_session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_session` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token` varchar(64) NOT NULL,
  `expires_at` varchar(32) NOT NULL,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_session_token` (`token`),
  KEY `idx_user_session_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_session`
--

LOCK TABLES `user_session` WRITE;
/*!40000 ALTER TABLE `user_session` DISABLE KEYS */;
INSERT INTO `user_session` VALUES (1,1,'54d9d2d5a31f444805110f51eedf3ad1a3de0bd259c04b8d0a0fdbc9f54789cf','2026-04-18T01:12:07Z','2026-03-19T01:12:07Z');
/*!40000 ALTER TABLE `user_session` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `writeback_job`
--

DROP TABLE IF EXISTS `writeback_job`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `writeback_job` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(100) NOT NULL,
  `job_type` varchar(100) NOT NULL,
  `status` varchar(50) NOT NULL,
  `payload_json` mediumtext DEFAULT NULL,
  `result_json` mediumtext DEFAULT NULL,
  `created_at` varchar(32) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `writeback_job`
--

LOCK TABLES `writeback_job` WRITE;
/*!40000 ALTER TABLE `writeback_job` DISABLE KEYS */;
/*!40000 ALTER TABLE `writeback_job` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-23  8:35:26
