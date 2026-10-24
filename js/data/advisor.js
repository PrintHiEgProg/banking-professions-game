// Финансовый консультант: клиенты пяти смен.
// Денежный поток: доходы втекают в кошелёк, расходы утекают по трубам, остаток течёт в копилку цели.
// Расход: { id, icon, title, amount, kind: 'need' | 'fun' | 'waste', say — реплика клиента, когда кран закрыли }.
// need — нужное (резать нельзя), fun — радости (можно убавить), waste — лишнее (утекает зря).
// События перемотки: temptation (соблазн), gift (подарок/премия), emergency (беда), inflation (цены растут),
// newmodel (товар подешевел), pyramid (новости о пирамиде).

export const PRODUCTS = {
  piggy: { icon: '🐷', title: 'Копилка дома', rate: 0, lock: false, sub: 'Без процентов · снять когда угодно' },
  saving: { icon: '🏦', title: 'Накопительный счёт', rate: 0.08, lock: false, sub: '8% в год · снять когда угодно' },
  deposit: { icon: '🔒', title: 'Вклад', rate: 0.12, lock: true, sub: '12% в год · снять раньше — проценты сгорят' },
};

export const STYLE_TAGS = {
  story: ['🧸', 'На примере'],
  numbers: ['🔢', 'Цифрами'],
  terms: ['📚', 'Терминами'],
  push: ['⚡', 'Напором'],
};

export const MONTHS = ['Октябрь', 'Ноябрь', 'Декабрь', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь'];
export const SEASON = ['🍂', '🌧', '🎄', '❄️', '⛄', '🌱', '🌸', '🌷', '☀️', '🏖', '🍉', '📚'];

const L = {
  misha: { style: 'cap', hair: '#3b2a20', young: true, shirt: '#ff9f1c', bg: '#2b3a4a' },
  katya: { style: 'long', back: 'pony', hair: '#c0392b', young: true, shirt: '#9b6dff', bg: '#2d2440', earrings: true },
  andrey: { style: 'short', hair: '#4a3728', beard: true, shirt: '#2a9d8f', bg: '#1f3a35' },
  olga: { style: 'bun', hair: '#d9a066', earrings: true, shirt: '#e76f51', bg: '#3a2a26' },
  artyom: { style: 'side', hair: '#1d1d1d', young: true, shirt: '#06d6a0', bg: '#1d2f45' },
  granny: { style: 'bun', hair: '#d0d3da', glasses: true, old: true, shirt: '#8e5572', scarf: '#c9a227', bg: '#352a3a', skin: 3 },
  oleg: { style: 'short', hair: '#6d4c41', mustache: true, shirt: '#457b9d', bg: '#22303d', skin: 1 },
};

export const ADVISOR_SHIFTS = {
  1: {
    client: { name: 'Миша', age: 11, look: L.misha, about: 'школьник, 5 «Б»' },
    goal: { title: 'Велосипед', icon: '🚲', price: 12000, months: 8, when: 'к лету' },
    hello: 'Здравствуйте! Хочу велосипед. Но деньги куда-то исчезают — ни рубля накопить не могу!',
    incomes: [
      ['🪙', 'Карманные', 2000],
      ['👵', 'От бабушки', 1000],
    ],
    expenses: [
      { id: 'lunch', icon: '🥪', title: 'Буфет в школе', amount: 600, kind: 'need', say: 'А обедать я как буду?' },
      { id: 'bus', icon: '🚌', title: 'Проезд', amount: 400, kind: 'need', say: 'Пешком до школы час идти!' },
      { id: 'chips', icon: '🍟', title: 'Чипсы и газировка', amount: 800, kind: 'waste', say: 'Ого, 800 в месяц на чипсы?!' },
      { id: 'game', icon: '🎮', title: 'Донаты в игре', amount: 700, kind: 'waste', say: 'Скины всё равно надоедают…' },
      { id: 'cards', icon: '🃏', title: 'Наклейки и карточки', amount: 300, kind: 'fun', say: 'Ну ладно, без наклеек можно' },
      { id: 'ice', icon: '🍦', title: 'Мороженое с друзьями', amount: 200, kind: 'fun', say: 'А с друзьями погулять?..' },
    ],
    products: ['piggy'],
    explain: {
      q: 'А зачем вообще копить? Можно же попросить у мамы!',
      options: [
        { tag: 'story', text: 'Представь: каждый месяц к тебе «приезжает» одна деталь велосипеда. Сначала колесо, потом руль — и летом он твой!', trust: 20, reply: 'Прикольно! Тогда я его сам заработаю!' },
        { tag: 'terms', text: 'Формирование личных сбережений обеспечивает достижение финансовых целей.', trust: -10, reply: 'Э-э… чего?' },
        { tag: 'push', text: 'Маме и так тяжело. Хватит клянчить!', trust: -20, reply: 'Я и не клянчу…' },
      ],
    },
    events: [
      { m: 2, type: 'temptation', icon: '🎮', title: 'Скидка на скин', text: 'Миша: «В игре скидка 50% на легендарный скин — всего 600 ₽! Брать?»', cost: 600, wait: 'Через неделю скидка снова будет — проверено!' },
      { m: 4, type: 'gift', icon: '🎂', title: 'День рождения', text: 'Бабушка подарила 2 000 ₽ на день рождения. Куда их?', amount: 2000 },
      { m: 5, type: 'scam', icon: '🎣', title: '«Удвоим деньги!»', text: 'Миша: «В игре написали: переведи 1 000 ₽ на карту — вернём 2 000 и подарим легендарный скин! Переводить?»', cost: 1000 },
    ],
    // велосипед собирается по деталям, пока растёт копилка
    assemble: [
      [0.12, 'заднее колесо'],
      [0.27, 'переднее колесо'],
      [0.44, 'рама'],
      [0.6, 'руль'],
      [0.75, 'седло'],
      [0.9, 'педали и цепь'],
      [1, 'звонок!'],
    ],
    story: 'misha',
    finale: { scene: '🚲💨🌳☀️', text: 'Миша катит на новом велосипеде — и сам на него накопил!' },
    referral: '🚲 Миша привёл друга Петю — тот копит на самокат',
  },
  2: {
    client: { name: 'Катя', age: 19, look: L.katya, about: 'студентка, 2 курс' },
    goal: { title: 'Ноутбук для учёбы', icon: '💻', price: 72000, months: 10, when: 'к летней сессии' },
    hello: 'Мне нужен ноутбук к сессии. Зарплата с подработки есть, а денег — нет. Как так?',
    incomes: [
      ['🎓', 'Стипендия', 4000],
      ['🧋', 'Подработка в кафе', 22000],
    ],
    expenses: [
      { id: 'dorm', icon: '🏠', title: 'Общежитие', amount: 3000, kind: 'need', say: 'Мне что, на улице жить?' },
      { id: 'food', icon: '🛒', title: 'Продукты', amount: 8000, kind: 'need', say: 'Без еды я не сдам сессию!' },
      { id: 'bus', icon: '🚌', title: 'Проезд', amount: 1500, kind: 'need', say: 'А до универа как?' },
      { id: 'phone', icon: '📶', title: 'Связь и интернет', amount: 500, kind: 'need', say: 'Без интернета не учатся…' },
      { id: 'delivery', icon: '🛵', title: 'Доставка еды', amount: 4000, kind: 'waste', say: 'Да, готовить самой дешевле в три раза' },
      { id: 'coffee', icon: '☕', title: 'Кофе навынос', amount: 2400, kind: 'waste', say: 'Термос с собой — и минус 2 400!' },
      { id: 'subs', icon: '📺', title: 'Три подписки', amount: 900, kind: 'waste', say: 'Я одну из них даже не открывала' },
      { id: 'clothes', icon: '👗', title: 'Одежда', amount: 3000, kind: 'fun', say: 'Совсем ничего не покупать?..' },
      { id: 'cinema', icon: '🎬', title: 'Кино с друзьями', amount: 1200, kind: 'fun', say: 'Ну хоть иногда с друзьями…' },
    ],
    products: ['piggy'],
    cushion: { steps: [0, 1000, 2000, 3000], target: 8000 },
    explain: {
      q: 'Зачем мне какая-то «подушка»? Я коплю на ноутбук!',
      options: [
        { tag: 'numbers', text: 'Сломается телефон — ремонт 8 000. Без запаса придётся брать из ноутбука или в долг. Подушка 8 000 — и цель не пострадает.', trust: 20, reply: 'Логично. Сначала запас, потом ноутбук.' },
        { tag: 'terms', text: 'Резервный фонд снижает волатильность личного бюджета.', trust: -10, reply: 'Мне бы попроще…' },
        { tag: 'push', text: 'Без подушки только глупые живут.', trust: -20, reply: 'Спасибо, очень помогли.' },
      ],
    },
    events: [
      { m: 4, type: 'emergency', icon: '📱', title: 'Разбился телефон', text: 'Катя уронила телефон — экран вдребезги. Ремонт 8 000 ₽.', cost: 8000 },
      { m: 6, type: 'temptation', icon: '👟', title: 'Распродажа', text: 'Катя: «Кроссовки −30%! Всего 7 000 ₽. Беру?»', cost: 7000, wait: 'Старые ещё живы. Ноутбук важнее.' },
      { m: 7, type: 'gift', icon: '💰', title: 'Премия', text: 'В кафе выдали премию 5 000 ₽. Куда направить?', amount: 5000 },
    ],
    finale: { scene: '💻🎓✨📚', text: 'Катя сдаёт сессию на новом ноутбуке. А телефон починили из подушки — без долгов.' },
    referral: '💻 Катя рассказала одногруппникам — двое пришли за советом',
  },
  3: {
    client: { name: 'Петровы', age: null, look: L.olga, look2: L.andrey, about: 'Андрей и Ольга, двое детей' },
    goal: { title: 'Море всей семьёй', icon: '🏖', price: 250000, months: 12, when: 'следующим летом' },
    lump: 60000,
    lumpText: '60 000 ₽ уже лежат дома в конверте',
    hello: 'Хотим летом на море, вчетвером. 60 тысяч уже есть — в конверте. Как накопить остальное?',
    incomes: [
      ['👨', 'Зарплата Андрея', 70000],
      ['👩', 'Зарплата Ольги', 55000],
    ],
    expenses: [
      { id: 'mortgage', icon: '🏠', title: 'Ипотека', amount: 38000, kind: 'need', say: 'Ипотеку не платить нельзя!' },
      { id: 'food', icon: '🛒', title: 'Продукты', amount: 34000, kind: 'need', say: 'Детей кормить надо!' },
      { id: 'util', icon: '💡', title: 'Коммуналка', amount: 9000, kind: 'need', say: 'Без света сидеть?' },
      { id: 'car', icon: '⛽', title: 'Бензин', amount: 8000, kind: 'need', say: 'На машине Андрей ездит на работу' },
      { id: 'kids', icon: '⚽', title: 'Кружки детей', amount: 9000, kind: 'need', say: 'Дети без футбола заскучают!' },
      { id: 'cafe', icon: '🍕', title: 'Кафе по выходным', amount: 8000, kind: 'fun', say: 'Можно ходить реже, но не бросать' },
      { id: 'market', icon: '📦', title: 'Маркетплейсы «по мелочи»', amount: 9000, kind: 'waste', say: '9 000 на мелочи?! Мы и не замечали' },
      { id: 'taxi', icon: '🚕', title: 'Такси вместо автобуса', amount: 4000, kind: 'waste', say: 'Автобус ходит до самого дома, правда' },
      { id: 'snack', icon: '🥐', title: 'Кофе и перекусы на работе', amount: 3000, kind: 'waste', say: 'Бутерброды из дома — вкуснее' },
      { id: 'subs', icon: '📺', title: 'Четыре подписки', amount: 1600, kind: 'waste', say: 'Смотрим всё равно одну' },
    ],
    products: ['piggy', 'saving', 'deposit'],
    cushion: { steps: [0, 5000, 10000, 15000], target: 15000 },
    inflation: 0.07,
    explain: {
      q: 'Конверт дома — надёжно. Зачем нам что-то ещё?',
      options: [
        { tag: 'numbers', text: 'Путёвка за год подорожает примерно на 7% — это +17 500 ₽. Конверт ничего не заработает, а вклад под 12% — заработает.', trust: 20, reply: 'А вот это аргумент. Давайте посчитаем.' },
        { tag: 'story', text: 'Деньги в конверте как мороженое на солнце: вроде лежат, а становятся меньше.', trust: 5, reply: 'Красиво сказано… а сколько именно?' },
        { tag: 'terms', text: 'Реальная доходность наличных отрицательна из-за инфляции.', trust: -10, reply: 'Мы не экономисты…' },
      ],
    },
    events: [
      { m: 2, type: 'temptation', icon: '📺', title: 'Чёрная пятница', text: 'Андрей: «Телевизор 65″ за 60 000 ₽ — такая скидка! Берём?»', cost: 60000, wait: 'Старый телевизор работает. Море важнее.' },
      { m: 5, type: 'emergency', icon: '🦷', title: 'Срочно к стоматологу', text: 'У сына заболел зуб. Лечение 15 000 ₽ — нужно сегодня.', cost: 15000 },
      { m: 6, type: 'inflation', icon: '📈', title: 'Цены выросли', text: 'Путёвки подорожали' },
      { m: 9, type: 'gift', icon: '💰', title: 'Годовая премия', text: 'Ольге дали премию 20 000 ₽. Куда её?', amount: 20000 },
      { m: 12, type: 'inflation', icon: '📈', title: 'Сезон начался', text: 'К лету путёвки подорожали ещё' },
    ],
    finale: { scene: '🏖🌊👨‍👩‍👧‍👦☀️', text: 'Петровы на море! Дети строят замок из песка, а проценты по вкладу оплатили экскурсии.' },
    referral: '🏖 Петровы посоветовали тебя коллегам — у кабинета очередь',
  },
  4: {
    client: { name: 'Артём', age: 19, look: L.artyom, about: 'курьер, пришёл с бабушкой' },
    goal: { title: 'iPhone', icon: '📱', price: 120000, months: 12, when: 'вместо кредита на 2 года' },
    hello: 'Хочу айфон! В магазине кредит — «всего 6 300 в месяц». Норм же?',
    offer: { shop: 'ТехноМир', price: 120000, pay: 6300, months: 24 },
    incomes: [['🛵', 'Зарплата курьера', 38000]],
    expenses: [
      { id: 'room', icon: '🏠', title: 'Комната', amount: 12000, kind: 'need', say: 'Жить где-то надо!' },
      { id: 'food', icon: '🍞', title: 'Еда', amount: 10000, kind: 'need', say: 'Курьер без еды не доедет' },
      { id: 'bus', icon: '🚌', title: 'Проезд', amount: 2000, kind: 'need', say: 'Без проезда на работу не попасть' },
      { id: 'phone', icon: '📶', title: 'Связь', amount: 600, kind: 'need', say: 'Курьеру без связи никак' },
      { id: 'fastfood', icon: '🍔', title: 'Фастфуд', amount: 4000, kind: 'waste', say: '4 000 на бургеры… жёстко' },
      { id: 'games', icon: '🎮', title: 'Игры и донаты', amount: 2500, kind: 'waste', say: 'Ладно, донаты — это правда дыра' },
      { id: 'subs', icon: '🎧', title: 'Подписки', amount: 700, kind: 'waste', say: 'Оставлю одну музыку' },
      { id: 'party', icon: '🎉', title: 'Тусовки', amount: 3000, kind: 'fun', say: 'Совсем без друзей?..' },
    ],
    products: ['piggy', 'saving'],
    explainPair: [
      {
        who: 'Артём', look: L.artyom, q: 'Ну и что? 6 300 в месяц — это же мало!',
        options: [
          { tag: 'numbers', text: '6 300 × 24 = 151 200. Переплата 31 200 — это ещё четверть айфона. Или наушники и кроссовки.', trust: 20, reply: 'Блин… четверть айфона просто так отдать?' },
          { tag: 'terms', text: 'Полная стоимость кредита с учётом аннуитетных платежей существенно выше.', trust: -10, reply: 'Чё?' },
          { tag: 'push', text: 'Кредит на телефон — это для глупых.', trust: -25, reply: 'Сам ты… Пойду в другой банк.' },
        ],
      },
      {
        who: 'Бабушка Артёма', look: L.granny, q: 'Внучек, а кредит — это что, долг получается?',
        options: [
          { tag: 'story', text: 'Да. Банк даёт деньги сейчас, а Артём два года отдаёт больше, чем взял. Как занять 10 рублей и вернуть 13.', trust: 20, reply: 'Ох… Тёма, давай лучше накопим!' },
          { tag: 'numbers', text: 'Ставка около 24% годовых, переплата 26% от суммы.', trust: -5, reply: 'Милок, ты мне по-простому скажи…' },
          { tag: 'terms', text: 'Это потребительское кредитование с аннуитетным графиком погашения.', trust: -15, reply: 'Ничего не поняла…' },
        ],
      },
    ],
    events: [
      { m: 3, type: 'temptation', icon: '🎟', title: 'Концерт', text: 'Артём: «Друзья зовут на концерт, билет 5 000 ₽. Иду?»', cost: 5000, wait: 'Посмотрим трансляцию вместе — а через полгода в руках айфон.' },
      { m: 6, type: 'newmodel', icon: '🆕', title: 'Вышла новая модель', text: 'Вышел новый айфон — прошлая модель подешевела на 15%', pct: 0.15 },
    ],
    compare: 'credit',
    story: 'artyom',
    finale: { scene: '📱✨🙌💸', text: 'Артём купил айфон за свои — и никому не должен. А по кредиту он платил бы ещё больше года.' },
    referral: '📱 Артём рассказал курьерам про переплату — трое пришли считать',
  },
  5: {
    client: { name: 'Олег', age: 38, look: L.oleg, about: 'водитель автобуса, дочке 12' },
    goal: { title: 'Учёба дочки в вузе', icon: '🎓', price: 1500000, months: 60, when: 'через 5 лет, к выпускному' },
    lump: 100000,
    lumpText: '100 000 ₽ накоплено — Олег хочет отнести их в фонд',
    hello: 'Друг вложился в фонд — там 30% в месяц! Хочу отнести туда наши 100 тысяч. Через год будем миллионерами!',
    flyer: {
      title: '💎 Фонд «Золотой Рост»',
      need: 3,
      segments: [
        ['Фонд «Золотой Рост»', null],
        [' — ', null],
        ['30% в месяц', '30% в месяц — так не бывает: вклад в банке даёт около 1% в месяц'],
        [', ', null],
        ['гарантированно!', 'Доход в инвестициях никто не гарантирует'],
        [' ', null],
        ['Приведи друга — получи +10%', 'Платят из денег новых вкладчиков — это признак пирамиды'],
        ['. Минимальный вклад 10 000 ₽. ', null],
        ['Успей до пятницы — мест мало!', 'Давят срочностью, чтобы не успел подумать'],
        [' ', null],
        ['Лицензия ЦБ не нужна — мы международная компания', 'Нет лицензии Банка России — деньги никто не защищает'],
        ['. Работаем с 2024 года. ', null],
        ['Вывод денег через Telegram-бот', 'Нет офиса и договора — потом не с кого спросить'],
        ['.', null],
      ],
    },
    talk: {
      start: 30,
      win: 55,
      nodes: [
        {
          say: 'Да ладно! Друг уже получил 30 тысяч с первого месяца. Своими глазами видел!',
          emo: 'happy',
          choices: [
            { tag: 'logic', k: 'k_a_pyramid', text: 'Первые выплаты — это деньги новых вкладчиков. Пирамида платит, пока растёт, а потом исчезает.', trust: 20, reply: 'Хм… А друг как раз зовёт меня вложиться…' },
            { tag: 'calm', text: 'Я рад за друга. Давай вместе посмотрим, что это за фонд.', trust: 12, reply: 'Давай, посмотри. Там всё серьёзно!' },
            { tag: 'pressure', text: 'Твой друг — лох, и ты будешь.', trust: -20, reply: 'Сам такой. Друг лучше знает!' },
          ],
        },
        {
          say: 'А вдруг это правда? Упущу шанс — буду жалеть всю жизнь.',
          emo: 'worried',
          choices: [
            { tag: 'logic', text: 'Проверим вместе: у фонда нет лицензии ЦБ. Если он исчезнет — деньги никто не вернёт.', trust: 18, reply: 'Нет лицензии? Он же говорил — международная…' },
            { tag: 'calm', text: 'Деньги на учёбу дочки — не те, которыми рискуют. Давай сделаем план, который точно сработает.', trust: 15, reply: 'Ради дочки… да. Рисковать нельзя.' },
            { tag: 'pressure', text: 'Ну и вкладывай. Только потом не плачь.', trust: -25, reply: 'И вложу!' },
          ],
        },
        {
          say: 'Ладно. А что тогда? В банке же копейки дают.',
          emo: 'neutral',
          choices: [
            { tag: 'logic', text: 'Копейки за месяц, но за 5 лет проценты на проценты — это снежный ком. Покажу на экране.', trust: 20, reply: 'Снежный ком? Давай, показывай!' },
            { tag: 'calm', text: 'Надёжно и спокойно. Ты сможешь спать по ночам.', trust: 10, reply: 'Спать спокойно — это тоже ценно.' },
            { tag: 'pressure', text: 'Копейки лучше, чем ноль.', trust: -5, reply: 'Умеешь ты вдохновить…' },
          ],
        },
      ],
    },
    incomes: [
      ['🚌', 'Зарплата Олега', 65000],
      ['👩', 'Зарплата жены', 45000],
    ],
    expenses: [
      { id: 'rent', icon: '🏠', title: 'Аренда квартиры', amount: 35000, kind: 'need', say: 'Нам жить где-то надо' },
      { id: 'food', icon: '🛒', title: 'Продукты', amount: 28000, kind: 'need', say: 'Еду не режем!' },
      { id: 'util', icon: '💡', title: 'Коммуналка', amount: 7000, kind: 'need', say: 'Свет и воду отключат' },
      { id: 'school', icon: '🎒', title: 'Школа и кружки дочки', amount: 9000, kind: 'need', say: 'На дочке экономить не будем' },
      { id: 'lottery', icon: '🎰', title: 'Лотереи и ставки', amount: 5000, kind: 'waste', say: 'Да, я ни разу не выиграл больше 100 ₽' },
      { id: 'smoke', icon: '🥤', title: 'Энергетики и снеки', amount: 4000, kind: 'waste', say: 'И для здоровья лучше' },
      { id: 'subs', icon: '📺', title: 'Подписки и ТВ', amount: 2000, kind: 'waste', say: 'Одной подписки хватит' },
      { id: 'cafe', icon: '🍽', title: 'Кафе и доставка', amount: 8000, kind: 'fun', say: 'Раз в неделю оставим' },
      { id: 'fishing', icon: '🎣', title: 'Рыбалка', amount: 3000, kind: 'fun', say: 'Рыбалку не трогай — это святое!' },
    ],
    products: ['piggy', 'saving', 'deposit'],
    events: [
      { m: 1, type: 'pyramid', stage: 1, icon: '🔺', title: 'Фонд друга', text: 'Друг Олега получил первые +30%. Хвастается в чате.' },
      { m: 3, type: 'pyramid', stage: 2, icon: '⏳', title: 'Фонд друга', text: '«Выплаты задерживаются из-за технических работ»' },
      { m: 4, type: 'pyramid', stage: 3, icon: '💥', title: 'Фонд исчез', text: 'Сайт «Золотого Роста» не открывается, бот молчит. Тысячи людей потеряли деньги.' },
      { m: 12, type: 'snowball', icon: '☃️', title: 'Год прошёл', text: 'Проценты начислены — и теперь проценты капают и на них тоже' },
      { m: 36, type: 'snowball', icon: '☃️', title: 'Три года', text: 'Снежный ком растёт: проценты уже приносят больше, чем лотереи съедали' },
    ],
    compare: 'pyramid',
    long: true,
    finale: { scene: '🎓👧✨📚', text: 'Дочка Олега поступила, и учёба оплачена. А друг до сих пор пытается вернуть деньги из «Золотого Роста».' },
    referral: '🎓 Олег рассказал о пирамидах коллегам в автопарке',
  },
};

// ─────────────────────────── расчёты (без DOM — их же использует прогноз и перемотка) ───────────────────────────
export const CUT_FACTOR = { open: 1, half: 0.5, closed: 0 };

export function income(cfg) {
  return cfg.incomes.reduce((s, [, , v]) => s + v, 0);
}

export function spend(cfg, cuts = {}) {
  return cfg.expenses.reduce((s, e) => s + e.amount * CUT_FACTOR[cuts[e.id] || 'open'], 0);
}

export function monthlyFree(cfg, cuts = {}) {
  return income(cfg) - spend(cfg, cuts);
}

// Месяц за месяцем без событий: когда накопим. Возвращает { months, total, interest, cushion }.
export function forecast(cfg, plan, maxMonths = 120) {
  const rate = PRODUCTS[plan.product || 'piggy'].rate / 12;
  const free = monthlyFree(cfg, plan.cuts);
  const target = cfg.cushion?.target || 0;
  let goal = cfg.lump || 0;
  let cushion = 0;
  let interest = 0;
  for (let m = 1; m <= maxMonths; m++) {
    const toCushion = Math.max(0, Math.min(plan.cushion || 0, target - cushion, free));
    cushion += toCushion;
    const i = goal * rate;
    interest += i;
    goal += free - toCushion + i;
    if (goal >= cfg.goal.price) return { months: m, total: goal, interest, cushion };
    if (free <= 0 && m > 1) break;
  }
  return { months: Infinity, total: goal, interest, cushion };
}

// Сколько будет в копилке цели через N месяцев (без событий)
export function amountAt(cfg, plan, months) {
  const rate = PRODUCTS[plan.product || 'piggy'].rate / 12;
  const free = monthlyFree(cfg, plan.cuts);
  const target = cfg.cushion?.target || 0;
  let goal = cfg.lump || 0;
  let cushion = 0;
  for (let m = 1; m <= months; m++) {
    const toCushion = Math.max(0, Math.min(plan.cushion || 0, target - cushion, free));
    cushion += toCushion;
    goal += free - toCushion + goal * rate;
  }
  return goal;
}
