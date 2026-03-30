import { GoogleGenAI, Type } from "@google/genai";

let _ai: GoogleGenAI | null = null;

export function setApiKey(key: string) {
  _ai = key ? new GoogleGenAI({ apiKey: key }) : null;
}

function getAI(): GoogleGenAI {
  if (!_ai) throw new Error("Gemini API 키가 설정되지 않았습니다.");
  return _ai;
}

export interface Character {
  name: string;
  description: string;
  appearance: string;
  personality: string;
  style: string;
  imageUrl?: string;
  prompt?: string;
}

export interface Panel {
  panelNumber: number;
  description: string;
  backgroundDescription: string;
  dialogue: string;
  imageUrl?: string;
}

export interface Script {
  title: string;
  theme: string;
  panels: Panel[];
}

export async function generateCharacter(prompt: string, style: string = "UltraSimple", customName?: string): Promise<Character> {
  const styleDescription = style === "UltraSimple" ? "귀엽고 굵은 선의 초간단 캐릭터 스타일" : style === "Simple" ? "깔끔한 웹툰 스타일" : style;
  const response = await getAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `다음 프롬프트를 바탕으로 인스타그램 웹툰(인스타툰) 캐릭터를 생성해줘: ${prompt}. 
    그림체 스타일: ${styleDescription}.
    ${customName ? `캐릭터의 이름은 반드시 "${customName}"으로 설정해줘.` : ""}
    이름, 짧은 설명, 그림을 그리기 위한 상세한 외형 묘사, 그리고 성격을 한국어로 제공해줘.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          appearance: { type: Type.STRING },
          personality: { type: Type.STRING },
        },
        required: ["name", "description", "appearance", "personality"],
      },
    },
  });

  const characterData = JSON.parse(response.text);
  
  // Step 1: Generate detailed English prompt for character design
  const stylePrompt = getStylePrompt(style);
  const promptResponse = await getAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `다음 한국어 캐릭터 설명을 바탕으로, 이미지 생성 AI를 위한 매우 상세한 영어 캐릭터 디자인 프롬프트를 작성해줘.
    
    이름: ${characterData.name}
    설명: ${characterData.description}
    외형: ${characterData.appearance}
    성격: ${characterData.personality}
    그림체 스타일: ${stylePrompt}
    
    프롬프트 작성 규칙:
    1. 캐릭터의 전신 또는 상반신이 잘 보이도록 묘사할 것.
    2. 외형 묘사를 빠짐없이 영어로 상세히 번역 및 확장할 것.
    3. 배경은 깨끗한 흰색(White background)으로 설정할 것.
    4. 텍스트가 포함되지 않도록 할 것.
    5. 전체적인 분위기가 ${stylePrompt}에 완벽하게 부합하도록 할 것.
    6. 영어로만 출력할 것.`,
  });

  const detailedPrompt = promptResponse.text;

  // Step 2: Generate character image
  const imageResponse = await getAI().models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: detailedPrompt,
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  let imageUrl = "";
  for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      break;
    }
  }

  return { ...characterData, style, imageUrl, prompt };
}

function getStylePrompt(style: string): string {
  switch (style) {
    case "UltraSimple":
      return "A cute, minimalist character with thick bold outlines, very simple facial features like dots for eyes, no complex details, flat simple colors, popular Instagram webtoon doodle style, clean and simple, no shading";
    case "Simple":
      return "A polished and clean webtoon character with bold outlines, expressive features, vibrant flat colors, modern digital art style, simple but professional";
    case "Cute":
      return "A super cute chibi style character illustration, big eyes, soft colors, rounded shapes";
    case "Comic":
      return "A classic comic book style character illustration, dynamic lines, cross-hatching, bold colors";
    case "Watercolor":
      return "A soft watercolor style character illustration, artistic textures, gentle gradients, hand-drawn feel";
    case "Retro":
      return "A retro 90s anime style character illustration, vintage colors, nostalgic aesthetic";
    default:
      return "A clean webtoon style character illustration";
  }
}

export async function generateScript(topic: string, characters: Character[], panelCount: number = 4): Promise<Script> {
  const mainCharacter = characters[0];
  const subCharacters = characters.slice(1);
  const subCharsDesc = subCharacters.length > 0 
    ? `서브 캐릭터들: ${subCharacters.map(c => `${c.name}(${c.description})`).join(", ")}`
    : "서브 캐릭터 없음";

    const styleDescription = mainCharacter.style === "UltraSimple" ? "귀엽고 굵은 선의 초간단 캐릭터 스타일" : mainCharacter.style === "Simple" ? "깔끔한 웹툰 스타일" : mainCharacter.style;
  const response = await getAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `"${topic}"을 주제로 하고 ${mainCharacter.name}(${mainCharacter.description})이 주인공인 ${panelCount}컷 인스타툰 대본을 작성해줘. 
    그림체 스타일: ${styleDescription}.
    ${subCharsDesc}도 대본에 적절히 등장시켜줘.
    각 컷별로 상황 묘사(캐릭터 동작), 배경 묘사(장소 및 분위기), 그리고 대사를 한국어로 제공해줘. ${mainCharacter.style === "UltraSimple" ? "그림체가 매우 단순하므로 배경 묘사도 최소화하고 캐릭터의 동작 위주로 구성해줘." : ""}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          theme: { type: Type.STRING },
          panels: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                panelNumber: { type: Type.INTEGER },
                description: { type: Type.STRING },
                backgroundDescription: { type: Type.STRING },
                dialogue: { type: Type.STRING },
              },
              required: ["panelNumber", "description", "backgroundDescription", "dialogue"],
            },
          },
        },
        required: ["title", "theme", "panels"],
      },
    },
  });

  return JSON.parse(response.text);
}

export async function generatePanelImage(characters: Character[], panel: Panel): Promise<string> {
  const mainCharacter = characters[0];
  const stylePrompt = getStylePrompt(mainCharacter.style || "UltraSimple");
  
  const charDescriptions = characters.map(c => `${c.name}: ${c.appearance}`).join(". ");

  // Step 1: Use Gemini 3 Flash to generate a detailed English prompt from the Korean panel data
  const promptResponse = await getAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `다음 한국어 인스타툰 장면 설명을 바탕으로, 이미지 생성 AI를 위한 매우 상세한 영어 프롬프트를 작성해줘.
    
    캐릭터 정보: ${charDescriptions}
    장면 상황: ${panel.description}
    배경 설명: ${panel.backgroundDescription}
    그림체 스타일: ${stylePrompt}
    
    프롬프트 작성 규칙:
    1. 캐릭터의 동작, 표정, 구도를 구체적으로 묘사할 것.
    2. 배경의 색감, 조명, 소품 등을 상세히 포함할 것.
    3. 텍스트나 말풍선이 이미지에 포함되지 않도록 할 것.
    4. 전체적인 분위기가 ${stylePrompt}에 완벽하게 부합하도록 할 것.
    5. 영어로만 출력할 것.`,
  });

  const detailedPrompt = promptResponse.text;

  // Step 2: Generate the image using the detailed prompt
  const imageResponse = await getAI().models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: detailedPrompt,
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return "";
}

export async function regeneratePanelContent(
  topic: string,
  mainCharacter: Character,
  subCharacters: Character[],
  currentScript: Script,
  panelNumber: number,
  feedback?: string
): Promise<Panel> {
  const subCharsDesc = subCharacters.length > 0 
    ? `서브 캐릭터들: ${subCharacters.map(c => `${c.name}(${c.description})`).join(", ")}`
    : "서브 캐릭터 없음";

  const styleDescription = mainCharacter.style === "UltraSimple" ? "귀엽고 굵은 선의 초간단 캐릭터 스타일" : mainCharacter.style === "Simple" ? "깔끔한 웹툰 스타일" : mainCharacter.style;
  
  const response = await getAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `"${topic}"을 주제로 한 인스타툰 대본 중 ${panelNumber}번째 컷을 수정하려고 해.
    주인공: ${mainCharacter.name}(${mainCharacter.description})
    ${subCharsDesc}
    그림체 스타일: ${styleDescription}
    
    현재 전체 대본:
    ${JSON.stringify(currentScript.panels)}
    
    수정 요청 사항: ${feedback || "이 컷을 더 재미있게 또는 자연스럽게 수정해줘."}
    
    ${panelNumber}번째 컷에 대해서만 다음 JSON 형식으로 응답해줘:
    {
      "panelNumber": ${panelNumber},
      "description": "상황 묘사 (한국어)",
      "backgroundDescription": "배경 묘사 (한국어)",
      "dialogue": "대사 (한국어)"
    }`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          panelNumber: { type: Type.NUMBER },
          description: { type: Type.STRING },
          backgroundDescription: { type: Type.STRING },
          dialogue: { type: Type.STRING },
        },
        required: ["panelNumber", "description", "backgroundDescription", "dialogue"],
      },
    },
  });

  try {
    const result = JSON.parse(response.text);
    return result;
  } catch (e) {
    console.error("Failed to parse regenerated panel:", e);
    throw new Error("패널 수정에 실패했습니다.");
  }
}
