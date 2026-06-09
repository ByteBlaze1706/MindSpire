-- Supabase Seed Data: seed.sql
-- Contains baseline SaaS configurations, test universities, clinical questionnaires (PHQ-9/GAD-7) with full localisations,
-- and mock student-counselor structures for verification.

-- =====================================================================
-- 1. BASE SaaS SUBSCRIPTION PLANS
-- =====================================================================
INSERT INTO public.subscription_plans (id, name, max_students, price_amount, pricing_model, features)
VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Tier 1 - Starter', 1000, 1500.00, 'flat_annual', '{"aiCompanion": true, "peerCommunity": false, "customBranding": false}'),
  ('a1b2c3d4-0000-0000-0000-000000000002', 'Tier 2 - Growth', 5000, 5000.00, 'flat_annual', '{"aiCompanion": true, "peerCommunity": true, "customBranding": true}'),
  ('a1b2c3d4-0000-0000-0000-000000000003', 'Tier 3 - Enterprise Unlimited', 999999, 12000.00, 'flat_annual', '{"aiCompanion": true, "peerCommunity": true, "customBranding": true, "dedicatedSupport": true}')
ON CONFLICT (name) DO NOTHING;

-- =====================================================================
-- 2. MOCK TENANT INSTITUTIONS
-- =====================================================================
INSERT INTO public.institutions (id, name, subdomain, branding_config)
VALUES
  ('e5f6a7b8-1111-1111-1111-111111111111', 'Columbia University', 'columbia', '{
    "primaryColor": "#1D3557",
    "accentColor": "#457B9D",
    "logoUrl": "https://cdn.mindspire.app/columbia/logo.png",
    "supportEmail": "mentalhealth@columbia.edu",
    "emergencyPhone": "212-854-5555"
  }'),
  ('e5f6a7b8-2222-2222-2222-222222222222', 'Stanford University', 'stanford', '{
    "primaryColor": "#8C1515",
    "accentColor": "#F2C94C",
    "logoUrl": "https://cdn.mindspire.app/stanford/logo.png",
    "supportEmail": "caps@stanford.edu",
    "emergencyPhone": "650-723-3785"
  }')
ON CONFLICT (subdomain) DO NOTHING;

-- =====================================================================
-- 3. PROVISION ACTIVE INSTITUTION SUBSCRIPTIONS
-- =====================================================================
INSERT INTO public.institution_subscriptions (id, institution_id, plan_id, status, billing_cycle_start, billing_cycle_end)
VALUES
  ('c7d8e9f0-1111-1111-1111-111111111111', 'e5f6a7b8-1111-1111-1111-111111111111', 'a1b2c3d4-0000-0000-0000-000000000002', 'active', now(), now() + interval '1 year'),
  ('c7d8e9f0-2222-2222-2222-222222222222', 'e5f6a7b8-2222-2222-2222-222222222222', 'a1b2c3d4-0000-0000-0000-000000000003', 'active', now(), now() + interval '1 year')
ON CONFLICT (institution_id, status) DO NOTHING;

-- =====================================================================
-- 4. CLINICAL QUESTIONNAIRES DEFINITIONS (PHQ-9 & GAD-7)
-- =====================================================================
INSERT INTO public.assessment_types (id, name, description, version, scoring_guide, translations)
VALUES
  ('d1e2f3a4-1111-1111-1111-111111111111', 'PHQ-9', 'Patient Health Questionnaire for depression severity evaluation.', '1.0', '{
    "ranges": [
      {"min": 0, "max": 4, "severity": "Minimal Depression"},
      {"min": 5, "max": 9, "severity": "Mild Depression"},
      {"min": 10, "max": 14, "severity": "Moderate Depression"},
      {"min": 15, "max": 19, "severity": "Moderately Severe Depression"},
      {"min": 20, "max": 27, "severity": "Severe Depression"}
    ]
  }', '{
    "hi": { "name": "PHQ-9 (अवसाद मूल्यांकन)", "description": "पिछले २ हफ़्तों में आपके मन: स्थिति का आकलन करने के लिए प्रश्नावली।" },
    "mr": { "name": "PHQ-9 (उदासीनता मूल्यमापन)", "description": "गेल्या २ आठवड्यांतील तुमच्या मनःस्थितीचे मूल्यमापन करण्यासाठी प्रश्नावली." },
    "ta": { "name": "PHQ-9 (மனச்சோர்வு மதிப்பீடு)", "description": "கடந்த 2 வாரங்களில் உங்கள் மனநிலையை மதிப்பிடுவதற்கான வினாடி வினா." },
    "te": { "name": "PHQ-9 (డిప్రెషన్ అసెస్‌మెంట్)", "description": "గత 2 వారాలలో మీ మానసిక స్థితిని అంచనా వేయడానికి ప్రశ్నపత్రం." },
    "bn": { "name": "PHQ-9 (অবসাদ মূল্যায়ন)", "description": "গত ২ সপ্তাহে আপনার মানসিক অবস্থা মূল্যায়ন করার জন্য প্রশ্নাবলী।" },
    "gu": { "name": "PHQ-9 (હતાશા મૂલ્યાંકન)", "description": "છેલ્લા ૨ અઠવાડિયામાં તમારા માનસિક સ્વાસ્થ્યનું મૂલ્યાંકન કરવા માટે પ્રશ્નાવલી." }
  }'),

  ('d1e2f3a4-2222-2222-2222-222222222222', 'GAD-7', 'Generalized Anxiety Disorder scale for measuring anxiety levels.', '1.0', '{
    "ranges": [
      {"min": 0, "max": 4, "severity": "Minimal Anxiety"},
      {"min": 5, "max": 9, "severity": "Mild Anxiety"},
      {"min": 10, "max": 14, "severity": "Moderate Anxiety"},
      {"min": 15, "max": 21, "severity": "Severe Anxiety"}
    ]
  }', '{
    "hi": { "name": "GAD-7 (चिंता मूल्यांकन)", "description": "सामान्यीकृत चिंता विकार का स्तर मापने के लिए प्रश्नावली।" },
    "mr": { "name": "GAD-7 (चिंता मूल्यमापन)", "description": "सामान्यीकृत चिंता पातळी मोजण्यासाठी प्रश्नावली." },
    "ta": { "name": "GAD-7 (பதட்ட மதிப்பீடு)", "description": "பொதுவான பதட்ட நிலையை அளவிடுவதற்கான வினாடி வினா." },
    "te": { "name": "GAD-7 (ఆందోళన అసెస్‌మెంట్)", "description": "ఆందోళన స్థాయిని అంచనా వేయడానికి ప్రశ్నపత్రం." },
    "bn": { "name": "GAD-7 (উদ্বেগ মূল্যায়ন)", "description": "উদ্বেগের মাত্রা পরিমাপ করার জন্য প্রশ্নাবলী।" },
    "gu": { "name": "GAD-7 (ચિંતા મૂલ્યાંકન)", "description": "સામાન્યીકૃત ચિંતાના સ્તરને માપવા માટે પ્રશ્નાવલી." }
  }')
ON CONFLICT (name) DO NOTHING;

-- =====================================================================
-- 5. ASSESSMENT QUESTIONS BANK WITH LOCALISATIONS (PHQ-9 QUESTIONS)
-- =====================================================================

-- Question 1: Little interest
INSERT INTO public.assessment_questions (id, assessment_type_id, question_text, display_order, options, translations)
VALUES (
  'b1c2d3e4-1111-1111-1111-111111111111',
  'd1e2f3a4-1111-1111-1111-111111111111',
  'Little interest or pleasure in doing things.',
  1,
  '[
    {"label": "Not at all", "value": 0},
    {"label": "Several days", "value": 1},
    {"label": "More than half the days", "value": 2},
    {"label": "Nearly every day", "value": 3}
  ]'::jsonb,
  '{
    "hi": {
      "question_text": "कामों को करने में बहुत कम रुचि या आनंद होना।",
      "options": [{"label": "बिल्कुल नहीं", "value": 0}, {"label": "कई दिन", "value": 1}, {"label": "आधे से अधिक दिन", "value": 2}, {"label": "लगभग हर दिन", "value": 3}]
    },
    "mr": {
      "question_text": "गोष्टी करण्यात रस किंवा आनंद कमी असणे.",
      "options": [{"label": "अजिबात नाही", "value": 0}, {"label": "काही दिवस", "value": 1}, {"label": "अर्ध्यापेक्षा जास्त दिवस", "value": 2}, {"label": "जवळजवळ दररोज", "value": 3}]
    },
    "ta": {
      "question_text": "காரியங்களைச் செய்வதில் குறைந்த ஆர்வம் அல்லது மகிழ்ச்சி.",
      "options": [{"label": "இல்லவே இல்லை", "value": 0}, {"label": "பல நாட்கள்", "value": 1}, {"label": "பாதிக்கும் மேற்பட்ட நாட்கள்", "value": 2}, {"label": "கிட்டத்தட்ட ஒவ்வொரு நாளும்", "value": 3}]
    },
    "te": {
      "question_text": "పనులు చేయడంలో తక్కువ ఆసక్తి లేదా ఆనందం ఉండడం.",
      "options": [{"label": "అస్సలు లేదు", "value": 0}, {"label": "కొన్ని రోజులు", "value": 1}, {"label": "సగానికి పైగా రోజులు", "value": 2}, {"label": "దాదాపు ప్రతి రోజు", "value": 3}]
    },
    "bn": {
      "question_text": "কাজকর্মে খুব কম আগ্রহ বা আনন্দ পাওয়া।",
      "options": [{"label": "একদমই না", "value": 0}, {"label": "কয়েকদিন", "value": 1}, {"label": "অর্ধেকের বেশি দিন", "value": 2}, {"label": "প্রায় প্রতিদিন", "value": 3}]
    },
    "gu": {
      "question_text": "કાર્યો કરવામાં બહુ ઓછો રસ અથવા આનંદ હોવો.",
      "options": [{"label": "બિલકુલ નહીં", "value": 0}, {"label": "કેટલાક દિવસો", "value": 1}, {"label": "અડધાથી વધુ દિવસો", "value": 2}, {"label": "લગભગ દરેક દિવસે", "value": 3}]
    }
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Question 2: Feeling down
INSERT INTO public.assessment_questions (id, assessment_type_id, question_text, display_order, options, translations)
VALUES (
  'b1c2d3e4-2222-2222-2222-222222222222',
  'd1e2f3a4-1111-1111-1111-111111111111',
  'Feeling down, depressed, or hopeless.',
  2,
  '[
    {"label": "Not at all", "value": 0},
    {"label": "Several days", "value": 1},
    {"label": "More than half the days", "value": 2},
    {"label": "Nearly every day", "value": 3}
  ]'::jsonb,
  '{
    "hi": {
      "question_text": "उदासी, अवसाद या निराशा महसूस करना।",
      "options": [{"label": "बिल्कुल नहीं", "value": 0}, {"label": "कई दिन", "value": 1}, {"label": "आधे से अधिक दिन", "value": 2}, {"label": "लगभग हर दिन", "value": 3}]
    },
    "mr": {
      "question_text": "खिन्न, उदास किंवा हताश वाटणे.",
      "options": [{"label": "अजिबात नाही", "value": 0}, {"label": "काही दिवस", "value": 1}, {"label": "अर्ध्यापेक्षा जास्त दिवस", "value": 2}, {"label": "जवळजवळ दररोज", "value": 3}]
    },
    "ta": {
      "question_text": "சோர்வாக, மனச்சோர்வாக அல்லது நம்பிக்கையற்று உணருதல்.",
      "options": [{"label": "இல்லவே இல்லை", "value": 0}, {"label": "பல நாட்கள்", "value": 1}, {"label": "பாதிக்கும் மேற்பட்ட நாட்கள்", "value": 2}, {"label": "கிட்டத்தட்ட ஒவ்வொரு நாளும்", "value": 3}]
    },
    "te": {
      "question_text": "నిరాశగా, విచారంగా లేదా నిస్సహాయంగా అనిపించడం.",
      "options": [{"label": "అస్సలు లేదు", "value": 0}, {"label": "కొన్ని రోజులు", "value": 1}, {"label": "సగానికి పైగా రోజులు", "value": 2}, {"label": "దాదాపు ప్రతి రోజు", "value": 3}]
    },
    "bn": {
      "question_text": "মন খারাপ, অবসাদগ্রস্ত বা আশাহীন বোধ করা।",
      "options": [{"label": "একদমই না", "value": 0}, {"label": "কয়েকদিন", "value": 1}, {"label": "অর্ধেকের বেশি দিন", "value": 2}, {"label": "প্রায় প্রতিদিন", "value": 3}]
    },
    "gu": {
      "question_text": "ઉદાસ, હતાશ અથવા નિરાશ અનુભવવું.",
      "options": [{"label": "બિલકુલ નહીં", "value": 0}, {"label": "કેટલાક દિવસો", "value": 1}, {"label": "અડધાથી વધુ દિવસો", "value": 2}, {"label": "લગભગ દરેક દિવસે", "value": 3}]
    }
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Question 9 (Suicidal Ideation Trigger)
INSERT INTO public.assessment_questions (id, assessment_type_id, question_text, display_order, options, translations)
VALUES (
  'b1c2d3e4-9999-9999-9999-999999999999',
  'd1e2f3a4-1111-1111-1111-111111111111',
  'Thoughts that you would be better off dead, or of hurting yourself in some way.',
  9,
  '[
    {"label": "Not at all", "value": 0},
    {"label": "Several days", "value": 1},
    {"label": "More than half the days", "value": 2},
    {"label": "Nearly every day", "value": 3}
  ]'::jsonb,
  '{
    "hi": {
      "question_text": "ऐसे विचार आना कि आपका मर जाना बेहतर होगा, या खुद को चोट पहुँचाने के विचार।",
      "options": [{"label": "बिल्कुल नहीं", "value": 0}, {"label": "कई दिन", "value": 1}, {"label": "आधे से अधिक दिन", "value": 2}, {"label": "लगभग हर दिन", "value": 3}]
    },
    "mr": {
      "question_text": "आपण मरणे चांगले होईल किंवा स्वतःला दुखापत करून घेण्याचे विचार येणे.",
      "options": [{"label": "अजिबात नाही", "value": 0}, {"label": "काही दिवस", "value": 1}, {"label": "अर्ध्यापेक्षा जास्त दिवस", "value": 2}, {"label": "जवळजवळ दररोज", "value": 3}]
    },
    "ta": {
      "question_text": "நீங்கள் இறப்பது நல்லது அல்லது உங்களை ஏதேனும் ஒரு வழியில் காயப்படுத்திக் கொள்வது போன்ற எண்ணங்கள்.",
      "options": [{"label": "இல்லவே இல்லை", "value": 0}, {"label": "பல நாட்கள்", "value": 1}, {"label": "பாதிக்கும் மேற்பட்ட நாட்கள்", "value": 2}, {"label": "கிட்டத்தட்ட ஒவ்வொரு நாளும்", "value": 3}]
    },
    "te": {
      "question_text": "మీరు చనిపోవడం మంచిదనిపించడం లేదా ఏదైనా విధంగా మిమ్మల్ని మీరు గాయపరుచుకోవాలనే ఆలోచనలు.",
      "options": [{"label": "అస్సలు లేదు", "value": 0}, {"label": "కొన్ని రోజులు", "value": 1}, {"label": "సగానికి పైగా రోజులు", "value": 2}, {"label": "దాదాపు ప్రతి రోజు", "value": 3}]
    },
    "bn": {
      "question_text": "মারা যাওয়াই ভালো হবে অথবা নিজেকে কোনোভাবে আঘাত করার চিন্তা করা।",
      "options": [{"label": "একদমই না", "value": 0}, {"label": "কয়েকদিন", "value": 1}, {"label": "অর্ধেকের বেশি দিন", "value": 2}, {"label": "প্রায় প্রতিদিন", "value": 3}]
    },
    "gu": {
      "question_text": "એવા વિચારો આવવા કે તમારું મૃત્યુ થાય તે વધુ સારું છે, અથવા પોતાને કોઈ રીતે નુકસાન પહોંચાડવું.",
      "options": [{"label": "બિલકુલ નહીં", "value": 0}, {"label": "કેટલાક દિવસો", "value": 1}, {"label": "અડધાથી વધુ દિવસો", "value": 2}, {"label": "લગભગ દરેક દિવસે", "value": 3}]
    }
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- 6. CMS LOCALIZED RESOURCES
-- =====================================================================
INSERT INTO public.resources (id, institution_id, title, content_markdown, category, status, translations)
VALUES (
  'f1e2d3c4-1111-1111-1111-111111111111',
  'e5f6a7b8-1111-1111-1111-111111111111',
  'Managing Stress During Exams',
  '# Managing Stress During Exams\nHere are some tips to manage stress...\n1. Take short breaks\n2. Drink water\n3. Sleep well.',
  'Anxiety & Stress Management',
  'published',
  '{
    "hi": {
      "title": "परीक्षा के दौरान तनाव प्रबंधन",
      "content_markdown": "# परीक्षा के दौरान तनाव प्रबंधन\nतनाव को प्रबंधित करने के लिए यहाँ कुछ सुझाव दिए गए हैं...\n१. छोटे अंतराल लें\n२. पानी पिएं\n३. अच्छी नींद लें।"
    },
    "mr": {
      "title": "परीक्षेच्या काळात तणावाचे व्यवस्थापन",
      "content_markdown": "# परीक्षेच्या काळात तणावाचे व्यवस्थापन\nतणावाचे व्यवस्थापन करण्यासाठी काही टिप्स...\n१. लहान विश्रांती घ्या\n२. भरपूर पाणी प्या\n३. चांगली झोप घ्या."
    },
    "ta": {
      "title": "தேர்வு காலத்தில் பதட்டத்தை கையாளுதல்",
      "content_markdown": "# தேர்வு காலத்தில் பதட்டத்தை கையாளுதல்\nபதட்டத்தைக் குறைக்க சில குறிப்புகள்...\n1. சிறிய இடைவெளிகளை எடுத்துக் கொள்ளுங்கள்\n2. தண்ணீர் குடிக்கவும்\n3. நன்றாக தூங்குங்கள்."
    },
    "te": {
      "title": "పరీక్షల సమయంలో ఒత్తిడిని నిర్వహించడం",
      "content_markdown": "# పరీక్షల సమయంలో ఒత్తిడిని నిర్వహించడం\nఒత్తిడిని ఎదుర్కొనేందుకు కొన్ని చిట్కాలు...\n1. చిన్న విరామాలు తీసుకోండి\n2. నీరు త్రాగండి\n3. బాగా నిద్రపోండి."
    },
    "bn": {
      "title": "পরীক্ষার সময় মানসিক চাপ সামলানো",
      "content_markdown": "# পরীক্ষার সময় মানসিক চাপ সামলানো\nমানসিক চাপ কমানোর কিছু উপায়...\n১. ছোট বিরতি নিন\n২. জল পান করুন\n৩. পর্যাপ্ত ঘুমান।"
    },
    "gu": {
      "title": "પરીક્ષા દરમિયાન તણાવનું સંચાલન",
      "content_markdown": "# પરીક્ષા દરમિયાન તણાવનું સંચાલન\nતણાવ સંચાલન માટેની કેટલીક ટિપ્સ...\n૧. ટૂંકા વિરામ લો\n૨. પાણી પીઓ\n૩. સારી ઊંઘ લો."
    }
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- 7. CMS LOCALIZED ANNOUNCEMENTS
-- =====================================================================
INSERT INTO public.announcements (id, institution_id, title, content, target_audience, translations)
VALUES (
  'f1e2d3c4-2222-2222-2222-222222222222',
  'e5f6a7b8-1111-1111-1111-111111111111',
  'Free Wellness Workshops Next Week',
  'Join us on Monday at 3 PM in the Campus Center for an interactive meditation and breathing workshop.',
  'students',
  '{
    "hi": {
      "title": "अगले सप्ताह निःशुल्क वेलनेस कार्यशालाएं",
      "content": "ध्यान और श्वास कार्यशाला के लिए सोमवार दोपहर ३ बजे कैंपस सेंटर में हमारे साथ जुड़ें।"
    },
    "mr": {
      "title": "पुढील आठवड्यात विनामूल्य निरोगीपणा कार्यशाळा",
      "content": "सोमवारी दुपारी ३ वाजता कॅम्पस सेंटरमध्ये होणाऱ्या ध्यान आणि श्वासोच्छवासाच्या कार्यशाळेत सहभागी व्हा."
    },
    "ta": {
      "title": "அடுத்த வாரம் இலவச நல்வாழ்வுப் பயிலரங்குகள்",
      "content": "திங்கட்கிழமை மதியம் 3 மணிக்கு வளாக மையத்தில் நடைபெறும் தியானப் பயிலரங்கில் எங்களுடன் இணையுங்கள்."
    },
    "te": {
      "title": "వచ్చే వారం ఉచిత వెల్‌నెస్ వర్క్‌షాప్‌లు",
      "content": "సోమవారం మధ్యాహ్నం 3 గంటలకు క్యాంపస్ సెంటర్‌లో జరిగే ఉచిత ధ్యాన వర్క్‌షాప్‌లో పాల్గొనండి."
    },
    "bn": {
      "title": "আগামী সপ্তাহে বিনামূল্যে মানসিক সুস্থতা কর্মশালা",
      "content": "সোমবার দুপুর ৩টেয় ক্যাম্পাস সেন্টারে আমাদের ধ্যান কর্মশালায় যোগ দিন।"
    },
    "gu": {
      "title": "આવતા સપ્તાહે મફત વેલનેસ વર્કશોપ",
      "content": "સોમવારે બપોરે ૩ વાગ્યે કેમ્પસ સેન્ટરમાં મેડિટેશન વર્કશોપમાં જોડાઓ."
    }
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- 8. SEED USERS & ROLES
-- Insert credentials and user roles configuration (linked to Mock UUIDs)
INSERT INTO public.users (id, institution_id, email, role, real_first_name, real_last_name)
VALUES
  -- Super Admin
  ('11111111-1111-1111-1111-111111111111', 'e5f6a7b8-1111-1111-1111-111111111111', 'superadmin@mindspire.app', 'super_admin', 'Global', 'SuperAdmin'),
  -- Columbia Administrator
  ('22222222-2222-2222-2222-222222222222', 'e5f6a7b8-1111-1111-1111-111111111111', 'admin@columbia.edu', 'inst_admin', 'Jane', 'Doe'),
  -- Columbia Counselor
  ('33333333-3333-3333-3333-333333333333', 'e5f6a7b8-1111-1111-1111-111111111111', 'counselor1@columbia.edu', 'counselor', 'Dr. Sarah', 'Stone'),
  -- Columbia Student (Active logger)
  ('44444444-4444-4444-4444-444444444444', 'e5f6a7b8-1111-1111-1111-111111111111', 'student1@columbia.edu', 'student', 'Rohan', 'Sharma')
ON CONFLICT (id) DO NOTHING;

-- Seed Decoupled Anonymous Profiles
INSERT INTO public.anonymous_profiles (id, user_id, institution_id, pseudonym)
VALUES
  ('11111111-1111-1111-1111-11111111111a', '11111111-1111-1111-1111-111111111111', 'e5f6a7b8-1111-1111-1111-111111111111', 'GlobalRoot'),
  ('22222222-2222-2222-2222-22222222222a', '22222222-2222-2222-2222-222222222222', 'e5f6a7b8-1111-1111-1111-111111111111', 'ColumbiaAdmin'),
  ('33333333-3333-3333-3333-33333333333a', '33333333-3333-3333-3333-333333333333', 'e5f6a7b8-1111-1111-1111-111111111111', 'SarahC1'),
  ('44444444-4444-4444-4444-44444444444a', '44444444-4444-4444-4444-444444444444', 'e5f6a7b8-1111-1111-1111-111111111111', 'SereneDeer44')
ON CONFLICT (id) DO NOTHING;

-- Set counselor preferences to receive alerts
UPDATE public.notification_preferences
SET risk_alerts_subscribed = true
WHERE user_id = '33333333-3333-3333-3333-333333333333';

-- =====================================================================
-- 9. USER CLINICAL HISTORICAL ENTRIES
-- =====================================================================

-- Mock student mood ratings log history
INSERT INTO public.mood_logs (institution_id, user_id, score, tags, notes, logged_at)
VALUES
  ('e5f6a7b8-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 5, '{"happy", "energetic"}', 'Feeling good after exam.', now() - interval '2 days'),
  ('e5f6a7b8-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 3, '{"tired", "stressed"}', 'Lots of assignments due.', now() - interval '1 day'),
  ('e5f6a7b8-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 2, '{"anxious", "restless"}', 'Struggling with sleep tonight.', now());

-- Mock student journal (Encrypted in production, seeded with dummy ciphertext payload)
INSERT INTO public.journal_entries (id, institution_id, user_id, encrypted_content, encrypted_dek, sentiment_score, risk_level)
VALUES (
  '7a8b9c0d-1111-1111-1111-111111111111',
  'e5f6a7b8-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444',
  'AES256GCM_ENCRYPTED_TEXT_PLACEHOLDER_FOR_JOURNAL_DATA',
  'ENCRYPTED_DATA_ENCRYPTION_KEY_ENVELOPE',
  -0.65,
  'medium'
) ON CONFLICT (id) DO NOTHING;

-- Consent Grant (Student Rohit grants access to Counselor Sarah)
INSERT INTO public.consent_grants (institution_id, student_id, counselor_id, grant_type, status, expires_at)
VALUES (
  'e5f6a7b8-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333333',
  'both',
  'active',
  now() + interval '30 days'
);
