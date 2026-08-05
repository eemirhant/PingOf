# Ofis Masa Tenisi Uygulaması — PRD (Product Requirements Document)

> **Versiyon:** 1.1 (açık sorular karara bağlandı)
> **Hedef geliştirici profili:** Stajyer / junior seviye (Cursor AI destekli geliştirme)
> **Teknoloji:** Next.js (App Router) + React + TypeScript, PWA olarak telefona kurulabilir
> **Bu doküman:** Orijinal gereksinim ve kabul kriterleri dokümanının Cursor'da adım adım geliştirme yapılabilecek şekilde yeniden düzenlenmiş, hiçbir detayı atlamayan tam sürümüdür.

---

## 0. Bu PRD'nin Kullanım Amacı

Bu doküman, Cursor içinde çalışan bir AI ajanının (veya stajyer bir geliştiricinin) referans alacağı **tek gerçek kaynak (single source of truth)**tır. Her User Story (US) altında Kabul Kriterleri (KK) bulunur; bir özellik yalnızca **tüm** KK'ları karşılıyorsa "tamamlandı" sayılır. `.cursorrules` dosyası bu PRD ile birlikte kullanılmalıdır; `.cursorrules` genel kodlama standartlarını, bu dosya ise **ne** inşa edileceğini tanımlar.

**Önemli genel kural:** Görev tanımı ne kadar küçük olursa olsun (örn. "skor doğrulama fonksiyonunu yaz"), ilgili KK maddeleri tekrar okunmalı ve implementasyon bunlara birebir uymalıdır. Varsayım yapılacaksa bu PRD'deki "Alınan Kararlar" ve "Kapsam Dışı" bölümleri önceliklidir.

---

## 1. Proje Özeti

Ofis içinde düzenli oynanan masa tenisi maçlarının (1v1 ve 2v2), planlanan maçların, turnuvaların ve oyuncu istatistiklerinin takip edildiği bir web uygulaması. Uygulama mobil tarayıcıdan "ana ekrana ekle" ile uygulama gibi kurulabilir (PWA).

**Temel amaç:** Kim kiminle oynadı, kim kazandı, kim formda — bunun kayıt altına alınması ve herkesin görebilmesi.

---

## 2. Temel Kavramlar (Domain Sözlüğü)

| Terim | Açıklama |
|---|---|
| **Organizasyon (Workspace)** | Bir ofis/ekip. Tüm veriler organizasyon bazlıdır. Farklı organizasyonlar birbirinin verisini göremez. |
| **Oyuncu (Player/User)** | Organizasyona kayıtlı, giriş yapabilen kişi. |
| **Maç (Match)** | 1v1 veya 2v2 formatında, planlanmış veya anlık oynanmış karşılaşma. |
| **Takım (Team)** | 2v2 maçlarda bir maça özel oluşan iki kişilik grup (sabit değil, her maça özel). |
| **Turnuva (Tournament)** | Birden fazla maçtan oluşan, eleme veya lig formatında yapı. |
| **Meydan okuma (Challenge)** | Bir oyuncunun başka bir oyuncuya gönderdiği maç teklifi. |

---

## 3. Roller ve Yetkiler

İki teknik rol vardır: **Owner (Kurucu)** ve **Member (Üye)**. Yetki farkı minimumdur.

| Yetki | Owner | Member |
|---|---|---|
| Maç oluşturma / sonuç girme | ✅ | ✅ |
| Turnuva oluşturma / yönetme | ✅ | ✅ |
| Oyuncu davet etme | ✅ | ✅ |
| Oyuncuyu organizasyondan çıkarma | ✅ | ❌ |
| Organizasyon ayarlarını değiştirme | ✅ | ❌ |
| Davet linkini sıfırlama | ✅ | ❌ |

**Kural:** Organizasyona giren herkes maç/turnuva işlemlerinde eşit yetkilidir. Sadece "yıkıcı" işlemler (üye silme, organizasyon ayarları) kurucuya özeldir. Kurucu bu yetkiyi başka bir üyeye devredebilir.

> ⚠️ **Implementasyon notu:** Rol kontrolü sadece client-side yapılmamalı; her API route'ta sunucu tarafında da `role === 'OWNER'` kontrolü yapılmalıdır (bkz. Bölüm 7.3 Güvenlik).

---

## 4. Fonksiyonel Gereksinimler

Her başlık altında: **US** = User Story, **KK** = Kabul Kriterleri. Tüm KK maddeleri **birebir** uygulanmalıdır; hiçbiri "opsiyonel yorum" olarak değerlendirilmemelidir (aksi belirtilmedikçe).

### 4.1. Kayıt ve Kimlik Doğrulama

**US-1:** Bir kullanıcı e-posta ve şifre ile yeni bir organizasyon oluşturarak kayıt olabilir.

**KK-1:**
- [ ] Kayıt formu: e-posta, şifre, ad-soyad, organizasyon adı alanlarını içerir.
- [ ] E-posta formatı geçersizse form gönderilmez, alan altında hata mesajı çıkar.
- [ ] Şifre en az 8 karakter olmalı; kısa şifrede hata mesajı gösterilir.
- [ ] Aynı e-posta ile ikinci kez kayıt denendiğinde "Bu e-posta zaten kayıtlı" hatası döner.
- [ ] Başarılı kayıt sonrası kullanıcı otomatik giriş yapmış olur ve ana sayfaya yönlendirilir.
- [ ] Şifreler veritabanında düz metin olarak tutulmaz (bcrypt/argon2 ile hashlenir).

**US-2:** Kayıtlı bir oyuncu e-posta ve şifresi ile giriş yapabilir.

**KK-2:**
- [ ] Hatalı e-posta veya şifrede genel bir hata mesajı gösterilir ("E-posta veya şifre hatalı") — hangisinin yanlış olduğu belirtilmez (kullanıcı enumeration önlemi).
- [ ] Başarılı girişte oturum açılır ve oturum sayfa yenilendiğinde kaybolmaz.
- [ ] Giriş yapmamış bir kullanıcı korumalı sayfalara (`/dashboard`, `/matches` vb.) erişmeye çalışırsa login sayfasına yönlendirilir.
- [ ] "Çıkış yap" butonu oturumu sonlandırır.

**US-3:** Kullanıcı şifresini unuttuğunda sıfırlayabilir.

**KK-3:**
- [ ] "Şifremi unuttum" akışı e-posta adresine tek kullanımlık, süreli (örn. 1 saat) bir link gönderir.
- [ ] Link ile açılan sayfada yeni şifre belirlenebilir.
- [ ] Kullanılan link ikinci kez çalışmaz.

### 4.2. Oyuncu Ekleme ve Davet

**US-4:** Bir üye, yeni bir oyuncuyu e-posta + şifre belirleyerek doğrudan organizasyona ekleyebilir.

**KK-4:**
- [ ] Form: ad-soyad, e-posta, geçici şifre alanlarını içerir.
- [ ] Eklenen oyuncu bu bilgilerle giriş yapabilir.
- [ ] İlk girişte kullanıcıdan şifresini değiştirmesi istenir (zorunlu değil, ama önerilir — v1'de opsiyonel).
- [ ] Aynı organizasyonda aynı e-posta iki kez eklenemez.

**US-5:** Bir üye, davet (referans) linki paylaşarak yeni oyuncuların kendi kendine kayıt olmasını sağlayabilir.

**KK-5:**
- [ ] Organizasyon ayarları sayfasında kopyalanabilir bir davet linki bulunur (örn. `/join/AbC123xY`).
- [ ] Link ile gelen kullanıcı ad-soyad, e-posta, şifre girerek doğrudan o organizasyona üye olur.
- [ ] Kayıt sonrası kullanıcı otomatik giriş yapar.
- [ ] Kurucu, davet linkini yenileyebilir; eski link geçersiz olur ve açıldığında "Bu davet geçersiz" mesajı gösterilir.
- [ ] Davet linki ile gelen kullanıcı **Member** rolüyle eklenir.

**US-6:** Kullanıcı kendi profilini düzenleyebilir.

**KK-6:**
- [ ] Ad-soyad, profil fotoğrafı (veya baş harflerden oluşan avatar) ve şifre değiştirilebilir.
- [ ] E-posta değişikliği v1 kapsamı dışındadır.

### 4.3. Anlık Maç Girişi

**US-7:** Maçta oynayan bir oyuncu, az önce oynanmış maçı sisteme girebilir.

**KK-7 — Katılımcı seçimi:**
- [ ] Format seçilebilir: 1v1 veya 2v2.
- [ ] 1v1'de iki oyuncu, 2v2'de dört oyuncu (2 takım × 2 kişi) seçilir.
- [ ] Aynı oyuncu bir maçta iki kez seçilemez; seçilen oyuncu diğer listelerde pasif hale gelir (disabled).
- [ ] Maçı giren kişi, maçın taraflarından biri olmak zorundadır. Formda kendi adı otomatik seçili gelir ve **kaldırılamaz**.
- [ ] Bir kullanıcı, içinde yer almadığı bir maçı sisteme giremez (**sunucu tarafında da doğrulanır** — bu kritik bir güvenlik kuralıdır).
- [ ] 2v2'de takımlar her maç için serbestçe kurulur; sabit/kayıtlı takım kavramı **yoktur**.

**KK-7b — Skor girişi (5 sette 3 kuralı):**
- [ ] Maç 5 setin 3'ünü alan tarafın galibiyetiyle biter. Geçerli maç skorları: **3-0, 3-1, 3-2**.
- [ ] Her set için iki tarafın sayısı ayrı ayrı girilir (örn. Set 1: 11-7, Set 2: 9-11 …).
- [ ] Bir set 11 sayıya ve en az 2 sayı farkla kazanılır. 10-10 sonrası (deuce) 13-11, 15-13 gibi skorlar geçerlidir.
- [ ] Geçersiz set skorları kabul edilmez ve alan altında hata gösterilir:
  - Kazananın sayısı 11'den küçükse → geçersiz
  - Skor farkı 1 veya 0 ise → geçersiz
  - Kazanan 11'den fazla sayı aldıysa ve fark tam 2 değilse (örn. 13-9) → geçersiz
  - Negatif veya boş sayı → geçersiz
- [ ] Set sayısı 3, 4 veya 5 olabilir. Bir taraf 3 set aldıktan sonra ek set girilemez (form yeni set alanı açmaz).
- [ ] En az 3 set girilmeden maç kaydedilemez.
- [ ] Kazanan taraf set skoruna göre **otomatik** belirlenir; kullanıcı ayrıca "kazanan" seçmez.
- [ ] Form, girilen setlere göre anlık olarak "2-1 önde" gibi bir özet gösterir.
- [ ] Kayıt sonrası maç "Tamamlandı" durumunda listeye düşer ve istatistiklere anında yansır.
- [ ] **Not (v1 kapsam dışı):** Bazı maçlar tek set oynanıyorsa, ileride "hızlı maç (tek set)" seçeneği eklenebilir — v1'de kapsam dışı.

> 🔴 **Kritik:** Set skoru doğrulama mantığı (11 sayı / 2 fark / 3 set kuralı), projenin en kritik iş mantığıdır. Saf bir fonksiyon (`validateSetScore`, `determineMatchWinner` gibi) olarak yazılmalı ve **birim testleriyle** korunmalıdır (bkz. Bölüm 8 Teknik Beklentiler ve Bölüm 9 Faz Planı).

**US-8:** Maç sonucu yanlış girilirse düzeltilebilir.

**KK-8:**
- [ ] Sadece maçı **oluşturan kişi** maçı düzenleyebilir veya silebilir. Organizasyon **kurucusu** da (temizlik amacıyla, örn. maçı giren kişi ofisten ayrıldıysa) bu yetkiye sahiptir.
- [ ] Maçta oynayan ama maçı girmemiş diğer oyuncular için düzenle/sil butonları görünmez; API isteği de **403** döner.
- [ ] Silme işlemi onay diyaloğu ister.
- [ ] Düzenleme sonrası istatistikler yeniden hesaplanır; silinen maç istatistiklerden düşer.
- [ ] Maç detayında "düzenlendi" bilgisi görünür (kim, ne zaman).
- [ ] Süre sınırı yoktur — maç ne zaman girilmiş olursa olsun oluşturan kişi düzeltebilir.
- [ ] **Karar:** Ayrı bir onay/itiraz mekanizması yapılmayacaktır. Sonucu maçın taraflarından biri girer, anında geçerli olur. Yanlışlık olursa maçı giren kişi düzeltir. Diğer oyunculara "maçın sonucu girildi" bildirimi gitmesi (bkz. 4.7) şeffaflık için yeterlidir.

### 4.4. Maç Planlama (İleri Tarihli)

**US-10:** Bir oyuncu ileri bir tarih/saat için maç planlayabilir.

**KK-10:**
- [ ] Tarih ve saat seçilebilir; geçmiş bir tarih seçilemez.
- [ ] Format (1v1 / 2v2) ve katılımcılar seçilir.
- [ ] Katılımcı slotları boş bırakılabilir ("Açık maç" — sonradan biri katılabilir).
- [ ] Planlanan maç "Planlandı" durumunda listelenir.
- [ ] Maç saati geldiğinde durum otomatik "Oynanmayı bekliyor" olur.
- [ ] Planlanan maç iptal edilebilir; katılımcılara bildirim gider.
- [ ] Planlanan bir maçın sonucu girildiğinde durum "Tamamlandı" olur.

**Maç durumları (state machine):**

```
PLANLANDI → OYNANMAYI_BEKLIYOR → TAMAMLANDI
     ↓               ↓
    IPTAL           IPTAL
```

> 💡 Bu state machine `Match.status` alanı (`PLANNED | PENDING | COMPLETED | CANCELLED`) üzerinden yönetilmelidir. `PLANNED → PENDING` geçişi bir cron/scheduled job veya sayfa yüklendiğinde tarih kontrolüyle tetiklenebilir (v1'de basit bir "şu anki zaman > scheduledAt ise PENDING göster" mantığı yeterlidir, ayrı bir job sistemi zorunlu değildir).

### 4.5. Meydan Okuma (Maç Teklifi)

**US-11:** Bir oyuncu başka bir oyuncuya maç teklifi gönderebilir.

**KK-11:**
- [ ] Oyuncu profilinden veya oyuncu listesinden "Meydan oku" butonuyla teklif gönderilir.
- [ ] Teklifte opsiyonel tarih/saat ve not alanı bulunur.
- [ ] Teklif gönderilen oyuncuya bildirim gider.
- [ ] Teklif alan oyuncu kabul veya reddedebilir.
- [ ] Kabul edilirse otomatik olarak "Planlandı" durumunda bir maç oluşur ve organizasyondaki herkese bildirim gider.
- [ ] Reddedilirse teklif eden kişiye bildirim gider.
- [ ] 7 gün yanıtlanmayan teklif otomatik olarak süresi dolmuş sayılır (`status = EXPIRED`).
- [ ] **2v2 teklifi v1 kapsamı dışındadır (v2).** Sadece 1v1 meydan okuma yapılır.

### 4.6. Turnuva

**US-12:** Bir oyuncu turnuva oluşturabilir.

**KK-12:**
- [ ] Turnuva adı, format (1v1 / 2v2), turnuva tipi (**Tek eleme** veya **Lig / herkes herkesle**) ve başlangıç tarihi girilir.
- [ ] Katılımcılar organizasyon üyeleri arasından seçilir.
- [ ] Tek eleme: katılımcı sayısı 2'nin katı değilse eksik slotlara otomatik **"BAY"** atanır.
- [ ] Eşleşmeler otomatik oluşturulur (isteğe bağlı: rastgele karıştırma butonu).
- [ ] Turnuva bracket'i (eşleşme ağacı) görsel olarak listelenir — **v1'de basit liste yeterli, grafik bracket v2**.
- [ ] Turnuva maçları da normal maçlarla aynı skor formatını kullanır (5 sette 3) ve sonucu maçın taraflarından biri girer.
- [ ] Bir maçın sonucu girildiğinde kazanan otomatik bir sonraki tura ilerler.
- [ ] Lig formatında puan tablosu gösterilir (Galibiyet: 3 puan, Mağlubiyet: 0 puan — ayarlanabilir olması gerekmez, sabit değer olarak kodlanabilir).
- [ ] Son maç tamamlandığında turnuva "Tamamlandı" olur ve şampiyon ilan edilir; herkese bildirim gider.
- [ ] Turnuva maçları oyuncu istatistiklerine dahil edilir ve profil geçmişinde "Turnuva maçı" etiketiyle görünür.

**Turnuva durumları:** `TASLAK → DEVAM_EDIYOR → TAMAMLANDI` (+ `IPTAL`)

### 4.7. Bildirimler

**US-13:** Kullanıcı, kendisini ilgilendiren olaylardan haberdar olur.

**KK-13:**
- [ ] Uygulama içinde bir bildirim ikonu ve okunmamış sayacı bulunur.
- [ ] Bildirim listesi tarihe göre sıralanır; okundu/okunmadı ayrımı yapılır.
- [ ] "Tümünü okundu işaretle" butonu bulunur.
- [ ] Bildirime tıklanınca ilgili sayfaya yönlendirilir (maç detayı, turnuva vb. → `linkUrl`).

**Bildirim tetikleyicileri (tam liste — hiçbiri atlanmamalı):**

| Olay | Kime gider |
|---|---|
| Yeni maç oluşturuldu (anlık veya planlı) | Organizasyondaki herkes |
| Sana maç teklifi geldi | İlgili oyuncu |
| Teklifin kabul/reddedildi | Teklifi gönderen |
| Oynadığın maçın sonucu girildi | Maçtaki diğer oyuncular |
| Planlanan maç iptal edildi | Maçtaki oyuncular |
| Turnuva başladı / turnuvaya eklendin | Katılımcılar + herkes |
| Turnuvada sıradaki maçın hazır | İlgili oyuncular |
| Turnuva tamamlandı | Organizasyondaki herkes |
| Organizasyona yeni oyuncu katıldı | Organizasyondaki herkes |

- **v1:** Uygulama içi bildirim yeterlidir (sayfa yenilendiğinde/periyodik olarak güncellenir — polling kabul edilebilir).
- **v2 (kapsam dışı):** Web Push (Service Worker) ile telefona anlık bildirim.

### 4.8. Oyuncu Profili ve İstatistikler

**US-14:** Her oyuncunun kendi ve diğerlerinin istatistiklerini görebileceği bir profil sayfası vardır.

**KK-14 — Profilde gösterilmesi zorunlu bilgiler:**
- [ ] Ad-soyad, avatar, katılım tarihi
- [ ] Toplam: oynanan maç, galibiyet, mağlubiyet, galibiyet yüzdesi
- [ ] 1v1 kırılımı: oynanan / galibiyet / mağlubiyet / kazanma yüzdesi
- [ ] 2v2 kırılımı: oynanan / galibiyet / mağlubiyet / kazanma yüzdesi
- [ ] Set istatistiği: kazanılan set, kaybedilen set, set averajı (kazanılan − kaybedilen)
- [ ] Sayı istatistiği: atılan toplam sayı, yenilen toplam sayı, sayı averajı
- [ ] Son 5 maç formu (örn. G G M G M şeklinde renkli rozetler)
- [ ] Mevcut galibiyet/mağlubiyet serisi
- [ ] Sıralamada kaçıncı olduğu
- [ ] Geçmiş maçlar listesi: tarih, format, rakip(ler), takım arkadaşı (2v2'de), set skoru (örn. 3-1), sonuç (G/M). Sayfalama veya "daha fazla yükle" ile en az **20'şerlik gruplar** halinde.
- [ ] Listede bir maça tıklanınca set set detay skorları açılır (örn. 11-7, 9-11, 11-5, 12-10).
- [ ] Geçmiş maç listesi format (1v1 / 2v2) ve tarih aralığına göre **filtrelenebilir**.
- [ ] En çok oynadığı rakip ve o rakiple olan skor (örn. "Ahmet'e karşı 7G-3M") — head-to-head.
- [ ] 2v2'de en çok kazandığı takım arkadaşı.

### 4.9. Liderlik Tablosu (Leaderboard)

**US-15:** Organizasyondaki oyuncular bir sıralama tablosunda görülür.

**KK-15:**
- [ ] Tablo kolonları: sıra, oyuncu, oynanan (O), galibiyet (G), mağlubiyet (M), kazanma %, set averajı (SAV), sayı averajı (SYAV).
- [ ] Sekmeler: **Genel / 1v1 / 2v2**. Her sekme kendi verisiyle sıralanır.
- [ ] Tablo tüm zamanları kapsar. **Sezon, aylık sıfırlama veya tarih filtresi yoktur.**
- [ ] Giriş yapan kullanıcının satırı tabloda vurgulanır.
- [ ] İlk 3 sıraya görsel bir vurgu (madalya/renk) eklenir.
- [ ] Oyuncu adına tıklanınca profil sayfasına gidilir.

**Sıralama kuralı (Elo yok — basit sıralama), sırasıyla:**
1. Galibiyet sayısı (çoktan aza)
2. Eşitlik varsa → kazanma yüzdesi
3. Eşitlik varsa → set averajı (kazanılan set − kaybedilen set)
4. Eşitlik varsa → sayı averajı (atılan sayı − yenilen sayı)
5. Eşitlik varsa → alfabetik

- [ ] **Minimum maç barajı:** 3 maçtan az oynayan oyuncular ana sıralamaya girmez; tablonun altında ayrı bir **"Henüz sıralanmadı"** bölümünde listelenir.
- [ ] Sıralama hesaplaması **sunucu tarafında** yapılır ve her maç kaydında güncel veriden hesaplanır (önceden hesaplanmış/cache'lenmiş bir "rating" alanına güvenilmez).

> 📝 **Not:** Elo/derecelendirme sistemi bilinçli olarak kapsam dışında bırakılmıştır. İleride istenirse eklenebilir; bunun için `Match` ve `MatchSet` verisinin tarih sıralı olarak saklanıyor olması yeterlidir (mevcut veri modeli buna uygundur — bu yüzden veri modelini değiştirmeden bu genişlemeye izin verecek şekilde tasarlayın).

### 4.10. İddia / Bahis Notu (Opsiyonel — v2)

**US-16:** Bir maça iddia (kahve, yemek vb.) eklenebilir.

**KK-16:**
- [ ] Maç oluştururken serbest metin bir "iddia" alanı doldurulabilir (örn. "Kaybeden kahve ısmarlar").
- [ ] İddia maç detayında ve maç kartında görünür.
- [ ] Maç bittiğinde iddia "ödendi / ödenmedi" olarak işaretlenebilir.
- [ ] Profilde "ödenmemiş iddialar" listesi görülebilir.
- [ ] **Para bahsi ile ilgili herhangi bir ödeme/finansal entegrasyon kapsam dışıdır.** Bu alan tamamen bilgilendirme amaçlı serbest metindir.

> Bu özellik v2'dir ama veri modelinde `stakeNote` alanı v1'den itibaren mevcuttur (bkz. Bölüm 5) — sadece UI/akış v2'de açılır.

### 4.11. Ana Sayfa (Dashboard)

**KK-17:**
- [ ] Yaklaşan maçlarım (tarih sıralı)
- [ ] Son oynanan 5 maç
- [ ] Liderlik tablosunun ilk 5'i
- [ ] Aktif turnuva varsa özet kartı
- [ ] Hızlı aksiyon butonları: **"Maç Ekle"**, **"Maç Planla"**, **"Meydan Oku"**
- [ ] Kişisel özet: benim rekorum, formum, sıram

---

## 5. Veri Modeli (Prisma Şeması Referansı)

Aşağıdaki model doğrudan Prisma şemasına çevrilebilir. Alan adları ve ilişkiler **birebir korunmalıdır**; ek alan eklenebilir ama zorunlu alanlar çıkarılamaz.

```
Organization
  id, name, inviteCode, ownerId, createdAt

User
  id, organizationId, email, passwordHash, fullName,
  avatarUrl, role (OWNER | MEMBER), createdAt

Match
  id, organizationId, format (SINGLES | DOUBLES),
  status (PLANNED | PENDING | COMPLETED | CANCELLED),
  scheduledAt, playedAt,
  createdById,          // maçı sisteme giren kişi — düzenleme/silme yetkisi bunda
  resultEnteredById,    // sonucu giren kişi (maçın taraflarından biri olmak zorunda)
  tournamentId (nullable), stakeNote (nullable),
  team1SetsWon, team2SetsWon,  // 3-1 gibi set skoru; hesaplanıp saklanır
  winnerTeam (1 | 2 | null),
  team1Name (nullable), // 2v2 opsiyonel görüntü adı — istatistikleri etkilemez
  team2Name (nullable),
  updatedAt

MatchParticipant
  id, matchId, userId, team (1 | 2)

MatchSet
  id, matchId, setNumber (1..5), team1Score, team2Score
  // Tamamlanmış her maçta 3, 4 veya 5 kayıt bulunur.
  // Kazanan taraf bu kayıtlardan hesaplanır — kullanıcı manuel seçmez.

Tournament
  id, organizationId, name, type (KNOCKOUT | ROUND_ROBIN),
  format (SINGLES | DOUBLES), status, createdById, startsAt

TournamentParticipant
  id, tournamentId, userId

Challenge
  id, organizationId, fromUserId, toUserId,
  proposedAt, note, status (PENDING | ACCEPTED | DECLINED | EXPIRED)

Notification
  id, userId, type, title, body, linkUrl, isRead, createdAt
```

**🔴 Kritik kural:** Her sorgu `organizationId` ile filtrelenmelidir. Bir kullanıcı başka organizasyonun verisine hiçbir şekilde erişememelidir. Bu, kabul testlerinde ayrıca kontrol edilecektir. (Cursor için: her Prisma `findMany`/`findUnique`/`update`/`delete` çağrısında `where` içine `organizationId` eklenmeli; middleware veya repository katmanında bu kontrolü merkezi hale getirmek tercih edilir.)

---

## 6. Ekran Listesi

| # | Ekran | Rota |
|---|---|---|
| 1 | Giriş | `/login` |
| 2 | Kayıt (yeni organizasyon) | `/register` |
| 3 | Davet ile katıl | `/join/[code]` |
| 4 | Şifre sıfırlama | `/forgot-password`, `/reset-password/[token]` |
| 5 | Ana sayfa | `/` |
| 6 | Maç listesi | `/matches` |
| 7 | Maç detayı | `/matches/[id]` |
| 8 | Maç oluştur / planla | `/matches/new` |
| 9 | Oyuncular | `/players` |
| 10 | Oyuncu profili | `/players/[id]` |
| 11 | Liderlik tablosu | `/leaderboard` |
| 12 | Turnuvalar | `/tournaments` |
| 13 | Turnuva detayı | `/tournaments/[id]` |
| 14 | Bildirimler | `/notifications` |
| 15 | Ayarlar / Organizasyon | `/settings` |

---

## 7. Fonksiyonel Olmayan Gereksinimler

### 7.1. Mobil ve PWA
- [ ] Tüm ekranlar 375px genişlikten itibaren düzgün çalışır (**mobile-first**).
- [ ] `manifest.json` ve service worker mevcuttur; iOS ve Android'de "Ana ekrana ekle" ile kurulabilir.
- [ ] Uygulama ikonu, splash screen ve tema rengi tanımlıdır.
- [ ] İnternet yokken en azından "bağlantı yok" ekranı gösterilir (tam offline destek beklenmiyor).
- [ ] Dokunma hedefleri en az **44×44px**.

### 7.2. Performans
- [ ] Ana sayfa ilk yüklenme (3G benzeri koşulda) **3 saniyenin altında**.
- [ ] Liste sayfalarında sayfalama veya sonsuz kaydırma kullanılır; **100+ kayıt tek seferde çekilmez**.
- [ ] Lighthouse Performance ve Accessibility skorları **en az 80**.

### 7.3. Güvenlik
- [ ] Şifreler hashlenir (bcrypt / argon2).
- [ ] Tüm API uçları oturum kontrolü yapar; yetkisiz istek **401** döner.
- [ ] Organizasyon izolasyonu her sorguda uygulanır (bkz. Bölüm 5).
- [ ] Kullanıcı girdileri sunucu tarafında da doğrulanır (sadece client-side validation yetersizdir).
- [ ] Hassas bilgiler (`.env`) repoya commit edilmez.

### 7.4. Kullanılabilirlik
- [ ] Tüm formlarda yükleniyor durumu, hata mesajı ve başarı geri bildirimi vardır.
- [ ] Yıkıcı işlemler (maç silme, üye çıkarma) onay diyaloğu ister.
- [ ] Boş durumlar (henüz maç yok, henüz turnuva yok) anlamlı bir mesaj ve aksiyon butonu gösterir.
- [ ] Tarih/saatler kullanıcının yerel saat diliminde gösterilir.
- [ ] **Arayüz dili Türkçe.**

---

## 8. Teknik Beklentiler

| Konu | Beklenti |
|---|---|
| Framework | Next.js (App Router) + React + TypeScript |
| Stil | Tailwind CSS (veya ekip tercihi) |
| Veritabanı | PostgreSQL + Prisma ORM (öneri) |
| Kimlik doğrulama | Auth.js (NextAuth) credentials provider veya kendi JWT/session çözümü |
| Form yönetimi | react-hook-form + zod (client & server validation aynı şemayı paylaşsın) |
| Deploy | Vercel + yönetilen Postgres (Neon / Supabase) |
| Kod kalitesi | ESLint + Prettier, TypeScript `strict: true` |
| Versiyon kontrol | Git, main korumalı, feature branch + PR ile geliştirme |

**Stajyer için ek beklentiler:**
- [ ] `README.md` içinde kurulum adımları (`.env.example` dahil) yazılı olur.
- [ ] Commit mesajları anlamlıdır (örn. Conventional Commits).
- [ ] En az kritik iş mantığı (kazanan belirleme, set skoru doğrulama, sıralama hesabı, bracket ilerletme) için **birim testleri** yazılır.

---

## 9. Faz Planı (Geliştirme Sırası)

Cursor'da geliştirme yapılırken **her faz sırayla tamamlanmalı**, bir sonraki faza geçilmemelidir. Her fazın sonunda çalışan ve deploy edilmiş bir sürüm olmalıdır.

### Faz 1 — MVP (temel iskelet)
- Kayıt/giriş (US-1, US-2, US-3)
- Davet linki (US-5)
- Oyuncu ekleme (US-4)
- Anlık 1v1 ve 2v2 maç girişi (US-7, 5 sette 3 formatı ve set skoru doğrulaması dahil)
- Maç listesi
- Profil istatistikleri (US-14)
- Liderlik tablosu (US-15)

> 🔴 Set skoru doğrulama mantığı (11 sayı / 2 fark / 3 set kuralı) bu fazın en kritik parçasıdır ve birim testleriyle korunmalıdır.

### Faz 2 — Etkileşim
- Maç planlama (US-10)
- Meydan okuma akışı (US-11)
- Uygulama içi bildirimler (US-13)
- Maç düzenleme/silme (US-8)
- Dashboard (US-14.11 / KK-17)

### Faz 3 — Turnuva
- Tek eleme ve lig turnuvaları (US-12)
- Bracket görünümü (basit liste, v1)
- Turnuva istatistikleri

### Faz 4 — Cila
- PWA kurulumu (7.1)
- Head-to-head istatistikler
- Set/sayı averajı detayları
- Web push bildirim (v2)
- İddia alanı (US-16, v2)

---

## 10. Definition of Done (Bir iş "bitti" sayılmak için)

- [ ] Kabul kriterlerinin tamamı sağlanıyor.
- [ ] Mobil ve masaüstünde test edildi.
- [ ] Hata durumları (boş veri, ağ hatası, yetkisiz erişim) ele alındı.
- [ ] Kod PR olarak açıldı ve en az bir kişi tarafından gözden geçirildi.
- [ ] Lint ve build hatasız geçiyor.
- [ ] Staging ortamına deploy edildi ve manuel olarak doğrulandı.

---

## 11. Kapsam Dışı (v1) — Bunları Yapmayın

Aşağıdaki maddeler **bilinçli olarak** v1 kapsamı dışında bırakılmıştır. Cursor bu maddelerle ilgili herhangi bir kod/özellik üretmemeli, önerilmemeli veya "gelecekte kolay olur" diye önceden altyapı kurmamalıdır (veri modelinde zaten genişlemeye izin veren alanlar mevcuttur, bu yeterlidir):

- Elo / derecelendirme puanı (basit sıralama tercih edildi)
- Sezon / dönemsel sıralama (tek ve tüm zamanları kapsayan tablo tercih edildi)
- Maç sonucu onay-itiraz mekanizması (sonucu maçın tarafı girer, anında geçerlidir)
- Sabit/kayıtlı 2v2 takımları (takımlar her maç yeniden kurulur)
- Gerçek para / ödeme entegrasyonu
- Çoklu dil desteği
- Native mobil uygulama (App Store / Play Store)
- Maç videosu / fotoğraf yükleme
- Slack / Teams entegrasyonu
- Birden fazla spor dalı desteği
- Detaylı analitik grafikler
- Tek set "hızlı maç" tipi
- 2v2 meydan okuma
- Web Push bildirimleri (v1'de sadece uygulama içi bildirim)
- Grafik/görsel turnuva bracket'i (v1'de basit liste yeterli)

---

## 12. Alınan Kararlar (Referans)

| # | Konu | Karar |
|---|---|---|
| 1 | Sonuç girişi | Sonucu maçın taraflarından biri girer. Ayrı onay/itiraz mekanizması yoktur. |
| 2 | Skor formatı | 5 sette 3 set alan kazanır. Her set 11 sayı, en az 2 fark. Geçerli maç skorları: 3-0, 3-1, 3-2. |
| 3 | 2v2 takımları | Takımlar her maç yeniden kurulur. Sabit/kayıtlı takım kavramı yoktur. |
| 4 | Silme yetkisi | Maçı oluşturan kişi (+ organizasyon kurucusu) düzenleyebilir ve silebilir. |
| 5 | Sıralama periyodu | Tüm zamanlar, tek tablo. Sezon veya dönemsel sıfırlama yoktur. |
| 6 | Puanlama | Elo yok. Sıralama: galibiyet → kazanma % → set averajı → sayı averajı. |

**Sonraki turda netleşmesi gerekenler (geliştirmeyi bloke etmez, karar verilene kadar mevcut varsayımlarla devam edilir):**
1. Tek set "hızlı maç": Ofiste bazen tek set oynanıyorsa, ileride ayrı bir maç tipi gerekebilir. Şimdilik tüm maçlar 5'te 3 varsayılıyor.
2. Minimum maç barajı: Liderlik tablosu için 3 maç barajı önerildi; bu sayı sabit kod (`MIN_MATCHES_FOR_RANKING = 3`) yerine kolayca değiştirilebilir bir konfigürasyon değeri olarak tutulmalıdır.
3. Lig turnuvasında puanlama: Galibiyet 3 / mağlubiyet 0 varsayıldı. Set farkının puana etkisi olması istenirse ayrıca belirtilmelidir.

---

## 13. Cursor için Görev Kırılımı Önerisi (Uygulama Sırası)

AI ajanının büyük bir görevi tek seferde yapmaya çalışmaması, aşağıdaki sırayla küçük PR'lar halinde ilerlemesi önerilir:

1. Proje iskeleti: Next.js + TypeScript + Tailwind + Prisma kurulumu, `.env.example`, `README.md`
2. Prisma şeması (Bölüm 5) ve ilk migration
3. Auth.js kurulumu + kayıt/giriş/çıkış (US-1, US-2)
4. Şifre sıfırlama akışı (US-3)
5. Organizasyon davet linki + join akışı (US-5)
6. Oyuncu doğrudan ekleme (US-4)
7. Profil düzenleme (US-6)
8. **Set skoru doğrulama fonksiyonu + birim testleri** (KK-7b çekirdek mantık, UI'dan bağımsız yazılmalı)
9. Anlık maç girişi formu ve API (US-7, KK-7)
10. Maç listesi ve maç detay sayfası
11. Maç düzenleme/silme + yetki kontrolü (US-8)
12. Profil istatistik hesaplama servisi + profil sayfası (US-14)
13. Liderlik tablosu hesaplama servisi + sayfa (US-15)
14. Dashboard (KK-17)
15. Maç planlama (US-10) + state machine
16. Meydan okuma (US-11)
17. Bildirim sistemi (US-13) — tüm tetikleyiciler tablo halinde Bölüm 4.7'de listelenmiştir, hiçbiri atlanmamalı
18. Turnuva oluşturma, bracket/eşleşme mantığı, lig puan tablosu (US-12)
19. PWA: manifest.json, service worker, ikonlar (7.1)
20. İddia alanı (US-16, v2 — sadece Faz 4'te)

---

## 14. Ekli Orijinal Doküman

Bu PRD, kullanıcı tarafından sağlanan `masa-tenisi-app-gereksinimler.md` (PDF) dosyasının tam ve yeniden düzenlenmiş halidir. Orijinal dokümandaki hiçbir US, KK, veri modeli alanı, ekran, teknik beklenti veya kapsam dışı madde atlanmamıştır. Şüpheye düşülen her durumda bu PRD ile orijinal doküman çelişmemelidir; PRD orijinalin biçimsel olarak Cursor'a uygun hale getirilmiş halidir.