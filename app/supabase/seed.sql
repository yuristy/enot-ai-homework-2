-- app/supabase/seed.sql
-- Курируемый стартовый набор (расширяется workflow'ом workflow/add-place.md).
--
-- photo_url — реальные фото соответствующих московских локаций с Wikimedia
-- Commons (лицензии CC0/CC BY/CC BY-SA/FAL — свободное использование
-- с указанием авторства там, где лицензия требует; прямые ссылки на файлы
-- commons.wikimedia.org, не на страницы описания). Один снимок
-- («Электрозавод, стрит-арт кластер») — не с точной локации: адресного
-- фото именно этого кластера на Commons не нашлось, использовано другое
-- документированное московское граффити как представительное изображение
-- для мудборда — не выдаётся за фото именно этого места.
insert into public.places (name, description, lat, lng, tags, photo_url, source) values
  ('Смотровая площадка Воробьёвы горы', 'Классический вид на Москву-Сити и стадион Лужники', 55.7104, 37.5566, '{"панорама","парки"}', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Personas_en_el_mirador_de_la_Colina_de_los_Gorriones.jpg/1280px-Personas_en_el_mirador_de_la_Colina_de_los_Gorriones.jpg', 'curated'),
  ('Парк Зарядье, парящий мост', 'Мост без опор с видом на Кремль и Москву-реку', 55.7500, 37.6294, '{"панорама","архитектура"}', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Moscow._View_to_The_Kremlin_from_Floating_bridge_in_Zaryadye_Park.jpg/1280px-Moscow._View_to_The_Kremlin_from_Floating_bridge_in_Zaryadye_Park.jpg', 'curated'),
  ('Патриаршие пруды', 'Тихий пруд в центре, булгаковские места', 55.7626, 37.5924, '{"парки"}', 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Patriarch_Ponds.jpg/1280px-Patriarch_Ponds.jpg', 'curated'),
  ('ГУМ, Красная площадь', 'Историческое здание торговых рядов', 55.7546, 37.6215, '{"архитектура"}', 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/GUM_department_store.jpg/1280px-GUM_department_store.jpg', 'curated'),
  ('Артплей, дизайн-квартал', 'Индустриальный лофт-квартал со стрит-артом', 55.7590, 37.6600, '{"граффити","архитектура"}', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Moscow%2C_inside_Artplay_Design_Center_-_panoramio_%28316%29.jpg/1280px-Moscow%2C_inside_Artplay_Design_Center_-_panoramio_%28316%29.jpg', 'curated'),
  ('Крутицкое подворье', 'Изразцовый терем XVII века', 55.7311, 37.6580, '{"архитектура"}', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Moscow_KrutitskyTeremok_018_6745.jpg/1280px-Moscow_KrutitskyTeremok_018_6745.jpg', 'curated'),
  ('Царицыно, дворцовый ансамбль', 'Готический дворцовый комплекс с прудами', 55.6156, 37.6693, '{"парки","архитектура"}', 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Moscow._Tsaritsyno._Grand_Palace_P5182975_2600.jpg/1280px-Moscow._Tsaritsyno._Grand_Palace_P5182975_2600.jpg', 'curated'),
  ('Библиотека им. Ленина, вид с крыши', 'Одна из известных смотровых крыш центра', 55.7519, 37.6100, '{"крыши","панорама"}', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Moscow_RSL_main_building_asv2019-06_img1.jpg/1280px-Moscow_RSL_main_building_asv2019-06_img1.jpg', 'curated'),
  ('Останкинская телебашня, парк', 'Вид на башню от ВДНХ', 55.8197, 37.6117, '{"панорама"}', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Ostankino_Tower.jpg/1280px-Ostankino_Tower.jpg', 'curated'),
  ('Электрозавод, стрит-арт кластер', 'Заводская территория с муралами', 55.7890, 37.7189, '{"граффити"}', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/The_beginning_of_madness._Moscow._2015._%2819676665283%29.jpg/1280px-The_beginning_of_madness._Moscow._2015._%2819676665283%29.jpg', 'curated'),
  ('Коломенское, деревянный дворец', 'Реконструкция дворца Алексея Михайловича у Москвы-реки', 55.6683, 37.6708, '{"парки","архитектура"}', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Moscow._Kolomenskoye._Wooden_palace_of_tsar_Alexey_P5183195_3110.jpg/1280px-Moscow._Kolomenskoye._Wooden_palace_of_tsar_Alexey_P5183195_3110.jpg', 'curated'),
  ('Никольская улица', 'Пешеходная улица с гирляндами у Кремля', 55.7576, 37.6229, '{"архитектура"}', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Nikolskaya_street%2C_Moscow%2C_2024.jpg/1280px-Nikolskaya_street%2C_Moscow%2C_2024.jpg', 'curated');
