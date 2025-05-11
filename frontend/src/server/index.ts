import { generateText } from "ai";
import { LanguageModelV1 } from "ai";

export class Server {
  private readonly model: LanguageModelV1;
  constructor(model: LanguageModelV1) {
    this.model = model;
  }

  async getContentOfUserInterests(interests: string) {
    const response = await generateText({
      model: this.model,
      prompt: interests,
    });
  }

  async fetchContentFromWeb() {}

  async splitContentIntoChunks(content: string) {}

  async pushContentToDb() {}
}
