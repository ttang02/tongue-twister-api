import { db } from './client'
import { phrases } from './schema'

const data = [
  // ── Français ──────────────────────────────────────────────────────────────
  { language: 'fr', country: 'FR', text: 'Bonjour Madame',                                                           difficulty: 'easy',   timer_s: 30 },
  { language: 'fr', country: 'FR', text: 'La jolie petite Julie',                                                    difficulty: 'easy',   timer_s: 30 },
  { language: 'fr', country: 'FR', text: 'Je veux et j\'exige du jasmin',                                            difficulty: 'easy',   timer_s: 30 },
  { language: 'fr', country: 'FR', text: 'Tonton, ton thé t\'a-t-il ôté ta toux ?',                                  difficulty: 'medium', timer_s: 20 },
  { language: 'fr', country: 'FR', text: 'Si six scies scient six cyprès',                                           difficulty: 'medium', timer_s: 20 },
  { language: 'fr', country: 'FR', text: 'Seize jacinthes sèchent sous seize feuilles sèches',                       difficulty: 'medium', timer_s: 20 },
  { language: 'fr', country: 'FR', text: 'Un chasseur sachant chasser sait chasser sans son chien',                  difficulty: 'hard',   timer_s: 10 },
  { language: 'fr', country: 'FR', text: 'Les chaussettes de l\'archiduchesse sont-elles sèches ou archi-sèches ?', difficulty: 'hard',   timer_s: 10 },
  { language: 'fr', country: 'FR', text: 'Didon dîna, dit-on, du dos d\'un dodu dindon',                            difficulty: 'hard',   timer_s: 10 },

  // ── English ────────────────────────────────────────────────────────────────
  { language: 'en', country: 'US', text: 'Red lorry, yellow lorry',                                                  difficulty: 'easy',   timer_s: 30 },
  { language: 'en', country: 'US', text: 'How much wood would a woodchuck chuck',                                    difficulty: 'easy',   timer_s: 30 },
  { language: 'en', country: 'US', text: 'Betty Botter bought some butter',                                          difficulty: 'easy',   timer_s: 30 },
  { language: 'en', country: 'US', text: 'She sells seashells by the seashore',                                      difficulty: 'medium', timer_s: 20 },
  { language: 'en', country: 'US', text: 'Peter Piper picked a peck of pickled peppers',                             difficulty: 'medium', timer_s: 20 },
  { language: 'en', country: 'US', text: 'How can a clam cram in a clean cream can',                                 difficulty: 'medium', timer_s: 20 },
  { language: 'en', country: 'US', text: 'Pad kid poured curd pulled cod',                                           difficulty: 'hard',   timer_s: 10 },
  { language: 'en', country: 'US', text: 'The sixth sick sheik\'s sixth sheep\'s sick',                              difficulty: 'hard',   timer_s: 10 },
  { language: 'en', country: 'US', text: 'Brisk brave brigadiers brandished broad bright blades',                   difficulty: 'hard',   timer_s: 10 },

  // ── Korean ─────────────────────────────────────────────────────────────────
  { language: 'ko', country: 'KR', text: '아버지가방에들어가신다',                                                       difficulty: 'easy',   timer_s: 30 },
  { language: 'ko', country: 'KR', text: '내가 그린 기린 그림',                                                         difficulty: 'easy',   timer_s: 30 },
  { language: 'ko', country: 'KR', text: '경찰청 철창살',                                                               difficulty: 'medium', timer_s: 20 },
  { language: 'ko', country: 'KR', text: '저 분은 백 법학 박사이고 이 분은 박 법학 박사이다',                              difficulty: 'medium', timer_s: 20 },
  { language: 'ko', country: 'KR', text: '간장 공장 공장장은 강 공장장이고 된장 공장 공장장은 장 공장장이다',               difficulty: 'hard',   timer_s: 10 },
  { language: 'ko', country: 'KR', text: '앞집 팥죽은 붉은 팥 팥죽이고 뒷집 팥죽은 검은 팥 팥죽이다',                     difficulty: 'hard',   timer_s: 10 },

  // ── Vietnamese ─────────────────────────────────────────────────────────────
  { language: 'vi', country: 'VN', text: 'Bà ba béo bán bánh bèo',                                                   difficulty: 'easy',   timer_s: 30 },
  { language: 'vi', country: 'VN', text: 'Chú chích choè chạy chân chim',                                            difficulty: 'easy',   timer_s: 30 },
  { language: 'vi', country: 'VN', text: 'Con kiến kiến bò lên cây kiến',                                            difficulty: 'medium', timer_s: 20 },
  { language: 'vi', country: 'VN', text: 'Lúa nếp là lúa nếp nàng, lúa lên lớp lớp lòng nàng lúa ơi',              difficulty: 'medium', timer_s: 20 },
  { language: 'vi', country: 'VN', text: 'Nhà Nha Trang nằm ngang nhánh núi nhỏ',                                    difficulty: 'hard',   timer_s: 10 },
  { language: 'vi', country: 'VN', text: 'Bốn bức bình bát bằng bạc bày biện bên bờ biển',                          difficulty: 'hard',   timer_s: 10 },
] as const

await db.insert(phrases).values(data as any)
console.log(`Seeded ${data.length} phrases.`)
process.exit(0)
