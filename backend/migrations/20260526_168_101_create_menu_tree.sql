-- 168차 N-152-F F2/F3 = T3 spec: docs/spec/n152f_consolidated_pm_track.md §4
-- 출처: T3_BACKEND_API_REQUEST.md §2.1 menu_tree
-- Admin / User 메뉴 가시성 토글 — 메뉴 트리 본체

CREATE TABLE IF NOT EXISTS menu_tree (
  id              VARCHAR(255) PRIMARY KEY,
  parent_id       VARCHAR(255) DEFAULT NULL,
  label_key       VARCHAR(255) NOT NULL,
  icon            VARCHAR(64) DEFAULT NULL,
  route           VARCHAR(255) DEFAULT NULL,
  menu_key        VARCHAR(255) DEFAULT NULL,
  display_order   INT NOT NULL DEFAULT 0,
  visibility      ENUM('visible','hidden','disabled') NOT NULL DEFAULT 'visible',
  required_plan   VARCHAR(32) DEFAULT NULL,
  required_role   VARCHAR(32) DEFAULT NULL,
  is_admin_only   TINYINT(1) NOT NULL DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_menu_tree_parent (parent_id),
  KEY idx_menu_tree_order (parent_id, display_order),
  CONSTRAINT fk_menu_tree_parent FOREIGN KEY (parent_id) REFERENCES menu_tree(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- @rollback
DROP TABLE IF EXISTS menu_tree;
-- @end-rollback
