import React from "react";

type Props = {
  children: React.ReactNode;
};

export default function AuthLayout({ children }: Props) {
  return (
    <div className="flex min-h-screen w-full">
      <div className="flex flex-col justify-center p-8 w-full md:w-1/2">
        {children}
      </div>
      <div
        className="bg-cover bg-center bg-no-repeat md:block hidden md:w-1/2 "
        style={{ backgroundImage: "url('/auth-image.png')" }}
      />
    </div>
  );
}
