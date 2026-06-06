// BSC KU — Student Guide Course Catalog
// Organized by major, prereqs normalized to numeric codes

const PMAP={
  'BSc101':'0490101','BSc102':'0490102','BSc103':'0490103','BSc105':'0490105',
  'BSc271':'0490271','BSc281':'0490281',
  'E161':'E161','E162':'E162','E90':'E90',
  'Chem110':'ك110','Chem111':'ك111','Chem114':'ك114','Chem204':'ك204','Chem236':'ك236',
  'Z201':'0493201','Z203':'0493203','Z204':'0493204','Z205':'0493205','Z206':'0493206',
  'Z281':'0493281','Z303':'0493303','Z304':'0493304','Z306':'0493306','Z307':'0493307',
  'Z311':'0493311','Z312':'0493312','Z313':'0493313','Z320':'0493320','Z321':'0493321','Z335':'0493335',
  'Bot102':'0494102','Bot142':'0494142','Bot221':'0494221','Bot231':'0494231',
  'Bot241':'0494241','Bot245':'0494245','Bot251':'0494251','Bot261':'0494261',
  'Bot265':'0494265','Bot266':'0494266','Bot271':'0494271','Bot281':'0494281','Bot383':'0494383',
  'Micro105':'0495106','Micro107':'0495107','Micro203':'0495203','Micro204':'0495204',
  'Micro205':'0495205','Micro206':'0495206','Micro207':'0495207',
  'Biochem204':'0496204','Biochem217':'0496217','Biochem256':'0496256',
  'Biochem315':'0496315','Biochem333':'0496333','Biochem337':'0496337',
  'Biochem372':'0496372','Biochem415':'0496415','Biochem482':'0496482',
  'Mol231':'0497231','Mol371':'0497371','Mol383':'0497383',
  'Mol401':'0497401','Mol415':'0497415','Mol482':'0497482',
};

function mp(prereqs){ return prereqs.map(p=>PMAP[p]||p); }
function lv(code){ const n=+code.slice(-3); return n<200?1:n<300?2:n<400?3:4; }

const SHARED=[
  {code:'0490101',nameAr:'بيولوجيا (1)',nameEn:'Biology 1',hours:3,level:1,type:'required',prereqs:[]},
  {code:'0490102',nameAr:'بيولوجيا (2)',nameEn:'Biology 2',hours:3,level:2,type:'required',prereqs:['0490101']},
  {code:'0490103',nameAr:'بيولوجيا (3)',nameEn:'Biology 3',hours:3,level:3,type:'required',prereqs:['0490102']},
  {code:'0490105',nameAr:'علم الكائنات الدقيقة',nameEn:'Microbiology',hours:3,level:2,type:'required',prereqs:['0490102']},
  {code:'0490271',nameAr:'مقدمة في الكيمياء الحيوية',nameEn:'Intro to Biochemistry',hours:4,level:2,type:'required',prereqs:['0490102','ك114']},
  {code:'0490281',nameAr:'مقدمة في البيولوجيا الجزيئية',nameEn:'Intro to Molecular Biology',hours:3,level:3,type:'required',prereqs:['0490271']},
  {code:'0490410',nameAr:'رياضة حيوية',nameEn:'Biostatistics',hours:3,level:1,type:'required',prereqs:[]},
];

const RAW_ANIMAL=[
  // — مقررات القسم العامة —
  {code:'0493106',nameAr:'بيولوجيا اللافقاريات',nameEn:'Invertebrate Biology',hours:3,type:'major',prereqs:['BSc101']},
  {code:'0493112',nameAr:'بيولوجيا الإنسان والبحر',nameEn:'Human and Marine Biology',hours:3,type:'major',prereqs:[]},
  {code:'0493116',nameAr:'الإنسان والطبيعة',nameEn:'Human and Nature',hours:3,type:'major',prereqs:[]},
  // — إلزامية التخصص —
  {code:'0493200',nameAr:'تطبيقات مخبرية في بيولوجيا الحيوان',nameEn:'Lab Applications in Animal Biology',hours:3,type:'major',prereqs:['BSc101']},
  {code:'0493201',nameAr:'بيولوجيا اللافقاريات',nameEn:'Invertebrate Biology',hours:4,type:'major',prereqs:['BSc101']},
  {code:'0493202',nameAr:'بيولوجيا الخلية',nameEn:'Cell Biology',hours:3,type:'major',prereqs:['BSc101']},
  {code:'0493203',nameAr:'البيولوجيا البحرية',nameEn:'Marine Biology',hours:4,type:'major',prereqs:['BSc101']},
  {code:'0493205',nameAr:'التنوع الحيواني I: اللافقاريات',nameEn:'Animal Diversity I: Invertebrates',hours:4,type:'major',prereqs:['BSc101','E162']},
  {code:'0493206',nameAr:'التنوع الحيواني II: الحبليات',nameEn:'Animal Diversity II: Chordates',hours:3,type:'major',prereqs:['BSc101']},
  {code:'0493305',nameAr:'علم الأجنة',nameEn:'Embryology',hours:4,type:'major',prereqs:['Z206']},
  {code:'0493306',nameAr:'علم البيئة',nameEn:'Ecology',hours:3,type:'major',prereqs:['Z205','Z206']},
  {code:'0493312',nameAr:'علم وظائف أعضاء الحيوانات',nameEn:'Animal Physiology',hours:3,type:'major',prereqs:['Z205','Z206']},
  {code:'0493320',nameAr:'علم الوراثة',nameEn:'Genetics',hours:4,type:'major',prereqs:['BSc101']},
  // — اختيارية: النظم الحيوانية —
  {code:'0493259',nameAr:'تطبيقات المجهر في الأدلة الجنائية',nameEn:'Microscopy Applications in Forensic Evidence',hours:2,type:'elective',prereqs:['BSc101']},
  {code:'0493300',nameAr:'علم وظائف أعضاء الثديات',nameEn:'Mammalian Physiology',hours:3,type:'elective',prereqs:['Z205','Z206']},
  {code:'0493301',nameAr:'علم الأنسجة وكيمياء الأنسجة',nameEn:'Histology and Histochemistry',hours:3,type:'elective',prereqs:['Z206']},
  {code:'0493302',nameAr:'بيولوجيا اللافقاريات 2',nameEn:'Invertebrate Biology 2',hours:3,type:'elective',prereqs:['Z205']},
  {code:'0493311',nameAr:'علم وظائف أعضاء الجسم',nameEn:'Animal Physiology',hours:3,type:'elective',prereqs:['BSc103']},
  {code:'0493313',nameAr:'علم الحشرات',nameEn:'Entomology',hours:3,type:'elective',prereqs:['Z205','Z206']},
  {code:'0493321',nameAr:'قضايا أخلاقية في بيولوجيا الحيوان',nameEn:'Ethical Issues in Zoology',hours:3,type:'elective',prereqs:['Z320']},
  {code:'0493330',nameAr:'تطور الحيوان ونظم تصنيفه',nameEn:'Animal Evolution and Taxonomy',hours:3,type:'elective',prereqs:['Z320']},
  {code:'0493403',nameAr:'علم الغدد الصماء',nameEn:'Endocrinology',hours:3,type:'elective',prereqs:['Z312']},
  {code:'0493406',nameAr:'علم وظائف أعضاء الحيوان المقارن',nameEn:'Comparative Animal Physiology',hours:3,type:'elective',prereqs:['Z312']},
  {code:'0493409',nameAr:'علم المناعة',nameEn:'Immunology',hours:3,type:'elective',prereqs:['BSc103']},
  {code:'0493411',nameAr:'التركيب الوظيفي المقارن',nameEn:'Comparative Functional Anatomy',hours:3,type:'elective',prereqs:['Z205','Z206']},
  {code:'0493412',nameAr:'فسيولوجيا الأسماك',nameEn:'Fish Physiology',hours:3,type:'elective',prereqs:['Z205','Z206']},
  {code:'0493413',nameAr:'علم وظائف الجهاز العصبي',nameEn:'Neuroscience',hours:3,type:'elective',prereqs:['Z205','Z206']},
  {code:'0493416',nameAr:'علم وظائف أعضاء الحشرات',nameEn:'Insect Physiology',hours:3,type:'elective',prereqs:['Z313']},
  {code:'0493420',nameAr:'علم الوراثة التطوري في الحيوان',nameEn:'Evolutionary Genetics in Animals',hours:3,type:'elective',prereqs:['Z320']},
  // — اختيارية: البيئة الحيوانية والمحافظة عليها —
  {code:'0493307',nameAr:'علم الحيوان الاقتصادي',nameEn:'Economic Zoology',hours:3,type:'elective',prereqs:['Z205','Z206']},
  {code:'0493308',nameAr:'حيوانات بيئة الكويت',nameEn:'Animals of Kuwait',hours:3,type:'elective',prereqs:['Z205','Z206']},
  {code:'0493314',nameAr:'علم الأحياء البحرية',nameEn:'Marine Biology',hours:3,type:'elective',prereqs:['Z205','Z206']},
  {code:'0493401',nameAr:'سلوك الحيوان',nameEn:'Animal Behavior',hours:3,type:'elective',prereqs:['Z320']},
  {code:'0493404',nameAr:'علم البيئة البحرية والمحافظة عليها',nameEn:'Marine Ecology and Conservation',hours:3,type:'elective',prereqs:['Z306']},
  {code:'0493405',nameAr:'علم البيئة الصحراوية',nameEn:'Desert Ecology',hours:3,type:'elective',prereqs:['Z306']},
  {code:'0493408',nameAr:'التطور',nameEn:'Evolution',hours:3,type:'elective',prereqs:['Z320']},
  {code:'0493414',nameAr:'بيولوجيا الجماعات',nameEn:'Population Biology',hours:3,type:'elective',prereqs:['Z306']},
  {code:'0493415',nameAr:'علم الطفيليات',nameEn:'Parasitology',hours:3,type:'elective',prereqs:['Z205','Z206']},
  {code:'0493417',nameAr:'البيولوجيا الجزيئية',nameEn:'Molecular Biology',hours:3,type:'elective',prereqs:['BSc281']},
  // — مشتركة بين المسارين —
  {code:'0493493',nameAr:'مواضيع في بيولوجيا الحيوان',nameEn:'Topics in Animal Biology',hours:1,type:'elective',prereqs:['Z320']},
  {code:'0493494',nameAr:'تطبيقات في بيولوجيا الحيوان',nameEn:'Applications in Animal Biology',hours:3,type:'elective',prereqs:['Z320']},
];

const RAW_PLANT=[
  {code:'0494102',nameAr:'التركيب والوظيفة في النبات',nameEn:'Plant Structure and Function',hours:3,type:'major',prereqs:['E161']},
  {code:'0494141',nameAr:'الزراعة والمجتمع الكويتي',nameEn:'Agriculture and Kuwaiti Society',hours:3,type:'major',prereqs:[]},
  {code:'0494142',nameAr:'علم النبات الزراعي',nameEn:'Agricultural Botany',hours:3,type:'major',prereqs:[]},
  {code:'0494211',nameAr:'مبادئ علم تصنيف النبات',nameEn:'Plant Taxonomy Principles',hours:3,type:'major',prereqs:['Bot102']},
  {code:'0494212',nameAr:'علم هيئة النبات المقارن',nameEn:'Comparative Plant Morphology',hours:3,type:'major',prereqs:['Bot102']},
  {code:'0494221',nameAr:'مبادئ علم الطحالب',nameEn:'Principles of Algology',hours:3,type:'major',prereqs:['BSc101']},
  {code:'0494231',nameAr:'مبادئ علم الوراثة',nameEn:'Principles of Genetics',hours:3,type:'major',prereqs:['BSc101']},
  {code:'0494241',nameAr:'علم النبات الاقتصادي',nameEn:'Economic Botany',hours:3,type:'major',prereqs:['Bot102']},
  {code:'0494245',nameAr:'بستنة 1',nameEn:'Horticulture 1',hours:3,type:'major',prereqs:['Bot142','Bot102']},
  {code:'0494251',nameAr:'مبادئ علم تصنيف النبات 2',nameEn:'Plant Taxonomy 2',hours:3,type:'major',prereqs:['Bot102']},
  {code:'0494261',nameAr:'مبادئ علم البيئة النباتية',nameEn:'Plant Ecology Principles',hours:3,type:'major',prereqs:['Bot102']},
  {code:'0494265',nameAr:'البيولوجيا البحرية',nameEn:'Marine Biology',hours:4,type:'major',prereqs:['BSc101','E162']},
  {code:'0494266',nameAr:'الزراعة والتربية',nameEn:'Agriculture and Breeding',hours:3,type:'major',prereqs:['Bot102','ك114']},
  {code:'0494271',nameAr:'مقدمة فسيولوجيا النبات',nameEn:'Intro to Plant Physiology',hours:3,type:'major',prereqs:['ك114','Bot102']},
  {code:'0494313',nameAr:'علم النبات القديم والتطور',nameEn:'Paleobotany and Evolution',hours:3,type:'major',prereqs:['BSc102']},
  {code:'0494322',nameAr:'علم النبات البحري',nameEn:'Marine Botany',hours:3,type:'major',prereqs:['Bot221']},
  {code:'0494323',nameAr:'علم الطحالب المتقدم',nameEn:'Advanced Algology',hours:3,type:'major',prereqs:['Bot221']},
  {code:'0494332',nameAr:'علم الوراثة الخلوية',nameEn:'Cytogenetics',hours:3,type:'major',prereqs:['Bot231']},
  {code:'0494337',nameAr:'زراعة الأنسجة والأعضاء النباتية',nameEn:'Plant Tissue and Organ Culture',hours:3,type:'major',prereqs:['Bot142','Bot102']},
  {code:'0494345',nameAr:'بستنة 2',nameEn:'Horticulture 2',hours:3,type:'major',prereqs:['Bot245','Bot241']},
  {code:'0494352',nameAr:'علم تصنيف النبات المتقدم',nameEn:'Advanced Plant Taxonomy',hours:3,type:'major',prereqs:['Bot251']},
  {code:'0494362',nameAr:'علم التربة',nameEn:'Soil Science',hours:3,type:'major',prereqs:['Bot261']},
  {code:'0494363',nameAr:'الإنتاج النباتي في بيئة قاحلة',nameEn:'Plant Production in Arid Environments',hours:3,type:'major',prereqs:['Bot261']},
  {code:'0494372',nameAr:'فسيولوجيا النبات المتقدم',nameEn:'Advanced Plant Physiology',hours:4,type:'major',prereqs:['Bot102','Bot271']},
  {code:'0494381',nameAr:'وقاية النبات',nameEn:'Plant Protection',hours:3,type:'major',prereqs:['Bot102','Bot142']},
  {code:'0494383',nameAr:'مواضيع في البيولوجيا الجزيئية',nameEn:'Topics in Molecular Biology',hours:3,type:'major',prereqs:['Bot281']},
  {code:'0494390',nameAr:'المعلوماتية الحيوية',nameEn:'Bioinformatics',hours:4,type:'major',prereqs:['Bot102']},
  {code:'0494401',nameAr:'بيولوجيا الخلية الجزيئية',nameEn:'Molecular Cell Biology',hours:3,type:'major',prereqs:['Bot383']},
  {code:'0494404',nameAr:'الوراثة الجزيئية لأمراض الإنسان',nameEn:'Molecular Genetics of Human Diseases',hours:3,type:'major',prereqs:['Bot231']},
  {code:'0494405',nameAr:'الأساس الجزيئي للسرطان',nameEn:'Molecular Basis of Cancer',hours:3,type:'major',prereqs:['Bot231']},
  {code:'0494415',nameAr:'مختبر الكيمياء الحيوية 1',nameEn:'Biochemistry Lab 1',hours:3,type:'major',prereqs:['Bot271']},
  {code:'0494416',nameAr:'علم الوراثة التطوري في النبات',nameEn:'Evolutionary Plant Genetics',hours:3,type:'major',prereqs:['Bot231']},
  {code:'0494475',nameAr:'تقنية الخلايا',nameEn:'Cell Technology',hours:3,type:'major',prereqs:['Bot281']},
  {code:'0494480',nameAr:'مقدمة في الوراثة الجزيئية',nameEn:'Intro to Molecular Genetics',hours:3,type:'major',prereqs:['BSc281']},
  {code:'0494490',nameAr:'أساسيات التكنولوجيا الحيوية',nameEn:'Fundamentals of Biotechnology',hours:3,type:'major',prereqs:['Bot281']},
  {code:'0494493',nameAr:'تقرير علمي',nameEn:'Scientific Report',hours:1,type:'required',prereqs:[]},
  {code:'0494494',nameAr:'مشروع بحث',nameEn:'Research Project',hours:3,type:'required',prereqs:[]},
];

const RAW_MICRO=[
  {code:'0495106',nameAr:'علم الميكروبيولوجيا',nameEn:'Microbiology',hours:3,type:'major',prereqs:['E161']},
  {code:'0495107',nameAr:'تقنيات دقيقة ومجهرية',nameEn:'Microscopy and Microtechniques',hours:3,type:'major',prereqs:['BSc105','ك110','E162']},
  {code:'0495109',nameAr:'علم الكائنات الدقيقة والحياة',nameEn:'Microbiology and Life',hours:3,type:'major',prereqs:[]},
  {code:'0495203',nameAr:'الأيض والوراثة الميكروبية',nameEn:'Microbial Metabolism and Genetics',hours:3,type:'major',prereqs:['Micro105']},
  {code:'0495204',nameAr:'علم الفيروسات',nameEn:'Virology',hours:3,type:'major',prereqs:['BSc105']},
  {code:'0495205',nameAr:'علم البكتيريا',nameEn:'Bacteriology',hours:3,type:'major',prereqs:['Micro107']},
  {code:'0495206',nameAr:'علم الفطريات',nameEn:'Mycology',hours:3,type:'major',prereqs:['Micro107']},
  {code:'0495207',nameAr:'الطحالب الدقيقة والبروتوزوا',nameEn:'Microalgae and Protozoa',hours:3,type:'major',prereqs:['Micro107']},
  {code:'0495315',nameAr:'التركيب الدقيق للكائنات المجهرية',nameEn:'Fine Structure of Microorganisms',hours:4,type:'major',prereqs:['BSc105','Micro205','Micro207']},
  {code:'0495335',nameAr:'علم الوراثة الميكروبية والبيولوجيا الجزيئية',nameEn:'Microbial Genetics and Molecular Biology',hours:3,type:'major',prereqs:['Micro206','Micro205']},
  {code:'0495343',nameAr:'ميكروبيولوجيا الهواء والماء',nameEn:'Air and Water Microbiology',hours:3,type:'major',prereqs:['Micro206','Micro205']},
  {code:'0495344',nameAr:'الميكروبيولوجيا الصناعية',nameEn:'Industrial Microbiology',hours:3,type:'major',prereqs:['Micro206','Micro205']},
  {code:'0495371',nameAr:'فسيولوجيا الكائنات الدقيقة',nameEn:'Microbial Physiology',hours:3,type:'major',prereqs:['Micro206','Micro205']},
  {code:'0495382',nameAr:'علم المناعة',nameEn:'Immunology',hours:3,type:'major',prereqs:['Micro203']},
  {code:'0495406',nameAr:'التحلل الحيوي',nameEn:'Biodegradation',hours:3,type:'major',prereqs:['Micro206','Micro205']},
  {code:'0495408',nameAr:'ميكروبيولوجيا الغذاء',nameEn:'Food Microbiology',hours:3,type:'major',prereqs:['Micro206','Micro205']},
  {code:'0495409',nameAr:'ميكروبيولوجيا المضادات الحيوية',nameEn:'Antimicrobial Microbiology',hours:3,type:'major',prereqs:['Micro206','Micro205']},
  {code:'0495419',nameAr:'ميكروبيولوجيا التربة والنبات',nameEn:'Soil Plant Microbiology',hours:4,type:'major',prereqs:['Micro206','Micro204']},
  {code:'0495420',nameAr:'مبادئ أمراض النباتات',nameEn:'Principles of Plant Pathology',hours:4,type:'major',prereqs:['Micro206','Micro205']},
  {code:'0495444',nameAr:'علم المناعة الحيوانية',nameEn:'Animal Immunology',hours:3,type:'major',prereqs:['Micro206','Micro205']},
  {code:'0495465',nameAr:'ميكروبيولوجيا البيئات القاسية',nameEn:'Extremophile Microbiology',hours:4,type:'major',prereqs:['Micro206','Micro205']},
  {code:'0495493',nameAr:'تقرير علمي',nameEn:'Scientific Report',hours:1,type:'required',prereqs:[]},
  {code:'0495494',nameAr:'مشروع بحث',nameEn:'Research Project',hours:3,type:'required',prereqs:[]},
];

const RAW_BIOCHEM=[
  {code:'0496217',nameAr:'الكيمياء الحيوية الفيزيائية',nameEn:'Physical Biochemistry',hours:4,type:'major',prereqs:['ك114','BSc271']},
  {code:'0496219',nameAr:'الكيمياء الحيوية الغذائية',nameEn:'Nutritional Biochemistry',hours:3,type:'major',prereqs:['Biochem217']},
  {code:'0496300',nameAr:'مختبر الكيمياء الحيوية',nameEn:'Biochemistry Lab',hours:2,type:'major',prereqs:['Biochem217']},
  {code:'0496315',nameAr:'الكيمياء الحيوية 1',nameEn:'Biochemistry 1',hours:3,type:'major',prereqs:['Biochem217','BSc271']},
  {code:'0496325',nameAr:'علم السموم وتقدير الأخطار',nameEn:'Toxicology and Risk Assessment',hours:2,type:'major',prereqs:['BSc271']},
  {code:'0496333',nameAr:'الكيمياء الحيوية التحليلية',nameEn:'Analytical Biochemistry',hours:3,type:'major',prereqs:['ك236','Biochem217']},
  {code:'0496337',nameAr:'الإنزيمات',nameEn:'Enzymes',hours:2,type:'major',prereqs:['Biochem315']},
  {code:'0496345',nameAr:'الكيمياء الحيوية للهرمونات والعقاقير',nameEn:'Biochemistry of Hormones and Drugs',hours:3,type:'major',prereqs:['Biochem315']},
  {code:'0496369',nameAr:'الكيمياء الحيوية في الوراثة الجزيئية',nameEn:'Biochemistry in Molecular Genetics',hours:2,type:'major',prereqs:['BSc281']},
  {code:'0496372',nameAr:'مقدمة في الوراثة الجزيئية',nameEn:'Intro to Molecular Genetics',hours:3,type:'major',prereqs:['BSc281']},
  {code:'0496400',nameAr:'الكيمياء الحيوية والسرطان',nameEn:'Cancer Biochemistry',hours:3,type:'major',prereqs:['Biochem315']},
  {code:'0496415',nameAr:'الكيمياء الحيوية 2',nameEn:'Biochemistry 2',hours:3,type:'major',prereqs:['Biochem315']},
  {code:'0496420',nameAr:'مختبر الكيمياء الحيوية 2',nameEn:'Biochemistry Lab 2',hours:2,type:'major',prereqs:['Biochem415']},
  {code:'0496432',nameAr:'علم المناعة الخلوية والجزيئية',nameEn:'Cellular and Molecular Immunology',hours:3,type:'major',prereqs:['Biochem315']},
  {code:'0496435',nameAr:'الكيمياء الحيوية الإكلينيكية',nameEn:'Clinical Biochemistry',hours:4,type:'major',prereqs:['Mol415']},
  {code:'0496444',nameAr:'ورشة عمل الكيمياء الحيوية التطبيقية',nameEn:'Applied Biochemistry Workshop',hours:3,type:'major',prereqs:['Biochem315']},
  {code:'0496464',nameAr:'التغذية',nameEn:'Nutrition',hours:3,type:'major',prereqs:['Biochem315']},
  {code:'0496466',nameAr:'مختبر التغذية',nameEn:'Nutrition Lab',hours:1,type:'major',prereqs:['Biochem315']},
  {code:'0496473',nameAr:'الطاقة الحيوية',nameEn:'Bioenergetics',hours:3,type:'major',prereqs:['Biochem315']},
  {code:'0496482',nameAr:'مقدمة في البيولوجيا الوراثية',nameEn:'Intro to Genetic Biology',hours:3,type:'major',prereqs:['Biochem372']},
  {code:'0496490',nameAr:'أساسيات التكنولوجيا الوراثية',nameEn:'Fundamentals of Genetic Technology',hours:3,type:'major',prereqs:['Biochem482']},
  {code:'0496493',nameAr:'تقرير علمي',nameEn:'Scientific Report',hours:1,type:'required',prereqs:[]},
  {code:'0496494',nameAr:'مشروع بحث',nameEn:'Research Project',hours:3,type:'required',prereqs:[]},
];

const RAW_MOLECULAR=[
  {code:'0497121',nameAr:'مقدمة في التكنولوجيا الحيوية',nameEn:'Intro to Biotechnology',hours:3,type:'major',prereqs:['BSc103']},
  {code:'0497282',nameAr:'زراعة الأنسجة الحيوانية والنباتية',nameEn:'Animal and Plant Tissue Culture',hours:3,type:'major',prereqs:['BSc101']},
  {code:'0497283',nameAr:'زراعة الأنسجة الحيوانية',nameEn:'Animal Tissue Culture',hours:3,type:'major',prereqs:['BSc281']},
  {code:'0497291',nameAr:'تقنيات في الكيمياء الحيوية',nameEn:'Biochemistry Techniques',hours:4,type:'major',prereqs:['BSc271']},
  {code:'0497332',nameAr:'علم الوراثة الخلوية',nameEn:'Cytogenetics',hours:3,type:'major',prereqs:['Mol231']},
  {code:'0497371',nameAr:'مقدمة في الوراثة الجزيئية',nameEn:'Intro to Molecular Genetics',hours:3,type:'major',prereqs:['BSc281','BSc271']},
  {code:'0497383',nameAr:'بيولوجيا الخلية الجزيئية',nameEn:'Molecular Cell Biology',hours:3,type:'major',prereqs:['BSc281']},
  {code:'0497385',nameAr:'علم الوراثة الجزيئية للنبات',nameEn:'Plant Molecular Genetics',hours:3,type:'major',prereqs:['Bot281']},
  {code:'0497390',nameAr:'المعلوماتية الحيوية',nameEn:'Bioinformatics',hours:4,type:'major',prereqs:['Bot231']},
  {code:'0497401',nameAr:'علم المناعة الحيوانية الخلوية',nameEn:'Cellular Animal Immunology',hours:3,type:'major',prereqs:['Mol371']},
  {code:'0497403',nameAr:'علم الغدد الصماء',nameEn:'Endocrinology',hours:3,type:'major',prereqs:['Mol371']},
  {code:'0497404',nameAr:'الوراثة الجزيئية لأمراض الإنسان',nameEn:'Molecular Genetics of Human Diseases',hours:3,type:'major',prereqs:['Mol371']},
  {code:'0497405',nameAr:'الأساس الجزيئي للسرطان',nameEn:'Molecular Basis of Cancer',hours:3,type:'major',prereqs:['Mol371']},
  {code:'0497410',nameAr:'التطور الجزيئي',nameEn:'Molecular Evolution',hours:3,type:'major',prereqs:['Mol371']},
  {code:'0497475',nameAr:'تقنية الخلايا الجذعية والتجديدية',nameEn:'Stem Cell and Regenerative Technology',hours:3,type:'major',prereqs:['Mol371']},
  {code:'0497480',nameAr:'مقدمة في الهندسة البيولوجية الجزيئية',nameEn:'Intro to Molecular Bioengineering',hours:3,type:'major',prereqs:['Mol371']},
  {code:'0497482',nameAr:'مقدمة في البيولوجيا الوراثية',nameEn:'Intro to Genetic Biology',hours:2,type:'major',prereqs:['Mol371']},
  {code:'0497483',nameAr:'مختبر البيولوجيا الجزيئية',nameEn:'Molecular Biology Lab',hours:3,type:'major',prereqs:['Mol482']},
  {code:'0497485',nameAr:'مقدمة في الجينوم',nameEn:'Intro to Genomics',hours:3,type:'major',prereqs:['Mol371']},
  {code:'0497490',nameAr:'أساسيات التكنولوجيا الوراثية الحيوية',nameEn:'Fundamentals of Genetic Biotechnology',hours:3,type:'major',prereqs:['Mol371']},
  {code:'0497493',nameAr:'تقرير علمي',nameEn:'Scientific Report',hours:1,type:'required',prereqs:[]},
  {code:'0497494',nameAr:'مشروع بحث',nameEn:'Research Project',hours:3,type:'required',prereqs:[]},
  {code:'0497495',nameAr:'تطبيقات في البيولوجيا الحيوية',nameEn:'Applications in Biosciences',hours:3,type:'elective',prereqs:[]},
];

function build(rawArr){
  return [...SHARED, ...rawArr].map(c=>({
    ...c,
    level:c.level||lv(c.code),
    prereqs:mp(c.prereqs),
  }));
}

export const CATALOG_SEED={
  animal:   {major:'animal',   courses:build(RAW_ANIMAL)},
  plant:    {major:'plant',    courses:build(RAW_PLANT)},
  micro:    {major:'micro',    courses:build(RAW_MICRO)},
  biochem:  {major:'biochem',  courses:build(RAW_BIOCHEM)},
  molecular:{major:'molecular',courses:build(RAW_MOLECULAR)},
};

// ── Support Sheet Catalogs ──────────────────────────────────────
// Normalize dash-codes like "0490-101" → "0490101"
function nd(code){return code.replace(/-/g,'');}
function buildSupport(raw){
  return raw.map(c=>({
    ...c,
    code: nd(c.code),
    level: c.level||lv(nd(c.code)),
    prereqs: c.prereqs.map(p=>nd(p)),
  }));
}

const RAW_SUPPORT_FORENSIC=[
  {code:'0490-101',nameAr:'بيولوجيا 1',nameEn:'Biology 1',hours:3,type:'major',prereqs:[]},
  {code:'0490-102',nameAr:'بيولوجيا 2',nameEn:'Biology 2',hours:3,type:'major',prereqs:[]},
  {code:'0490-103',nameAr:'بيولوجيا 3',nameEn:'Biology 3',hours:3,type:'major',prereqs:[]},
  {code:'0490-105',nameAr:'علم الكائنات الدقيقة',nameEn:'Microbiology',hours:3,type:'major',prereqs:[]},
  {code:'0493-201',nameAr:'بيولوجيا الحبليات',nameEn:'Chordate Biology',hours:4,type:'major',prereqs:[]},
  {code:'0493-203',nameAr:'بيولوجيا الخلية',nameEn:'Cell Biology',hours:4,type:'major',prereqs:[]},
  {code:'0493-205',nameAr:'بيولوجيا اللافقاريات 1',nameEn:'Invertebrate Biology 1',hours:4,type:'major',prereqs:[]},
  {code:'0493-305',nameAr:'علم الأجنة',nameEn:'Embryology',hours:4,type:'major',prereqs:[]},
  {code:'0494-141',nameAr:'الزراعة والمجتمع الكويتي',nameEn:'Agriculture and Kuwaiti Society',hours:3,type:'major',prereqs:[]},
  {code:'0494-142',nameAr:'علم النبات الزراعي',nameEn:'Agricultural Botany',hours:3,type:'major',prereqs:[]},
  {code:'0494-241',nameAr:'علم النبات الاقتصادي',nameEn:'Economic Botany',hours:3,type:'elective',prereqs:[]},
  {code:'0494-245',nameAr:'بستنة 1',nameEn:'Horticulture 1',hours:3,type:'elective',prereqs:[]},
  {code:'0494-266',nameAr:'الزراعة والتربة',nameEn:'Agriculture and Soil',hours:3,type:'elective',prereqs:[]},
  {code:'0494-337',nameAr:'زراعة الأنسجة في النبات',nameEn:'Plant Tissue Culture',hours:3,type:'elective',prereqs:[]},
  {code:'0494-345',nameAr:'بستنة 2',nameEn:'Horticulture 2',hours:3,type:'elective',prereqs:[]},
  {code:'0494-363',nameAr:'الإنتاج النباتي في بيئة قاحلة',nameEn:'Plant Production in Arid Environment',hours:3,type:'elective',prereqs:[]},
  {code:'0494-372',nameAr:'فسيولوجيا نبات متقدم',nameEn:'Advanced Plant Physiology',hours:4,type:'elective',prereqs:[]},
  {code:'0494-381',nameAr:'وقاية نبات',nameEn:'Plant Protection',hours:3,type:'elective',prereqs:[]},
  {code:'0494-434',nameAr:'تربية نبات',nameEn:'Plant Breeding',hours:3,type:'elective',prereqs:[]},
  {code:'0494-437',nameAr:'التقنيات الحيوية الزراعية',nameEn:'Agricultural Biotechnology',hours:3,type:'elective',prereqs:[]},
  {code:'0494-466',nameAr:'علم البيئة الزراعية',nameEn:'Agricultural Ecology',hours:3,type:'elective',prereqs:[]},
  {code:'0494-474',nameAr:'الإكثار النباتي',nameEn:'Plant Propagation',hours:3,type:'elective',prereqs:[]},
  {code:'0496-217',nameAr:'الكيمياء البيولوجية',nameEn:'Biological Chemistry',hours:4,type:'major',prereqs:[]},
  {code:'0496-300',nameAr:'مختبر الكيمياء الحيوية 1',nameEn:'Biochemistry Lab 1',hours:2,type:'major',prereqs:[]},
  {code:'0496-315',nameAr:'الكيمياء الحيوية 1',nameEn:'Biochemistry 1',hours:3,type:'major',prereqs:[]},
  {code:'0496-337',nameAr:'الإنزيمات',nameEn:'Enzymology',hours:3,type:'major',prereqs:[]},
  {code:'0496-372',nameAr:'مقدمة في الوراثة الجزيئية',nameEn:'Intro to Molecular Genetics',hours:3,type:'major',prereqs:[]},
  {code:'0496-415',nameAr:'الكيمياء الحيوية 2',nameEn:'Biochemistry 2',hours:3,type:'major',prereqs:[]},
  {code:'0490-271',nameAr:'مقدمة في الكيمياء الحيوية',nameEn:'Intro to Biochemistry',hours:4,type:'support',prereqs:[]},
  {code:'0497-291',nameAr:'تقنيات في الكيمياء الحيوية',nameEn:'Techniques in Biochemistry',hours:4,type:'major',prereqs:[]},
  {code:'0497-371',nameAr:'مقدمة في الوراثة الجزيئية',nameEn:'Intro to Molecular Genetics',hours:3,type:'major',prereqs:[]},
  {code:'0497-482',nameAr:'مقدمة في الوراثة الجزيئية',nameEn:'Intro to Molecular Genetics',hours:3,type:'major',prereqs:[]},
  {code:'0497-483',nameAr:'مختبر البيولوجيا الجزيئية',nameEn:'Molecular Biology Lab',hours:2,type:'major',prereqs:[]},
  {code:'0409-166',nameAr:'الثقافة الجنائية',nameEn:'Forensic Culture',hours:3,type:'required',prereqs:[]},
  {code:'0409-201',nameAr:'مقدمة في علم الأدلة الجنائية',nameEn:'Intro to Forensic Science',hours:3,type:'required',prereqs:['0490-101','0420-101','0420-105','0420-110','0420-111']},
  {code:'0409-238',nameAr:'الكيمياء التحليلية',nameEn:'Analytical Chemistry',hours:3,type:'major',prereqs:['0420-102','0420-106','0420-114']},
  {code:'0409-259',nameAr:'تطبيقات المجهر في الأدلة الجنائية',nameEn:'Microscopy Applications in Forensic Evidence',hours:2,type:'major',prereqs:['0490-101']},
  {code:'0409-301',nameAr:'التحليل الجنائي للأدلة البيولوجية',nameEn:'Forensic Analysis of Biological Evidence',hours:4,type:'major',prereqs:['0409-201']},
  {code:'0409-305',nameAr:'الكيمياء الجنائية وتحليل الأدلة المادية',nameEn:'Forensic Chemistry and Physical Evidence Analysis',hours:4,type:'major',prereqs:['0497-201','0420-259']},
  {code:'0409-310',nameAr:'فحص مسرح الجريمة وتقنيات جمع الأدلة',nameEn:'Crime Scene Examination and Evidence Collection',hours:2,type:'major',prereqs:['0409-201']},
  {code:'0496-402',nameAr:'علم السميات الجنائي',nameEn:'Forensic Toxicology',hours:2,type:'major',prereqs:['0490-271','0420-255','0409-301']},
  {code:'0409-207',nameAr:'الطب الشرعي الجنائي',nameEn:'Forensic Legal Medicine',hours:2,type:'elective',prereqs:['0490-101','0420-101','0420-110']},
  {code:'0409-400',nameAr:'مبادئ الإجراءات والمحاكمات الجزائية',nameEn:'Principles of Criminal Procedures and Trials',hours:3,type:'elective',prereqs:['0497-201','0420-166']},
  {code:'0420-406',nameAr:'علم المخدرات الجنائي',nameEn:'Forensic Drug Science',hours:2,type:'elective',prereqs:['0409-301','0490-271','0420-255']},
  {code:'0409-486',nameAr:'الأخلاقيات المهنية لعلم الأدلة الجنائية',nameEn:'Professional Ethics in Forensic Science',hours:2,type:'elective',prereqs:['0409-301']},
  {code:'0409-496',nameAr:'كتابة التقرير الجنائي',nameEn:'Forensic Report Writing',hours:1,type:'elective',prereqs:['0409-301']},
  {code:'0409-498',nameAr:'مشروع بحث في الأدلة الجنائية',nameEn:'Research Project in Forensic Evidence',hours:3,type:'elective',prereqs:['0409-301']},
];

// ── بيولوجيا الحيوان المساند ──────────────────────────────────
// (لغير طلبة العلوم البيولوجية — يشمل الإلزامي + الاختياري)
const RAW_SUPPORT_ANIMAL=[
  // إلزامي
  {code:'0490-101',nameAr:'بيولوجيا 1',nameEn:'Biology 1',hours:3,type:'required',prereqs:[]},
  {code:'0490-103',nameAr:'بيولوجيا 3',nameEn:'Biology 3',hours:3,type:'required',prereqs:['0490-101']},
  {code:'0493-201',nameAr:'بيولوجيا الحبليات',nameEn:'Chordate Biology',hours:4,type:'major',prereqs:['0490-101']},
  {code:'0493-203',nameAr:'بيولوجيا الخلية',nameEn:'Cell Biology',hours:4,type:'major',prereqs:['0490-101']},
  {code:'0493-205',nameAr:'بيولوجيا اللافقاريات 1',nameEn:'Invertebrate Biology 1',hours:4,type:'major',prereqs:['0490-101']},
  {code:'0493-305',nameAr:'علم الأجنة',nameEn:'Embryology',hours:4,type:'major',prereqs:['0493-201']},
  // اختياري — من مقررات بيولوجيا الحيوان مستوى 200+
  {code:'0493-206',nameAr:'التنوع الحيواني II: الحبليات',nameEn:'Animal Diversity II: Chordates',hours:3,type:'elective',prereqs:['0490-101']},
  {code:'0493-306',nameAr:'علم البيئة',nameEn:'Ecology',hours:4,type:'elective',prereqs:['0493-205']},
  {code:'0493-307',nameAr:'علم الحيوان الاقتصادي',nameEn:'Economic Zoology',hours:3,type:'elective',prereqs:['0493-205']},
  {code:'0493-308',nameAr:'علم وظائف الجهاز العصبي',nameEn:'Neuroscience',hours:3,type:'elective',prereqs:['0493-205']},
  {code:'0493-311',nameAr:'علم وظائف أعضاء الجسم',nameEn:'Animal Physiology',hours:3,type:'elective',prereqs:['0490-103']},
  {code:'0493-312',nameAr:'علم وظائف الحيوانات المقارن',nameEn:'Comparative Animal Physiology',hours:3,type:'elective',prereqs:['0493-205']},
  {code:'0493-320',nameAr:'تطور الحيوان ونظم تصنيفه',nameEn:'Animal Evolution and Taxonomy',hours:3,type:'elective',prereqs:['0490-103']},
  {code:'0493-330',nameAr:'سلوك الحيوان',nameEn:'Animal Behavior',hours:3,type:'elective',prereqs:['0493-320']},
  {code:'0493-401',nameAr:'النظم الحيوانية',nameEn:'Animal Systems',hours:3,type:'elective',prereqs:['0493-311']},
  {code:'0493-408',nameAr:'التطور',nameEn:'Evolution',hours:2,type:'elective',prereqs:['0493-320']},
  {code:'0493-409',nameAr:'علم المناعة',nameEn:'Immunology',hours:3,type:'elective',prereqs:['0490-103']},
];

// ── بيولوجيا النبات المساند ────────────────────────────────────
// (لغير طلبة العلوم البيولوجية)
const RAW_SUPPORT_PLANT=[
  // إلزامي
  {code:'0490-101',nameAr:'بيولوجيا 1',nameEn:'Biology 1',hours:3,type:'required',prereqs:[]},
  {code:'0490-102',nameAr:'بيولوجيا 2',nameEn:'Biology 2',hours:3,type:'required',prereqs:['0490-101']},
  // اختياري — من مقررات بيولوجيا النبات (6 وحدات على الأقل من مستوى 300 أو 400)
  {code:'0494-102',nameAr:'التركيب والوظيفة في النبات',nameEn:'Plant Structure and Function',hours:3,type:'elective',prereqs:['0490-101']},
  {code:'0494-211',nameAr:'مبادئ علم تصنيف النبات',nameEn:'Plant Taxonomy Principles',hours:3,type:'elective',prereqs:['0494-102']},
  {code:'0494-221',nameAr:'مبادئ علم الطحالب',nameEn:'Principles of Algology',hours:3,type:'elective',prereqs:['0490-101']},
  {code:'0494-231',nameAr:'مبادئ علم الوراثة',nameEn:'Principles of Genetics',hours:3,type:'elective',prereqs:['0490-101']},
  {code:'0494-241',nameAr:'علم النبات الاقتصادي',nameEn:'Economic Botany',hours:3,type:'elective',prereqs:['0494-102']},
  {code:'0494-261',nameAr:'مبادئ علم البيئة النباتية',nameEn:'Plant Ecology Principles',hours:3,type:'elective',prereqs:['0494-102']},
  {code:'0494-271',nameAr:'مقدمة فسيولوجيا النبات',nameEn:'Intro to Plant Physiology',hours:3,type:'elective',prereqs:['0494-102']},
  {code:'0494-313',nameAr:'علم النبات القديم والتطور',nameEn:'Paleobotany and Evolution',hours:3,type:'elective',prereqs:['0490-102']},
  {code:'0494-322',nameAr:'علم النبات البحري',nameEn:'Marine Botany',hours:3,type:'elective',prereqs:['0494-221']},
  {code:'0494-332',nameAr:'علم الوراثة الخلوية',nameEn:'Cytogenetics',hours:3,type:'elective',prereqs:['0494-231']},
  {code:'0494-352',nameAr:'علم تصنيف النبات المتقدم',nameEn:'Advanced Plant Taxonomy',hours:3,type:'elective',prereqs:['0494-211']},
  {code:'0494-362',nameAr:'علم التربة',nameEn:'Soil Science',hours:3,type:'elective',prereqs:['0494-261']},
  {code:'0494-372',nameAr:'فسيولوجيا نبات متقدم',nameEn:'Advanced Plant Physiology',hours:4,type:'elective',prereqs:['0494-271']},
  {code:'0494-381',nameAr:'وقاية نبات',nameEn:'Plant Protection',hours:3,type:'elective',prereqs:['0494-102']},
  {code:'0494-390',nameAr:'المعلوماتية الحيوية',nameEn:'Bioinformatics',hours:4,type:'elective',prereqs:['0494-102']},
];

// ── علم النبات الزراعي المساند ─────────────────────────────────
// (لغير طلبة بيولوجيا النبات)
const RAW_SUPPORT_AGRI=[
  // إلزامي
  {code:'0494-141',nameAr:'الزراعة والمجتمع الكويتي',nameEn:'Agriculture and Kuwaiti Society',hours:3,type:'required',prereqs:[]},
  {code:'0494-142',nameAr:'علم النبات الزراعي',nameEn:'Agricultural Botany',hours:3,type:'required',prereqs:[]},
  // اختياري (6 وحدات على الأقل من مستوى 300 أو 400)
  {code:'0494-241',nameAr:'علم النبات الاقتصادي',nameEn:'Economic Botany',hours:3,type:'elective',prereqs:['0494-142']},
  {code:'0494-245',nameAr:'بستنة 1',nameEn:'Horticulture 1',hours:3,type:'elective',prereqs:['0494-142']},
  {code:'0494-266',nameAr:'الزراعة والتربة',nameEn:'Agriculture and Soil',hours:3,type:'elective',prereqs:['0494-142']},
  {code:'0494-337',nameAr:'الزراعة النسيجية في النبات',nameEn:'Plant Tissue Culture',hours:3,type:'elective',prereqs:['0494-142']},
  {code:'0494-345',nameAr:'بستنة 2',nameEn:'Horticulture 2',hours:3,type:'elective',prereqs:['0494-245']},
  {code:'0494-363',nameAr:'الإنتاج النباتي في بيئة قاحلة',nameEn:'Plant Production in Arid Environment',hours:3,type:'elective',prereqs:['0494-142']},
  {code:'0494-372',nameAr:'فسيولوجيا نبات متقدم',nameEn:'Advanced Plant Physiology',hours:4,type:'elective',prereqs:['0494-142']},
  {code:'0494-381',nameAr:'وقاية نبات',nameEn:'Plant Protection',hours:3,type:'elective',prereqs:['0494-142']},
  {code:'0494-434',nameAr:'تربية نبات',nameEn:'Plant Breeding',hours:3,type:'elective',prereqs:['0494-142']},
  {code:'0494-437',nameAr:'التقنيات الحيوية الزراعية',nameEn:'Agricultural Biotechnology',hours:3,type:'elective',prereqs:['0494-142']},
  {code:'0494-466',nameAr:'علم البيئة الزراعية',nameEn:'Agricultural Ecology',hours:3,type:'elective',prereqs:['0494-142']},
  {code:'0494-474',nameAr:'الإكثار النباتي',nameEn:'Plant Propagation',hours:3,type:'elective',prereqs:['0494-142']},
];

// ── الميكروبيولوجيا المساند ────────────────────────────────────
// (لغير طلبة العلوم البيولوجية)
const RAW_SUPPORT_MICRO=[
  // إلزامي
  {code:'0490-105',nameAr:'علم الكائنات الدقيقة',nameEn:'Microbiology',hours:3,type:'required',prereqs:[]},
  // اختياري — من مقررات الميكروبيولوجيا (6 وحدات على الأقل من مستوى 300 أو 400)
  {code:'0495-106',nameAr:'علم الميكروبيولوجيا',nameEn:'Microbiology',hours:3,type:'elective',prereqs:['0490-105']},
  {code:'0495-107',nameAr:'تقنيات دقيقة ومجهرية',nameEn:'Microscopy and Microtechniques',hours:3,type:'elective',prereqs:['0490-105']},
  {code:'0495-203',nameAr:'الأيض والوراثة الميكروبية',nameEn:'Microbial Metabolism and Genetics',hours:3,type:'elective',prereqs:['0495-106']},
  {code:'0495-204',nameAr:'علم الفيروسات',nameEn:'Virology',hours:3,type:'elective',prereqs:['0490-105']},
  {code:'0495-205',nameAr:'علم البكتيريا',nameEn:'Bacteriology',hours:3,type:'elective',prereqs:['0495-107']},
  {code:'0495-206',nameAr:'علم الفطريات',nameEn:'Mycology',hours:3,type:'elective',prereqs:['0495-107']},
  {code:'0495-207',nameAr:'الطحالب الدقيقة والبروتوزوا',nameEn:'Microalgae and Protozoa',hours:3,type:'elective',prereqs:['0495-107']},
  {code:'0495-315',nameAr:'التركيب الدقيق للكائنات المجهرية',nameEn:'Fine Structure of Microorganisms',hours:4,type:'elective',prereqs:['0495-205']},
  {code:'0495-335',nameAr:'علم الوراثة الميكروبية والبيولوجيا الجزيئية',nameEn:'Microbial Genetics and Molecular Biology',hours:3,type:'elective',prereqs:['0495-205']},
  {code:'0495-343',nameAr:'ميكروبيولوجيا الهواء والماء',nameEn:'Air and Water Microbiology',hours:3,type:'elective',prereqs:['0495-205']},
  {code:'0495-344',nameAr:'الميكروبيولوجيا الصناعية',nameEn:'Industrial Microbiology',hours:3,type:'elective',prereqs:['0495-205']},
  {code:'0495-371',nameAr:'فسيولوجيا الكائنات الدقيقة',nameEn:'Microbial Physiology',hours:3,type:'elective',prereqs:['0495-205']},
  {code:'0495-382',nameAr:'علم المناعة',nameEn:'Immunology',hours:3,type:'elective',prereqs:['0495-203']},
  {code:'0495-406',nameAr:'التحلل الحيوي',nameEn:'Biodegradation',hours:3,type:'elective',prereqs:['0495-205']},
  {code:'0495-408',nameAr:'ميكروبيولوجيا الغذاء',nameEn:'Food Microbiology',hours:3,type:'elective',prereqs:['0495-205']},
  {code:'0495-409',nameAr:'ميكروبيولوجيا المضادات الحيوية',nameEn:'Antimicrobial Microbiology',hours:3,type:'elective',prereqs:['0495-205']},
  {code:'0495-465',nameAr:'ميكروبيولوجيا البيئات القاسية',nameEn:'Extremophile Microbiology',hours:4,type:'elective',prereqs:['0495-205']},
];

// ── الكيمياء الحيوية المساند ────────────────────────────────────
// (لغير طلبة العلوم البيولوجية — الأشمل)
const RAW_SUPPORT_BIOCHEM=[
  // إلزامي
  {code:'0490-271',nameAr:'مقدمة في الكيمياء الحيوية',nameEn:'Intro to Biochemistry',hours:4,type:'required',prereqs:[]},
  {code:'0496-217',nameAr:'الكيمياء البيولوجية',nameEn:'Biological Chemistry',hours:4,type:'required',prereqs:['0490-271']},
  {code:'0496-300',nameAr:'مختبر الكيمياء الحيوية 1',nameEn:'Biochemistry Lab 1',hours:2,type:'required',prereqs:['0496-217']},
  {code:'0496-315',nameAr:'الكيمياء الحيوية 1',nameEn:'Biochemistry 1',hours:3,type:'required',prereqs:['0496-217']},
  {code:'0496-337',nameAr:'الإنزيمات',nameEn:'Enzymology',hours:3,type:'required',prereqs:['0496-315']},
  {code:'0496-415',nameAr:'الكيمياء الحيوية 2',nameEn:'Biochemistry 2',hours:3,type:'required',prereqs:['0496-315']},
  // اختياري — من مقررات الكيمياء الحيوية مستوى 200+ (لا يحسب 0496-402)
  {code:'0496-325',nameAr:'علم السموم وتقدير الأخطار',nameEn:'Toxicology and Risk Assessment',hours:2,type:'elective',prereqs:['0490-271']},
  {code:'0496-333',nameAr:'الكيمياء الحيوية التحليلية',nameEn:'Analytical Biochemistry',hours:3,type:'elective',prereqs:['0496-217']},
  {code:'0496-345',nameAr:'الكيمياء الحيوية للهرمونات والعقاقير',nameEn:'Biochemistry of Hormones and Drugs',hours:3,type:'elective',prereqs:['0496-315']},
  {code:'0496-372',nameAr:'مقدمة في الوراثة الجزيئية',nameEn:'Intro to Molecular Genetics',hours:3,type:'elective',prereqs:['0490-271']},
  {code:'0496-420',nameAr:'مختبر الكيمياء الحيوية 2',nameEn:'Biochemistry Lab 2',hours:2,type:'elective',prereqs:['0496-415']},
  {code:'0496-432',nameAr:'علم المناعة الخلوية والجزيئية',nameEn:'Cellular and Molecular Immunology',hours:3,type:'elective',prereqs:['0496-315']},
  {code:'0496-435',nameAr:'الكيمياء الحيوية الإكلينيكية',nameEn:'Clinical Biochemistry',hours:4,type:'elective',prereqs:['0496-415']},
  {code:'0496-444',nameAr:'ورشة عمل الكيمياء الحيوية التطبيقية',nameEn:'Applied Biochemistry Workshop',hours:3,type:'elective',prereqs:['0496-315']},
  {code:'0496-464',nameAr:'التغذية',nameEn:'Nutrition',hours:3,type:'elective',prereqs:['0496-315']},
  {code:'0496-473',nameAr:'الطاقة الحيوية',nameEn:'Bioenergetics',hours:3,type:'elective',prereqs:['0496-315']},
];

// ── البيولوجيا الجزيئية المساند ────────────────────────────────
// (لطلبة العلوم البيولوجية ما عدا تخصص البيولوجيا الجزيئية)
const RAW_SUPPORT_MOLECULAR=[
  // إلزامي
  {code:'0497-291',nameAr:'تقنيات في الكيمياء الحيوية',nameEn:'Techniques in Biochemistry',hours:4,type:'required',prereqs:[]},
  {code:'0497-371',nameAr:'مقدمة في الوراثة الجزيئية',nameEn:'Intro to Molecular Genetics',hours:3,type:'required',prereqs:['0497-291']},
  {code:'0497-482',nameAr:'مقدمة في الوراثة الجزيئية',nameEn:'Intro to Molecular Genetics',hours:3,type:'required',prereqs:['0497-371']},
  {code:'0497-483',nameAr:'مختبر البيولوجيا الجزيئية',nameEn:'Molecular Biology Lab',hours:2,type:'required',prereqs:['0497-482']},
  // اختياري — 12 وحدة (6 وحدات على الأقل من مستوى 400)
  {code:'0497-383',nameAr:'بيولوجيا الخلية الجزيئية',nameEn:'Molecular Cell Biology',hours:3,type:'elective',prereqs:['0497-371']},
  {code:'0497-401',nameAr:'علم المناعة الحيوانية الخلوية',nameEn:'Cellular Animal Immunology',hours:3,type:'elective',prereqs:['0497-371']},
  {code:'0497-403',nameAr:'علم الغدد الصماء',nameEn:'Endocrinology',hours:3,type:'elective',prereqs:['0497-371']},
  {code:'0497-404',nameAr:'الوراثة الجزيئية لأمراض الإنسان',nameEn:'Molecular Genetics of Human Diseases',hours:3,type:'elective',prereqs:['0497-371']},
  {code:'0497-405',nameAr:'الأساس الجزيئي للسرطان',nameEn:'Molecular Basis of Cancer',hours:3,type:'elective',prereqs:['0497-371']},
  {code:'0497-410',nameAr:'التطور الجزيئي',nameEn:'Molecular Evolution',hours:3,type:'elective',prereqs:['0497-371']},
  {code:'0497-475',nameAr:'تقنية الخلايا الجذعية والتجديدية',nameEn:'Stem Cell and Regenerative Technology',hours:3,type:'elective',prereqs:['0497-371']},
  {code:'0497-480',nameAr:'مقدمة في الهندسة البيولوجية الجزيئية',nameEn:'Intro to Molecular Bioengineering',hours:3,type:'elective',prereqs:['0497-371']},
  {code:'0497-485',nameAr:'مقدمة في الجينوم',nameEn:'Intro to Genomics',hours:3,type:'elective',prereqs:['0497-371']},
  {code:'0497-490',nameAr:'أساسيات التكنولوجيا الوراثية الحيوية',nameEn:'Fundamentals of Genetic Biotechnology',hours:3,type:'elective',prereqs:['0497-371']},
];

export const SUPPORT_CATALOG_SEED={
  forensic: {major:'forensic', courses:buildSupport(RAW_SUPPORT_FORENSIC)},
  animal:   {major:'animal',   courses:buildSupport(RAW_SUPPORT_ANIMAL)},
  plant:    {major:'plant',    courses:buildSupport(RAW_SUPPORT_PLANT)},
  agri:     {major:'agri',     courses:buildSupport(RAW_SUPPORT_AGRI)},
  micro:    {major:'micro',    courses:buildSupport(RAW_SUPPORT_MICRO)},
  biochem:  {major:'biochem',  courses:buildSupport(RAW_SUPPORT_BIOCHEM)},
  molecular:{major:'molecular',courses:buildSupport(RAW_SUPPORT_MOLECULAR)},
};
