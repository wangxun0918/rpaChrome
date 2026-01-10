/*
 Navicat Premium Data Transfer

 Source Server         : rpa
 Source Server Type    : SQLite
 Source Server Version : 3030001
 Source Schema         : main

 Target Server Type    : SQLite
 Target Server Version : 3030001
 File Encoding         : 65001

 Date: 27/12/2025 16:01:18
*/

PRAGMA foreign_keys = false;

-- ----------------------------
-- Table structure for tkChatCreator
-- ----------------------------
DROP TABLE IF EXISTS "tkChatCreator";
CREATE TABLE "tkChatCreator" (
  "creatorId" VARCHAR(50),
  "creatorName" VARCHAR(100),
  "shopId" VARCHAR(50),
  "regionCode" VARCHAR(2),
  "categorys" VARCHAR(1000),
  "fansNum" integer,
  "watchNum" integer,
  "medGmv" VARCHAR(200),
  "unitsSold" integer,
  "videoEngagement" integer,
  "videoGmv" real,
  "liveGmv" real,
  "chatNum" INTEGER,
  "createTime" DATETIME NOT NULL
);

-- ----------------------------
-- Indexes structure for table tkChatCreator
-- ----------------------------
CREATE INDEX "idx_tkChatCreator_creatorId"
ON "tkChatCreator" (
  "creatorId" ASC
);
CREATE INDEX "idx_tkChatCreator_creatorName"
ON "tkChatCreator" (
  "creatorName" ASC
);
CREATE INDEX "idx_tkChatCreator_shopId"
ON "tkChatCreator" (
  "shopId" ASC
);

PRAGMA foreign_keys = true;
