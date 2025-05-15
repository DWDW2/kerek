import React from "react";

const features = [
  {
    title: "Real-time Collaboration",
    description:
      "Experience seamless, simultaneous editing with your team. See changes as they happen, making collaboration faster and more efficient.",
    icon: "⚡",
  },
  {
    title: "AI-Powered Summarization",
    description:
      "Instantly distill lengthy conversations into concise summaries.  Quickly catch up on key points and decisions without reading every message.",
    icon: "🤖",
  },
  {
    title: "Contextual Threading",
    description:
      "Maintain clear and organized conversations with advanced threading. Keep discussions focused and easily track multiple topics within a channel.",
    icon: "🧵",
  },
  {
    title: "Integrated Task Management",
    description:
      "Create, assign, and track tasks directly within your chats.  Streamline your workflow and ensure accountability without switching apps.",
    icon: "✅",
  },
  {
    title: "End-to-End Encryption",
    description:
      "Communicate with confidence knowing your messages are secured with state-of-the-art end-to-end encryption, ensuring complete privacy.",
    icon: "🔒",
  },
  {
    title: "Customizable Reactions",
    description:
      "Express yourself beyond simple emojis. Create and use custom reactions to add personality and nuance to your communications.",
    icon: "🎨",
  },
];

const Features = () => {
  return (
    <section className="py-16 px-3">
      <div className="container mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-semibold font-mono mb-8 text-gray-800">
          Next-Gen Messaging Features
        </h2>
        <p className="text-lg text-gray-600 mb-12">
          Empowering seamless communication and collaboration with advanced
          features.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300"
            >
              <div className="text-3xl mb-4 text-blue-500">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2 text-gray-700">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
