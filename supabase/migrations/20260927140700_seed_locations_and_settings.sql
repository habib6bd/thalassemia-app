-- Phase 1a: seed the 8 divisions and 64 districts of Bangladesh, per the
-- Bangladesh Bureau of Statistics administrative unit list
-- (https://bbs.gov.bd — "Administrative Units", division/district level,
-- current as of the 2022 census reorganisation), plus initial app_settings.

insert into public.divisions (id, name_bn, name_en) values
  (1, 'ঢাকা', 'Dhaka'),
  (2, 'চট্টগ্রাম', 'Chattogram'),
  (3, 'রাজশাহী', 'Rajshahi'),
  (4, 'খুলনা', 'Khulna'),
  (5, 'বরিশাল', 'Barishal'),
  (6, 'সিলেট', 'Sylhet'),
  (7, 'রংপুর', 'Rangpur'),
  (8, 'ময়মনসিংহ', 'Mymensingh');

insert into public.districts (id, division_id, name_bn, name_en) values
  -- Dhaka division (13)
  (1, 1, 'ঢাকা', 'Dhaka'),
  (2, 1, 'ফরিদপুর', 'Faridpur'),
  (3, 1, 'গাজীপুর', 'Gazipur'),
  (4, 1, 'গোপালগঞ্জ', 'Gopalganj'),
  (5, 1, 'কিশোরগঞ্জ', 'Kishoreganj'),
  (6, 1, 'মাদারীপুর', 'Madaripur'),
  (7, 1, 'মানিকগঞ্জ', 'Manikganj'),
  (8, 1, 'মুন্সিগঞ্জ', 'Munshiganj'),
  (9, 1, 'নারায়ণগঞ্জ', 'Narayanganj'),
  (10, 1, 'নরসিংদী', 'Narsingdi'),
  (11, 1, 'রাজবাড়ী', 'Rajbari'),
  (12, 1, 'শরীয়তপুর', 'Shariatpur'),
  (13, 1, 'টাঙ্গাইল', 'Tangail'),
  -- Chattogram division (11)
  (14, 2, 'বান্দরবান', 'Bandarban'),
  (15, 2, 'ব্রাহ্মণবাড়িয়া', 'Brahmanbaria'),
  (16, 2, 'চাঁদপুর', 'Chandpur'),
  (17, 2, 'চট্টগ্রাম', 'Chattogram'),
  (18, 2, 'কুমিল্লা', 'Cumilla'),
  (19, 2, 'কক্সবাজার', 'Cox''s Bazar'),
  (20, 2, 'ফেনী', 'Feni'),
  (21, 2, 'খাগড়াছড়ি', 'Khagrachhari'),
  (22, 2, 'লক্ষ্মীপুর', 'Lakshmipur'),
  (23, 2, 'নোয়াখালী', 'Noakhali'),
  (24, 2, 'রাঙামাটি', 'Rangamati'),
  -- Rajshahi division (8)
  (25, 3, 'বগুড়া', 'Bogura'),
  (26, 3, 'জয়পুরহাট', 'Joypurhat'),
  (27, 3, 'নওগাঁ', 'Naogaon'),
  (28, 3, 'নাটোর', 'Natore'),
  (29, 3, 'চাঁপাইনবাবগঞ্জ', 'Chapai Nawabganj'),
  (30, 3, 'পাবনা', 'Pabna'),
  (31, 3, 'রাজশাহী', 'Rajshahi'),
  (32, 3, 'সিরাজগঞ্জ', 'Sirajganj'),
  -- Khulna division (10)
  (33, 4, 'বাগেরহাট', 'Bagerhat'),
  (34, 4, 'চুয়াডাঙ্গা', 'Chuadanga'),
  (35, 4, 'যশোর', 'Jashore'),
  (36, 4, 'ঝিনাইদহ', 'Jhenaidah'),
  (37, 4, 'খুলনা', 'Khulna'),
  (38, 4, 'কুষ্টিয়া', 'Kushtia'),
  (39, 4, 'মাগুরা', 'Magura'),
  (40, 4, 'মেহেরপুর', 'Meherpur'),
  (41, 4, 'নড়াইল', 'Narail'),
  (42, 4, 'সাতক্ষীরা', 'Satkhira'),
  -- Barishal division (6)
  (43, 5, 'বরগুনা', 'Barguna'),
  (44, 5, 'বরিশাল', 'Barishal'),
  (45, 5, 'ভোলা', 'Bhola'),
  (46, 5, 'ঝালকাঠি', 'Jhalokati'),
  (47, 5, 'পটুয়াখালী', 'Patuakhali'),
  (48, 5, 'পিরোজপুর', 'Pirojpur'),
  -- Sylhet division (4)
  (49, 6, 'হবিগঞ্জ', 'Habiganj'),
  (50, 6, 'মৌলভীবাজার', 'Moulvibazar'),
  (51, 6, 'সুনামগঞ্জ', 'Sunamganj'),
  (52, 6, 'সিলেট', 'Sylhet'),
  -- Rangpur division (8)
  (53, 7, 'দিনাজপুর', 'Dinajpur'),
  (54, 7, 'গাইবান্ধা', 'Gaibandha'),
  (55, 7, 'কুড়িগ্রাম', 'Kurigram'),
  (56, 7, 'লালমনিরহাট', 'Lalmonirhat'),
  (57, 7, 'নীলফামারী', 'Nilphamari'),
  (58, 7, 'পঞ্চগড়', 'Panchagarh'),
  (59, 7, 'রংপুর', 'Rangpur'),
  (60, 7, 'ঠাকুরগাঁও', 'Thakurgaon'),
  -- Mymensingh division (4)
  (61, 8, 'জামালপুর', 'Jamalpur'),
  (62, 8, 'ময়মনসিংহ', 'Mymensingh'),
  (63, 8, 'নেত্রকোণা', 'Netrokona'),
  (64, 8, 'শেরপুর', 'Sherpur');

insert into public.app_settings (key, value, description) values
  ('max_connected_donors', '6', 'Product rule (not medical), CLAUDE.md #4: max donors a patient may keep connected.'),
  ('request_expiry_grace_hours', '24', 'Hours after required_at before an open/responding request is auto-expired by process_request_timers().'),
  ('regular_response_window_hours', '6', 'Phase 2: regular-donor response window before backup donors are notified (OPEN_QUESTIONS Q13). Unused in Phase 1.'),
  ('donation_reminder_days', '120', 'Phase 2: configurable reminder cadence, not a medical eligibility rule. Unused in Phase 1.');
