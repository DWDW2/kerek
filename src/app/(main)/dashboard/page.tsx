"use client";
import React, { useState } from "react";

type Props = {};

export default function InterestsForm({}: Props) {
  const [interests, setInterests] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInterests(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Interests submitted:", interests);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="interests">Enter your interests:</label>
      <input
        type="text"
        id="interests"
        value={interests}
        onChange={handleChange}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
