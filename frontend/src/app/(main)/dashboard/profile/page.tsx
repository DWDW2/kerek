import React from "react";
import { ProfileClient } from "@/components/profile/profile-client";
import { getProfileData } from "@/packages/api/actions";

export default async function ProfilePage() {
  return <ProfileClient getProfileData={getProfileData} />;
}
