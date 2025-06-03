import React from "react";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { getDashboardData } from "@/packages/api/actions";

export default async function DashboardPage() {
  return <DashboardClient getDashboardData={getDashboardData} />;
}
