-- Adds the "Most Likely To" deck to public.prompts (Classic mode).
-- Source: AI_Picture_Game_200_Most Likely to.xlsx ("Most Likely To" sheet)
--
-- All rows share category = 'most_likely_to' so they surface as one new,
-- distinctly selectable option in the existing prompt-category dropdown
-- (no code changes needed - the lobby category list is populated dynamically
-- from distinct public.prompts.category values).
--
-- The source file had 200 rows but only 80 unique prompt texts (each repeated
-- 2-3x with a different roast_level tag - mild/medium/spicy - which the app
-- has no column for and cannot yet use). Deduped to the 80 unique prompts.
--
-- Two of the five source image_style values are not supported by this app's
-- image generator (see app/lib/imagePrompt.ts imageStyleInstructions) and were
-- remapped: 'Cinematic' -> comic_book, 'Mockumentary' -> puppet_show.
-- 'Cartoon', 'Claymation', and 'Children''s Book' map to existing styles as-is.
--
-- prompt_rating normalized from the source's 'great' to 'good' to match this
-- table's actual rating enum (good/ehhh/bad) - pickBestRatedPromptDeck() filters
-- to rating='good' first, so an unrecognized value would silently exclude these
-- prompts whenever 'Random' category pools them with the existing good-rated deck.
-- Run this in the Supabase SQL Editor.

begin;

insert into public.prompts (id, prompt, category, active, personal, image_style, prompt_rating)
values
  (1001, 'Who''s most likely to turn a first date into a quarterly performance review?', 'most_likely_to', true, true, 'cartoon', 'good'),
  (1002, 'Who''s most likely to become the unofficial mayor of the bar?', 'most_likely_to', true, true, 'childrens_picture_book', 'good'),
  (1003, 'Who''s most likely to turn one unread email into a bomb-disposal mission?', 'most_likely_to', true, true, 'puppet_show', 'good'),
  (1004, 'Who''s most likely to treat a buffet like a professional sport?', 'most_likely_to', true, true, 'comic_book', 'good'),
  (1005, 'Who''s most likely to treat mini golf like a major championship?', 'most_likely_to', true, true, 'claymation', 'good'),
  (1006, 'Who''s most likely to pack for a weekend like they''re moving forever?', 'most_likely_to', true, true, 'cartoon', 'good'),
  (1007, 'Who''s most likely to start a group chat over absolutely nothing?', 'most_likely_to', true, true, 'childrens_picture_book', 'good'),
  (1008, 'Who''s most likely to need three trips to carry groceries?', 'most_likely_to', true, true, 'puppet_show', 'good'),
  (1009, 'Who''s most likely to fall in love with the waiter instead of their date?', 'most_likely_to', true, true, 'comic_book', 'good'),
  (1010, 'Who''s most likely to start leading strangers in a victory parade?', 'most_likely_to', true, true, 'claymation', 'good'),
  (1011, 'Who''s most likely to schedule a meeting that could have been one sentence?', 'most_likely_to', true, true, 'cartoon', 'good'),
  (1012, 'Who''s most likely to start a debate over the best french fry?', 'most_likely_to', true, true, 'childrens_picture_book', 'good'),
  (1013, 'Who''s most likely to bring recovery gear to a casual walk?', 'most_likely_to', true, true, 'puppet_show', 'good'),
  (1014, 'Who''s most likely to arrive at the airport six hours early?', 'most_likely_to', true, true, 'comic_book', 'good'),
  (1015, 'Who''s most likely to accidentally become the group''s spokesperson?', 'most_likely_to', true, true, 'claymation', 'good'),
  (1016, 'Who''s most likely to watch five tutorials before hanging a picture?', 'most_likely_to', true, true, 'cartoon', 'good'),
  (1017, 'Who''s most likely to bring a color-coded itinerary to a coffee date?', 'most_likely_to', true, true, 'childrens_picture_book', 'good'),
  (1018, 'Who''s most likely to treat karaoke like a sold-out stadium tour?', 'most_likely_to', true, true, 'puppet_show', 'good'),
  (1019, 'Who''s most likely to make the office coffee sound life-changing?', 'most_likely_to', true, true, 'comic_book', 'good'),
  (1020, 'Who''s most likely to order enough appetizers for twenty people?', 'most_likely_to', true, true, 'claymation', 'good'),
  (1021, 'Who''s most likely to celebrate finishing a 5K like winning Olympic gold?', 'most_likely_to', true, true, 'cartoon', 'good'),
  (1022, 'Who''s most likely to turn a road trip into a nature documentary?', 'most_likely_to', true, true, 'childrens_picture_book', 'good'),
  (1023, 'Who''s most likely to remember everyone''s embarrassing stories?', 'most_likely_to', true, true, 'puppet_show', 'good'),
  (1024, 'Who''s most likely to celebrate assembling furniture without leftover screws?', 'most_likely_to', true, true, 'comic_book', 'good'),
  (1025, 'Who''s most likely to accidentally interview their date?', 'most_likely_to', true, true, 'claymation', 'good'),
  (1026, 'Who''s most likely to make friends with literally everyone in line?', 'most_likely_to', true, true, 'cartoon', 'good'),
  (1027, 'Who''s most likely to build a PowerPoint for a two-minute conversation?', 'most_likely_to', true, true, 'childrens_picture_book', 'good'),
  (1028, 'Who''s most likely to act like brunch requires formal training?', 'most_likely_to', true, true, 'puppet_show', 'good'),
  (1029, 'Who''s most likely to pack enough snacks for a one-mile hike?', 'most_likely_to', true, true, 'comic_book', 'good'),
  (1030, 'Who''s most likely to collect maps they''ll never use?', 'most_likely_to', true, true, 'claymation', 'good'),
  (1031, 'Who''s most likely to bring board games to every gathering?', 'most_likely_to', true, true, 'cartoon', 'good'),
  (1032, 'Who''s most likely to make laundry sound like an expedition?', 'most_likely_to', true, true, 'childrens_picture_book', 'good'),
  (1033, 'Who''s most likely to plan a third date before the appetizers arrive?', 'most_likely_to', true, true, 'puppet_show', 'good'),
  (1034, 'Who''s most likely to be handed the aux cord and never give it back?', 'most_likely_to', true, true, 'comic_book', 'good'),
  (1035, 'Who''s most likely to create a color-coded sticky-note empire?', 'most_likely_to', true, true, 'claymation', 'good'),
  (1036, 'Who''s most likely to turn a backyard grill into a Michelin competition?', 'most_likely_to', true, true, 'cartoon', 'good'),
  (1037, 'Who''s most likely to turn pickleball into a championship rivalry?', 'most_likely_to', true, true, 'childrens_picture_book', 'good'),
  (1038, 'Who''s most likely to volunteer to navigate and get everyone lost?', 'most_likely_to', true, true, 'puppet_show', 'good'),
  (1039, 'Who''s most likely to give a toast nobody asked for?', 'most_likely_to', true, true, 'comic_book', 'good'),
  (1040, 'Who''s most likely to forget why they walked into a room?', 'most_likely_to', true, true, 'claymation', 'good'),
  (1041, 'Who''s most likely to treat speed dating like the Olympics?', 'most_likely_to', true, true, 'cartoon', 'good'),
  (1042, 'Who''s most likely to accidentally organize a conga line?', 'most_likely_to', true, true, 'childrens_picture_book', 'good'),
  (1043, 'Who''s most likely to become employee of the month somewhere they don''t work?', 'most_likely_to', true, true, 'puppet_show', 'good'),
  (1044, 'Who''s most likely to eat movie theater popcorn like it''s survival rations?', 'most_likely_to', true, true, 'comic_book', 'good'),
  (1045, 'Who''s most likely to become the team mascot by accident?', 'most_likely_to', true, true, 'claymation', 'good'),
  (1046, 'Who''s most likely to photograph every road sign?', 'most_likely_to', true, true, 'cartoon', 'good'),
  (1047, 'Who''s most likely to be elected leader of an activity that doesn''t need one?', 'most_likely_to', true, true, 'childrens_picture_book', 'good'),
  (1048, 'Who''s most likely to buy a planner to organize their planners?', 'most_likely_to', true, true, 'puppet_show', 'good'),
  (1049, 'Who''s most likely to memorize their date''s entire family tree?', 'most_likely_to', true, true, 'comic_book', 'good'),
  (1050, 'Who''s most likely to turn bar trivia into a blood feud?', 'most_likely_to', true, true, 'claymation', 'good'),
  (1051, 'Who''s most likely to treat the printer like a sworn enemy?', 'most_likely_to', true, true, 'cartoon', 'good'),
  (1052, 'Who''s most likely to request extra napkins before seeing the menu?', 'most_likely_to', true, true, 'childrens_picture_book', 'good'),
  (1053, 'Who''s most likely to wear a fitness watch to play board games?', 'most_likely_to', true, true, 'puppet_show', 'good'),
  (1054, 'Who''s most likely to treat a hotel breakfast like a royal banquet?', 'most_likely_to', true, true, 'comic_book', 'good'),
  (1055, 'Who''s most likely to start a fantasy league for everyday life?', 'most_likely_to', true, true, 'claymation', 'good'),
  (1056, 'Who''s most likely to turn returning a package into an adventure?', 'most_likely_to', true, true, 'cartoon', 'good'),
  (1057, 'Who''s most likely to bring a spreadsheet to split the bill?', 'most_likely_to', true, true, 'childrens_picture_book', 'good'),
  (1058, 'Who''s most likely to order food for the entire table?', 'most_likely_to', true, true, 'puppet_show', 'good'),
  (1059, 'Who''s most likely to give an acceptance speech after finishing a spreadsheet?', 'most_likely_to', true, true, 'comic_book', 'good'),
  (1060, 'Who''s most likely to become emotionally attached to a restaurant booth?', 'most_likely_to', true, true, 'claymation', 'good'),
  (1061, 'Who''s most likely to stretch longer than the actual workout?', 'most_likely_to', true, true, 'cartoon', 'good'),
  (1062, 'Who''s most likely to buy the weirdest souvenir?', 'most_likely_to', true, true, 'childrens_picture_book', 'good'),
  (1063, 'Who''s most likely to plan next year''s trip before this one starts?', 'most_likely_to', true, true, 'puppet_show', 'good'),
  (1064, 'Who''s most likely to have fifteen reusable bags and forget all of them?', 'most_likely_to', true, true, 'comic_book', 'good'),
  (1065, 'Who''s most likely to start a debate club on a first date?', 'most_likely_to', true, true, 'claymation', 'good'),
  (1066, 'Who''s most likely to convince strangers they''re celebrating a holiday?', 'most_likely_to', true, true, 'cartoon', 'good'),
  (1067, 'Who''s most likely to start every sentence with ''quick question''?', 'most_likely_to', true, true, 'childrens_picture_book', 'good'),
  (1068, 'Who''s most likely to make grocery shopping look like a treasure hunt?', 'most_likely_to', true, true, 'puppet_show', 'good'),
  (1069, 'Who''s most likely to give a motivational speech before bowling?', 'most_likely_to', true, true, 'comic_book', 'good'),
  (1070, 'Who''s most likely to become best friends with the tour guide?', 'most_likely_to', true, true, 'claymation', 'good'),
  (1071, 'Who''s most likely to turn game night into a championship?', 'most_likely_to', true, true, 'cartoon', 'good'),
  (1072, 'Who''s most likely to label everything in the refrigerator?', 'most_likely_to', true, true, 'childrens_picture_book', 'good'),
  (1073, 'Who''s most likely to make flirting sound like customer service?', 'most_likely_to', true, true, 'puppet_show', 'good'),
  (1074, 'Who''s most likely to be mistaken for the bartender?', 'most_likely_to', true, true, 'comic_book', 'good'),
  (1075, 'Who''s most likely to accidentally become the office tour guide?', 'most_likely_to', true, true, 'claymation', 'good'),
  (1076, 'Who''s most likely to treat free samples like an all-you-can-eat event?', 'most_likely_to', true, true, 'cartoon', 'good'),
  (1077, 'Who''s most likely to take cornhole way too seriously?', 'most_likely_to', true, true, 'childrens_picture_book', 'good'),
  (1078, 'Who''s most likely to start an international snack review channel?', 'most_likely_to', true, true, 'puppet_show', 'good'),
  (1079, 'Who''s most likely to become the designated hype person?', 'most_likely_to', true, true, 'comic_book', 'good'),
  (1080, 'Who''s most likely to applaud themselves after paying bills?', 'most_likely_to', true, true, 'claymation', 'good');

commit;
