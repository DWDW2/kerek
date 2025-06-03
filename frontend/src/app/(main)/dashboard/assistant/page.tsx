import React from "react";
import { AssistantClient } from "./assistant-client";
import { getAssistantData } from "@/packages/api/actions";

export default async function AssistantPage() {
  return <AssistantClient getAssistantData={getAssistantData} />;
}
