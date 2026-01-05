import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { chatStorage } from "./storage";

let openai: OpenAI | null = null;
let gemini: GoogleGenerativeAI | null = null;

try {
  // Try to initialize OpenAI first
  if (process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  
  // Try to initialize Gemini if OpenAI is not available
  if (!openai && process.env.GEMINI_API_KEY) {
    gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  
  if (!openai && !gemini) {
    console.warn("⚠️ No AI API Key found for chat. Please set either AI_INTEGRATIONS_OPENAI_API_KEY or GEMINI_API_KEY in .env");
  }
} catch (error) {
  console.error("❌ Failed to initialize AI client for chat:", error);
}

export function registerChatRoutes(app: Express): void {
  // Get all conversations
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      const conversations = await chatStorage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get single conversation with messages
  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Create new conversation
  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      const conversation = await chatStorage.createConversation(title || "New Chat");
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Delete conversation
  app.delete("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Send message and get AI response (streaming)
  app.post("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;

      // Save user message
      await chatStorage.createMessage(conversationId, "user", content);

      // Get conversation history for context
      const messages = await chatStorage.getMessagesByConversation(conversationId);
      const chatMessages = messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // Set up SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Check if either OpenAI or Gemini is configured
      if (!openai && !gemini) {
        throw new Error("No AI provider configured for chat");
      }

      let fullResponse = "";

      // Stream response from OpenAI if available
      if (openai) {
        const stream = await openai.chat.completions.create({
          model: "gpt-5.1",
          messages: chatMessages,
          stream: true,
          max_completion_tokens: 2048,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            fullResponse += content;
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
          }
        }
      } 
      // Fallback to Gemini if OpenAI is not available
      else if (gemini) {
        // For Gemini, we'll send a non-streaming response since streaming is more complex
        const model = gemini.getGenerativeModel({ model: "gemini-1.5-pro" });
        
        // Convert messages to Gemini format
        const history = chatMessages.slice(0, -1).map(msg => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        }));
        
        const chat = model.startChat({
          history: history,
          generationConfig: {
            maxOutputTokens: 2048,
          },
        });
        
        const result = await chat.sendMessage(chatMessages[chatMessages.length - 1].content);
        const response = await result.response;
        fullResponse = response.text();
        
        // Send the response in chunks to simulate streaming
        const chunkSize = 50;
        for (let i = 0; i < fullResponse.length; i += chunkSize) {
          const chunk = fullResponse.substring(i, i + chunkSize);
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          // Add a small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Save assistant message
      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error sending message:", error);
      // Check if headers already sent (SSE streaming started)
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to send message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });
}

