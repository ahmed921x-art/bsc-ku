// BSC KU — Complete Major Sheets with Correct Prerequisites
// Source: Student Guide 2025/2026 PDF
// Admin: Press "استيراد مسبقات كل التخصصات" to load all data

export const MAJOR_SHEETS_SEED = {

// ══════════════════════════════════════════════════════════════
// 🧬 MOLECULAR BIOLOGY (0497)
// ══════════════════════════════════════════════════════════════
molecular: { major:"molecular", courses:[
  // Row 0 — No prereqs
  {code:"ع 101",nameAr:"مهارات الاتصال اللغوية",nameEn:"Communication Skills",hours:3,level:1,type:"required",prereqs:[]},
  {code:"ك 110",nameAr:"كيمياء عامة",nameEn:"General Chemistry",hours:3,level:1,type:"required",prereqs:[]},
  {code:"ك 111",nameAr:"مختبر كيمياء عامة",nameEn:"General Chemistry Lab",hours:1,level:1,type:"required",prereqs:[]},
  {code:"ب 103",nameAr:"رياضة حيوية",nameEn:"Biostatistics",hours:3,level:1,type:"dept",prereqs:[]},
  {code:"E 161",nameAr:"اللغة الإنجليزية (1)",nameEn:"English (1)",hours:3,level:1,type:"required",prereqs:[]},
  {code:"ب 101",nameAr:"بيولوجيا (1)",nameEn:"Biology (1)",hours:4,level:1,type:"dept",prereqs:[]},
  {code:"ب 105",nameAr:"علم الكائنات الدقيقة",nameEn:"Microbiology",hours:3,level:1,type:"dept",prereqs:[]},
  {code:"إح 102",nameAr:"إحصاء لعلوم الحياة",nameEn:"Statistics",hours:3,level:1,type:"required",prereqs:[]},
  {code:"ر 103",nameAr:"رياضيات",nameEn:"Mathematics",hours:3,level:1,type:"required",prereqs:[]},
  // Row 1 — Prereq: one of above
  {code:"E 162",nameAr:"اللغة الإنجليزية (2)",nameEn:"English (2)",hours:3,level:2,type:"required",prereqs:["E 161"]},
  {code:"ب ج 281",nameAr:"مقدمة في البيولوجيا الجزيئية",nameEn:"Intro Molecular Biology",hours:3,level:2,type:"major",prereqs:["ب 101"]},
  {code:"ب ج 271",nameAr:"بيولوجيا الخلية",nameEn:"Cell Biology",hours:3,level:2,type:"major",prereqs:["ب 101"]},
  {code:"ب ج 283",nameAr:"زراعة الأنسجة الحيوانية",nameEn:"Animal Tissue Culture",hours:4,level:2,type:"major",prereqs:["ب 101"]},
  {code:"ب ج 291",nameAr:"تقنيات في الكيمياء الحيوية",nameEn:"Biochemistry Techniques",hours:3,level:2,type:"major",prereqs:["ب ج 271"]},
  // Row 2 — Prereq: ب ج 281
  {code:"ب ج 320",nameAr:"علم الوراثة",nameEn:"Genetics",hours:4,level:3,type:"major",prereqs:["ب ج 281"]},
  {code:"ب ج 371",nameAr:"مقدمة في الوراثة الجزيئية",nameEn:"Molecular Genetics",hours:3,level:3,type:"major",prereqs:["ب ج 281","ب ج 271"]},
  {code:"ب ج 383",nameAr:"بيولوجيا الخلية الجزيئية",nameEn:"Molecular Cell Biology",hours:3,level:3,type:"major",prereqs:["ب 101","ب ج 281"]},
  {code:"ب ج 493",nameAr:"مواضيع في البيولوجيا الجزيئية",nameEn:"Topics in Molecular Bio",hours:1,level:3,type:"major",prereqs:["E 162"]},
  {code:"ب ج 390",nameAr:"المعلوماتية الحياتية",nameEn:"Bioinformatics",hours:3,level:3,type:"major",prereqs:["ب ج 281"]},
  // Row 3 — Prereq: ب ج 371 / ب ج 383
  {code:"ب ج 401",nameAr:"علم المناعة الخلوية والجزيئية",nameEn:"Cellular Immunology",hours:3,level:4,type:"major",prereqs:["ب ج 371"]},
  {code:"ب ج 402",nameAr:"م. علم المناعة",nameEn:"Immunology Lab",hours:3,level:4,type:"major",prereqs:["ب ج 371"]},
  {code:"ب ج 480",nameAr:"تقنية الحمض النووي",nameEn:"Recombinant DNA",hours:6,level:4,type:"major",prereqs:["ب ج 482","ب ج 383"]},
  {code:"ب ج 482",nameAr:"بيولوجيا جزيئية",nameEn:"Molecular Biology",hours:3,level:4,type:"major",prereqs:["ب ج 371"]},
  {code:"ب ج 483",nameAr:"تقنيات البيولوجيا الجزيئية",nameEn:"Molecular Bio Techniques",hours:3,level:4,type:"major",prereqs:["ب ج 371"]},
  {code:"ب ج 490",nameAr:"أساسيات التكنولوجيا الحيوية",nameEn:"Biotechnology",hours:6,level:4,type:"major",prereqs:["ب ج 482","ب ج 383"]},
  {code:"ب ج 495",nameAr:"بيولوجيا جزيئية متقدمة",nameEn:"Advanced Molecular Bio",hours:3,level:4,type:"major",prereqs:["ب ج 371","ب ج 383"]},
]},

// ══════════════════════════════════════════════════════════════
// 🦠 MICROBIOLOGY (0495)
// ══════════════════════════════════════════════════════════════
micro: { major:"micro", courses:[
  {code:"ع 101",nameAr:"مهارات الاتصال اللغوية",nameEn:"Communication Skills",hours:3,level:1,type:"required",prereqs:[]},
  {code:"ك 110",nameAr:"كيمياء عامة",nameEn:"General Chemistry",hours:3,level:1,type:"required",prereqs:[]},
  {code:"ك 111",nameAr:"مختبر كيمياء عامة",nameEn:"General Chemistry Lab",hours:1,level:1,type:"required",prereqs:[]},
  {code:"ب 103",nameAr:"رياضة حيوية",nameEn:"Biostatistics",hours:3,level:1,type:"dept",prereqs:[]},
  {code:"E 161",nameAr:"اللغة الإنجليزية (1)",nameEn:"English (1)",hours:3,level:1,type:"required",prereqs:[]},
  {code:"ب 101",nameAr:"بيولوجيا (1)",nameEn:"Biology (1)",hours:4,level:1,type:"dept",prereqs:[]},
  {code:"ب 105",nameAr:"علم الكائنات الدقيقة",nameEn:"Microbiology",hours:3,level:1,type:"dept",prereqs:[]},
  // Row 1
  {code:"E 162",nameAr:"اللغة الإنجليزية (2)",nameEn:"English (2)",hours:3,level:2,type:"required",prereqs:["E 161"]},
  {code:"ب ج 281",nameAr:"مقدمة في البيولوجيا الجزيئية",nameEn:"Intro Molecular Biology",hours:3,level:2,type:"dept",prereqs:["ب 101"]},
  {code:"م ب 102",nameAr:"بيولوجيا (2)",nameEn:"Biology (2)",hours:3,level:2,type:"major",prereqs:["ب 101"]},
  {code:"م ب 103",nameAr:"بيولوجيا (3)",nameEn:"Biology (3)",hours:3,level:2,type:"major",prereqs:["ب 101"]},
  {code:"ك 271",nameAr:"مقدمة في الكيمياء الحيوية",nameEn:"Intro Biochemistry",hours:3,level:2,type:"support",prereqs:["ك 110"]},
  {code:"م ب 107",nameAr:"تقنيات دقيقة ومجهرية",nameEn:"Microscopy Techniques",hours:3,level:2,type:"major",prereqs:["ب 105"]},
  // Row 2
  {code:"م ب 203",nameAr:"الأيض والوراثة الميكروبية",nameEn:"Microbial Genetics",hours:3,level:3,type:"major",prereqs:["م ب 102"]},
  {code:"م ب 204",nameAr:"علم الفيروسات",nameEn:"Virology",hours:3,level:3,type:"major",prereqs:["م ب 102"]},
  {code:"م ب 205",nameAr:"علم البكتيريا",nameEn:"Bacteriology",hours:3,level:3,type:"major",prereqs:["م ب 102"]},
  {code:"م ب 382",nameAr:"علم المناعة",nameEn:"Immunology",hours:3,level:3,type:"major",prereqs:["م ب 102"]},
  // Row 3
  {code:"م ب 206",nameAr:"علم الفطريات والبروتوزوا",nameEn:"Mycology",hours:3,level:4,type:"major",prereqs:["م ب 102"]},
  {code:"م ب 207",nameAr:"الطحالب الدقيقة",nameEn:"Microalgae",hours:3,level:4,type:"major",prereqs:["م ب 102"]},
]},

// ══════════════════════════════════════════════════════════════
// 🌱 PLANT BIOLOGY (0494)
// ══════════════════════════════════════════════════════════════
plant: { major:"plant", courses:[
  {code:"ع 101",nameAr:"مهارات الاتصال اللغوية",nameEn:"Communication Skills",hours:3,level:1,type:"required",prereqs:[]},
  {code:"ك 110",nameAr:"كيمياء عامة",nameEn:"General Chemistry",hours:3,level:1,type:"required",prereqs:[]},
  {code:"ب 103",nameAr:"رياضة حيوية",nameEn:"Biostatistics",hours:3,level:1,type:"dept",prereqs:[]},
  {code:"E 161",nameAr:"اللغة الإنجليزية (1)",nameEn:"English (1)",hours:3,level:1,type:"required",prereqs:[]},
  {code:"ب 101",nameAr:"بيولوجيا (1)",nameEn:"Biology (1)",hours:4,level:1,type:"dept",prereqs:[]},
  {code:"ب 105",nameAr:"علم الكائنات الدقيقة",nameEn:"Microbiology",hours:3,level:1,type:"dept",prereqs:[]},
  // Row 1
  {code:"E 162",nameAr:"اللغة الإنجليزية (2)",nameEn:"English (2)",hours:3,level:2,type:"required",prereqs:["E 161"]},
  {code:"ب ج 281",nameAr:"مقدمة في البيولوجيا الجزيئية",nameEn:"Intro Molecular Biology",hours:3,level:2,type:"dept",prereqs:["ب 101"]},
  {code:"ن 211",nameAr:"تشريح نبات",nameEn:"Plant Anatomy",hours:3,level:2,type:"major",prereqs:["ب 101"]},
  {code:"ك 271",nameAr:"مقدمة في الكيمياء الحيوية",nameEn:"Intro Biochemistry",hours:3,level:2,type:"support",prereqs:["ك 110"]},
  {code:"ن 102",nameAr:"التركيب والوظيفة في النبات",nameEn:"Plant Structure",hours:4,level:2,type:"major",prereqs:["ب 101"]},
  // Row 2
  {code:"ن 221",nameAr:"مبادئ علم الطحالب",nameEn:"Algology",hours:3,level:3,type:"major",prereqs:["ب 101"]},
  {code:"ن 231",nameAr:"مبادئ علم الوراثة",nameEn:"Genetics",hours:3,level:3,type:"major",prereqs:["ب ج 281"]},
  {code:"ن 251",nameAr:"مبادئ علم تصنيف النبات",nameEn:"Plant Taxonomy",hours:3,level:3,type:"major",prereqs:["ن 102"]},
  {code:"ن 261",nameAr:"مبادئ علم البيئة النباتية",nameEn:"Plant Ecology",hours:3,level:3,type:"major",prereqs:["ب 101"]},
  // Row 3
  {code:"ن 271",nameAr:"فسيولوجيا النبات",nameEn:"Plant Physiology",hours:3,level:4,type:"major",prereqs:["ن 102","ك 271"]},
]},

// ══════════════════════════════════════════════════════════════
// 🐾 ANIMAL BIOLOGY (0493)
// ══════════════════════════════════════════════════════════════
animal: { major:"animal", courses:[
  {code:"ع 101",nameAr:"مهارات الاتصال اللغوية",nameEn:"Communication Skills",hours:3,level:1,type:"required",prereqs:[]},
  {code:"ك 110",nameAr:"كيمياء عامة",nameEn:"General Chemistry",hours:3,level:1,type:"required",prereqs:[]},
  {code:"ك 111",nameAr:"مختبر كيمياء عامة",nameEn:"General Chemistry Lab",hours:1,level:1,type:"required",prereqs:[]},
  {code:"ب 103",nameAr:"رياضة حيوية",nameEn:"Biostatistics",hours:3,level:1,type:"dept",prereqs:[]},
  {code:"E 161",nameAr:"اللغة الإنجليزية (1)",nameEn:"English (1)",hours:3,level:1,type:"required",prereqs:[]},
  {code:"ب 101",nameAr:"بيولوجيا (1)",nameEn:"Biology (1)",hours:4,level:1,type:"dept",prereqs:[]},
  {code:"ب 105",nameAr:"علم الكائنات الدقيقة",nameEn:"Microbiology",hours:3,level:1,type:"dept",prereqs:[]},
  // Row 1
  {code:"E 162",nameAr:"اللغة الإنجليزية (2)",nameEn:"English (2)",hours:3,level:2,type:"required",prereqs:["E 161"]},
  {code:"ب ج 281",nameAr:"مقدمة في البيولوجيا الجزيئية",nameEn:"Intro Molecular Biology",hours:3,level:2,type:"dept",prereqs:["ب 101"]},
  {code:"ح 200",nameAr:"تطبيقات مخبرية",nameEn:"Animal Biology Lab",hours:3,level:2,type:"major",prereqs:["ب 101"]},
  {code:"ح 206",nameAr:"التنوع الحيواني الحبليات",nameEn:"Chordate Diversity",hours:3,level:2,type:"major",prereqs:["ب 101"]},
  {code:"ك 271",nameAr:"مقدمة في الكيمياء الحيوية",nameEn:"Intro Biochemistry",hours:3,level:2,type:"support",prereqs:["ك 110"]},
  // Row 2
  {code:"ح 202",nameAr:"بيولوجيا الخلية",nameEn:"Cell Biology",hours:4,level:3,type:"major",prereqs:["ب 101"]},
  {code:"ح 205",nameAr:"التنوع اللافقاريات",nameEn:"Invertebrate Diversity",hours:4,level:3,type:"major",prereqs:["ح 206"]},
  {code:"ح 320",nameAr:"علم الوراثة",nameEn:"Genetics",hours:4,level:3,type:"major",prereqs:["ب ج 281"]},
  // Row 3
  {code:"ح 306",nameAr:"علم البيئة",nameEn:"Ecology",hours:3,level:4,type:"major",prereqs:["ح 206"]},
  {code:"ح 312",nameAr:"علم وظائف أعضاء الحيوانات",nameEn:"Animal Physiology",hours:3,level:4,type:"major",prereqs:["ح 202"]},
  {code:"ح 305",nameAr:"علم الأجنة",nameEn:"Embryology",hours:4,level:4,type:"major",prereqs:["ح 320"]},
]},

// ══════════════════════════════════════════════════════════════
// ⚗️ BIOCHEMISTRY (0496)
// ══════════════════════════════════════════════════════════════
biochem: { major:"biochem", courses:[
  {code:"ع 101",nameAr:"مهارات الاتصال اللغوية",nameEn:"Communication Skills",hours:3,level:1,type:"required",prereqs:[]},
  {code:"ك 110",nameAr:"كيمياء عامة",nameEn:"General Chemistry",hours:3,level:1,type:"required",prereqs:[]},
  {code:"ك 111",nameAr:"مختبر كيمياء عامة",nameEn:"General Chemistry Lab",hours:1,level:1,type:"required",prereqs:[]},
  {code:"ب 103",nameAr:"رياضة حيوية",nameEn:"Biostatistics",hours:3,level:1,type:"dept",prereqs:[]},
  {code:"E 161",nameAr:"اللغة الإنجليزية (1)",nameEn:"English (1)",hours:3,level:1,type:"required",prereqs:[]},
  {code:"ب 101",nameAr:"بيولوجيا (1)",nameEn:"Biology (1)",hours:4,level:1,type:"dept",prereqs:[]},
  {code:"ب 105",nameAr:"علم الكائنات الدقيقة",nameEn:"Microbiology",hours:3,level:1,type:"dept",prereqs:[]},
  // Row 1
  {code:"E 162",nameAr:"اللغة الإنجليزية (2)",nameEn:"English (2)",hours:3,level:2,type:"required",prereqs:["E 161"]},
  {code:"ب ج 281",nameAr:"مقدمة في البيولوجيا الجزيئية",nameEn:"Intro Molecular Biology",hours:3,level:2,type:"dept",prereqs:["ب 101"]},
  {code:"ك 271",nameAr:"مقدمة في الكيمياء الحيوية",nameEn:"Intro Biochemistry",hours:3,level:2,type:"major",prereqs:["ك 110"]},
  // Row 2
  {code:"ح ب 217",nameAr:"الكيمياء البيولوجية",nameEn:"Biological Chemistry",hours:4,level:3,type:"major",prereqs:["ك 271","ب 101"]},
  {code:"ح ب 219",nameAr:"الكيمياء الحيوية الفيزيائية",nameEn:"Physical Biochemistry",hours:3,level:3,type:"major",prereqs:["ك 271"]},
  {code:"ح ب 372",nameAr:"مقدمة في الوراثة الجزيئية",nameEn:"Molecular Genetics",hours:3,level:3,type:"major",prereqs:["ب ج 281"]},
  // Row 3
  {code:"ح ب 300",nameAr:"مختبر الكيمياء الحيوية",nameEn:"Biochemistry Lab",hours:2,level:4,type:"major",prereqs:["ح ب 217"]},
  {code:"ح ب 315",nameAr:"الكيمياء الحيوية (1)",nameEn:"Biochemistry (1)",hours:3,level:4,type:"major",prereqs:["ح ب 217"]},
  {code:"ح ب 337",nameAr:"الإنزيمات",nameEn:"Enzymology",hours:3,level:4,type:"major",prereqs:["ح ب 217"]},
  {code:"ح ب 464",nameAr:"التغذية",nameEn:"Nutrition",hours:3,level:4,type:"major",prereqs:["ح ب 217"]},
  {code:"ح ب 482",nameAr:"الهندسة الوراثية",nameEn:"Genetic Engineering",hours:3,level:4,type:"major",prereqs:["ح ب 372"]},
  // Row 4 — depend on ح ب 315
  {code:"ح ب 415",nameAr:"الكيمياء الحيوية (2)",nameEn:"Biochemistry (2)",hours:3,level:5,type:"major",prereqs:["ح ب 315"]},
  {code:"ح ب 420",nameAr:"مختبر الكيمياء الحيوية (2)",nameEn:"Biochemistry Lab (2)",hours:2,level:5,type:"major",prereqs:["ح ب 315"]},
  {code:"ح ب 425",nameAr:"الكيمياء الحيوية (3)",nameEn:"Biochemistry (3)",hours:3,level:5,type:"major",prereqs:["ح ب 315"]},
  {code:"ح ب 435",nameAr:"الكيمياء الإكلينيكية",nameEn:"Clinical Chemistry",hours:3,level:5,type:"major",prereqs:["ح ب 415"]},
]}

};
