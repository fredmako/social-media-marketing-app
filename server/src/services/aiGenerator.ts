import { GoogleGenerativeAI } from '@google/generative-ai';

interface GeneratedAd {
  headline: string;
  bodyText: string;
  hashtags: string;
}

// Fallback generator for mock mode
function generateFallbackAd(
  productName: string,
  productDescription: string,
  targetAudience: string,
  brandVoice?: string
): GeneratedAd {
  const voice = brandVoice || 'Professional';
  
  const headlines = [
    `Transform Your Day with ${productName}!`,
    `Meet ${productName} - The Future of Productivity`,
    `Stop wasting time. Start using ${productName}.`,
    `Why top brands are switching to ${productName}.`
  ];
  
  const bodies = [
    `Designed specifically for ${targetAudience}, ${productName} solves your biggest headaches. ${productDescription}. Try it today and feel the difference!`,
    `Calling all ${targetAudience}! If you are struggling with daily tasks, ${productName} is here to help. Features: ${productDescription}. Get started now!`,
    `Ready to level up? ${productName} is the ultimate tool engineered for ${targetAudience}. Here is what you get: ${productDescription}. Click to learn more.`
  ];

  const hashtagPool = ['marketing', 'innovative', 'productivity', 'trending', 'business', 'tech', 'solution'];
  const hashtags = [
    `#${productName.replace(/\s+/g, '')}`,
    ...Array.from({ length: 3 }, () => `#${hashtagPool[Math.floor(Math.random() * hashtagPool.length)]}`)
  ].join(', ');

  return {
    headline: headlines[Math.floor(Math.random() * headlines.length)],
    bodyText: bodies[Math.floor(Math.random() * bodies.length)],
    hashtags
  };
}

export async function generateAdCreative(
  productName: string,
  productDescription: string,
  targetAudience: string,
  brandVoice?: string
): Promise<GeneratedAd> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.startsWith('mock_')) {
    console.log('[AI Generator] API key is missing or mock; using fallback mock generator.');
    return generateFallbackAd(productName, productDescription, targetAudience, brandVoice);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-2.5-flash (or gemini-1.5-flash as fallback)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });

    const prompt = `
      You are an elite copywriter. Generate a social media ad campaign for the following product:
      - Product Name: ${productName}
      - Description: ${productDescription}
      - Target Audience: ${targetAudience}
      - Brand Voice/Tone: ${brandVoice || 'Professional & Engaging'}

      Provide your response as a JSON object matching this schema exactly:
      {
        "headline": "A short, punchy marketing headline",
        "bodyText": "An engaging, high-converting ad body copy suitable for multi-platform publishing",
        "hashtags": "A string of 3-5 relevant hashtags separated by commas, starting with #"
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    if (text) {
      const parsed = JSON.parse(text) as GeneratedAd;
      return parsed;
    }
    
    throw new Error('Empty response from Gemini');
  } catch (error) {
    console.error('[AI Generator] Gemini generation failed, reverting to mock fallback:', error);
    return generateFallbackAd(productName, productDescription, targetAudience, brandVoice);
  }
}
