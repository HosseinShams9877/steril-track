-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "created" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "members" (
    "tenantID" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    PRIMARY KEY ("tenantID", "email"),
    CONSTRAINT "members_tenantID_fkey" FOREIGN KEY ("tenantID") REFERENCES "tenants" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "equipment" (
    "tenantID" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "qrInfo" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT 'انبار تجهیزات',
    "approval" TEXT NOT NULL DEFAULT 'pending',
    "expiry" TEXT,
    "created" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("tenantID", "id"),
    CONSTRAINT "equipment_tenantID_fkey" FOREIGN KEY ("tenantID") REFERENCES "tenants" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "events" (
    "tenantID" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "equipmentID" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "destination" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "condition" TEXT NOT NULL DEFAULT '',
    "result" TEXT NOT NULL DEFAULT '',
    "cycleID" TEXT,
    "actor" TEXT NOT NULL,
    "at" TEXT NOT NULL,

    PRIMARY KEY ("tenantID", "id"),
    CONSTRAINT "events_tenantID_equipmentID_fkey" FOREIGN KEY ("tenantID", "equipmentID") REFERENCES "equipment" ("tenantID", "id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "auth_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "platform_admin" INTEGER NOT NULL DEFAULT 0,
    "active" INTEGER NOT NULL DEFAULT 1,
    "created" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "token_hash" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "expires" BIGINT NOT NULL,
    CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "auth_attempts" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL,
    "until" BIGINT NOT NULL
);

-- CreateTable
CREATE TABLE "auth_audit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "at" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "schema_migrations" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "hash" TEXT NOT NULL,
    "applied" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "equipment_tenant_code" ON "equipment"("tenantID", "code");

-- CreateIndex
CREATE INDEX "events_tenant_equipment" ON "events"("tenantID", "equipmentID");

-- CreateIndex
CREATE UNIQUE INDEX "auth_users_email_key" ON "auth_users"("email");

-- CreateIndex
CREATE INDEX "auth_sessions_expiry" ON "auth_sessions"("expires");

