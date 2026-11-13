export type SupportedLanguage = 'en' | 'hi' | 'or';

export interface TranslationDictionary {
  appName: string;
  tagline: string;
  disclaimerTitle: string;
  disclaimerNotice: string;
  disclaimerBullet1: string;
  disclaimerBullet2: string;
  disclaimerBullet3: string;
  acceptAndContinue: string;
  setupProfileTitle: string;
  setupProfileSub: string;
  ageLabel: string;
  agePlaceholder: string;
  genderLabel: string;
  genderMale: string;
  genderFemale: string;
  genderOther: string;
  saveProfile: string;
  scanCameraBtn: string;
  scanGalleryBtn: string;
  pastReportsBtn: string;
  demoReportBtn: string;
  readingReport: string;
  processingStep1: string;
  processingStep2: string;
  processingStep3: string;
  statusGreen: string;
  statusYellow: string;
  statusRed: string;
  statusGreenSub: string;
  statusYellowSub: string;
  statusRedSub: string;
  emergencyBanner: string;
  emergencySub: string;
  bodyMapTitle: string;
  bodyMapSub: string;
  findingsTitle: string;
  findingsSub: string;
  everythingElseNormal: string;
  viewNormalTests: string;
  hideNormalTests: string;
  labRange: string;
  generalRange: string;
  valueLow: string;
  valueNormal: string;
  valueHigh: string;
  whatThisMeans: string;
  symptomsToWatch: string;
  howUrgent: string;
  urgencyRoutine: string;
  urgencySoon: string;
  urgencyToday: string;
  whatYouCanDo: string;
  doctorQuestions: string;
  downloadPdf: string;
  readAloud: string;
  readingActive: string;
  stopReadAloud: string;
  saveReport: string;
  savedSuccess: string;
  reportAlreadySaved: string;
  permanentFooter: string;
  deleteDataBtn: string;
  deleteDataConfirm: string;
  privacyNote: string;
  noPastReports: string;
  trendTitle: string;
  trendBetter: string;
  trendSame: string;
  trendWorse: string;
  retakePhoto: string;
  blurryWarning: string;
  blurryProceed: string;
  addAnotherPage: string;
  analyzePages: string;
  pagesCaptured: string;
  frontView: string;
  backView: string;
  offlineTitle: string;
  offlineDesc: string;
  offlineScanNotice: string;
  backToHome: string;
  tapBodyPartHint: string;
  installApp: string;
  installAppIos: string;
}

export const translations: Record<SupportedLanguage, TranslationDictionary> = {
  en: {
    appName: 'ReportSamjho',
    tagline: 'Understand your medical report in simple visuals',
    disclaimerTitle: 'Important Notice',
    disclaimerNotice: 'This app explains reports in simple words. It does not give a diagnosis or prescribe medicines.',
    disclaimerBullet1: 'Explains medical terms simply',
    disclaimerBullet2: 'Shows if results are normal or need doctor attention',
    disclaimerBullet3: 'Never takes the place of a registered doctor',
    acceptAndContinue: 'I Understand & Accept',
    setupProfileTitle: 'Tell us a little about you',
    setupProfileSub: 'Used only to match standard normal lab ranges on your phone.',
    ageLabel: 'Your Age (Years)',
    agePlaceholder: 'e.g. 45',
    genderLabel: 'Gender',
    genderMale: 'Male',
    genderFemale: 'Female',
    genderOther: 'Other',
    saveProfile: 'Continue to Home',
    scanCameraBtn: 'Scan Report with Camera',
    scanGalleryBtn: 'Upload from Photos / Files',
    pastReportsBtn: 'My Past Reports',
    demoReportBtn: 'Try Demo Report (No Scan Needed)',
    readingReport: 'Reading your report...',
    processingStep1: 'Looking at report details...',
    processingStep2: 'Checking normal healthy ranges...',
    processingStep3: 'Preparing clear visual summary...',
    statusGreen: 'All Normal',
    statusYellow: 'See Doctor Soon',
    statusRed: 'See Doctor Today',
    statusGreenSub: 'Your tests look within healthy limits.',
    statusYellowSub: 'Some values need a routine doctor check.',
    statusRedSub: 'Important findings need doctor care right away.',
    emergencyBanner: 'Go to a doctor or hospital today.',
    emergencySub: 'One or more tests are in an urgent range. Do not wait.',
    bodyMapTitle: 'Body Area Affected',
    bodyMapSub: 'Tap the highlighted body part to see what was checked.',
    findingsTitle: 'Report Findings',
    findingsSub: 'Values outside normal are shown below.',
    everythingElseNormal: 'All other tests are normal',
    viewNormalTests: 'Show normal tests',
    hideNormalTests: 'Hide normal tests',
    labRange: 'Lab Range',
    generalRange: 'General range, not from your lab',
    valueLow: 'Low',
    valueNormal: 'Normal',
    valueHigh: 'High',
    whatThisMeans: 'What this may mean',
    symptomsToWatch: 'Symptoms to watch for',
    howUrgent: 'How Urgent',
    urgencyRoutine: 'Routine — Check on your next visit',
    urgencySoon: 'Soon — Visit a doctor in 2 to 3 days',
    urgencyToday: 'Today — Visit a doctor or clinic today',
    whatYouCanDo: 'What you can do safely',
    doctorQuestions: 'Questions to ask your doctor',
    downloadPdf: 'Download / Print for Doctor',
    readAloud: 'Read Aloud (Voice)',
    readingActive: 'Speaking...',
    stopReadAloud: 'Stop Voice',
    saveReport: 'Save to My Reports',
    savedSuccess: 'Saved to phone!',
    reportAlreadySaved: 'Report is already saved',
    permanentFooter: 'This is not a doctor. Please confirm with a registered doctor.',
    deleteDataBtn: 'Delete all my data',
    deleteDataConfirm: 'Are you sure you want to delete all saved reports, medicines, prescriptions, and profile from this phone? This cannot be undone.',
    privacyNote: 'Your reports stay completely private on your phone. No data is stored on external servers.',
    noPastReports: 'No saved reports yet. Scan or try a demo report to get started!',
    trendTitle: 'Health Marker Trends',
    trendBetter: 'Better',
    trendSame: 'Same',
    trendWorse: 'Worse',
    retakePhoto: 'Photo not clear. Please retake.',
    blurryWarning: 'The image looks blurry or dark. It may be hard to read numbers correctly.',
    blurryProceed: 'Use Photo Anyway',
    addAnotherPage: 'Add Another Page',
    analyzePages: 'Analyze Report',
    pagesCaptured: 'page(s) ready',
    frontView: 'Front View',
    backView: 'Back / Spine View',
    offlineTitle: 'You are offline',
    offlineDesc: 'You can still view your saved reports.',
    offlineScanNotice: 'Scanning needs internet to read the report. Please reconnect to scan new documents.',
    backToHome: 'Back to Home',
    tapBodyPartHint: 'Tap the body part to view test notes',
    installApp: 'Install App',
    installAppIos: 'Install on Phone',
  },
  hi: {
    appName: 'रिपोर्ट समझो',
    tagline: 'अपनी मेडिकल रिपोर्ट सरल तस्वीरों में समझें',
    disclaimerTitle: 'ज़रूरी सूचना',
    disclaimerNotice: 'यह ऐप रिपोर्ट को आसान शब्दों में समझाता है। यह कोई बीमारी तय नहीं करता और न ही दवा लिखता है।',
    disclaimerBullet1: 'कठिन मेडिकल शब्दों को आसान भाषा में बताता है',
    disclaimerBullet2: 'दिखाता है कि जांच सामान्य है या डॉक्टर को दिखाना चाहिए',
    disclaimerBullet3: 'यह कभी भी असली डॉक्टर की जगह नहीं ले सकता',
    acceptAndContinue: 'मैं समझ गया, आगे बढ़ें',
    setupProfileTitle: 'अपने बारे में थोड़ा बताएं',
    setupProfileSub: 'यह जानकारी सिर्फ आपके फोन पर सही नॉर्मल रेंज मिलाने के लिए है।',
    ageLabel: 'आपकी उम्र (वर्ष)',
    agePlaceholder: 'जैसे 45',
    genderLabel: 'लिंग (Gender)',
    genderMale: 'पुरुष (Male)',
    genderFemale: 'महिला (Female)',
    genderOther: 'अन्य (Other)',
    saveProfile: 'होम पेज पर जाएं',
    scanCameraBtn: 'कैमरे से रिपोर्ट फोटो खींचें',
    scanGalleryBtn: 'गैलरी / फाइल से फोटो चुनें',
    pastReportsBtn: 'मेरी पुरानी रिपोर्टें',
    demoReportBtn: 'डेमो रिपोर्ट देखें (बिना फोटो खींचे)',
    readingReport: 'आपकी रिपोर्ट पढ़ी जा रही है...',
    processingStep1: 'रिपोर्ट के पन्नों को देखा जा रहा है...',
    processingStep2: 'स्वस्थ शरीर के नॉर्मल मान जांच रहे हैं...',
    processingStep3: 'आसान चित्र तैयार कर रहे हैं...',
    statusGreen: 'सब सामान्य है',
    statusYellow: 'जल्द डॉक्टर से मिलें',
    statusRed: 'आज ही डॉक्टर से मिलें',
    statusGreenSub: 'आपकी जांचें सामान्य सीमा के अंदर दिख रही हैं।',
    statusYellowSub: 'कुछ मान सामान्य से अलग हैं, डॉक्टर को दिखाएं।',
    statusRedSub: 'ज़रूरी बदलाव मिले हैं, तुरंत डॉक्टर की सलाह लें।',
    emergencyBanner: 'आज ही डॉक्टर या अस्पताल जाएं।',
    emergencySub: 'एक या अधिक टेस्ट बहुत अलग हैं। देर न करें।',
    bodyMapTitle: 'शरीर का कौन सा हिस्सा प्रभावित है',
    bodyMapSub: 'दिए गए हिस्से पर छूकर देखें कि क्या जांच हुई है।',
    findingsTitle: 'जांच के नतीजे',
    findingsSub: 'सामान्य से बाहर वाले टेस्ट नीचे दिए गए हैं।',
    everythingElseNormal: 'बाकी सभी टेस्ट सामान्य हैं',
    viewNormalTests: 'सामान्य टेस्ट देखें',
    hideNormalTests: 'सामान्य टेस्ट छिपाएं',
    labRange: 'लैब की सीमा',
    generalRange: 'सामान्य सीमा (लैब की नहीं)',
    valueLow: 'कम',
    valueNormal: 'सामान्य',
    valueHigh: 'ज्यादा',
    whatThisMeans: 'इसका क्या मतलब हो सकता है',
    symptomsToWatch: 'इन लक्षणों पर ध्यान दें',
    howUrgent: 'कितनी जल्दी दिखाना है',
    urgencyRoutine: 'सामान्य — अगली बार डॉक्टर को दिखाएं',
    urgencySoon: 'जल्द — 2 से 3 दिन में डॉक्टर से मिलें',
    urgencyToday: 'आज ही — आज ही डॉक्टर या क्लिनिक जाएं',
    whatYouCanDo: 'सुरक्षित सावधानियां',
    doctorQuestions: 'डॉक्टर से क्या पूछें',
    downloadPdf: 'डॉक्टर को दिखाने के लिए प्रिंट / डाउनलोड',
    readAloud: 'आवाज़ में सुनें',
    readingActive: 'बोल रहा है...',
    stopReadAloud: 'आवाज़ रोकें',
    saveReport: 'फोन में सुरक्षित करें',
    savedSuccess: 'फोन में सहेज लिया गया!',
    reportAlreadySaved: 'यह रिपोर्ट पहले से सेव है',
    permanentFooter: 'यह डॉक्टर नहीं है। कृपया पंजीकृत डॉक्टर से सलाह लें।',
    deleteDataBtn: 'मेरा सारा डेटा हटाएं',
    deleteDataConfirm: 'क्या आप इस फोन से अपनी सभी रिपोर्ट, दवाइयां, पर्चे और प्रोफाइल हटाना चाहते हैं? इसे वापस नहीं लाया जा सकता।',
    privacyNote: 'आपकी रिपोर्ट पूरी तरह आपके फोन पर रहती है। कोई भी डेटा बाहरी सर्वर पर सेव नहीं होता।',
    noPastReports: 'अभी कोई रिपोर्ट नहीं है। कैमरा से स्कैन करें या डेमो रिपोर्ट देखें!',
    trendTitle: 'टेस्ट के उतार-चढ़ाव (ट्रेंड्स)',
    trendBetter: 'सुधार',
    trendSame: 'समान',
    trendWorse: 'खराब',
    retakePhoto: 'फोटो साफ नहीं है। कृपया दोबारा लें।',
    blurryWarning: 'फोटो धुंधली या अंधेरे में है। अंक गलत पढ़े जा सकते हैं।',
    blurryProceed: 'फिर भी यही फोटो उपयोग करें',
    addAnotherPage: 'अगला पन्ना जोड़ें',
    analyzePages: 'रिपोर्ट समझें',
    pagesCaptured: 'पन्ने तैयार हैं',
    frontView: 'सामने का दृश्य',
    backView: 'पीठ / रीढ़ का दृश्य',
    offlineTitle: 'इंटरनेट बंद है',
    offlineDesc: 'आप अपनी पुरानी सुरक्षित रिपोर्टें देख सकते हैं।',
    offlineScanNotice: 'नई रिपोर्ट पढ़ने के लिए इंटरनेट चाहिए। कृपया इंटरनेट जोड़ें।',
    backToHome: 'होम पेज पर जाएं',
    tapBodyPartHint: 'जांच देखने के लिए शरीर के अंग पर टैप करें',
    installApp: 'ऐप इंस्टॉल करें',
    installAppIos: 'फोन पर जोड़ें',
  },
  or: {
    appName: 'ରିପୋର୍ଟ ବୁଝନ୍ତୁ',
    tagline: 'ସରଳ ଚିତ୍ର ମାଧ୍ୟମରେ ଆପଣଙ୍କ ଡାକ୍ତରୀ ରିପୋର୍ଟ ବୁଝନ୍ତୁ',
    disclaimerTitle: 'ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ସୂଚନା',
    disclaimerNotice: 'ଏହି ଆପ୍ ରିପୋର୍ଟକୁ ସହଜ ଭାଷାରେ ବୁଝାଇଥାଏ। ଏହା ରୋଗ ନିର୍ଣ୍ଣୟ କରେନାହିଁ କିମ୍ବା ଔଷଧ ଦିଏନାହିଁ।',
    disclaimerBullet1: 'ଜଟିଳ ଡାକ୍ତରୀ ଶବ୍ଦକୁ ସରଳ ଭାବେ ବୁଝାଏ',
    disclaimerBullet2: 'ଫଳାଫଳ ସ୍ୱାଭାବିକ କି ଡାକ୍ତରଙ୍କ ପରାମର୍ଶ ଦରକାର ତାହା ଦର୍ଶାଏ',
    disclaimerBullet3: 'ପଞ୍ଜୀକୃତ ଡାକ୍ତରଙ୍କ ସ୍ଥାନ କେବେବି ନେଇପାରିବ ନାହିଁ',
    acceptAndContinue: 'ମୁଁ ବୁଝିଲି, ଆଗକୁ ବଢ଼ନ୍ତୁ',
    setupProfileTitle: 'ଆପଣଙ୍କ ବିଷୟରେ କିଛି କୁହନ୍ତୁ',
    setupProfileSub: 'ଏହା କେବଳ ଫୋନ୍‌ରେ ସଠିକ୍ ସାଧାରଣ ସୀମା ଯାଞ୍ଚ କରିବା ପାଇଁ ବ୍ୟବହୃତ ହୁଏ।',
    ageLabel: 'ଆପଣଙ୍କ ବୟସ (ବର୍ଷ)',
    agePlaceholder: 'ଯଥା ୪୫',
    genderLabel: 'ଲିଙ୍ଗ (Gender)',
    genderMale: 'ପୁରୁଷ (Male)',
    genderFemale: 'ମହିଳା (Female)',
    genderOther: 'ଅନ୍ୟାନ୍ୟ (Other)',
    saveProfile: 'ମୁଖ୍ୟ ପୃଷ୍ଠାକୁ ଯାଆନ୍ତୁ',
    scanCameraBtn: 'କ୍ୟାମେରାରେ ରିପୋର୍ଟ ଫଟୋ ଉଠାନ୍ତୁ',
    scanGalleryBtn: 'ଗ୍ୟାଲେରୀରୁ ଫଟୋ ବାଛନ୍ତୁ',
    pastReportsBtn: 'ମୋର ପୁରୁଣା ରିପୋର୍ଟ',
    demoReportBtn: 'ଡେମୋ ରିପୋର୍ଟ ଦେଖନ୍ତୁ (ବିନା ସ୍କାନ୍‌ରେ)',
    readingReport: 'ଆପଣଙ୍କ ରିପୋର୍ଟ ପଢ଼ା ଚାଲିଛି...',
    processingStep1: 'ରିପୋର୍ଟର ବିବରଣୀ ଦେଖାଯାଉଛି...',
    processingStep2: 'ସ୍ୱାଭାବିକ ସୁସ୍ଥ ମାନ ଯାଞ୍ଚ ହେଉଛି...',
    processingStep3: 'ସରଳ ଚିତ୍ର ପ୍ରସ୍ତୁତ ହେଉଛି...',
    statusGreen: 'ସବୁ ସ୍ୱାଭାବିକ ଅଛି',
    statusYellow: 'ଶୀଘ୍ର ଡାକ୍ତରଙ୍କୁ ଦେଖାନ୍ତୁ',
    statusRed: 'ଆଜି ହିଁ ଡାକ୍ତରଙ୍କ ପାଖକୁ ଯାଆନ୍ତୁ',
    statusGreenSub: 'ଆପଣଙ୍କ ପରୀକ୍ଷା ଫଳ ସୁସ୍ଥ ସୀମା ମଧ୍ୟରେ ଅଛି।',
    statusYellowSub: 'କିଛି ମାନ ସ୍ୱାଭାବିକଠାରୁ ଅଲଗା, ଡାକ୍ତରଙ୍କୁ ଦେଖାନ୍ତୁ।',
    statusRedSub: 'ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ପରିବର୍ତ୍ତନ ମିଳିଛି, ତୁରନ୍ତ ଡାକ୍ତର ଦେଖାନ୍ତୁ।',
    emergencyBanner: 'ଆଜି ହିଁ ଡାକ୍ତର କିମ୍ବା ଡାକ୍ତରଖାନା ଯାଆନ୍ତୁ।',
    emergencySub: 'ଗୋଟିଏ କିମ୍ବା ଅଧିକ ପରୀକ୍ଷା ଜରୁରୀ ପରିସରରେ ଅଛି। ବିଳମ୍ବ କରନ୍ତୁ ନାହିଁ।',
    bodyMapTitle: 'ଶରୀରର କେଉଁ ଅଂଶ ପ୍ରଭାବିତ',
    bodyMapSub: 'ଚିହ୍ନିତ ଅଙ୍ଗ ଉପରେ ଚିପି ଦେଖନ୍ତୁ କଣ ପରୀକ୍ଷା ହୋଇଛି।',
    findingsTitle: 'ପରୀକ୍ଷା ଫଳାଫଳ',
    findingsSub: 'ସ୍ୱାଭାବିକ ବାହାରେ ଥିବା ଟେଷ୍ଟ ତଳେ ଦିଆଯାଇଛି।',
    everythingElseNormal: 'ଅନ୍ୟ ସମସ୍ତ ପରୀକ୍ଷା ସ୍ୱାଭାବିକ ଅଛି',
    viewNormalTests: 'ସ୍ୱାଭାବିକ ପରୀକ୍ଷା ଦେଖନ୍ତୁ',
    hideNormalTests: 'ଲୁଚାନ୍ତୁ',
    labRange: 'ଲ୍ୟାବ୍ ସୀମା',
    generalRange: 'ସାଧାରଣ ସୀମା (ଲ୍ୟାବ୍‌ର ନୁହେଁ)',
    valueLow: 'କମ୍',
    valueNormal: 'ସ୍ୱାଭାବିକ',
    valueHigh: 'ଅଧିକ',
    whatThisMeans: 'ଏହାର ଅର୍ଥ କଣ ହୋଇପାରେ',
    symptomsToWatch: 'ଏହି ଲକ୍ଷଣ ଉପରେ ଧ୍ୟାନ ଦିଅନ୍ତୁ',
    howUrgent: 'କେତେ ଶୀଘ୍ର ଦେଖାଇବେ',
    urgencyRoutine: 'ସାଧାରଣ — ପରବର୍ତ୍ତୀ ସାକ୍ଷାତରେ ଦେଖାନ୍ତୁ',
    urgencySoon: 'ଶୀଘ୍ର — ୨ ରୁ ୩ ଦିନରେ ଡାକ୍ତରଙ୍କୁ ଦେଖାନ୍ତୁ',
    urgencyToday: 'ଆଜି — ଆଜି ହିଁ ଡାକ୍ତର କିମ୍ବା କ୍ଲିନିକ୍ ଯାଆନ୍ତୁ',
    whatYouCanDo: 'ନିରାପଦ ପଦକ୍ଷେପ',
    doctorQuestions: 'ଡାକ୍ତରଙ୍କୁ କଣ ପଚାରିବେ',
    downloadPdf: 'ଡାକ୍ତରଙ୍କୁ ଦେଖାଇବା ପାଇଁ ପ୍ରିଣ୍ଟ / ଡାଉନଲୋଡ୍',
    readAloud: 'ସ୍ୱରରେ ଶୁଣନ୍ତୁ (Voice)',
    readingActive: 'କହୁଛି...',
    stopReadAloud: 'ସ୍ୱର ବନ୍ଦ କରନ୍ତୁ',
    saveReport: 'ଫୋନ୍‌ରେ ସାଇତି ରଖନ୍ତୁ',
    savedSuccess: 'ଫୋନ୍‌ରେ ସେଭ୍ ହୋଇଗଲା!',
    reportAlreadySaved: 'ଏହି ରିପୋର୍ଟ ପୂର୍ବରୁ ସେଭ୍ ଅଛି',
    permanentFooter: 'ଏହା ଡାକ୍ତର ନୁହେଁ। ଦୟାକରି ପଞ୍ଜୀକୃତ ଡାକ୍ତରଙ୍କ ସହିତ ନିଶ୍ଚିତ କରନ୍ତୁ।',
    deleteDataBtn: 'ମୋର ସମସ୍ତ ତଥ୍ୟ ଲିଭାନ୍ତୁ',
    deleteDataConfirm: 'ଆପଣ ଏହି ଫୋନ୍‌ରୁ ସମସ୍ତ ସାଇତି ରଖାଯାଇଥିବା ରିପୋର୍ଟ, ଔଷଧ, ପ୍ରେସକ୍ରିପସନ୍ ଏବଂ ପ୍ରୋଫାଇଲ୍ ଲିଭାଇବାକୁ ଚାହୁଁଛନ୍ତି କି? ଏହା ଫେରାଇ ଅଣାଯାଇପାରିବ ନାହିଁ।',
    privacyNote: 'ଆପଣଙ୍କ ରିପୋର୍ଟ ସମ୍ପୂର୍ଣ୍ଣ ରୂପେ ଆପଣଙ୍କ ଫୋନ୍‌ରେ ରହିଥାଏ। କୌଣସି ବାହାର ସର୍ଭରରେ ସାଇତା ଯାଏ ନାହିଁ।',
    noPastReports: 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ରିପୋର୍ଟ ନାହିଁ। କ୍ୟାମେରା ସ୍କାନ୍ କରନ୍ତୁ କିମ୍ବା ଡେମୋ ଦେଖନ୍ତୁ!',
    trendTitle: 'ପରୀକ୍ଷା ଧାରା (ଟ୍ରେଣ୍ଡ୍)',
    trendBetter: 'ଉନ୍ନତି',
    trendSame: 'ସମାନ',
    trendWorse: 'ଅବନତି',
    retakePhoto: 'ଫଟୋ ସ୍ପଷ୍ଟ ନାହିଁ। ଦୟାକରି ପୁନର୍ବାର ନିଅନ୍ତୁ।',
    blurryWarning: 'ଫଟୋ ଅସ୍ପଷ୍ଟ ବା ଅନ୍ଧାରିଆ ଅଛି। ସଂଖ୍ୟା ଭୁଲ୍ ପଢ଼ା ହୋଇପାରେ।',
    blurryProceed: 'ତଥାପି ଏହି ଫଟୋ ବ୍ୟବହାର କରନ୍ତୁ',
    addAnotherPage: 'ଆଉ ଏକ ପୃଷ୍ଠା ଯୋଡନ୍ତୁ',
    analyzePages: 'ରିପୋର୍ଟ ବୁଝନ୍ତୁ',
    pagesCaptured: 'ପୃଷ୍ଠା ପ୍ରସ୍ତୁତ',
    frontView: 'ଆଗ ଦୃଶ୍ୟ',
    backView: 'ପଛ / ମେରୁଦଣ୍ଡ ଦୃଶ୍ୟ',
    offlineTitle: 'ଆପଣ ଅଫଲାଇନ୍ ଅଛନ୍ତି',
    offlineDesc: 'ଆପଣ ଏବେବି ଆପଣଙ୍କର ସାଇତି ରଖାଯାଇଥିବା ରିପୋର୍ଟ ଦେଖିପାରିବେ।',
    offlineScanNotice: 'ନୂଆ ରିପୋର୍ଟ ପଢ଼ିବା ପାଇଁ ଇଣ୍ଟରନେଟ୍ ଆବଶ୍ୟକ। ଦୟାକରି ଇଣ୍ଟରନେଟ୍ ଯୋଡନ୍ତୁ।',
    backToHome: 'ମୁଖ୍ୟ ପୃଷ୍ଠାକୁ ଫେରନ୍ତୁ',
    tapBodyPartHint: 'ପରୀକ୍ଷା ତଥ୍ୟ ଦେଖିବାକୁ ଅଙ୍ଗ ଉପରେ ଚିପନ୍ତୁ',
    installApp: 'ଆପ୍ ଇନଷ୍ଟଲ୍ କରନ୍ତୁ',
    installAppIos: 'ଫୋନ୍‌ରେ ଯୋଡନ୍ତୁ',
  },
};
