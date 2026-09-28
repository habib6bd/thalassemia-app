-- Phase 3: agent-written DRAFT awareness content (CLAUDE.md #9).
--
-- Everything here is review_status = 'draft' and drafted_by = 'agent'. None
-- of it is visible to users. A human admin must check the text against the
-- linked sources, mark each source as checked (accessed_at), and take each
-- item through in_review → approved → published (docs/CONTENT_SAFETY.md).
--
-- The sources are the starting references from master prompt §33. They are
-- inserted with accessed_at = null because the drafting agent could not open
-- them (network policy), so nothing citing them can be published until a
-- human has checked them (OPEN_QUESTIONS Q35).

insert into public.content_sources (id, title, organization, url, accessed_at) values
  ('5c000000-0000-4000-8000-000000000001', 'Thalassaemia and other haemoglobinopathies (health topic)', 'World Health Organization (WHO)', 'https://www.who.int/health-topics/thalassaemia', null),
  ('5c000000-0000-4000-8000-000000000002', 'Thalassemia', 'U.S. Centers for Disease Control and Prevention (CDC)', 'https://www.cdc.gov/thalassemia/', null),
  ('5c000000-0000-4000-8000-000000000003', 'Thalassaemia International Federation', 'Thalassaemia International Federation (TIF)', 'https://thalassaemia.org.cy/', null),
  ('5c000000-0000-4000-8000-000000000004', 'Bangladesh thalassemia prevalence and prevention literature (PMC12247199)', 'NCBI / PubMed Central', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12247199/', null)
on conflict (id) do nothing;

insert into public.awareness_content (
  id, kind, slug, category, sort_order, drafted_by, title_bn, title_en, summary_bn, summary_en, body_bn, body_en
) values
(
  '5d000000-0000-4000-8000-000000000001', 'article', 'what-is-thalassemia', 'what_is_thalassemia', 10, 'agent',
  'থ্যালাসেমিয়া কী?',
  'What is thalassemia?',
  'থ্যালাসেমিয়া একটি বংশগত রক্তের অবস্থা। এটি ছোঁয়াচে নয়।',
  'Thalassemia is an inherited blood condition. It is not contagious.',
  E'থ্যালাসেমিয়া একটি বংশগত রক্তের অবস্থা। এতে শরীর যথেষ্ট পরিমাণে বা স্বাভাবিক হিমোগ্লোবিন তৈরি করতে পারে না। হিমোগ্লোবিন হলো লোহিত রক্তকণিকার একটি প্রোটিন, যা শরীরে অক্সিজেন বহন করে।\n\nথ্যালাসেমিয়া মা-বাবার কাছ থেকে জিনের মাধ্যমে সন্তানের মধ্যে আসে। এটি ছোঁয়াচে নয়, এবং মা-বাবা কিছু ভুল করেছেন বলে এটি হয় না।\n\nথ্যালাসেমিয়ার ধরন ও তীব্রতা একেক জনের একেক রকম। কারও নিয়মিত রক্ত নিতে হয়, আবার কারও লক্ষণ খুব কম বা নেই। কার কী চিকিৎসা দরকার, তা শুধু চিকিৎসক ও চিকিৎসা কেন্দ্রই ঠিক করতে পারেন।',
  E'Thalassemia is an inherited blood condition. The body cannot make enough normal haemoglobin, the protein in red blood cells that carries oxygen around the body.\n\nThalassemia is passed from parents to children through genes. It is not contagious, and it is not caused by anything the parents did wrong.\n\nThe type and severity of thalassemia differ from person to person. Some people need regular blood transfusions, while others have few or no symptoms. Only a doctor and the treatment centre can decide what care a person needs.'
),
(
  '5d000000-0000-4000-8000-000000000002', 'article', 'what-is-a-carrier', 'what_is_carrier', 20, 'agent',
  'থ্যালাসেমিয়া বাহক (ক্যারিয়ার) কী?',
  'What is a thalassemia carrier?',
  'দেখতে সম্পূর্ণ সুস্থ হলেও কেউ থ্যালাসেমিয়ার বাহক হতে পারেন।',
  'Someone can look completely healthy and still be a thalassemia carrier.',
  E'থ্যালাসেমিয়া বাহক (ক্যারিয়ার বা ট্রেইট) মানে একজন মানুষের মধ্যে থ্যালাসেমিয়ার একটি পরিবর্তিত জিন আছে। সাধারণত বাহকের থ্যালাসেমিয়া রোগ থাকে না, এবং অনেক সময় কোনো লক্ষণও থাকে না।\n\nতাই দেখতে সম্পূর্ণ সুস্থ হলেও কেউ বাহক হতে পারেন, এবং নিজে তা না-ও জানতে পারেন। বাহক হওয়া কোনো অসুখ বা লজ্জার বিষয় নয়।\n\nবাহক তাঁর সন্তানের মধ্যে এই জিনটি দিতে পারেন। কেউ বাহক কি না, তা শুধু রক্ত পরীক্ষার মাধ্যমে জানা যায়। কোন পরীক্ষা আপনার জন্য উপযুক্ত, তা একজন চিকিৎসকের সাথে আলোচনা করুন।',
  E'A thalassemia carrier (also called having the trait) has one changed thalassemia gene. A carrier usually does not have thalassemia disease, and often has no symptoms at all.\n\nSo someone can look completely healthy and still be a carrier, without knowing it. Being a carrier is not an illness and nothing to be ashamed of.\n\nA carrier can pass this gene on to their children. The only way to know whether someone is a carrier is a blood test. Talk to a doctor about which test is right for you.'
),
(
  '5d000000-0000-4000-8000-000000000003', 'article', 'why-carrier-screening-matters', 'why_screening', 30, 'agent',
  'বাহক পরীক্ষা কেন গুরুত্বপূর্ণ হতে পারে',
  'Why carrier screening can matter',
  'বিয়ে বা পরিবার পরিকল্পনার আগে বাহক অবস্থা সম্পর্কে জানা গুরুত্বপূর্ণ হতে পারে।',
  'Knowing about carrier status before marriage or family planning can be important.',
  E'অনেক বাহক জানেন না যে তাঁরা বাহক, কারণ তাঁদের কোনো লক্ষণ থাকে না। পরীক্ষার মাধ্যমে জানা থাকলে একজন মানুষ বা দম্পতি তথ্য জেনে ভবিষ্যৎ পরিকল্পনা করতে পারেন এবং প্রয়োজনে চিকিৎসকের সাথে আগেভাগে কথা বলতে পারেন।\n\nবাহক পরীক্ষা করা একটি ব্যক্তিগত সিদ্ধান্ত। কে পরীক্ষা করেছেন বা করেননি, তার জন্য কাউকে দোষ দেওয়া উচিত নয়। কাকে বিয়ে করবেন, সেই সিদ্ধান্ত এই অ্যাপ বা এই লেখা দেয় না।\n\nপরীক্ষা আপনার জন্য প্রযোজ্য কি না এবং কখন করা ভালো, তা একজন চিকিৎসক বা জেনেটিক কাউন্সেলরের সাথে আলোচনা করুন।',
  E'Many carriers do not know they are carriers, because they have no symptoms. Knowing through a test lets a person or a couple plan with information and, if needed, talk to a doctor early.\n\nCarrier screening is a personal decision. Nobody should be blamed for having or not having been tested. This app and this text do not tell anyone whom to marry.\n\nAsk a doctor or genetic counsellor whether screening is appropriate for you, and when.'
),
(
  '5d000000-0000-4000-8000-000000000004', 'article', 'if-both-partners-are-carriers', 'both_carriers', 40, 'agent',
  'দুজনই বাহক হলে',
  'If both partners are carriers',
  'দুজন বাহক হলে ভবিষ্যৎ সন্তানের বিষয়ে একজন যোগ্য চিকিৎসক বা জেনেটিক কাউন্সেলরের সাথে কথা বলা উচিত।',
  'If both partners are carriers, they should talk to a qualified doctor or genetic counsellor about future children.',
  E'প্রত্যেক মানুষ প্রতিটি জিনের দুটি কপি পান: একটি মায়ের কাছ থেকে, একটি বাবার কাছ থেকে।\n\nঅনেক ধরনের থ্যালাসেমিয়ার ক্ষেত্রে, মা ও বাবা দুজনই বাহক হলে প্রতিটি গর্ভধারণে সাধারণভাবে বলা হয়:\n• ৪ ভাগের ১ ভাগ সম্ভাবনা সন্তান বাহক নয়\n• ৪ ভাগের ২ ভাগ সম্ভাবনা সন্তান বাহক\n• ৪ ভাগের ১ ভাগ সম্ভাবনা সন্তানের থ্যালাসেমিয়া রোগ\n\nএই সম্ভাবনা প্রতিটি গর্ভধারণে একই থাকে; আগের সন্তানের ফলাফলের উপর নির্ভর করে না। এটি একটি সাধারণ শিক্ষামূলক ব্যাখ্যা, ব্যক্তিগত ঝুঁকি মূল্যায়ন নয়। থ্যালাসেমিয়ার ধরন অনুযায়ী বাস্তব চিত্র ভিন্ন হতে পারে।\n\nদুজনই বাহক হলে কী কী বিকল্প আছে, তা একজন যোগ্য চিকিৎসক বা জেনেটিক কাউন্সেলর ব্যাখ্যা করতে পারেন। সিদ্ধান্ত আপনার ও আপনার পরিবারের।',
  E'Everyone has two copies of each gene: one from their mother and one from their father.\n\nFor many types of thalassemia, when both parents are carriers, each pregnancy is usually described as having:\n• a 1 in 4 chance that the child is not a carrier\n• a 2 in 4 chance that the child is a carrier\n• a 1 in 4 chance that the child has thalassemia disease\n\nThese chances are the same in every pregnancy; they do not depend on earlier children. This is a general educational explanation, not a personal risk assessment. The real picture can differ depending on the type of thalassemia.\n\nA qualified doctor or genetic counsellor can explain the options when both partners are carriers. The decisions are yours and your family''s.'
),
(
  '5d000000-0000-4000-8000-000000000005', 'article', 'genetic-counselling', 'genetic_counselling', 50, 'agent',
  'জেনেটিক কাউন্সেলিং কী?',
  'What is genetic counselling?',
  'একজন প্রশিক্ষিত পেশাজীবী পরীক্ষার ফলাফল ও বিকল্পগুলো বুঝতে সাহায্য করেন।',
  'A trained professional helps you understand test results and options.',
  E'জেনেটিক কাউন্সেলিং হলো একজন প্রশিক্ষিত চিকিৎসক বা জেনেটিক কাউন্সেলরের সাথে আলোচনা। তিনি ব্যাখ্যা করেন একটি বংশগত অবস্থা কীভাবে পরিবারে আসে, পরীক্ষার ফলাফলের অর্থ কী, এবং আপনার সামনে কী কী বিকল্প আছে।\n\nযেসব সময়ে অনেকে জেনেটিক কাউন্সেলিং নেওয়ার কথা ভাবেন:\n• পরীক্ষায় একজন বা দুজন সঙ্গীই বাহক পাওয়া গেলে\n• পরিবারে থ্যালাসেমিয়া থাকলে\n• পরিবার পরিকল্পনার আগে বা গর্ভাবস্থায় প্রশ্ন থাকলে\n\nকাউন্সেলর আপনার হয়ে সিদ্ধান্ত নেন না; তিনি তথ্য দিয়ে সাহায্য করেন, যাতে আপনি নিজে সিদ্ধান্ত নিতে পারেন।',
  E'Genetic counselling is a conversation with a trained doctor or genetic counsellor. They explain how an inherited condition runs in families, what test results mean, and what options you have.\n\nPeople often consider genetic counselling when:\n• a test shows that one or both partners are carriers\n• thalassemia runs in the family\n• they have questions before family planning or during pregnancy\n\nThe counsellor does not make decisions for you; they give you information so that you can decide for yourself.'
),
(
  '5d000000-0000-4000-8000-000000000006', 'article', 'about-screening', 'screening', 60, 'agent',
  'বাহক পরীক্ষা সম্পর্কে',
  'About carrier screening',
  'কোন রক্ত পরীক্ষা আপনার জন্য উপযুক্ত, তা একজন চিকিৎসক বলে দেবেন।',
  'A doctor will advise which blood tests are right for you.',
  E'বাহক কি না তা জানার জন্য রক্ত পরীক্ষা করা হয়। কোন পরীক্ষা করা হবে এবং ফলাফলের অর্থ কী, তা একজন চিকিৎসক বা ল্যাবরেটরি বিশেষজ্ঞ ঠিক করেন ও ব্যাখ্যা করেন।\n\nএই অ্যাপ কোনো পরীক্ষা করে না, ফলাফল ব্যাখ্যা করে না, এবং কেউ বাহক কি না তা বলতে পারে না।\n\nপরীক্ষার কথা ভাবলে একজন চিকিৎসকের সাথে কথা বলুন। ফলাফল হাতে পেলে তা একজন চিকিৎসক বা জেনেটিক কাউন্সেলরকে দিয়ে ব্যাখ্যা করিয়ে নিন।',
  E'Carrier status is found with blood tests. A doctor or laboratory specialist decides which tests to do and explains what the results mean.\n\nThis app does not run tests, does not interpret results, and cannot tell anyone whether they are a carrier.\n\nIf you are thinking about testing, talk to a doctor. When you have results, ask a doctor or genetic counsellor to explain them.'
),
(
  '5d000000-0000-4000-8000-000000000007', 'article', 'family-awareness', 'family_awareness', 70, 'agent',
  'পরিবার ও থ্যালাসেমিয়া',
  'Families and thalassemia',
  'আপনার বা আপনার পরিবারের জন্য পরীক্ষা উপযুক্ত কি না, চিকিৎসক বা জেনেটিক কাউন্সেলরকে জিজ্ঞেস করুন।',
  'Ask your doctor or genetic counsellor whether screening is appropriate for you or your family.',
  E'থ্যালাসেমিয়া বংশগত, তাই পরিবারের ইতিহাস জানা থাকলে চিকিৎসকের সাথে আলোচনা সহজ হয়।\n\nপরিবারে কারও থ্যালাসেমিয়া বা বাহক অবস্থা থাকলে, আত্মীয়দের জন্য পরীক্ষা উপযুক্ত কি না, সে বিষয়ে চিকিৎসক বা জেনেটিক কাউন্সেলরের পরামর্শ নিতে পারেন। সবাইকে পরীক্ষা করতেই হবে, এমন নয়; এটি প্রত্যেকের নিজের সিদ্ধান্ত।\n\nপরিবারে এ বিষয়ে কথা বলার সময় সম্মান ও গোপনীয়তা বজায় রাখুন। কারও পরীক্ষার ফলাফল তাঁর অনুমতি ছাড়া অন্যকে জানাবেন না।',
  E'Thalassemia is inherited, so knowing your family history makes it easier to talk with a doctor.\n\nIf someone in the family has thalassemia or is a carrier, you can ask a doctor or genetic counsellor whether screening is appropriate for relatives. Not everyone has to be tested; it is each person''s own decision.\n\nWhen you talk about this in the family, be respectful and protect privacy. Do not share anyone''s test results without their permission.'
),
(
  '5d000000-0000-4000-8000-000000000011', 'faq', 'faq-is-it-contagious', 'what_is_thalassemia', 10, 'agent',
  'থ্যালাসেমিয়া কি ছোঁয়াচে?',
  'Is thalassemia contagious?',
  null, null,
  E'না। থ্যালাসেমিয়া বংশগত; এটি জিনের মাধ্যমে মা-বাবা থেকে সন্তানে আসে। একসাথে থাকা, খাওয়া বা ছোঁয়ার মাধ্যমে এটি ছড়ায় না।',
  E'No. Thalassemia is inherited; it passes from parents to children through genes. It does not spread by living together, sharing food or touching.'
),
(
  '5d000000-0000-4000-8000-000000000012', 'faq', 'faq-carrier-is-not-illness', 'what_is_carrier', 20, 'agent',
  'বাহক হওয়া মানে কি আমি অসুস্থ?',
  'Does being a carrier mean I am ill?',
  null, null,
  E'সাধারণত না। বেশিরভাগ বাহকের থ্যালাসেমিয়া রোগ থাকে না এবং অনেকের কোনো লক্ষণ থাকে না। আপনার স্বাস্থ্য নিয়ে প্রশ্ন থাকলে একজন চিকিৎসকের সাথে কথা বলুন।',
  E'Usually not. Most carriers do not have thalassemia disease, and many have no symptoms. If you have questions about your own health, talk to a doctor.'
),
(
  '5d000000-0000-4000-8000-000000000013', 'faq', 'faq-can-the-app-tell-me', 'screening', 30, 'agent',
  'এই অ্যাপ কি বলতে পারবে আমি বাহক কি না?',
  'Can this app tell me whether I am a carrier?',
  null, null,
  E'না। শুধু রক্ত পরীক্ষা এবং একজন চিকিৎসকের ব্যাখ্যার মাধ্যমেই তা জানা যায়। এই অ্যাপ শুধু সাধারণ তথ্য দেয় এবং আপনাকে যাচাইকৃত চিকিৎসা কেন্দ্র ও জেনেটিক কাউন্সেলিং সেবা খুঁজে পেতে সাহায্য করে।',
  E'No. Only a blood test, explained by a doctor, can tell you that. This app gives general information and helps you find verified treatment centres and genetic counselling services.'
)
on conflict (id) do nothing;

insert into public.content_source_links (content_id, source_id)
select c.id, s.id
from public.awareness_content c
cross join public.content_sources s
where c.drafted_by = 'agent'
  and c.id::text like '5d000000-%'
  and (
    s.id in ('5c000000-0000-4000-8000-000000000001', '5c000000-0000-4000-8000-000000000002', '5c000000-0000-4000-8000-000000000003')
    or (s.id = '5c000000-0000-4000-8000-000000000004' and c.category in ('why_screening', 'screening'))
  )
on conflict do nothing;
