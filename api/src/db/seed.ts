import { db } from './client'
import { phrases } from './schema'

type Row = {
  language:   'fr' | 'en' | 'ko' | 'vi'
  country:    'FR' | 'US' | 'KR' | 'VN'
  text:       string
  difficulty: 'easy' | 'medium' | 'hard'
  timer_s:    number
}

const data: Row[] = [

  // ════════════════════════════════════════════════════════════════════════════
  // FRANÇAIS
  // ════════════════════════════════════════════════════════════════════════════

  // --- Facile (30 s) ----------------------------------------------------------
  { language: 'fr', country: 'FR', difficulty: 'easy', timer_s: 30,
    text: 'Bonjour Madame' },
  { language: 'fr', country: 'FR', difficulty: 'easy', timer_s: 30,
    text: 'La jolie petite Julie' },
  { language: 'fr', country: 'FR', difficulty: 'easy', timer_s: 30,
    text: 'Je veux et j\'exige du jasmin' },
  { language: 'fr', country: 'FR', difficulty: 'easy', timer_s: 30,
    text: 'Papa, as-tu vu ce gros pou velu ?' },
  { language: 'fr', country: 'FR', difficulty: 'easy', timer_s: 30,
    text: 'Poisson sans boisson est poison' },
  { language: 'fr', country: 'FR', difficulty: 'easy', timer_s: 30,
    text: 'Mon père est maire, mon frère est masseur' },
  { language: 'fr', country: 'FR', difficulty: 'easy', timer_s: 30,
    text: 'Gros gras grand grain d\'orge' },

  // --- Moyen (20 s) -----------------------------------------------------------
  { language: 'fr', country: 'FR', difficulty: 'medium', timer_s: 20,
    text: 'Tonton, ton thé t\'a-t-il ôté ta toux ?' },
  { language: 'fr', country: 'FR', difficulty: 'medium', timer_s: 20,
    text: 'Si six scies scient six cyprès' },
  { language: 'fr', country: 'FR', difficulty: 'medium', timer_s: 20,
    text: 'Seize jacinthes sèchent sous seize feuilles sèches' },
  { language: 'fr', country: 'FR', difficulty: 'medium', timer_s: 20,
    text: 'Trois tortues trottaient sur un trottoir très étroit' },
  { language: 'fr', country: 'FR', difficulty: 'medium', timer_s: 20,
    text: 'Natacha n\'attacha pas son chat Pacha qui s\'échappa' },
  { language: 'fr', country: 'FR', difficulty: 'medium', timer_s: 20,
    text: 'Ce sont seize cents sachets de sel qui sèchent' },
  { language: 'fr', country: 'FR', difficulty: 'medium', timer_s: 20,
    text: 'Une fine fille folle fait la file follement' },

  // --- Difficile (10 s) -------------------------------------------------------
  { language: 'fr', country: 'FR', difficulty: 'hard', timer_s: 10,
    text: 'Un chasseur sachant chasser sait chasser sans son chien' },
  { language: 'fr', country: 'FR', difficulty: 'hard', timer_s: 10,
    text: 'Les chaussettes de l\'archiduchesse sont-elles sèches ou archi-sèches ?' },
  { language: 'fr', country: 'FR', difficulty: 'hard', timer_s: 10,
    text: 'Didon dîna, dit-on, du dos d\'un dodu dindon' },
  { language: 'fr', country: 'FR', difficulty: 'hard', timer_s: 10,
    text: 'Le fisc fixe exprès chaque taxe fixe excessive' },
  { language: 'fr', country: 'FR', difficulty: 'hard', timer_s: 10,
    text: 'Que lit-il ? Il lit l\'heure. Quelle heure lit-il ? Il lit l\'heure illisible' },
  { language: 'fr', country: 'FR', difficulty: 'hard', timer_s: 10,
    text: 'Cinq gros rats grillent dans la grosse graisse grasse' },
  { language: 'fr', country: 'FR', difficulty: 'hard', timer_s: 10,
    text: 'Pauvre petit pêcheur, prends patience pour pouvoir prendre plusieurs petits poissons' },

  // ════════════════════════════════════════════════════════════════════════════
  // ENGLISH
  // ════════════════════════════════════════════════════════════════════════════

  // --- Easy (30 s) ------------------------------------------------------------
  { language: 'en', country: 'US', difficulty: 'easy', timer_s: 30,
    text: 'Unique New York' },
  { language: 'en', country: 'US', difficulty: 'easy', timer_s: 30,
    text: 'Red lorry, yellow lorry' },
  { language: 'en', country: 'US', difficulty: 'easy', timer_s: 30,
    text: 'Toy boat, toy boat, toy boat' },
  { language: 'en', country: 'US', difficulty: 'easy', timer_s: 30,
    text: 'Which witch is which?' },
  { language: 'en', country: 'US', difficulty: 'easy', timer_s: 30,
    text: 'Betty Botter bought some butter' },
  { language: 'en', country: 'US', difficulty: 'easy', timer_s: 30,
    text: 'How much wood would a woodchuck chuck?' },
  { language: 'en', country: 'US', difficulty: 'easy', timer_s: 30,
    text: 'A big black bug bit a big black bear' },

  // --- Medium (20 s) ----------------------------------------------------------
  { language: 'en', country: 'US', difficulty: 'medium', timer_s: 20,
    text: 'She sells seashells by the seashore' },
  { language: 'en', country: 'US', difficulty: 'medium', timer_s: 20,
    text: 'Peter Piper picked a peck of pickled peppers' },
  { language: 'en', country: 'US', difficulty: 'medium', timer_s: 20,
    text: 'How can a clam cram in a clean cream can?' },
  { language: 'en', country: 'US', difficulty: 'medium', timer_s: 20,
    text: 'I saw Susie sitting in a shoeshine shop' },
  { language: 'en', country: 'US', difficulty: 'medium', timer_s: 20,
    text: 'A proper copper coffee pot' },
  { language: 'en', country: 'US', difficulty: 'medium', timer_s: 20,
    text: 'Six slippery snails slid slowly seaward' },
  { language: 'en', country: 'US', difficulty: 'medium', timer_s: 20,
    text: 'Can you can a can as a canner can can a can?' },

  // --- Hard (10 s) ------------------------------------------------------------
  { language: 'en', country: 'US', difficulty: 'hard', timer_s: 10,
    text: 'Pad kid poured curd pulled cod' },
  { language: 'en', country: 'US', difficulty: 'hard', timer_s: 10,
    text: 'The sixth sick sheik\'s sixth sheep\'s sick' },
  { language: 'en', country: 'US', difficulty: 'hard', timer_s: 10,
    text: 'Brisk brave brigadiers brandished broad bright blades' },
  { language: 'en', country: 'US', difficulty: 'hard', timer_s: 10,
    text: 'Freshly fried fresh flesh' },
  { language: 'en', country: 'US', difficulty: 'hard', timer_s: 10,
    text: 'Lesser leather never weathered wetter weather better' },
  { language: 'en', country: 'US', difficulty: 'hard', timer_s: 10,
    text: 'Six sick hicks nick six slick bricks with picks and sticks' },
  { language: 'en', country: 'US', difficulty: 'hard', timer_s: 10,
    text: 'Through three cheese trees three free fleas flew' },

  // ════════════════════════════════════════════════════════════════════════════
  // KOREAN (한국어)
  // ════════════════════════════════════════════════════════════════════════════

  // --- 쉬움 — Easy (30 s) -------------------------------------------------------
  { language: 'ko', country: 'KR', difficulty: 'easy', timer_s: 30,
    text: '내가 그린 기린 그림' },
  { language: 'ko', country: 'KR', difficulty: 'easy', timer_s: 30,
    text: '아버지가방에들어가신다' },
  { language: 'ko', country: 'KR', difficulty: 'easy', timer_s: 30,
    text: '저기 저 뜀틀이 내가 뛸 뜀틀인가' },
  { language: 'ko', country: 'KR', difficulty: 'easy', timer_s: 30,
    text: '나는 나를 나누려 나무에 나갔다' },
  { language: 'ko', country: 'KR', difficulty: 'easy', timer_s: 30,
    text: '콩 심은 데 콩 나고 팥 심은 데 팥 난다' },

  // --- 보통 — Medium (20 s) -----------------------------------------------------
  { language: 'ko', country: 'KR', difficulty: 'medium', timer_s: 20,
    text: '경찰청 철창살' },
  { language: 'ko', country: 'KR', difficulty: 'medium', timer_s: 20,
    text: '저 분은 백 법학 박사이고 이 분은 박 법학 박사이다' },
  { language: 'ko', country: 'KR', difficulty: 'medium', timer_s: 20,
    text: '신진 상회 사장 신상진 씨' },
  { language: 'ko', country: 'KR', difficulty: 'medium', timer_s: 20,
    text: '멍멍이네 꿀꿀이는 멍멍이고 꿀꿀이네 멍멍이는 꿀꿀이야' },
  { language: 'ko', country: 'KR', difficulty: 'medium', timer_s: 20,
    text: '철수 책상 책상 철수' },
  { language: 'ko', country: 'KR', difficulty: 'medium', timer_s: 20,
    text: '고려고 교가 고려고 교가고 고려고 교가가 고려고 교가다' },

  // --- 어려움 — Hard (10 s) -----------------------------------------------------
  { language: 'ko', country: 'KR', difficulty: 'hard', timer_s: 10,
    text: '간장 공장 공장장은 강 공장장이고 된장 공장 공장장은 장 공장장이다' },
  { language: 'ko', country: 'KR', difficulty: 'hard', timer_s: 10,
    text: '앞집 팥죽은 붉은 팥 팥죽이고 뒷집 팥죽은 검은 팥 팥죽이다' },
  { language: 'ko', country: 'KR', difficulty: 'hard', timer_s: 10,
    text: '한양 양장점 한 양장사 양장 단추 달고' },
  { language: 'ko', country: 'KR', difficulty: 'hard', timer_s: 10,
    text: '저기 가는 저 상장사가 새 상장 사러 가는 상장 사장인가 헌 상장 사러 가는 상장 사장인가' },
  { language: 'ko', country: 'KR', difficulty: 'hard', timer_s: 10,
    text: '육통 통장 촉탁은 삼통 통장 촉탁이고 삼통 통장 촉탁은 육통 통장 촉탁이다' },

  // ════════════════════════════════════════════════════════════════════════════
  // VIETNAMESE (Tiếng Việt)
  // ════════════════════════════════════════════════════════════════════════════

  // --- Dễ — Easy (30 s) --------------------------------------------------------
  { language: 'vi', country: 'VN', difficulty: 'easy', timer_s: 30,
    text: 'Bà ba béo bán bánh bèo' },
  { language: 'vi', country: 'VN', difficulty: 'easy', timer_s: 30,
    text: 'Chú chích choè chạy chân chim' },
  { language: 'vi', country: 'VN', difficulty: 'easy', timer_s: 30,
    text: 'Cô Kha khéo kéo khung cửi' },
  { language: 'vi', country: 'VN', difficulty: 'easy', timer_s: 30,
    text: 'Mấy cái cò mò cá' },
  { language: 'vi', country: 'VN', difficulty: 'easy', timer_s: 30,
    text: 'Cái ghế gỗ ghép gọn gàng' },
  { language: 'vi', country: 'VN', difficulty: 'easy', timer_s: 30,
    text: 'Ba ba bán bưởi bờ bên' },

  // --- Trung bình — Medium (20 s) -----------------------------------------------
  { language: 'vi', country: 'VN', difficulty: 'medium', timer_s: 20,
    text: 'Con kiến kiến bò lên cây kiến' },
  { language: 'vi', country: 'VN', difficulty: 'medium', timer_s: 20,
    text: 'Lúa nếp là lúa nếp nàng, lúa lên lớp lớp lòng nàng lúa ơi' },
  { language: 'vi', country: 'VN', difficulty: 'medium', timer_s: 20,
    text: 'Mưa mùa mưa móc mưa trên mái nhà' },
  { language: 'vi', country: 'VN', difficulty: 'medium', timer_s: 20,
    text: 'Tròn trịa trắng trẻo trông trăng trắng' },
  { language: 'vi', country: 'VN', difficulty: 'medium', timer_s: 20,
    text: 'Một con cá vàng bơi vào vũng nước vàng' },
  { language: 'vi', country: 'VN', difficulty: 'medium', timer_s: 20,
    text: 'Sáu sào sắn sắc sắn sào sáu' },

  // --- Khó — Hard (10 s) --------------------------------------------------------
  { language: 'vi', country: 'VN', difficulty: 'hard', timer_s: 10,
    text: 'Nhà Nha Trang nằm ngang nhánh núi nhỏ' },
  { language: 'vi', country: 'VN', difficulty: 'hard', timer_s: 10,
    text: 'Bốn bức bình bát bằng bạc bày biện bên bờ biển' },
  { language: 'vi', country: 'VN', difficulty: 'hard', timer_s: 10,
    text: 'Trên trời có vẩy tê tê, dưới đất lại có tê tê vẩy trời' },
  { language: 'vi', country: 'VN', difficulty: 'hard', timer_s: 10,
    text: 'Ngựa nghỉ ngơi nơi núi nọ, nương náu ngắm ngọn núi ngàn năm' },
  { language: 'vi', country: 'VN', difficulty: 'hard', timer_s: 10,
    text: 'Phố phường phồn phú phục phục phục, phú phường phố phục phồn phú phục' },

]

await db.insert(phrases).values(data)
console.log(`Seeded ${data.length} phrases.`)
console.table(
  ['fr', 'en', 'ko', 'vi'].flatMap((lang) =>
    ['easy', 'medium', 'hard'].map((diff) => ({
      lang,
      difficulty: diff,
      count: data.filter((d) => d.language === lang && d.difficulty === diff).length,
    }))
  )
)
process.exit(0)
