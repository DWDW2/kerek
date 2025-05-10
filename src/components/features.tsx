import React from "react";

const features = [
  {
    title: "Finding content that you actually need",
    description:
      "We provide a platform for you to find content that you actually need.",
    icon: "🚀",
  },
  {
    title: "Managing your own content",
    description: "We provide a platform for you to manage your own content.",
    icon: "📝",
  },
  {
    title: "Collaborating with your friends",
    description:
      "You can create space where you and your friends can collaborate on content creation.",
    icon: "👯",
  },
  {
    title: "Smart Suggestions",
    description:
      "We provide a system that can help you to write original content.",
    icon: "💡",
  },
];

const Features = () => {
  return (
    <section className="py-16">
      <div className="container mx-auto text-center">
        <h2 className="text-3xl font-semibold mb-8 text-gray-800">
          Key Features
        </h2>
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
