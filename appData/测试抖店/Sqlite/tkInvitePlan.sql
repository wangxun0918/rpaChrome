/*
 Navicat Premium Data Transfer

 Source Server         : rpa
 Source Server Type    : SQLite
 Source Server Version : 3030001
 Source Schema         : main

 Target Server Type    : SQLite
 Target Server Version : 3030001
 File Encoding         : 65001

 Date: 27/12/2025 16:01:32
*/

PRAGMA foreign_keys = false;

-- ----------------------------
-- Table structure for tkInvitePlan
-- ----------------------------
DROP TABLE IF EXISTS "tkInvitePlan";
CREATE TABLE "tkInvitePlan" (
  "inviteId" VARCHAR(50),
  "shopId" VARCHAR(50),
  "endTime" DATETIME,
  "updateTime" VARCHAR(50),
  "jsonCreators" TEXT,
  "jsonProducts" TEXT
);

-- ----------------------------
-- Indexes structure for table tkInvitePlan
-- ----------------------------
CREATE INDEX "idx_endTime"
ON "tkInvitePlan" (
  "endTime" ASC
);

PRAGMA foreign_keys = true;
