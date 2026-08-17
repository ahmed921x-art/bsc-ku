// BSC KU — الهيئة الأكاديمية لقسم العلوم البيولوجية
// المصدر: كشف الهيئة الأكاديمية الرسمي للقسم.
// هذي نسخة احتياطية تُعرض في advisors.html إذا كانت مجموعة `faculty` في
// Firestore فاضية — والتعديل الفعلي يصير من لوحة الأدمن (قسم "الهيئة الأكاديمية").

export const FACULTY_GROUPS = [
  { key: 'plant',     ar: 'بيولوجيا النبات',    en: 'Plant Biology',            icon: '🌱', c: '#CEF516', bg: 'rgba(206,245,22,.14)',  bd: 'rgba(206,245,22,.35)'  },
  { key: 'animal',    ar: 'بيولوجيا الحيوان',   en: 'Animal Biology',           icon: '🐾', c: '#9FE0F2', bg: 'rgba(159,224,242,.14)', bd: 'rgba(159,224,242,.35)' },
  { key: 'micro',     ar: 'الميكروبيولوجي',     en: 'Microbiology',             icon: '🦠', c: '#ef4444', bg: 'rgba(239,68,68,.14)',   bd: 'rgba(239,68,68,.35)'   },
  { key: 'molecular', ar: 'البيولوجيا الجزيئية', en: 'Molecular Biology',        icon: '🧬', c: '#FBE39B', bg: 'rgba(251,227,155,.14)', bd: 'rgba(251,227,155,.35)' },
  { key: 'biochem',   ar: 'الكيمياء الحيوية',   en: 'Biochemistry',             icon: '⚗️', c: '#E6A6F8', bg: 'rgba(230,166,248,.14)', bd: 'rgba(230,166,248,.35)' },
  { key: 'agri',      ar: 'مساند نبات زراعي',   en: 'Agricultural Plant (Minor)', icon: '🌾', c: '#34d399', bg: 'rgba(52,211,153,.14)',  bd: 'rgba(52,211,153,.35)'  },
  { key: 'forensic',  ar: 'مساند أدلة جنائية',  en: 'Forensic Science (Minor)', icon: '🔎', c: '#fb923c', bg: 'rgba(251,146,60,.14)',  bd: 'rgba(251,146,60,.35)'  },
  { key: 'biotech',   ar: 'مساند تقنية حيوية',  en: 'Biotechnology (Minor)',    icon: '🧪', c: '#22d3ee', bg: 'rgba(34,211,238,.14)',  bd: 'rgba(34,211,238,.35)'  },
  { key: 'admin',     ar: 'سكرتارية القسم',     en: 'Department Secretariat',   icon: '📋', c: '#a5b4fc', bg: 'rgba(165,180,252,.14)', bd: 'rgba(165,180,252,.35)' },
];

export const FACULTY_RANKS = {
  prof:  { ar: 'أستاذ (بروفيسور)', en: 'Professor' },
  assoc: { ar: 'أستاذ مشارك',      en: 'Associate Professor' },
  asst:  { ar: 'أستاذ مساعد',      en: 'Assistant Professor' },
  ta:    { ar: 'معيد',             en: 'Teaching Assistant' },
  sec:   { ar: 'سكرتيرة القسم',    en: 'Department Secretary' },
};

export const FACULTY_SEED = [
  // ── بيولوجيا النبات ────────────────────────────────────────
  { group:'plant', order:1,  nameAr:'د. أحلام بوعركي',   nameEn:'Ahlam Bouariky',      rank:'asst',  email:'ahlam.bouariky@ku.edu.kw',      roleAr:'مرشد أكاديمي · منسق جدول التخصص', roleEn:'Academic Advisor · Schedule Coordinator' },
  { group:'plant', order:2,  nameAr:'د. جاسر الجاسر',    nameEn:'Jaser Al-Jaser',      rank:'asst',  email:'jaser.aljaser@ku.edu.kw' },
  { group:'plant', order:3,  nameAr:'د. محمد مراد',      nameEn:'Mohammed Morad',      rank:'asst',  email:'mohammed.morad@ku.edu.kw' },
  { group:'plant', order:4,  nameAr:'د. أمينة رضا',      nameEn:'Amena Redha',         rank:'assoc', email:'a.redha@ku.edu.kw' },
  { group:'plant', order:5,  nameAr:'د. ضياء البدر',     nameEn:'Dhia Albader',        rank:'assoc', email:'dhiyaa.albader@ku.edu.kw' },
  { group:'plant', order:6,  nameAr:'د. عائشة الشطي',    nameEn:'Aisha Al-Shatti',     rank:'asst',  email:'aisha.alshatti@ku.edu.kw' },
  { group:'plant', order:7,  nameAr:'د. سعاد المزروعي',  nameEn:'Suad Al-Mazrooei',    rank:'asst',  email:'s.almazrooei@ku.edu.kw' },
  { group:'plant', order:8,  nameAr:'د. نعيمة المنصور',  nameEn:'Naeamah Almansour',   rank:'asst',  email:'naeamah.almansour@ku.edu.kw' },
  { group:'plant', order:9,  nameAr:'د. غانم عبادي',     nameEn:'Ghanim Abbadi',       rank:'assoc', email:'ghanim.abbadi@ku.edu.kw' },
  { group:'plant', order:10, nameAr:'د. موضي الدوسري',   nameEn:'Mody Al-Dosary',      rank:'ta',    email:'mody.aldosary@ku.edu.kw',       roleAr:'حاصلة على الدكتوراة', roleEn:'PhD holder' },
  { group:'plant', order:11, nameAr:'أ. فاطمة الخرينج',  nameEn:'Fatemah Al-Kherainej',rank:'ta',    email:'fatemah.alkherainej@ku.edu.kw' },
  { group:'plant', order:12, nameAr:'أ. كافيثا بيتر',    nameEn:'Kavitha Peter',       rank:'ta',    email:'kavitha.peter@ku.edu.kw' },
  { group:'plant', order:13, nameAr:'أ. آلاء بوهندي',    nameEn:'Alaa Buhendi',        rank:'ta',    email:'alaa.buhendi@ku.edu.kw' },
  { group:'plant', order:14, nameAr:'أ. فاطمة أحمد',     nameEn:'Fatemah Ahmad',       rank:'ta',    email:'fatemah.ahmad@ku.edu.kw' },

  // ── بيولوجيا الحيوان ──────────────────────────────────────
  { group:'animal', order:1,  nameAr:'د. أماني الزيدان',    nameEn:'Amani Al-Zaidan',   rank:'asst',  email:'amani.alzaidan@ku.edu.kw',   roleAr:'مرشد أكاديمي', roleEn:'Academic Advisor' },
  { group:'animal', order:2,  nameAr:'د. بدور الصايغ',      nameEn:'Bedour Al-Sayegh',  rank:'asst',  email:'bedour.alsayegh@ku.edu.kw' },
  { group:'animal', order:3,  nameAr:'د. أماني العدساني',   nameEn:'Amani Al-Adsani',   rank:'assoc', email:'amani.aladsani@ku.edu.kw' },
  { group:'animal', order:4,  nameAr:'د. جازي العنزي',      nameEn:'Jazi Al-Enezi',     rank:'asst',  email:'jazi.alenezi@ku.edu.kw' },
  { group:'animal', order:5,  nameAr:'د. سعاد الفقعان',     nameEn:'Soaad Al-Faqaan',   rank:'asst',  email:'soaad.alfaqaan@ku.edu.kw' },
  { group:'animal', order:6,  nameAr:'د. مريم المحيسن',     nameEn:'Maryam Al-Mahaisen',rank:'asst',  email:'maryam.almohaisen@ku.edu.kw', roleAr:'منسق جدول التخصص', roleEn:'Schedule Coordinator' },
  { group:'animal', order:7,  nameAr:'د. روان عيدان',       nameEn:'Rawan Edan',        rank:'asst',  email:'rawan.edan@ku.edu.kw' },
  { group:'animal', order:8,  nameAr:'د. جاسم الربيعان',    nameEn:'Jasem Al-Rubaian',  rank:'assoc', email:'jasem.al_rubaian@ku.edu.kw' },
  { group:'animal', order:9,  nameAr:'د. عبدالعزيز العوضي', nameEn:'Abdulaziz Al-Awadi',rank:'asst',  email:'abdulaziz.alawadi@ku.edu.kw' },
  { group:'animal', order:10, nameAr:'أ.د. بدر الهاجري',    nameEn:'Bader Al-Hajeri',   rank:'prof',  email:'bader.alhajeri@ku.edu.kw' },
  { group:'animal', order:11, nameAr:'أ. محمد حسن',         nameEn:'Mohamed Hasan',     rank:'ta',    email:'mohamed.hasan@ku.edu.kw' },
  { group:'animal', order:12, nameAr:'أ. شذى البغلي',       nameEn:'Shatha Al-Baghli',  rank:'ta',    email:'shatha.albaghli@ku.edu.kw' },
  { group:'animal', order:13, nameAr:'أ. عادل أغا',         nameEn:'Adel Agha',         rank:'ta',    email:'adel.aga@ku.edu.kw' },
  { group:'animal', order:14, nameAr:'أ. عقيل حسن',         nameEn:'Aqeel Hasan',       rank:'ta',    email:'aqeel.hasan@ku.edu.kw' },
  { group:'animal', order:15, nameAr:'أ. علياء عبود',       nameEn:"Alia'A Aboud",      rank:'ta',    email:'a.alsmawi@ku.edu.kw' },

  // ── الميكروبيولوجي ────────────────────────────────────────
  { group:'micro', order:1,  nameAr:'أ.د. نداء الصراف',    nameEn:'Nedaa Al-Sarraf',   rank:'prof',  email:'ny.ali@ku.edu.kw',            roleAr:'رئيس القسم', roleEn:'Head of Department' },
  { group:'micro', order:2,  nameAr:'أ.د. نرجس دشتي',      nameEn:'Narjes Dashti',     rank:'prof',  email:'narjes.dashti@ku.edu.kw',     roleAr:'منسق جدول التخصص', roleEn:'Schedule Coordinator' },
  { group:'micro', order:3,  nameAr:'د. زهراء البقصمي',    nameEn:'Zahra Al-Baqsami',  rank:'asst',  email:'z.albaqsami@ku.edu.kw',       roleAr:'مشرفة نادي العلوم البيولوجية', roleEn:'BSC Club Supervisor' },
  { group:'micro', order:4,  nameAr:'د. دنيا الغربلي',     nameEn:'Dunia Al-Gharabally',rank:'asst', email:'dunia.algharabally@ku.edu.kw', roleAr:'مرشد أكاديمي', roleEn:'Academic Advisor' },
  { group:'micro', order:5,  nameAr:'أ.د. حسين العوضي',    nameEn:'Husain Al-Aawadhi', rank:'prof',  email:'husain.alawadhi@ku.edu.kw' },
  { group:'micro', order:6,  nameAr:'أ.د. هدى محمود',      nameEn:'Huda Mahmoud',      rank:'prof',  email:'huda.mahmoud@ku.edu.kw',      roleAr:'مساعد نائب مدير الجامعة للشؤون العلمية للتطور الأكاديمي', roleEn:'Assistant Vice President for Academic Development' },
  { group:'micro', order:7,  nameAr:'د. إسماعيل الصالح',   nameEn:'Esmaeil Al-Saleh',  rank:'assoc', email:'e.alsaleh@ku.edu.kw' },
  { group:'micro', order:8,  nameAr:'د. هبة حاجية',        nameEn:'Hebah Hajeyah',     rank:'asst',  email:'hebah.hajeyah@ku.edu.kw' },
  { group:'micro', order:9,  nameAr:'د. يوسف مطر',         nameEn:'Yousef Mater',      rank:'asst',  email:'yousef.mater@ku.edu.kw' },
  { group:'micro', order:10, nameAr:'د. محمد حيدر',        nameEn:'Mohammed Haider',   rank:'assoc', email:'mohammed.haider@ku.edu.kw' },
  { group:'micro', order:11, nameAr:'د. فهد الخياط',       nameEn:'Fahad Al-Khait',    rank:'asst',  email:'fahad.alkhait@ku.edu.kw' },
  { group:'micro', order:12, nameAr:'أ. صلاح عبدربه',      nameEn:'Salah Abdrabou',    rank:'ta',    email:'salah.elghanyabdrabou@ku.edu.kw' },
  { group:'micro', order:13, nameAr:'أ. علي الشيخ',        nameEn:'Ali Al-Shaikh',     rank:'ta',    email:'a.alshaikh@ku.edu.kw' },
  { group:'micro', order:14, nameAr:'أ. فاطمة الكاظمي',    nameEn:'Fatemah Al-Kazemi', rank:'ta',    email:'f.alkazemi@ku.edu.kw' },
  { group:'micro', order:15, nameAr:'أ. عهد جاوي',         nameEn:'Ahd Jawee',         rank:'ta',    email:'ahd.jawee@ku.edu.kw' },
  { group:'micro', order:16, nameAr:'أ. غدير عبدالحسين',   nameEn:'Ghadir Abdelhussain',rank:'ta',   email:'ghadir.abdelhussain@ku.edu.kw' },

  // ── البيولوجيا الجزيئية ───────────────────────────────────
  { group:'molecular', order:1,  nameAr:'أ.د. حسين بهبهاني', nameEn:'Hussain Bahbahani', rank:'prof',  email:'hussain.bahbahani@ku.edu.kw', roleAr:'العميد المساعد للشؤون الأكاديمية والأبحاث والدراسات العليا', roleEn:'Assistant Dean for Academic Affairs, Research and Graduate Studies' },
  { group:'molecular', order:2,  nameAr:'أ.د. نسمة بستكي',   nameEn:'Nasmah Bastaki',    rank:'assoc', email:'Nasmah.bastaki@ku.edu.kw',    roleAr:'مدير الوحدة الوطنية للأبحاث والخدمات البيئية', roleEn:'Director, National Unit for Environmental Research and Services' },
  { group:'molecular', order:3,  nameAr:'أ.د. سوزان البستان',nameEn:'Suzanne Al-Bustan', rank:'prof',  email:'s.albustan@ku.edu.kw',        roleAr:'نائب العميد بالتكليف للشؤون الأكاديمية والأبحاث والدراسات العليا', roleEn:'Acting Vice Dean for Academic Affairs, Research and Graduate Studies' },
  { group:'molecular', order:4,  nameAr:'د. عباس الأمير',    nameEn:'Abbas Al-Ameer',    rank:'asst',  email:'abbas.alameer@ku.edu.kw',     roleAr:'مرشد أكاديمي', roleEn:'Academic Advisor' },
  { group:'molecular', order:5,  nameAr:'د. سارة جاسم',      nameEn:'Sarah Jasem',       rank:'asst',  email:'sarah.jasem@ku.edu.kw',       roleAr:'منسق جدول التخصص', roleEn:'Schedule Coordinator' },
  { group:'molecular', order:6,  nameAr:'أ.د. محمد أباظة',   nameEn:'Mohamed Abaza',     rank:'prof',  email:'mohammed.abaza@ku.edu.kw' },
  { group:'molecular', order:7,  nameAr:'د. فاطمة غلوم',     nameEn:'Fatmah Ghuloum',    rank:'asst',  email:'f.ismael@ku.edu.kw' },
  { group:'molecular', order:8,  nameAr:'د. حسن الحداد',     nameEn:'Hassan Al-Haddad',  rank:'assoc', email:'Hassan.alhaddad@ku.edu.kw' },
  { group:'molecular', order:9,  nameAr:'د. عواطف المطيري',  nameEn:'Awatef Al-Mutairi', rank:'asst',  email:'a.almutairi@ku.edu.kw' },
  { group:'molecular', order:10, nameAr:'د. وفاء الكندري',   nameEn:'Wafaa Al-Kandari',  rank:'assoc', email:'wafa.alkandari@ku.edu.kw' },
  { group:'molecular', order:11, nameAr:'د. مشاعل الدبوس',   nameEn:'Mashael Al-Dabbous',rank:'asst',  email:'m.aldabbous@ku.edu.kw' },
  { group:'molecular', order:12, nameAr:'د. مريم الرشيد',    nameEn:'Maryam Alrashid',   rank:'asst',  email:'maryam.alrashid@ku.edu.kw' },
  { group:'molecular', order:13, nameAr:'أ. عبير العازمي',   nameEn:'Abeer Al-Azemi',    rank:'ta',    email:'abeer.alazemi@ku.edu.kw' },
  { group:'molecular', order:14, nameAr:'أ. هدى العسكر',     nameEn:'Huda Al-Askar',     rank:'ta',    email:'h.alaskar@ku.edu.kw' },
  { group:'molecular', order:15, nameAr:'أ. سهى عبدالغفور',  nameEn:'Suha Abdulghafoor', rank:'ta',    email:'suha.abdulghafoor@ku.edu.kw' },
  { group:'molecular', order:16, nameAr:'أ. طيبة البرجس',    nameEn:'Taibah Al-Barjas',  rank:'ta',    email:'taibah.albarjas@ku.edu.kw' },

  // ── الكيمياء الحيوية ──────────────────────────────────────
  { group:'biochem', order:1,  nameAr:'د. أنفال الماص',     nameEn:'Anfal Al-Mass',     rank:'asst',  email:'anfal.almass@ku.edu.kw',   roleAr:'منسق جدول التخصص', roleEn:'Schedule Coordinator' },
  { group:'biochem', order:2,  nameAr:'د. هيا الرشيدي',     nameEn:'Haya Al-Reshidi',   rank:'asst',  email:'haya.alreshidi@ku.edu.kw', roleAr:'مرشد أكاديمي', roleEn:'Academic Advisor' },
  { group:'biochem', order:3,  nameAr:'د. أمل الصفار',      nameEn:'Amal Alsaffar',     rank:'assoc', email:'amal.alsaffar@ku.edu.kw' },
  { group:'biochem', order:4,  nameAr:'د. حمد ياديكار',     nameEn:'Hamad Yadikar',     rank:'asst',  email:'hamad.yadikar@ku.edu.kw' },
  { group:'biochem', order:5,  nameAr:'د. جميلة زمون',      nameEn:'Jamilla Zamoon',    rank:'asst',  email:'j.zamoon@ku.edu.kw' },
  { group:'biochem', order:6,  nameAr:'د. إبراهيم المسعود', nameEn:'Ibrahim Al-Masoud', rank:'asst',  email:'I.almasoud@ku.edu.kw' },
  { group:'biochem', order:7,  nameAr:'د. علي حاجية',       nameEn:'Ali Hajeyah',       rank:'asst',  email:'ali.hajeyah@ku.edu.kw' },
  { group:'biochem', order:8,  nameAr:'د. أبرار الأنصاري',  nameEn:'Abrar Alansary',    rank:'asst',  email:'abrar.alansary@ku.edu.kw' },
  { group:'biochem', order:9,  nameAr:'د. أمينة حيدر',      nameEn:'Ameena Haider',     rank:'asst',  email:'ameena.haider@ku.edu.kw' },
  { group:'biochem', order:10, nameAr:'د. محمد المشوط',     nameEn:'Mohammad Almishwat',rank:'asst',  email:'mohammad.almishwat@ku.edu.kw' },
  { group:'biochem', order:11, nameAr:'د. لمياء حيات',      nameEn:'Lamya Hayat',       rank:'assoc', email:'l.hayat@ku.edu.kw' },
  { group:'biochem', order:12, nameAr:'أ. فاطمة الطواري',   nameEn:'Fatmah Altawari',   rank:'ta',    email:'fatmah.altawari@ku.edu.kw' },
  { group:'biochem', order:13, nameAr:'د. منى الهولي',      nameEn:'Mouna Al-Houli',    rank:'ta',    email:'m.alhouli@ku.edu.kw',      roleAr:'حاصلة على الدكتوراة', roleEn:'PhD holder' },
  { group:'biochem', order:14, nameAr:'أ. نادية الحمادي',   nameEn:'Nadia Al-Hammadi',  rank:'ta',    email:'nadia.alhammadi@ku.edu.kw' },
  { group:'biochem', order:15, nameAr:'أ. دانة الثويني',    nameEn:'Dana Althuwaini',   rank:'ta',    email:'dana.althuwaini@ku.edu.kw' },

  // ── مساند نبات زراعي ──────────────────────────────────────
  { group:'agri', order:1,  nameAr:'د. أحلام بوعركي',   nameEn:'Ahlam Bouariky',       rank:'asst',  email:'ahlam.bouariky@ku.edu.kw' },
  { group:'agri', order:2,  nameAr:'د. عائشة الشطي',    nameEn:'Aisha Alshatti',       rank:'asst',  email:'aisha.alshatti@ku.edu.kw' },
  { group:'agri', order:3,  nameAr:'د. سعاد المزروعي',  nameEn:'Suad Almazrooei',      rank:'asst',  email:'s.almazrooei@ku.edu.kw' },
  { group:'agri', order:4,  nameAr:'د. أمينة رضا',      nameEn:'Amena Redha',          rank:'assoc', email:'a.redha@ku.edu.kw' },
  { group:'agri', order:5,  nameAr:'د. محمد مراد',      nameEn:'Mohammed Morad',       rank:'asst',  email:'mohammed.morad@ku.edu.kw' },
  { group:'agri', order:6,  nameAr:'د. جاسر الجاسر',    nameEn:'Jaser Al-Jaser',       rank:'asst',  email:'jaser.aljaser@ku.edu.kw' },
  { group:'agri', order:7,  nameAr:'أ. كافيثا بيتر',    nameEn:'Kavitha Peter',        rank:'ta',    email:'kavitha.peter@ku.edu.kw' },
  { group:'agri', order:8,  nameAr:'أ. فاطمة الخرينج',  nameEn:'Fatemah Alkherainej',  rank:'ta',    email:'fatemah.alkherainej@ku.edu.kw' },
  { group:'agri', order:9,  nameAr:'أ. آلاء بوهندي',    nameEn:'Alaa Buhendi',         rank:'ta',    email:'alaa.buhendi@ku.edu.kw' },
  { group:'agri', order:10, nameAr:'أ. فاطمة أحمد',     nameEn:'Fatemah Ahmad',        rank:'ta',    email:'fatemah.ahmad@ku.edu.kw' },

  // ── مساند أدلة جنائية ─────────────────────────────────────
  { group:'forensic', order:1, nameAr:'أ.د. انتصار الهتلاني', nameEn:'Entesar Alhetlani', rank:'prof', email:'entesar.alhetlani@ku.edu.kw' },
  { group:'forensic', order:2, nameAr:'د. سناء الصالح',       nameEn:'Sana Al-Saleh',     rank:'asst', email:'sana.alsaleh@ku.edu.kw' },
  { group:'forensic', order:3, nameAr:'د. سارة جاسم',         nameEn:'Sarah Jasem',       rank:'asst', email:'sarah.jasem@ku.edu.kw' },

  // ── مساند تقنية حيوية ─────────────────────────────────────
  { group:'biotech', order:1, nameAr:'أ.د. نسمة بستكي', nameEn:'Nasmah Bastaki', rank:'assoc', email:'Nasmah.bastaki@ku.edu.kw', roleAr:'مدير الوحدة الوطنية للأبحاث والخدمات البيئية', roleEn:'Director, National Unit for Environmental Research and Services' },
  { group:'biotech', order:2, nameAr:'د. فهد الخياط',   nameEn:'Fahad Al-Khait',  rank:'asst',  email:'fahad.alkhait@ku.edu.kw' },

  // ── سكرتارية القسم ────────────────────────────────────────
  { group:'admin', order:1, nameAr:'أ. إلهام السلامين', nameEn:'Elham Al-Salameen', rank:'sec', email:'elham.alsalameen@ku.edu.kw', roleAr:'إرشاد أكاديمي', roleEn:'Academic Advising' },
  { group:'admin', order:2, nameAr:'أ. حنان الخواجة',   nameEn:'Hanan Al-Khwagah',  rank:'sec', email:'hanan.alkhwagah@ku.edu.kw' },
];
