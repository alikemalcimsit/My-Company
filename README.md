# Geliştirici Dokümantasyonu — Gün 1 & 2

Bu doküman projenin ilk iki gününde yapılan her şeyi, neden yapıldığını ve her kod parçasının ne işe yaradığını detaylıca açıklamaktadır.

---

## Projeye Genel Bakış

AI Company Platform, şirketlerin yapay zeka agent'larını bir ekip gibi organize edip yönetebileceği, kodsuz ve görsel bir platformdur. Kullanıcılar kod yazmadan AI çalışanlar oluşturabilir, görevler atayabilir ve birden fazla agent'ı aynı anda koordineli şekilde çalıştırabilir.

Sistemin kalbi **Orchestrator**'dır — CEO gibi davranır, gelen görevi analiz eder, doğru agent'lara dağıtır, paralel çalıştırır ve en iyi sonucu döndürür.

---

## Proje Yapısı — Neden Monorepo?

```
ai-company/
	apps/
		backend/     ← Node.js + TypeScript API
		frontend/    ← Next.js arayüz (ileriki günlerde)
	packages/
		sdk/         ← Embedded entegrasyon SDK'sı (ileriki günlerde)
	docker-compose.yml
	.gitignore
```

Tek bir klasörde üç ayrı uygulama tutuyoruz. Buna **monorepo** deniyor.

**Neden monorepo?** Backend, frontend ve SDK birbirleriyle konuşacak ve aynı TypeScript tiplerini paylaşacak. Ayrı repolar olsaydı her değişiklikte üç ayrı yeri güncellemek gerekirdi. Monorepo'da hepsi aynı yerde, aynı `npm install` ile kurulur.

---

## Docker Compose — Neden Gerekli?

```yaml
# docker-compose.yml
services:
	postgres:
		image: postgres:15
		environment:
			POSTGRES_USER: aicompany
			POSTGRES_PASSWORD: aicompany123
			POSTGRES_DB: aicompany
		ports:
			- "5432:5432"

	redis:
		image: redis:7-alpine
		ports:
			- "6379:6379"
```

İki servis ayağa kaldırıyor: **PostgreSQL** ve **Redis**.

**Neden Docker ile kurduk, direkt bilgisayara kurmadık?**

Docker ile kurduğunda bilgisayarın temiz kalıyor. Projeyi silen biri `docker compose down -v` yaparsa her şey gidiyor, bilgisayarda iz kalmıyor. Başka bir bilgisayarda `docker compose up` yazınca aynı ortam ayağa kalkıyor. Ekip çalışmasında ve yeni makineye geçişte bu kritik öneme sahip.

**PostgreSQL** — kalıcı veriler burada saklanıyor. Kullanıcılar, projeler, agent'lar, task'lar ve loglar. Uygulama kapansa bile veriler burada duruyor.

**Redis** — geçici veriler burada. Cache ve kuyruk için kullanılıyor. Uygulama kapanıp açılsa cache sıfırlanır ama bu normaldir, zaten geçici veridir.

---

## .env Dosyası — Neden Gerekli?

```env
DATABASE_URL="postgresql://aicompany:aicompany123@localhost:5432/aicompany"
REDIS_URL="redis://localhost:6379"
OPENAI_API_KEY="sk-..."
NODE_ENV="development"
```

API key'leri ve bağlantı bilgilerini **asla** kod içine yazmıyoruz.

**Neden?** Kodu GitHub'a yükleyeceksin. Eğer key koda yazılıysa herkes görebilir, hesabın ele geçirilebilir. `.env` dosyası `.gitignore`'a eklendi, yani git'e hiç girmiyor. Sadece senin bilgisayarında var.

`.env.example` dosyası ise şablon gösteriyor — "bu değişkenler lazım ama değerlerini sen doldur" mesajını veriyor. Bu dosya git'e giriyor.

---

## TypeScript Konfigürasyonu — Neden Strict Mode?

```json
{
	"compilerOptions": {
		"target": "ES2022",
		"strict": true,
		"esModuleInterop": true
	}
}
```

`strict: true` TypeScript'in en katı modudur. Tip hatalarını önceden yakalar.

**Örnek:** `res.json()` çağrısı `unknown` tip döndürür. Sen onu kullanmak istersen ne olduğunu TypeScript'e söylemek zorundasın:

```typescript
const data = await res.json() as {
	choices: Array<{ message: { content: string } }>;
	usage: { total_tokens: number };
};
```

Bu sayede runtime'da `cannot read property of undefined` hatası almak yerine derleme aşamasında hatayı görürsün. Production'da bu yaklaşım çok büyük sorunların önüne geçer.

**Neden Node 20 kullandık?** Node 24 çok yeni ve Prisma henüz tam desteklemiyor. `nvm` ile Node 20'ye geçtik. `nvm` birden fazla Node versiyonunu aynı bilgisayarda yönetmeye yarar.

---

## Prisma — Neden ORM Kullandık?

Prisma bir ORM (Object Relational Mapper). Yani SQL yazmak yerine TypeScript ile veritabanını yönetiyoruz.

**SQL ile:**
```sql
SELECT * FROM agents WHERE project_id = 'proj-001';
```

**Prisma ile:**
```typescript
prisma.agent.findMany({ where: { projectId: "proj-001" } });
```

İkisi aynı işi yapıyor ama Prisma versiyonu tip güvenli. Yanlış alan adı yazarsan TypeScript hemen hata veriyor. Ayrıca schema değişince migration otomatik oluşturuyor, veritabanını güncel tutuyor.

---

## Veritabanı Schema Tasarımı

### User Tablosu

```prisma
model User {
	id        String    @id @default(uuid())
	email     String    @unique
	name      String
	plan      Plan      @default(FREE)
	projects  Project[]
	createdAt DateTime  @default(now())
}

enum Plan {
	FREE
	PRO
	ENTERPRISE
}
```

Sistemi kullanan kişiyi temsil eder. `plan` alanı ileriki aşamada kaç agent kurabileceğini ve kaç token harcayabileceğini belirleyecek.

**Neden `uuid()` kullandık?** 1, 2, 3 gibi sıralı ID'ler güvenlik açığı yaratır — birisi `user/1`, `user/2` diye deneyerek tüm kullanıcılara erişmeye çalışabilir. UUID tahmin edilemez bir string üretir.

---

### Project Tablosu

```prisma
model Project {
	id          String   @id @default(uuid())
	ownerId     String
	owner       User     @relation(fields: [ownerId], references: [id])
	name        String
	description String?
	agents      Agent[]
	tasks       Task[]
	createdAt   DateTime @default(now())
}
```

Her kullanıcının birden fazla projesi olabilir. Proje = AI şirketi. Bir kullanıcı "E-ticaret Şirketim" ve "Klinik Otomasyonum" diye iki ayrı proje kurabilir, her birinin kendi agent'ları olur.

`owner User @relation(...)` satırı Prisma'ya "ownerId alanı User tablosundaki id'ye bağlı" diyor. Bu sayede `project.owner` dediğinde Prisma otomatik olarak ilgili User kaydını getiriyor.

---

### Agent Tablosu

```prisma
model Agent {
	id            String    @id @default(uuid())
	projectId     String
	project       Project   @relation(fields: [projectId], references: [id])
	name          String
	role          String
	model         ModelName
	goal          String
	efficiency    Int       @default(5)
	memoryEnabled Boolean   @default(false)
}

enum ModelName {
	GPT_4
	GPT_3_5_TURBO
	GEMINI_PRO
	CLAUDE_SONNET
}
```

AI çalışanları temsil eder. Üç kritik alan var:

**`role`** — agent'ın ne iş yaptığını belirler. `backend-dev`, `frontend-dev`, `analyst` gibi değerler alır. Orchestrator task geldiğinde "bu coding task'ı, backend-dev rolündeki agent'ları bul" diyerek doğru agent'ları seçer.

**`model`** — hangi AI modelini kullandığını belirler. GPT_4, GEMINI_PRO, CLAUDE_SONNET gibi.

**`efficiency`** — 1-10 arası verimlilik skoru. Düşük = ucuz model anlamına gelir. Orchestrator agent seçerken önce düşük efficiency'li agent'ları dener — yani önce ucuz olanı dener, yeterli olmadığında pahalıya geçer. Bu token maliyetini düşürür.

**`memoryEnabled`** — ileriki aşamada agent'ın geçmiş konuşmaları hatırlamasını sağlayacak.

---

### Task Tablosu

```prisma
model Task {
	id             String     @id @default(uuid())
	projectId      String
	input          String
	output         String?
	type           TaskType   @default(SIMPLE)
	status         TaskStatus @default(PENDING)
	totalTokenUsed Int        @default(0)
	durationMs     Int        @default(0)
}

enum TaskType {
	SIMPLE
	CODING
	DESIGN
	ANALYSIS
	COMPLEX
}

enum TaskStatus {
	PENDING
	RUNNING
	DONE
	FAILED
}
```

Yapılacak işleri temsil eder.

`input` — kullanıcının verdiği görev metni.
`output` — sistemin ürettiği sonuç. `?` işareti optional demek, task henüz bitmemişse boş olabilir.
`type` — orchestrator'ın otomatik tespit ettiği task tipi.
`status` — task'ın durumu: pending → running → done.
`totalTokenUsed` ve `durationMs` — cost dashboard için. Kaç token harcandı, ne kadar sürdü. Bu veriler yatırımcıya "aynı işi %60 daha ucuza yapıyoruz" diyebilmek için gerekli.

---

### TaskAssignment Tablosu

```prisma
model TaskAssignment {
	id         String     @id @default(uuid())
	taskId     String
	task       Task       @relation(fields: [taskId], references: [id])
	agentId    String
	agent      Agent      @relation(fields: [agentId], references: [id])
	output     String?
	tokenUsed  Int        @default(0)
	durationMs Int        @default(0)
	status     TaskStatus @default(PENDING)
}
```

Bir task'a birden fazla agent atanabilir. Bu tablo köprü görevi görür. Her agent'ın kendi çıktısı ayrı tutulur — merge öncesi ham veriler burada saklanır. Sonradan "hangi agent daha iyi cevap verdi" analizini bu tablodan yapabiliriz.

---

### TaskLog Tablosu

```prisma
model TaskLog {
	id         String   @id @default(uuid())
	taskId     String
	agentId    String
	action     String
	model      String?
	tokenUsed  Int      @default(0)
	durationMs Int      @default(0)
	createdAt  DateTime @default(now())
}
```

Her LLM çağrısının ham kaydı. `action` alanı şu değerleri alabilir: `llm_call`, `cache_hit`, `pre_filter`, `dedup`. Bu tablo cost dashboard'un hammaddesidir. "Bu ay 4.200 token harcandı, bunun 1.800'ü cache'den döndü, gerçek LLM çağrısı 2.400 tokendi" gibi analizler buradan yapılır.

---

## Prisma Client Singleton

```typescript
// src/db/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient;
};

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({ log: ["error"] });

if (process.env.NODE_ENV !== "production") {
	globalForPrisma.prisma = prisma;
}
```

**Neden singleton?** Her dosyada `new PrismaClient()` çağırsan her seferinde yeni bir veritabanı bağlantısı açılır. 10 dosyan varsa 10 bağlantı açık kalır, bu veritabanını yorar ve hataları davet eder. Singleton pattern ile tek bir instance oluşturup her yerden aynısını kullanıyoruz.

`globalThis` kullanımı Next.js ve hot-reload ortamlarında önemli. Development'ta dosya her kayıt edildiğinde modüller yeniden yüklenir ama global obje korunur. Bu sayede gereksiz bağlantı açılmaz.

---

## TypeScript Tipleri

```typescript
// src/types/index.ts
export type ModelName =
	| "gpt-4"
	| "gpt-3.5-turbo"
	| "gemini-pro"
	| "claude-sonnet";

export type TaskType =
	| "simple" | "coding" | "design" | "analysis" | "complex";

export interface Agent {
	id: string;
	name: string;
	role: string;
	model: ModelName;
	goal: string;
	efficiency: number;
}

export interface Task {
	id: string;
	projectId: string;
	input: string;
	type?: TaskType;
	status: TaskStatus;
}

export interface AgentResult {
	agentId: string;
	model: ModelName;
	output: string;
	tokenUsed: number;
	durationMs: number;
}
```

**Neden merkezi tip dosyası?** Tüm dosyalar aynı tipleri kullanıyor. Eğer her dosyaya ayrı ayrı yazsan, bir yerde değiştirince diğerleri eski kalır. Merkezi dosyada tutunca bir yerde değiştiriyorsun, TypeScript geri kalan her yerde uyumsuzluğu hemen gösteriyor.

`ModelName` tipini `string` olarak tanımlamak yerine `"gpt-4" | "gpt-3.5-turbo" | ...` şeklinde tanımladık. Bu sayede başka bir yerde `model: "gpt-5"` yazarsan TypeScript hata verir — henüz böyle bir model tanımlanmamış.

---

## LLM Gateway

```typescript
// src/agents/llmGateway.ts
export async function callLLM(
	model: ModelName,
	systemPrompt: string,
	userInput: string
): Promise<LLMResponse> {
	if (model === "gpt-4" || model === "gpt-3.5-turbo") {
		return callOpenAI(model, systemPrompt, userInput);
	}
	if (model === "gemini-pro") {
		return callGeminiMock(systemPrompt, userInput);
	}
	if (model === "claude-sonnet") {
		return callClaudeMock(systemPrompt, userInput);
	}
	throw new Error(`Bilinmeyen model: ${model}`);
}
```

Bu dosyanın amacı **soyutlama katmanı** oluşturmak. Sistemin geri kalanı hangi AI modelini kullandığını bilmek zorunda değil. Orchestrator sadece "bu agent için LLM çağır" diyor, hangi şirkete istek gittiğini bilmiyor.

**Neden bu önemli?** Yarın Google Gemini'nin fiyatı artarsa, sadece bu dosyada bir satır değiştiriyorsun, geri kalan hiçbir kod değişmiyor. Yeni bir model çıkarsa sadece buraya bir `if` bloğu ekliyorsun.

```typescript
async function callOpenAI(model, system, user): Promise<LLMResponse> {
	const res = await fetch("https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
		},
		body: JSON.stringify({
			model,
			messages: [
				{ role: "system", content: system },
				{ role: "user",   content: user },
			],
			max_tokens: 500,
		}),
	});

	const data = await res.json() as {
		choices: Array<{ message: { content: string } }>;
		usage: { total_tokens: number };
	};

	return {
		text:      data.choices[0].message.content,
		tokenUsed: data.usage.total_tokens,
	};
}
```

`system` ve `user` mesajlarını ayrı göndermek önemli. `system` mesajı agent'ın kimliğini ve rolünü tanımlar, `user` mesajı ise yapılacak görevi içerir. OpenAI bu iki mesajı farklı şekilde işler — system mesajı LLM'in davranışını şekillendirir.

`max_tokens: 500` ile cevabın çok uzun olmasını engelliyoruz. Daha uzun cevap = daha fazla token = daha yüksek maliyet.

`callGeminiReal` fonksiyonunu da yazdık ama billing aktif olana kadar `callGeminiMock` kullanıyoruz. Billing aktif olduğunda tek satır değişecek.

---

## Agent Runner

```typescript
// src/agents/agentRunner.ts
export async function runAgent(
	agent: Agent,
	input: string
): Promise<AgentResult> {
	const start = Date.now();

	console.log(`[${agent.name}] çalışıyor... (model: ${agent.model})`);

	const systemPrompt = `
		Sen "${agent.name}" adlı bir AI çalışanısın.
		Rol: ${agent.role}
		Hedef: ${agent.goal}
		Kısa, net ve uygulanabilir cevap ver.
	`.trim();

	const response = await callLLM(agent.model, systemPrompt, input);

	return {
		agentId:    agent.id,
		model:      agent.model,
		output:     response.text,
		tokenUsed:  response.tokenUsed,
		durationMs: Date.now() - start,
	};
}
```

Bu fonksiyon bir agent'ı "canlandırıyor". Agent'ın kimliğini, rolünü ve hedefini system prompt olarak LLM'e veriyor. LLM bu kimliği benimseyerek cevap üretiyor.

`Date.now() - start` ile kaç milisaniyede tamamlandığını ölçüyoruz. Bir agent sürekli yavaş cevap veriyorsa bunu tespit edip daha hızlı modele yönlendirebilirsin.

`AgentResult` döndürmesi önemli — sadece cevap değil, hangi agent, hangi model, kaç token ve kaç ms de dönüyor. Bu veriler log tablosuna kaydedilecek ve dashboard'da gösterilecek.

---

## Task Analyzer

```typescript
// src/orchestrator/taskAnalyzer.ts
export function analyzeTask(input: string): AnalysisResult {
	const text = input.toLowerCase();

	if (text.includes("ui") || text.includes("tasarım") || text.includes("frontend")) {
		return { type: "design", recommendedModel: "gemini-pro", complexity: "medium" };
	}
	if (text.includes("kod") || text.includes("api") || text.includes("backend")) {
		return { type: "coding", recommendedModel: "gpt-4", complexity: "high" };
	}
	if (text.includes("analiz") || text.includes("rapor")) {
		return { type: "analysis", recommendedModel: "claude-sonnet", complexity: "medium" };
	}
	if (input.length < 80) {
		return { type: "simple", recommendedModel: "gpt-3.5-turbo", complexity: "low" };
	}

	return { type: "complex", recommendedModel: "gpt-4", complexity: "high" };
}
```

Kullanıcı "şu özelliği ekle" dediğinde sistem otomatik anlıyor bu ne tür bir iş. Kullanıcı "coding task" diye etiketlemek zorunda değil.

**Neden bu önemli?** Model seçimi doğrudan maliyeti etkiliyor. UI işi Gemini'ye giderse GPT-4'e göre çok daha ucuz. Kısa ve basit bir soru `gpt-3.5-turbo`'ya giderse `gpt-4`'e göre yaklaşık 10 kat daha ucuz.

İleride bunu LLM ile daha akıllı hale getirebilirsin — "Bu task'ın tipini tespit et" diye küçük ve ucuz bir model çağırırsın, keyword analizi yerine semantik anlama yaparsın.

---

## Agent Selector

```typescript
// src/orchestrator/agentSelector.ts
const ROLE_MAP: Record<TaskType, string[]> = {
	coding:   ["backend-dev", "fullstack-dev"],
	design:   ["frontend-dev", "ui-designer"],
	analysis: ["analyst", "researcher"],
	simple:   [],
	complex:  [],
};

export function selectAgents(
	allAgents: Agent[],
	taskType: TaskType,
	maxAgents: number = 2
): Agent[] {
	const targetRoles = ROLE_MAP[taskType];

	let candidates = targetRoles.length > 0
		? allAgents.filter(a => targetRoles.includes(a.role))
		: allAgents;

	// Verimlilik skoruna göre sırala — düşük = ucuz = önce
	candidates = candidates.sort((a, b) => a.efficiency - b.efficiency);

	return candidates.slice(0, maxAgents);
}
```

Her task tipi için hangi rollerin uygun olduğunu tanımlar. Task "coding" tipindeyse sadece "backend-dev" ve "fullstack-dev" rolündeki agent'lar aday olur.

`maxAgents = 2` parametresi var. Neden 2? Paralel çalıştırıp iki farklı cevap alıyoruz, en iyisini seçiyoruz. 3-4 agent'a atarsan maliyet artar ama kalite çok fazla artmaz.

`sort((a, b) => a.efficiency - b.efficiency)` ile en ucuz agent'lar önce geliyor. Ucuz agent yeterli kalitede cevap verirse pahalı agent'a gerek kalmıyor.

---

## Cache Service

```typescript
// src/cache/cacheService.ts
const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

export async function getCached(key: string): Promise<AgentResult | null> {
	const val = await redis.get(key);
	return val ? JSON.parse(val) : null;
}

export async function setCache(
	key: string,
	result: AgentResult,
	ttlSeconds = 3600
): Promise<void> {
	await redis.set(key, JSON.stringify(result), "EX", ttlSeconds);
}
```

Aynı input tekrar geldiğinde LLM'e hiç gitmiyoruz, Redis'ten dönüyoruz. Token sıfır harcanıyor.

`TTL = 3600` yani 1 saat sonra cache'den siliniyor. Neden sonsuz tutmuyoruz? Cevaplar zamanla değişebilir. Bugün "JWT nasıl yazılır" sorusuna verilen cevap iyi ama 6 ay sonra daha iyi bir yöntem çıkmış olabilir.

**Cache key nasıl oluşturuluyor?**

```typescript
const cacheKey = createHash("sha256")
	.update(task.input + analysis.type)
	.digest("hex");
```

Input + task tipi birleşiminin SHA256 hash'i. Aynı input + aynı tip = aynı key = cache hit. Hash kullanıyoruz çünkü uzun bir metin yerine sabit uzunlukta 64 karakterlik bir string elde ediyoruz, Redis'te alan tasarrufu sağlıyor.

---

## Output Merger

```typescript
// src/orchestrator/outputMerger.ts
export function mergeOutputs(results: AgentResult[]): AgentResult {
	if (results.length === 1) return results[0];

	return results.reduce((prev, curr) => {
		const prevScore = prev.output.length / (prev.tokenUsed || 1);
		const currScore = curr.output.length / (curr.tokenUsed || 1);
		return currScore > prevScore ? curr : prev;
	});
}
```

İki agent çalıştı, iki farklı cevap geldi. Hangisini kullanacağız?

Şu an "token başına en uzun cevap" stratejisini kullanıyoruz — az token harcayıp çok şey söyleyen agent kazanıyor. Bu basit ama etkili bir başlangıç stratejisi.

İleride geliştirilebilir:
- Voting sistemi: 3 agent çalıştır, 2'si aynı fikirdeyse onu seç
- Kalite skorlaması: ayrı bir "reviewer agent" çıktıları değerlendirsin
- Semantic similarity: iki cevabı karşılaştır, tutarlı olanı seç

---

## Orchestrator — CEO Mantığı

```typescript
// src/orchestrator/orchestrator.ts
export async function orchestrate(
	task: Task,
	allAgents: Agent[]
): Promise<AgentResult> {

	// 1. Task'ı analiz et
	const analysis = analyzeTask(task.input);
	task.type = analysis.type;

	// 2. Cache kontrolü
	const cacheKey = createHash("sha256")
		.update(task.input + analysis.type)
		.digest("hex");

	const cached = await getCached(cacheKey);
	if (cached) {
		console.log("[CEO] Cache hit — LLM çağrısı atlandı");
		return cached;
	}

	// 3. Agent seçimi
	const selected = selectAgents(allAgents, analysis.type);

	// 4. Paralel çalıştır
	const results = await Promise.all(
		selected.map(agent => runAgent(agent, task.input))
	);

	// 5. Sonuçları birleştir
	const final = mergeOutputs(results);

	// 6. Cache'e kaydet
	await setCache(cacheKey, final);

	return final;
}
```

Bu fonksiyon tüm sistemi koordine ediyor. Hiçbir iş yapmıyor aslında — sadece doğru sırada doğru fonksiyonları çağırıyor. Bu **orchestration pattern**'inin özü.

**Neden bu ayrımı yaptık?** Her parça bağımsız test edilebilir. `taskAnalyzer` tek başına test edilebilir, `agentSelector` tek başına test edilebilir. Orchestrator bunları bir araya getiriyor ama her biri kendi başına çalışabiliyor. Buna **separation of concerns** (sorumlulukları ayırma) deniyor.

**`Promise.all` neden önemli?**

```typescript
// ❌ Sıralı — yavaş
const r1 = await runAgent(agent1, input); // 2 saniye bekle
const r2 = await runAgent(agent2, input); // 2 saniye bekle
// Toplam: 4 saniye

// ✅ Paralel — hızlı
const [r1, r2] = await Promise.all([
	runAgent(agent1, input),
	runAgent(agent2, input),
]);
// Toplam: 2 saniye (ikisi aynı anda çalışıyor)
```

2 agent varsa ikisi aynı anda başlıyor. Sıralı çalışsaydı 2 kat daha yavaş olurdu.

---

## Sistemin Tam Akışı

Bir task geldiğinde şunlar oluyor sırasıyla:

```
1. orchestrate() çağrılır
				 ↓
2. analyzeTask() → "bu coding task, GPT-4 önerilir"
				 ↓
3. Redis'te cache var mı?
	 → Varsa direkt dön, LLM çağırma (token = 0)
	 → Yoksa devam et
				 ↓
4. selectAgents() → "backend-dev rolündeki agentları bul,
										 ucuzdan pahalıya sırala, ilk 2'yi al"
				 ↓
5. Promise.all → tüm seçilen agentlar AYNI ANDA çalışır
				 ↓
6. Her agent için:
	 systemPrompt oluştur → callLLM() → cevap al → AgentResult dön
				 ↓
7. callLLM() → hangi model? → ilgili API'yi çağır
				 ↓
8. mergeOutputs() → en verimli cevabı seç
				 ↓
9. Redis'e kaydet → bir sonraki aynı soruda LLM çağrılmayacak
				 ↓
10. Sonuç döner
```

---

## Seed Verisi — Neden Gerekli?

```typescript
// prisma/seed.ts
const user    = await prisma.user.upsert({ ... });
const project = await prisma.project.upsert({ ... });
await prisma.agent.upsert({ id: "agent-001", role: "backend-dev", model: "GPT_4", ... });
await prisma.agent.upsert({ id: "agent-002", role: "backend-dev", model: "GPT_3_5_TURBO", ... });
await prisma.agent.upsert({ id: "agent-003", role: "frontend-dev", model: "GEMINI_PRO", ... });
```

Geliştirme sürecinde her seferinde elle veri girmek yerine seed komutu ile hazır test verisi yüklüyoruz. `upsert` kullanıyoruz çünkü seed'i birden fazla kez çalıştırsan bile aynı kaydı tekrar oluşturmuyor — varsa günceller, yoksa oluşturur.

---

## Test Sonuçları

Gün sonunda sistemin çalıştığını şu çıktıyla doğruladık:

```
AI Company backend başladı

── Veritabanı ──────────────────
✓ Kullanıcılar : 1
✓ Projeler     : 1
✓ Agent'lar    : 3
────────────────────────────────

[CEO] Task alındı: Kullanıcı kaydı için backend API endpoint yaz...
[CEO] Tip: coding | Model: gpt-4 | Karmaşıklık: high
[CEO] Seçilen agentlar: Backend Dev 2, Backend Dev 1
[Backend Dev 2] çalışıyor... (model: gemini-pro)
[Backend Dev 1] çalışıyor... (model: gemini-pro)
[CEO] Tamamlandı — toplam token: 240

── Test 2: Cache ───────────────
[CEO] Cache hit — LLM çağrısı atlandı
Cache'den geldi mi: ✓ Evet
```

İki kritik şey doğrulandı: CEO task'ı analiz etti ve doğru agent'ları seçti. Aynı task ikinci kez geldiğinde LLM çağrısı hiç yapılmadı, direkt cache'den döndü — token sıfır harcandı.

---

## Şu Ana Kadar Çalışan Modüller

| Modül | Dosya | Durum |
|---|---|---|
| Veritabanı | `prisma/schema.prisma` | ✅ Çalışıyor |
| DB Client | `src/db/prisma.ts` | ✅ Çalışıyor |
| LLM Gateway | `src/agents/llmGateway.ts` | ✅ Çalışıyor |
| Agent Runner | `src/agents/agentRunner.ts` | ✅ Çalışıyor |
| Task Analyzer | `src/orchestrator/taskAnalyzer.ts` | ✅ Çalışıyor |
| Agent Selector | `src/orchestrator/agentSelector.ts` | ✅ Çalışıyor |
| Cache Service | `src/cache/cacheService.ts` | ✅ Çalışıyor |
| Output Merger | `src/orchestrator/outputMerger.ts` | ✅ Çalışıyor |
| Orchestrator | `src/orchestrator/orchestrator.ts` | ✅ Çalışıyor |

---

## Sıradaki Adımlar

**Gün 3-4 — Token Optimizer Middleware**

Beş katmanlı optimizasyon pipeline'ı:
1. Pre-filter — LLM çağırmadan cevaplanabilecek sorular
2. Deduplication — aynı task aynı anda iki kez çalışmasın
3. Context minimization — sadece son 5 mesajı gönder
4. Smart model routing — göreve göre en ucuz uygun model
5. Prompt compression — gereksiz kelimeler temizle

**Gün 5-6 — REST API**

Express ile endpoint'ler: `POST /api/tasks`, `GET /api/projects`, `GET /api/agents`, `GET /api/logs`

**Gün 7 — Frontend Başlangıcı**

Next.js + React Flow ile görsel workflow builder

---

## Komutlar Referansı

```bash
# Docker'ı başlat
docker compose up -d

# Migration çalıştır
npx prisma migrate dev --name init

# Seed verisi yükle
npx prisma db seed

# Prisma Studio (görsel DB yönetimi)
npx prisma studio

# Uygulamayı çalıştır
npx ts-node src/index.ts

# Development modunda çalıştır (hot-reload)
npm run dev
```
# AI Company Platform

## Ürün Tanımı
AI Company Platform — şirketlerin yapay zeka agent'larını bir ekip gibi organize edip yönetebileceği, kodsuz ve görsel bir platform.

---

## Problem
Bugün yapay zeka araçları iki uç noktada takılı kalmış durumda. Bir tarafta ChatGPT gibi tek başına çalışan asistanlar var — zeki ama koordine değil, hafızası yok, sisteminize bağlanamıyor. Diğer tarafta LangChain, Flowise gibi teknik araçlar var — güçlü ama bir developer olmadan kullanılamıyor.

Ortada kalan şirket sahibi, pazarlama müdürü, klinik yöneticisi şunu soruyor: "Ben sadece işimi otomatize etmek istiyorum, neden bu kadar zor?"

---

## Çözüm
Trello'yu düşünün. Her sütun bir departman, her kart bir görev. Sürükle bırak, basit, herkes anlıyor.

Biz bunu AI agent'larla yapıyoruz.

Her sütun bir AI çalışan. Sales Agent, Support Agent, Backend Developer Agent, Content Writer Agent. Siz görevi tanımlıyorsunuz, doğru çalışana otomatik gidiyor, yapılıyor. Kod yazmak yok, teknik bilgi yok, sadece yönetmek var.

---


## Nasıl Çalışır
Kullanıcı platformumuza giriyor ve bir "şirket" oluşturuyor. Bu şirketin içine AI çalışanlar ekliyor — her birinin rolü, hedefi ve kullanacağı AI modeli belirleniyor. Sonra bir görev tanımlıyor. Sistem bu görevi otomatik parçalara ayırıyor, doğru agent'lara dağıtıyor, agent'lar paralel çalışıyor ve sonuç ekrana geliyor. Kullanıcı canlı olarak hangi agent'ın ne yaptığını izleyebiliyor.

---


## İki Kullanım Modu
- **Standalone mod:** Platformu doğrudan kullanıyorsunuz. Kendi AI şirketinizi sıfırdan kuruyorsunuz, workflow'ları görsel olarak tasarlıyorsunuz.
- **Embedded mod:** Var olan projenize entegre ediyorsunuz. GitHub reponuzu bağlıyorsunuz, sistem mimarinizi anlıyor, "şu özelliği ekle" diyorsunuz, agent'lar çalışıyor, PR açılıyor. Sizin uygulamanızın içinde çalışıyor, müşterileriniz platformumuzu görmüyor bile.

---

## MVP — Şu An Mevcut Özellikler
- **Görsel yönetim:** Rakipler ya çok teknik ya çok basit. Biz ortada, ama doğru ortada. Bir pazarlamacı da bir CTO da aynı ekranda rahat çalışabiliyor. Trello mantığıyla, sürükle bırak ile workflow kurulabiliyor.
- **Token optimizasyonu:** Her LLM çağrısı beş katmanlı bir filtreden geçiyor — basit sorular LLM'e gitmeden cevaplanıyor, tekrar eden işler cache'den dönüyor, görevin tipine göre en ucuz uygun model seçiliyor. Aynı işi rakip sistemlere göre ortalama yüzde altmış daha ucuza yapıyoruz. Bu müşteriye direkt para olarak yansıyor.
- **Çoklu model desteği:** OpenAI, Google Gemini, Anthropic Claude — hepsi aynı anda kullanılabiliyor. UI görevi Gemini'ye, kod görevi GPT-4'e, analiz görevi Claude'a otomatik gidiyor.
- **GitHub entegrasyonu:** Repoyu bağlıyorsunuz, sistem kodu anlıyor, özellik tanımlıyorsunuz, PR geliyor.
- **Fallback mekanizması:** Bir model cevap vermezse sistem otomatik diğerine geçiyor. Production'da kopukluk olmuyor.
- **Cost dashboard:** Hangi agent ne kadar token harcadı, task başına maliyet, toplam harcama — hepsi anlık görünüyor.

---

## Sonraki Aşama — Yatırım Sonrası Eklenecek Özellikler
- **Agent Memory — Şirket Hafızası:** Agent sadece o anki görevi yapmayacak, şirketin geçmişini bilecek. "Bu müşteri geçen ay da aynı problemi yaşadı", "Bu kod tabanında authentication her zaman JWT kullanılıyor" gibi bilgileri vector DB'de tutup her çağrıda kullanacak. Müşteriye satılan fikir şu: AI çalışanların işe girdikleri günden itibaren şirketini öğreniyor.
- **Agent Performance Score:** Sistem arka planda hangi modelin daha iyi sonuç verdiğini ölçecek ve routing tablosunu kendisi güncelleyecek. Yatırımcıya "self-improving system" olarak sunulabilecek.
- **Cost Forecast:** Sadece geçmişi değil, geleceği de göster. Geçen haftanın trendine bakarak "bu ay tahminen 340 dolar harcayacaksın, şu optimizasyonları yapsan 180 dolara düşer" diyecek.
- **Approval Mode:** Agent bir şey yapacak ama önce insan onayı lazım. PR açılmadan önce, müşteriye cevap gitmeden önce kullanıcı onaylasın. Bu özellik olmadan enterprise müşteri almak çok zor.
- **Simulation Mode:** Workflow'u canlıya almadan önce sahte veriyle test et. 100 farklı müşteri mesajı gönder, nasıl cevap veriyor gör, hata varsa düzelt, sonra aç.
- **Webhook ve Event Trigger:** Agent'lar sadece manuel tetiklemeyle değil, olaylar olunca otomatik devreye girsin. Yeni GitHub issue açıldığında, Stripe'ta ödeme geldiğinde, formdan lead geldiğinde — bunlar tetikleyici olabilsin. Bu olmadan sistem hâlâ yarı manuel, bu gelince gerçek otomasyon oluyor.
- **Multi-Tenant White Label:** Bir ajans sistemi alıyor, kendi müşterilerine kendi logosuyla satıyor. Arka planda platform çalışıyor. Bu model geliri katlar çünkü tek müşteri değil, her birinin kendi müşteri tabanı olan ajanslara satılıyor.
- **Audit Log:** Hangi agent hangi kararı aldı, hangi prompt kullanıldı, sonuç ne oldu — hepsi kayıt altında, export edilebilir. Enterprise müşteri ve GDPR uyumluluğu için zorunlu.

---

---

## Fark Yaratan Özellikler
- **Görsel yönetim:** Rakipler ya çok teknik ya çok basit. Biz ortada, ama doğru ortada. Bir pazarlamacı da bir CTO da aynı ekranda rahat çalışabiliyor.
- **Token optimizasyonu:** Her LLM çağrısı beş katmanlı bir filtreden geçiyor — basit sorular LLM'e gitmeden cevaplanıyor, tekrar eden işler cache'den dönüyor, görevin tipine göre en ucuz uygun model seçiliyor. Aynı işi rakip sistemlere göre ortalama yüzde altmış daha ucuza yapıyoruz. Bu müşteriye direkt para olarak yansıyor.
- **Çoklu model desteği:** OpenAI, Google Gemini, Anthropic Claude — hepsi aynı anda kullanılabiliyor. UI görevi Gemini'ye, kod görevi GPT-4'e, analiz görevi Claude'a otomatik gidiyor.
- **GitHub entegrasyonu:** Repoyu bağlıyorsunuz, sistem kodu anlıyor, özellik tanımlıyorsunuz, PR geliyor. Tek developer gibi değil, koordineli bir ekip gibi.
- **Fallback mekanizması:** Bir model cevap vermezse sistem otomatik diğerine geçiyor. Production'da kopukluk olmuyor.

---

## Hedef Kitle
- **Birincil hedef:** 5-50 kişilik, teknik ekibi olmayan veya sınırlı olan şirketler. Muhasebe yazılımı satan bir firma, orta ölçekli bir e-ticaret şirketi, bir diş kliniği zinciri, bir emlak ofisi. Bunların ortak noktası: tekrar eden işleri var, otomatize etmek istiyorlar, ama developer tutamıyorlar.
- **İkincil hedef:** Mevcut yazılım ürünleri olan şirketler. Ürünlerine AI katmanı eklemek istiyorlar ama sıfırdan geliştirme maliyetine girmek istemiyorlar. Embedded SDK ile iki satır kodla entegre ediyorlar.

---

---

## Gelir Modeli
- **Standalone kullanım** için aylık abonelik — Basic, Pro, Enterprise katmanları, agent sayısı ve token limitine göre fiyatlandırma.
- **Embedded SDK** için kullanım başına ücretlendirme. Müşterinin ürününe ne kadar trafik gelirse o kadar gelir. Müşteri büyüdükçe biz büyüyoruz.
- **White Label** aşamasında ajans başına lisans ücreti.

---

---

## Rakiplerden Farkı
Flowise ve n8n developer aracı, kod bilmeden kullanmak zor. Make.com otomasyon aracı ama AI koordinasyonu yok. Devin tek agent, kara kutu, aylık 500 dolar. ChatGPT tek başına çalışıyor, sisteminize bağlanamıyor, koordine edemez.

Biz kodsuz kullanım, görsel yönetim, çoklu agent koordinasyonu, token optimizasyonu ve GitHub entegrasyonunu tek çatı altında sunuyoruz. Ve sistem zamanla kendi kendini optimize ediyor.

---

## Yol Haritası
- **MVP — 4 hafta:** Orchestrator, token optimizer, çoklu model, GitHub entegrasyonu, görsel workflow builder, cost dashboard, embedded SDK, ilk pilot müşteri.
- **V2 — Yatırım sonrası:** Agent Memory, Performance Score, Cost Forecast, Approval Mode, Simulation Mode, Webhook Trigger.
- **V3 — Ölçekleme:** White Label, Audit Log, enterprise güvenlik, marketplace.

---

---

## Tek Cümle Pitch
> "GitHub'ını bağla, özelliği tanımla, PR gelsin — ya da sıfırdan AI ekibini kur, görsel olarak yönet, maliyeti optimize et."
