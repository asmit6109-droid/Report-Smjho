import { SupportedLanguage } from './translations';

export interface MedicineTranslations {
  scanMedicineBtn: string;
  uploadMedicineBtn: string;
  scanMedicineHint: string;
  recentMedicinesTitle: string;
  scanPrescriptionBtn: string;
  myMedicinesBtn: string;
  tryDemoMedicineBtn: string;
  readingMedicine: string;
  identifyingStep: string;
  verifyingStep: string;
  readingPrescription: string;
  // Confirm / Edit Step 1 screen
  confirmMedTitle: string;
  confirmMedSubtitle: string;
  confidenceHigh: string;
  confidenceMedium: string;
  confidenceLow: string;
  manualEntryBtn: string;
  confirmAndCheckBtn: string;
  brandLabel: string;
  saltLabel: string;
  strengthLabel: string;
  // Problem Context screen
  problemTitle: string;
  problemSubtitle: string;
  problemPlaceholder: string;
  attachDocBtn: string;
  docAttached: string;
  skipBtn: string;
  continueBtn: string;
  chipFever: string;
  chipPain: string;
  chipCold: string;
  chipSugar: string;
  chipBp: string;
  chipInfection: string;
  chipStomach: string;
  chipOther: string;
  // Medicine Result screen
  demoBadge: string;
  sourcePrinted: string;
  sourceVerified: string;
  sourceNotVerified: string;
  notVerifiedFallback: string;
  couldNotVerifyTitle: string;
  whoCanGiveTitle: string;
  accessOtc: string;
  accessAskDoctor: string;
  accessPrescriptionOnly: string;
  expiryOk: string;
  expiryExpired: string;
  expiryUnknown: string;
  whatIsItTitle: string;
  whatIsItFor: string;
  howItWorks: string;
  howToTake: string;
  howToTakeDefault: string;
  sideEffectsTitle: string;
  sideEffectsCommon: string;
  sideEffectsSeeDoctor: string;
  timeToFeelBetter: string;
  beCarefulIf: string;
  interactionsTitle: string;
  storageTitle: string;
  dosDonts: string;
  whyGivenBtn: string;
  whyGivenTitle: string;
  whatToDoNow: string;
  askYourDoctor: string;
  askQuestionBtn: string;
  shareBtn: string;
  copiedToast: string;
  medicineFooter: string;
  appNotReplaceDoctor: string;
  saveMedicineBtn: string;
  savedMedicineSuccess: string;
  looseTabletError: string;
  riskyMedicineTitle: string;
  riskyMedicineBody: string;
  suspiciousPackTitle: string;
  suspiciousPackBody: string;
  emergencyBanner: string;
  // Chat modal
  chatTitle: string;
  chatSubtitle: string;
  chatPlaceholder: string;
  chatSend: string;
  chatBlockedHint: string;
  // Why given picker
  pickReportTitle: string;
  pickFromSaved: string;
  scanNewReportOpt: string;
  useProblemOnly: string;
  // Prescription Flow
  rxVerifyTitle: string;
  rxVerifySubtitle: string;
  rxCheckBadge: string;
  rxAddLine: string;
  rxConfirmBtn: string;
  rxSummaryTitle: string;
  // My Medicines
  filterAll: string;
  filterDoctor: string;
  filterSelf: string;
  tagDoctor: string;
  tagSelf: string;
  tagNotSure: string;
  sameSaltWarning: string;
  interactionWarning: string;
  checkInteractionsBtn: string;
  healthProfileTitle: string;
  allergiesLabel: string;
  conditionsLabel: string;
  pregnantLabel: string;
  noMedicinesYet: string;
  doctorNameLabel: string;
  daysLabel: string;
  linkedReportLabel: string;
}

export const medicineTranslations: Record<SupportedLanguage, MedicineTranslations> = {
  en: {
    scanMedicineBtn: 'Scan Medicine',
    uploadMedicineBtn: 'Upload Image',
    scanMedicineHint: 'Scan your medicine to understand it',
    recentMedicinesTitle: 'Recently scanned medicines',
    scanPrescriptionBtn: 'Scan Prescription',
    myMedicinesBtn: 'My Medicines',
    tryDemoMedicineBtn: 'Try Demo Medicine',
    readingMedicine: 'Checking your medicine...',
    identifyingStep: 'Reading pack label...',
    verifyingStep: 'Checking verified medicine database...',
    readingPrescription: 'Reading doctor prescription...',
    confirmMedTitle: 'Is this your medicine?',
    confirmMedSubtitle: 'Please check the name and salt before we look it up.',
    confidenceHigh: 'High Match',
    confidenceMedium: 'Medium Match',
    confidenceLow: 'Low Match — Please Check',
    manualEntryBtn: 'Enter medicine name manually',
    confirmAndCheckBtn: 'Confirm & Verify Medicine',
    brandLabel: 'Brand / Medicine Name',
    saltLabel: 'Generic Salt / Active Ingredient',
    strengthLabel: 'Strength (e.g. 500 mg)',
    problemTitle: 'Why are you taking this?',
    problemSubtitle: 'Tap a problem or write why you are taking this. You can skip.',
    problemPlaceholder: 'Write your problem here (optional)...',
    attachDocBtn: 'Attach prescription or saved report (optional)',
    docAttached: 'Photo attached',
    skipBtn: 'Skip',
    continueBtn: 'See Medicine Info',
    chipFever: 'Fever',
    chipPain: 'Pain',
    chipCold: 'Cold / Cough',
    chipSugar: 'Sugar',
    chipBp: 'BP',
    chipInfection: 'Infection',
    chipStomach: 'Stomach',
    chipOther: 'Other',
    demoBadge: 'DEMO - not a real scan',
    sourcePrinted: 'Printed on pack',
    sourceVerified: 'Verified database (openFDA)',
    sourceNotVerified: 'Not verified',
    notVerifiedFallback: 'Not verified. Please ask a pharmacist.',
    couldNotVerifyTitle: 'I could not verify this medicine in the trusted database. Showing only what is printed on the pack.',
    whoCanGiveTitle: 'Who can give it',
    accessOtc: 'You can buy at shop',
    accessAskDoctor: 'Ask doctor first',
    accessPrescriptionOnly: "Only with doctor's prescription",
    expiryOk: 'Expiry date is okay',
    expiryExpired: 'EXPIRED. Do not use.',
    expiryUnknown: 'Expiry date not reliably read. Check pack.',
    whatIsItTitle: 'What is it?',
    whatIsItFor: 'Why is it used?',
    howItWorks: 'How does it work inside the body?',
    howToTake: 'How to take it',
    howToTakeDefault: 'Take as your doctor told you.',
    sideEffectsTitle: 'Side effects',
    sideEffectsCommon: 'Common (usually okay)',
    sideEffectsSeeDoctor: 'Go to a doctor if you see this',
    timeToFeelBetter: 'Time to feel better',
    beCarefulIf: 'Who should be careful',
    interactionsTitle: 'Interactions (medicines, food, alcohol)',
    storageTitle: 'Storage',
    dosDonts: "Do's and Don'ts",
    whyGivenBtn: 'Why was this given to me?',
    whyGivenTitle: 'Why you may have got this',
    whatToDoNow: 'What to do now',
    askYourDoctor: 'Ask your doctor',
    askQuestionBtn: 'Ask a question',
    shareBtn: 'Share',
    copiedToast: 'Medicine summary copied to share!',
    medicineFooter: 'Please confirm with a pharmacist or doctor.',
    appNotReplaceDoctor: 'This app does not replace a doctor.',
    saveMedicineBtn: 'Save medicine',
    savedMedicineSuccess: 'Saved to My Medicines!',
    looseTabletError: 'Please scan the strip or box.',
    riskyMedicineTitle: "Take only with a proper doctor's prescription.",
    riskyMedicineBody: 'If a shop or unlicensed doctor gave this without a prescription, be careful.',
    suspiciousPackTitle: 'I cannot confirm if this is genuine. Check with a pharmacist and ask for a bill.',
    suspiciousPackBody: 'Batch number, maker name, or print on this pack was unclear or missing.',
    emergencyBanner: 'Go to the nearest hospital or call emergency services now if you see severe swelling, trouble breathing, fainting, or overdose.',
    chatTitle: 'Ask about this medicine',
    chatSubtitle: 'Answers come only from verified medicine info. No dosage advice.',
    chatPlaceholder: 'Ask a simple question (e.g. can I take with food?)...',
    chatSend: 'Send',
    chatBlockedHint: 'I cannot suggest doses, starting, stopping, or diagnosing. Ask your doctor or pharmacist.',
    pickReportTitle: 'Connect with your report',
    pickFromSaved: 'Pick a saved report',
    scanNewReportOpt: 'Scan a new report',
    useProblemOnly: 'Check using my typed problem only',
    rxVerifyTitle: 'Check prescription names',
    rxVerifySubtitle: 'Handwriting can be hard. Fix any yellow lines before continuing.',
    rxCheckBadge: 'Please check',
    rxAddLine: 'Add another medicine',
    rxConfirmBtn: 'Confirm & Verify Medicines',
    rxSummaryTitle: 'Why this prescription?',
    filterAll: 'All',
    filterDoctor: 'Doctor prescribed',
    filterSelf: 'Self',
    tagDoctor: 'Doctor prescribed',
    tagSelf: 'Bought myself / from shop',
    tagNotSure: 'Not sure',
    sameSaltWarning: 'These two have the same medicine inside. Taking both can be dangerous. Ask your pharmacist.',
    interactionWarning: 'These may not be safe together. Ask a pharmacist or doctor.',
    checkInteractionsBtn: 'Check if my medicines are safe together',
    healthProfileTitle: 'My Allergies & Health Problems (Optional)',
    allergiesLabel: 'Medicine allergies (e.g. Penicillin, Sulfa)',
    conditionsLabel: 'Health problems (e.g. Sugar, Kidney, Liver, BP)',
    pregnantLabel: 'Pregnant or Breastfeeding',
    noMedicinesYet: 'No saved medicines yet. Scan a medicine strip or try a demo!',
    doctorNameLabel: 'Doctor name',
    daysLabel: 'How many days',
    linkedReportLabel: 'Linked report',
  },
  hi: {
    scanMedicineBtn: 'दवा स्कैन करें',
    uploadMedicineBtn: 'फोटो चुनें',
    scanMedicineHint: 'अपनी दवा को आसान भाषा में समझने के लिए स्कैन करें',
    recentMedicinesTitle: 'हाल में देखी गई दवाइयां',
    scanPrescriptionBtn: 'डॉक्टर की पर्ची स्कैन करें',
    myMedicinesBtn: 'मेरी दवाइयां',
    tryDemoMedicineBtn: 'डेमो दवा देखें',
    readingMedicine: 'दवा की जांच हो रही है...',
    identifyingStep: 'पैकेट का नाम पढ़ा जा रहा है...',
    verifyingStep: 'भरोसेमंद दवा डेटाबेस में जांचा जा रहा है...',
    readingPrescription: 'डॉक्टर की पर्ची पढ़ी जा रही है...',
    confirmMedTitle: 'क्या यह आपकी दवा है?',
    confirmMedSubtitle: 'आगे जांच करने से पहले नाम और सॉल्ट पक्का करें।',
    confidenceHigh: 'सही मिलान',
    confidenceMedium: 'मध्यम मिलान',
    confidenceLow: 'कम साफ — कृपया जांचें',
    manualEntryBtn: 'खुद दवा का नाम लिखें',
    confirmAndCheckBtn: 'पक्का करें और जांचें',
    brandLabel: 'दवा / ब्रांड का नाम',
    saltLabel: 'असली सॉल्ट (Salt / Generic Name)',
    strengthLabel: 'ताकत (जैसे 500 mg)',
    problemTitle: 'आप यह दवा क्यों ले रहे हैं?',
    problemSubtitle: 'अपनी परेशानी चुनें या लिखें। आप इसे छोड़ भी सकते हैं।',
    problemPlaceholder: 'अपनी परेशानी लिखें (ज़रूरी नहीं)...',
    attachDocBtn: 'डॉक्टर की पर्ची या रिपोर्ट जोड़ें (ज़रूरी नहीं)',
    docAttached: 'फोटो जुड़ गई',
    skipBtn: 'छोड़ें',
    continueBtn: 'दवा की जानकारी देखें',
    chipFever: 'बुखार',
    chipPain: 'दर्द',
    chipCold: 'सर्दी / खांसी',
    chipSugar: 'शुगर',
    chipBp: 'बीपी (BP)',
    chipInfection: 'इन्फेक्शन',
    chipStomach: 'पेट',
    chipOther: 'अन्य',
    demoBadge: 'डेमो - असली स्कैन नहीं',
    sourcePrinted: 'पैकेट पर लिखा',
    sourceVerified: 'जांचा गया डेटाबेस (openFDA)',
    sourceNotVerified: 'सत्यापित नहीं',
    notVerifiedFallback: 'सत्यापित नहीं। कृपया फार्मासिस्ट से पूछें।',
    couldNotVerifyTitle: 'डेटाबेस में इस दवा की पुष्टि नहीं हो सकी। केवल पैकेट पर लिखी जानकारी दिखाई जा रही है।',
    whoCanGiveTitle: 'यह दवा कौन दे सकता है',
    accessOtc: 'दुकान से खरीद सकते हैं',
    accessAskDoctor: 'पहले डॉक्टर से पूछें',
    accessPrescriptionOnly: 'सिर्फ डॉक्टर की पर्ची से ही लें',
    expiryOk: 'तारीख सही है (एक्सपायर नहीं)',
    expiryExpired: 'दवा खराब (EXPIRED) है। इसे न खाएं।',
    expiryUnknown: 'तारीख साफ नहीं दिखी। पैकेट पर देखें।',
    whatIsItTitle: 'यह क्या है?',
    whatIsItFor: 'यह क्यों इस्तेमाल होती है?',
    howItWorks: 'यह शरीर में कैसे काम करती है?',
    howToTake: 'कैसे लेना है',
    howToTakeDefault: 'जैसा डॉक्टर ने बताया है वैसे लें।',
    sideEffectsTitle: 'साइड इफेक्ट्स (असर)',
    sideEffectsCommon: 'आम असर (आमतौर पर ठीक)',
    sideEffectsSeeDoctor: 'यह दिखे तो डॉक्टर के पास जाएं',
    timeToFeelBetter: 'आराम मिलने का समय',
    beCarefulIf: 'किसे सावधान रहना चाहिए',
    interactionsTitle: 'अन्य दवा, खाना या शराब से सावधानी',
    storageTitle: 'कैसे रखें (Storage)',
    dosDonts: 'क्या करें और क्या न करें',
    whyGivenBtn: 'मुझे यह दवा क्यों दी गई?',
    whyGivenTitle: 'यह दवा क्यों दी गई हो सकती है',
    whatToDoNow: 'अभी क्या करें',
    askYourDoctor: 'डॉक्टर से पूछें',
    askQuestionBtn: 'सवाल पूछें',
    shareBtn: 'शेयर करें',
    copiedToast: 'दवा की जानकारी कॉपी हो गई!',
    medicineFooter: 'कृपया दवा दुकानदार (फार्मासिस्ट) या डॉक्टर से पक्का करें।',
    appNotReplaceDoctor: 'यह ऐप डॉक्टर की जगह नहीं लेता।',
    saveMedicineBtn: 'दवा सेव करें',
    savedMedicineSuccess: 'दवाइयों में सेव हो गई!',
    looseTabletError: 'कृपया पत्ता या डिब्बा स्कैन करें।',
    riskyMedicineTitle: 'सिर्फ सही डॉक्टर की पर्ची से ही यह दवा लें।',
    riskyMedicineBody: 'अगर किसी दुकान या बिना डिग्री वाले व्यक्ति ने बिना पर्ची के दी है, तो सावधान रहें।',
    suspiciousPackTitle: 'यह असली है या नहीं, मैं पक्का नहीं कह सकता। फार्मासिस्ट से जांच कराएं और पक्का बिल मांगें।',
    suspiciousPackBody: 'पैकेट पर बैच नंबर, कंपनी का नाम या छपाई साफ नहीं है।',
    emergencyBanner: 'अगर ज्यादा सूजन, सांस लेने में दिक्कत, बेहोशी या ज्यादा दवा खा ली हो, तो तुरंत अस्पताल जाएं या इमरजेंसी कॉल करें।',
    chatTitle: 'इस दवा के बारे में पूछें',
    chatSubtitle: 'जवाब केवल प्रमाणित जानकारी से दिए जाएंगे। खुराक की सलाह नहीं।',
    chatPlaceholder: 'आसान सवाल पूछें (जैसे खाने के साथ लें?)...',
    chatSend: 'भेजें',
    chatBlockedHint: 'मैं खुराक, दवा शुरू/बंद करने या बीमारी बताने की सलाह नहीं दे सकता। डॉक्टर या फार्मासिस्ट से पूछें।',
    pickReportTitle: 'अपनी रिपोर्ट से जोड़ें',
    pickFromSaved: 'पुरानी सेव रिपोर्ट चुनें',
    scanNewReportOpt: 'नई रिपोर्ट स्कैन करें',
    useProblemOnly: 'सिर्फ लिखी हुई परेशानी से जांचें',
    rxVerifyTitle: 'पर्ची की दवा के नाम जांचें',
    rxVerifySubtitle: 'लिखावट मुश्किल हो सकती है। पीले निशान वाली लाइन ठीक करें।',
    rxCheckBadge: 'कृपया जांचें',
    rxAddLine: 'एक और दवा जोड़ें',
    rxConfirmBtn: 'पक्का करें और दवाइयां जांचें',
    rxSummaryTitle: 'यह पर्ची क्यों दी गई?',
    filterAll: 'सभी',
    filterDoctor: 'डॉक्टर की पर्ची',
    filterSelf: 'खुद खरीदी',
    tagDoctor: 'डॉक्टर की पर्ची वाली',
    tagSelf: 'दुकान से खुद ली',
    tagNotSure: 'पता नहीं',
    sameSaltWarning: 'इन दोनों में एक ही दवा है। दोनों साथ लेना खतरनाक हो सकता है। फार्मासिस्ट से पूछें।',
    interactionWarning: 'इन्हें साथ लेना सुरक्षित नहीं हो सकता। फार्मासिस्ट या डॉक्टर से पूछें।',
    checkInteractionsBtn: 'जांचें कि मेरी दवाइयां साथ में सुरक्षित हैं या नहीं',
    healthProfileTitle: 'मेरी एलर्जी और पुरानी बीमारियां (ज़रूरी नहीं)',
    allergiesLabel: 'दवा से एलर्जी (जैसे पेनिसिलिन)',
    conditionsLabel: 'पुरानी बीमारी (जैसे शुगर, किडनी, लिवर, बीपी)',
    pregnantLabel: 'गर्भवती या स्तनपान कराती हैं',
    noMedicinesYet: 'अभी कोई दवा सेव नहीं है। पैकेट स्कैन करें या डेमो देखें!',
    doctorNameLabel: 'डॉक्टर का नाम',
    daysLabel: 'कितने दिन',
    linkedReportLabel: 'जुड़ी रिपोर्ट',
  },
  or: {
    scanMedicineBtn: 'ଔଷଧ ସ୍କାନ୍ କରନ୍ତୁ',
    uploadMedicineBtn: 'ଫଟୋ ବାଛନ୍ତୁ',
    scanMedicineHint: 'ଆପଣଙ୍କ ଔଷଧ ବିଷୟରେ ସହଜରେ ବୁଝିବାକୁ ସ୍କାନ୍ କରନ୍ତୁ',
    recentMedicinesTitle: 'ନିକଟରେ ସ୍କାନ୍ ହୋଇଥିବା ଔଷଧ',
    scanPrescriptionBtn: 'ଡାକ୍ତରୀ ଚିଠା ସ୍କାନ୍ କରନ୍ତୁ',
    myMedicinesBtn: 'ମୋର ଔଷଧ',
    tryDemoMedicineBtn: 'ଡେମୋ ଔଷଧ ଦେଖନ୍ତୁ',
    readingMedicine: 'ଔଷଧ ଯାଞ୍ଚ ଚାଲିଛି...',
    identifyingStep: 'ପ୍ୟାକେଟ୍ ନାମ ପଢ଼ା ଚାଲିଛି...',
    verifyingStep: 'ବିଶ୍ୱସ୍ତ ଔଷଧ ତଥ୍ୟ ଯାଞ୍ଚ ଚାଲିଛି...',
    readingPrescription: 'ଡାକ୍ତରୀ ଚିଠା ପଢ଼ା ଚାଲିଛି...',
    confirmMedTitle: 'ଏହା ଆପଣଙ୍କ ଔଷଧ କି?',
    confirmMedSubtitle: 'ଆଗକୁ ବଢ଼ିବା ପୂର୍ବରୁ ନାମ ଓ ସଲ୍ଟ ଯାଞ୍ଚ କରନ୍ତୁ।',
    confidenceHigh: 'ସଠିକ୍ ମେଳ',
    confidenceMedium: 'ମଧ୍ୟମ ମେଳ',
    confidenceLow: 'କମ୍ ସ୍ପଷ୍ଟ — ଦୟାକରି ଯାଞ୍ଚ କରନ୍ତୁ',
    manualEntryBtn: 'ନିଜେ ଔଷଧ ନାମ ଲେଖନ୍ତୁ',
    confirmAndCheckBtn: 'ନିଶ୍ଚିତ କରନ୍ତୁ ଓ ଯାଞ୍ଚ କରନ୍ତୁ',
    brandLabel: 'ଔଷଧ / ବ୍ରାଣ୍ଡ୍ ନାମ',
    saltLabel: 'ମୂଳ ସଲ୍ଟ (Salt / Generic Name)',
    strengthLabel: 'ଶକ୍ତି (ଯଥା 500 mg)',
    problemTitle: 'ଆପଣ ଏହା କାହିଁକି ଖାଉଛନ୍ତି?',
    problemSubtitle: 'ସମସ୍ୟା ବାଛନ୍ତୁ କିମ୍ବା ଲେଖନ୍ତୁ। ଆପଣ ଛାଡ଼ି ପାରିବେ।',
    problemPlaceholder: 'ଆପଣଙ୍କ ସମସ୍ୟା ଲେଖନ୍ତୁ (ଇଚ୍ଛାଧୀନ)...',
    attachDocBtn: 'ଚିଠା ବା ରିପୋର୍ଟ ଯୋଡ଼ନ୍ତୁ (ଇଚ୍ଛାଧୀନ)',
    docAttached: 'ଫଟୋ ଯୋଡ଼ାଗଲା',
    skipBtn: 'ଛାଡ଼ନ୍ତୁ',
    continueBtn: 'ଔଷଧ ସୂଚନା ଦେଖନ୍ତୁ',
    chipFever: 'ଜ୍ୱର',
    chipPain: 'ବ୍ୟଥା',
    chipCold: 'ଥଣ୍ଡା / କାଶ',
    chipSugar: 'ସୁଗାର',
    chipBp: 'ବିପି (BP)',
    chipInfection: 'ସଂକ୍ରମଣ',
    chipStomach: 'ପେଟ',
    chipOther: 'ଅନ୍ୟାନ୍ୟ',
    demoBadge: 'ଡେମୋ - ଅସଲି ସ୍କାନ୍ ନୁହେଁ',
    sourcePrinted: 'ପ୍ୟାକେଟ୍‌ରେ ଲେଖା',
    sourceVerified: 'ଯାଞ୍ଚ ତଥ୍ୟ (openFDA)',
    sourceNotVerified: 'ଯାଞ୍ଚ ହୋଇନାହିଁ',
    notVerifiedFallback: 'ଯାଞ୍ଚ ହୋଇନାହିଁ। ଦୟାକରି ଫାର୍ମାସିଷ୍ଟଙ୍କୁ ପଚାରନ୍ତୁ।',
    couldNotVerifyTitle: 'ତଥ୍ୟଭଣ୍ଡାରରେ ଏହି ଔଷଧ ଯାଞ୍ଚ ହୋଇପାରିଲା ନାହିଁ। କେବଳ ପ୍ୟାକେଟ୍‌ରେ ଲେଖାଥିବା ତଥ୍ୟ ଦେଖାଯାଉଛି।',
    whoCanGiveTitle: 'ଏହା କିଏ ଦେଇପାରିବେ',
    accessOtc: 'ଦୋକାନରୁ କିଣିପାରିବେ',
    accessAskDoctor: 'ଆଗରୁ ଡାକ୍ତରଙ୍କୁ ପଚାରନ୍ତୁ',
    accessPrescriptionOnly: 'କେବଳ ଡାକ୍ତରଙ୍କ ଚିଠା ସହିତ',
    expiryOk: 'ତାରିଖ ଠିକ୍ ଅଛି',
    expiryExpired: 'ତାରିଖ ଶେଷ (EXPIRED)। ବ୍ୟବହାର କରନ୍ତୁ ନାହିଁ।',
    expiryUnknown: 'ତାରିଖ ସ୍ପଷ୍ଟ ଦେଖାଯାଉନାହିଁ। ପ୍ୟାକେଟ୍ ଦେଖନ୍ତୁ।',
    whatIsItTitle: 'ଏହା କଣ?',
    whatIsItFor: 'ଏହା କାହିଁକି ବ୍ୟବହାର ହୁଏ?',
    howItWorks: 'ଏହା ଶରୀରରେ କିପରି କାମ କରେ?',
    howToTake: 'କିପରି ଖାଇବେ',
    howToTakeDefault: 'ଡାକ୍ତର କହିବା ଅନୁସାରେ ନିଅନ୍ତୁ।',
    sideEffectsTitle: 'ପାର୍ଶ୍ୱ ପ୍ରତିକ୍ରିୟା',
    sideEffectsCommon: 'ସାଧାରଣ (ସାଧାରଣତଃ ଠିକ୍)',
    sideEffectsSeeDoctor: 'ଏହା ଦେଖିଲେ ଡାକ୍ତରଙ୍କ ପାଖକୁ ଯାଆନ୍ତୁ',
    timeToFeelBetter: 'ଭଲ ଲାଗିବାର ସମୟ',
    beCarefulIf: 'କିଏ ସାବଧାନ ରହିବେ',
    interactionsTitle: 'ଅନ୍ୟ ଔଷଧ, ଖାଦ୍ୟ ବା ମଦ୍ୟ ସହ ସାବଧାନତା',
    storageTitle: 'କିପରି ରଖିବେ (Storage)',
    dosDonts: 'କଣ କରିବେ ଓ କରିବେ ନାହିଁ',
    whyGivenBtn: 'ମୋତେ ଏହା କାହିଁକି ଦିଆଗଲା?',
    whyGivenTitle: 'ଏହା କାହିଁକି ଦିଆଯାଇଥାଇପାରେ',
    whatToDoNow: 'ଏବେ କଣ କରିବେ',
    askYourDoctor: 'ଡାକ୍ତରଙ୍କୁ ପଚାରନ୍ତୁ',
    askQuestionBtn: 'ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ',
    shareBtn: 'ସେୟାର୍ କରନ୍ତୁ',
    copiedToast: 'ଔଷଧ ସୂଚନା କପି ହେଲା!',
    medicineFooter: 'ଦୟାକରି ଔଷଧ ଦୋକାନୀ କିମ୍ବା ଡାକ୍ତରଙ୍କ ସହିତ ନିଶ୍ଚିତ କରନ୍ତୁ।',
    appNotReplaceDoctor: 'ଏହି ଆପ୍ ଡାକ୍ତରଙ୍କ ସ୍ଥାନ ନିଏ ନାହିଁ।',
    saveMedicineBtn: 'ଔଷଧ ସେଭ୍ କରନ୍ତୁ',
    savedMedicineSuccess: 'ମୋ ଔଷଧରେ ସେଭ୍ ହୋଇଗଲା!',
    looseTabletError: 'ଦୟାକରି ପ୍ୟାକେଟ୍ କିମ୍ବା ବକ୍ସ ସ୍କାନ୍ କରନ୍ତୁ।',
    riskyMedicineTitle: 'କେବଳ ସଠିକ୍ ଡାକ୍ତରଙ୍କ ଚିଠା ସହିତ ନିଅନ୍ତୁ।',
    riskyMedicineBody: 'ବିନା ଚିଠାରେ ଦୋକାନ ବା ଅଣ-ଡାକ୍ତର ଦେଇଥିଲେ ସାବଧାନ ରୁହନ୍ତୁ।',
    suspiciousPackTitle: 'ଏହା ଅସଲି କି ନକଲି ମୁଁ ନିଶ୍ଚିତ କରିପାରିବି ନାହିଁ। ଫାର୍ମାସିଷ୍ଟଙ୍କୁ ଦେଖାନ୍ତୁ ଓ ବିଲ୍ ମାଗନ୍ତୁ।',
    suspiciousPackBody: 'ବ୍ୟାଚ୍ ନମ୍ବର, କମ୍ପାନୀ ନାମ କିମ୍ବା ଛାପା ସ୍ପଷ୍ଟ ନାହିଁ।',
    emergencyBanner: 'ଅତ୍ୟଧିକ ଫୁଲା, ନିଶ୍ୱାସ କଷ୍ଟ, ବେହୋସ୍ କିମ୍ବା ଅଧିକ ମାତ୍ରା ଖାଇଥିଲେ ତୁରନ୍ତ ହସ୍ପିଟାଲ ଯାଆନ୍ତୁ।',
    chatTitle: 'ଏହି ଔଷଧ ବିଷୟରେ ପଚାରନ୍ତୁ',
    chatSubtitle: 'କେବଳ ଯାଞ୍ଚ ତଥ୍ୟରୁ ଉତ୍ତର ମିଳିବ। ଡୋଜ୍ ପରାମର୍ଶ ନୁହେଁ।',
    chatPlaceholder: 'ସହଜ ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ...',
    chatSend: 'ପଠାନ୍ତୁ',
    chatBlockedHint: 'ମୁଁ ମାତ୍ରା, ଆରମ୍ଭ/ବନ୍ଦ କିମ୍ବା ରୋଗ ନିର୍ଣ୍ଣୟ ପରାମର୍ଶ ଦେଇପାରିବି ନାହିଁ। ଡାକ୍ତର ବା ଫାର୍ମାସିଷ୍ଟଙ୍କୁ ପଚାରନ୍ତୁ।',
    pickReportTitle: 'ଆପଣଙ୍କ ରିପୋର୍ଟ ସହିତ ଯୋଡ଼ନ୍ତୁ',
    pickFromSaved: 'ସାଇତା ରିପୋର୍ଟ ବାଛନ୍ତୁ',
    scanNewReportOpt: 'ନୂଆ ରିପୋର୍ଟ ସ୍କାନ୍ କରନ୍ତୁ',
    useProblemOnly: 'କେବଳ ଲେଖା ସମସ୍ୟା ସହିତ ଯାଞ୍ଚ କରନ୍ତୁ',
    rxVerifyTitle: 'ଚିଠା ଔଷଧ ନାମ ଯାଞ୍ଚ କରନ୍ତୁ',
    rxVerifySubtitle: 'ହାତଲେଖା କଷ୍ଟ ହୋଇପାରେ। ହଳଦିଆ ଧାଡ଼ିଗୁଡ଼ିକ ଠିକ୍ କରନ୍ତୁ।',
    rxCheckBadge: 'ଦୟାକରି ଯାଞ୍ଚ କରନ୍ତୁ',
    rxAddLine: 'ଆଉ ଏକ ଔଷଧ ଯୋଡ଼ନ୍ତୁ',
    rxConfirmBtn: 'ନିଶ୍ଚିତ କରନ୍ତୁ ଓ ଯାଞ୍ଚ କରନ୍ତୁ',
    rxSummaryTitle: 'ଏହି ଚିଠା କାହିଁକି ଦିଆଗଲା?',
    filterAll: 'ସବୁ',
    filterDoctor: 'ଡାକ୍ତର ଚିଠା',
    filterSelf: 'ନିଜେ କିଣା',
    tagDoctor: 'ଡାକ୍ତର ଲେଖିଛନ୍ତି',
    tagSelf: 'ନିଜେ ଦୋକାନରୁ କିଣିଛି',
    tagNotSure: 'ଜଣା ନାହିଁ',
    sameSaltWarning: 'ଏହି ଦୁଇଟିରେ ସମାନ ଔଷଧ ଅଛି। ଏକାଠି ଖାଇବା ବିପଜ୍ଜନକ ହୋଇପାରେ। ଦୋକାନୀଙ୍କୁ ପଚାରନ୍ତୁ।',
    interactionWarning: 'ଏଗୁଡ଼ିକ ଏକାଠି ନିରାପଦ ନ ହୋଇପାରେ। ଡାକ୍ତର ବା ଦୋକାନୀଙ୍କୁ ପଚାରନ୍ତୁ।',
    checkInteractionsBtn: 'ମୋ ଔଷଧଗୁଡ଼ିକ ଏକାଠି ନିରାପଦ କି ଯାଞ୍ଚ କରନ୍ତୁ',
    healthProfileTitle: 'ମୋର ଆଲର୍ଜି ଓ ସ୍ୱାସ୍ଥ୍ୟ ସମସ୍ୟା (ଇଚ୍ଛାଧୀନ)',
    allergiesLabel: 'ଔଷଧ ଆଲର୍ଜି (ଯଥା ପେନିସିଲିନ୍)',
    conditionsLabel: 'ସ୍ୱାସ୍ଥ୍ୟ ସମସ୍ୟା (ଯଥା ସୁଗାର, କିଡନୀ, ଲିଭର)',
    pregnantLabel: 'ଗର୍ଭବତୀ କିମ୍ବା ସ୍ତନ୍ୟପାନ କରାଉଛନ୍ତି',
    noMedicinesYet: 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ଔଷଧ ସେଭ୍ ନାହିଁ। ସ୍କାନ୍ କରନ୍ତୁ କିମ୍ବା ଡେମୋ ଦେଖନ୍ତୁ!',
    doctorNameLabel: 'ଡାକ୍ତରଙ୍କ ନାମ',
    daysLabel: 'କେତେ ଦିନ',
    linkedReportLabel: 'ଯୋଡ଼ା ରିପୋର୍ଟ',
  },
};
