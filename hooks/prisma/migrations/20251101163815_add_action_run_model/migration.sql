-- CreateTable
CREATE TABLE "ActionRun" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "zapRunId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActionRun_actionId_idx" ON "ActionRun"("actionId");

-- CreateIndex
CREATE INDEX "ActionRun_zapRunId_idx" ON "ActionRun"("zapRunId");

-- AddForeignKey
ALTER TABLE "ActionRun" ADD CONSTRAINT "ActionRun_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionRun" ADD CONSTRAINT "ActionRun_zapRunId_fkey" FOREIGN KEY ("zapRunId") REFERENCES "ZapRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
