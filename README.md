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
