import React from "react";

type Props = {};

export default function HelpPage({}: Props) {
  return (
    <div className="md:mx-auto py-8 space-y-6 md:max-w-5xl mx-8">
      <h1 className="text-2xl font-bold mb-4">
        Kerek Messenger - Help & Support
      </h1>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Getting Started</h2>
        <ul>
          <li>
            <a
              href="#account-creation"
              className="text-blue-500 hover:underline"
            >
              Creating an Account
            </a>
          </li>
          <li>
            <a href="#profile-setup" className="text-blue-500 hover:underline">
              Setting Up Your Profile
            </a>
          </li>
          <li>
            <a
              href="#finding-friends"
              className="text-blue-500 hover:underline"
            >
              Finding and Adding Friends
            </a>
          </li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Using the Messenger</h2>
        <ul>
          <li>
            <a
              href="#sending-messages"
              className="text-blue-500 hover:underline"
            >
              Sending and Receiving Messages
            </a>
          </li>
          <li>
            <a href="#group-chats" className="text-blue-500 hover:underline">
              Creating and Managing Group Chats
            </a>
          </li>
          <li>
            <a
              href="#voice-video-calls"
              className="text-blue-500 hover:underline"
            >
              Making Voice and Video Calls
            </a>
          </li>
          <li>
            <a href="#sharing-media" className="text-blue-500 hover:underline">
              Sharing Photos, Videos, and Files
            </a>
          </li>
          <li>
            <a
              href="#emojis-stickers"
              className="text-blue-500 hover:underline"
            >
              Using Emojis and Stickers
            </a>
          </li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">
          Account Settings & Privacy
        </h2>
        <ul>
          <li>
            <a
              href="#privacy-settings"
              className="text-blue-500 hover:underline"
            >
              Understanding Your Privacy Settings
            </a>
          </li>
          <li>
            <a
              href="#notification-settings"
              className="text-blue-500 hover:underline"
            >
              Managing Notification Settings
            </a>
          </li>
          <li>
            <a href="#blocking-users" className="text-blue-500 hover:underline">
              Blocking and Reporting Users
            </a>
          </li>
          <li>
            <a
              href="#changing-password"
              className="text-blue-500 hover:underline"
            >
              Changing Your Password
            </a>
          </li>
          <li>
            <a
              href="#deleting-account"
              className="text-blue-500 hover:underline"
            >
              Deleting Your Account
            </a>
          </li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Troubleshooting</h2>
        <ul>
          <li>
            <a
              href="#message-not-sent"
              className="text-blue-500 hover:underline"
            >
              Messages Not Sending
            </a>
          </li>
          <li>
            <a
              href="#connection-issues"
              className="text-blue-500 hover:underline"
            >
              Connection Issues
            </a>
          </li>
          <li>
            <a
              href="#audio-video-problems"
              className="text-blue-500 hover:underline"
            >
              Audio and Video Problems During Calls
            </a>
          </li>
          <li>
            <a
              href="#forgot-password"
              className="text-blue-500 hover:underline"
            >
              I Forgot My Password
            </a>
          </li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">
          Frequently Asked Questions (FAQ)
        </h2>
        <ul>
          <li>
            <a href="#faq-is-it-free" className="text-blue-500 hover:underline">
              Is Kerek Messenger free to use?
            </a>
          </li>
          <li>
            <a
              href="#faq-data-security"
              className="text-blue-500 hover:underline"
            >
              How secure is my data?
            </a>
          </li>
          {/* Add more FAQs */}
        </ul>
      </section>

      <section id="account-creation" className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Creating an Account</h3>
        <p>
          To create an account, download the Kerek Messenger app from the App
          Store or Google Play Store. Open the app and follow the on-screen
          instructions to register with your phone number or email address. You
          will be asked to create a password.
        </p>
      </section>

      <section id="profile-setup" className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Setting Up Your Profile</h3>
        <p>
          Once your account is created, you can set up your profile by adding a
          profile picture, a display name, and a short bio. To do this, go to
          Settings {">"} Profile.
        </p>
      </section>
    </div>
  );
}
