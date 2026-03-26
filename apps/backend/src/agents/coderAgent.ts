import { Agent, AgentResult } from "../types";
import { callLLM } from "./llmGateway";
import { FileSystemService } from "../services/fileSystem";

export interface CoderTask {
  type: "create_file" | "update_file" | "delete_file" | "refactor" | "add_feature";
  targetFile?: string;
  description: string;
  code?: string;
}

// JSON cevabını parse et — daha esnek
function extractJSONFromResponse(text: string): any {
  if (!text || text.trim().length === 0) {
    throw new Error("Yanıt boş");
  }
  
  // 1. Markdown kod bloğu içindeki JSON'u bul
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    const jsonCandidate = codeBlockMatch[1].trim();
    try {
      return JSON.parse(jsonCandidate);
    } catch (e) {
      // Geçersiz, devam et
    }
  }
  
  // 2. İlk { ile son } arasını al
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      // Geçersiz, devam et
    }
  }
  
  // 3. Tüm metni JSON olarak parse etmeyi dene
  try {
    return JSON.parse(text);
  } catch (e) {
    // Hala olmadı
  }
  
  throw new Error("Geçerli JSON bulunamadı");
}

export async function runCoderAgent(
  agent: Agent,
  task: CoderTask,
  projectId: string,
  taskId?: string
): Promise<AgentResult> {
  const start = Date.now();
  const fsService = new FileSystemService(projectId);
  await fsService.initWorkspace();

  console.log(`[Coder:${agent.name}] Görev başladı: ${task.type} - ${task.description}`);

  // Proje yapısını oku
  const projectStructure = await fsService.getDirectoryStructure();
  
  // Eğer güncellenecek dosya varsa mevcut içeriğini oku
  let currentFileContent: string | null = null;
  if (task.targetFile && (task.type === "update_file" || task.type === "refactor")) {
    currentFileContent = await fsService.readFile(task.targetFile);
  }

  // LLM'e gönderilecek prompt
  const systemPrompt = `
    Sen bir ${agent.role} AI çalışanısın. Adın: ${agent.name}
    Hedefin: ${agent.goal}
    
    Görevin: ${task.type === "create_file" ? "Yeni dosya oluşturmak" : 
              task.type === "update_file" ? "Mevcut dosyayı güncellemek" :
              task.type === "delete_file" ? "Dosya silmek" :
              task.type === "refactor" ? "Kod refaktörü yapmak" :
              "Yeni özellik eklemek"}
    
    ${currentFileContent ? `Mevcut dosya içeriği:\n\`\`\`\n${currentFileContent}\n\`\`\`\n` : ""}
    
    Proje yapısı:
    ${JSON.stringify(projectStructure, null, 2).slice(0, 1000)}
    
    Yapman gereken:
    ${task.description}
    
    ${task.code ? `Eklenmesi gereken kod:\n\`\`\`\n${task.code}\n\`\`\`` : ""}
    
    CEVAP FORMATI (SADECE GEÇERLİ JSON, başka bir şey yazma!):
    {
      "action": "create_file",
      "filePath": "src/api/auth.js",
      "content": "const express = require('express');\\nconst router = express.Router();\\n\\nrouter.post('/login', (req, res) => {\\n  res.json({ message: 'Login endpoint' });\\n});\\n\\nmodule.exports = router;",
      "explanation": "Login API endpoint'i oluşturuldu"
    }
    
    ÖNEMLİ KURALLAR:
    1. SADECE JSON çıktısı ver, başka yazı yazma!
    2. content içinde JavaScript kodu varsa \\n ile satır sonu ekle
    3. filePath proje köküne göre göreceli olmalı
    4. JSON geçerli olmalı
  `;

  const userPrompt = task.code 
    ? `Şu kodu ekle/güncelle:\n\`\`\`\n${task.code}\n\`\`\``
    : task.description;

  let response;
  try {
    response = await callLLM(agent.model, systemPrompt, userPrompt);
    console.log(`[Coder] LLM yanıtı alındı, uzunluk: ${response.text.length}`);
    if (response.text.length > 0) {
      console.log(`[Coder] Yanıt ilk 200 karakter:`, response.text.slice(0, 200));
    } else {
      console.log(`[Coder] UYARI: Yanıt boş!`);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[Coder] LLM çağrısı hatası:", errorMessage);
    response = {
      text: JSON.stringify({
        action: "create_file",
        filePath: task.targetFile || "src/fallback.js",
        content: `// ${task.description}\n// Otomatik oluşturuldu\n\nconst express = require('express');\nconst app = express();\nconst port = 3000;\n\napp.use(express.json());\n\napp.get('/', (req, res) => {\n  res.json({ message: 'API çalışıyor' });\n});\n\napp.listen(port, () => {\n  console.log(\`Server http://localhost:\${port} adresinde çalışıyor\`);\n});\n\nmodule.exports = app;`,
        explanation: "Fallback: Otomatik oluşturuldu"
      }),
      tokenUsed: 0,
    };
  }

  // JSON cevabını parse et
  let action;
  try {
    // Yanıt boş mu kontrol et
    if (!response.text || response.text.trim().length === 0) {
      console.log("[Coder] UYARI: Yanıt boş, fallback kullanılıyor");
      throw new Error("Yanıt boş");
    }
    
    action = extractJSONFromResponse(response.text);
    console.log("[Coder] JSON parse başarılı:", action.action);
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[Coder] JSON parse hatası:", errorMessage);
    console.log("[Coder] Raw response (ilk 500):", response.text?.slice(0, 500) || "BOŞ");
    
    // Fallback: yanıt içinde kod varsa onu al
    const codeMatch = response.text?.match(/```(?:javascript|js)?\n([\s\S]*?)```/);
    if (codeMatch) {
      console.log("[Coder] Kod bloğu bulundu, fallback olarak kullanılıyor");
      action = {
        action: "create_file",
        filePath: task.targetFile || "src/app.js",
        content: codeMatch[1],
        explanation: "Kod bloğundan otomatik çıkarıldı"
      };
    } else {
      action = { 
        action: "create_file", 
        filePath: task.targetFile || "src/fallback.js",
        content: `// ${task.description}\n// Otomatik oluşturuldu\n\nconst express = require('express');\nconst app = express();\n\napp.get('/', (req, res) => {\n  res.json({ message: 'API çalışıyor' });\n});\n\nmodule.exports = app;`,
        explanation: `Fallback: ${errorMessage}`
      };
    }
  }

  // İşlemi uygula

  // İşlemi uygula
  let operationResult = "";
  let filePath = action.filePath || task.targetFile || "unknown";

  // Ana dosyayı oluştur/güncelle
  if (action.action === "create_file" || action.action === "update_file") {
    if (action.content) {
      await fsService.writeFile(filePath, action.content);
      operationResult = `${action.action} dosyası oluşturuldu/güncellendi: ${filePath}`;
      console.log(`[Coder] Ana dosya yazıldı: ${filePath}, içerik uzunluğu: ${action.content.length}`);
    }
  }

  // Ek dosyaları oluştur
  if (action.additionalFiles && Array.isArray(action.additionalFiles)) {
    for (const extraFile of action.additionalFiles) {
      if (extraFile.filePath && extraFile.content) {
        await fsService.writeFile(extraFile.filePath, extraFile.content);
        operationResult += `\n+ Ek dosya: ${extraFile.filePath}`;
        console.log(`[Coder] Ek dosya yazıldı: ${extraFile.filePath}`);
      }
    }
  }

  // package.json güncellemesi gerekiyorsa
  if (action.packageJsonUpdates && action.packageJsonUpdates.length > 0) {
    const packageJsonPath = "package.json";
    const existingPackageJson = await fsService.readFile(packageJsonPath);
    let packageJson = existingPackageJson ? JSON.parse(existingPackageJson) : { dependencies: {}, devDependencies: {} };
    
    for (const dep of action.packageJsonUpdates) {
      if (!packageJson.dependencies[dep.name]) {
        packageJson.dependencies[dep.name] = dep.version || "latest";
        operationResult += `\n+ Bağımlılık eklendi: ${dep.name}`;
      }
    }
    
    await fsService.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }

  // Silme işlemi
  if (action.action === "delete_file") {
    await fsService.deleteFile(filePath);
    operationResult = `Dosya silindi: ${filePath}`;
  }
  // Diğer işlemler
  if (!operationResult) {
    operationResult = `İşlem yapılmadı: ${action.explanation || "açıklama yok"}`;
  }

  const result: AgentResult = {
    agentId: agent.id,
    model: agent.model,
    output: JSON.stringify({
      action: action.action,
      filePath: filePath,
      explanation: action.explanation || operationResult,
      result: operationResult,
      content: action.content ? action.content.slice(0, 500) : null,
    }, null, 2),
    tokenUsed: response.tokenUsed || 0,
    durationMs: Date.now() - start,
  };

  console.log(`[Coder:${agent.name}] Tamamlandı: ${operationResult}`);
  return result;
}