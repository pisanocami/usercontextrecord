#!/usr/bin/env tsx

/**
 * Test script to verify Gemini integration is working correctly
 */

import { config } from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Load environment variables
config();

async function testGemini() {
  console.log('Testing Gemini integration...');
  
  // Check if API key is set
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ No Gemini API key found in environment variables');
    console.log('Please set GEMINI_API_KEY in your .env file');
    return;
  }
  
  // Check if it's still the default example key
  if (apiKey === 'AIzaSyDarbM3nlWG9YWjI1EA1HNUvczex8M7aWU') {
    console.log('⚠️  Using default example Gemini API key');
    console.log('Please replace it with your actual Gemini API key in .env file');
  }
  
  console.log('✅ Gemini API key found');
  
  try {
    const gemini = new GoogleGenerativeAI(apiKey);
    // Try different models in order of preference
    const modelsToTry = ["gemini-pro", "gemini-1.0-pro", "models/gemini-pro"];
    let model;
    let selectedModel = "";
    
    for (const modelName of modelsToTry) {
      try {
        model = gemini.getGenerativeModel({ model: modelName });
        selectedModel = modelName;
        console.log(`✅ Using model: ${modelName}`);
        break;
      } catch (error) {
        console.log(`⚠️  Model ${modelName} not available`);
      }
    }
    
    if (!model) {
      console.log('❌ No available Gemini models found');
      return;
    }
    
    console.log('Testing simple API call...');
    
    const result = await model.generateContent("Say 'Hello, World!'");
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ API call successful');
    console.log('Response:', text);
  } catch (error: any) {
    console.error('❌ Gemini API call failed:', error.message);
    
    if (error.message && error.message.includes('401')) {
      console.log('This usually means your API key is invalid. Please check your .env file.');
    }
  }
}

testGemini();
